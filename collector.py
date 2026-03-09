#!/usr/bin/env python3
# collector.py
# Free Twitter/X collection using snscrape:
# - account allowlist timelines
# - keyword search
# - link-based dedup
# - outputs NDJSON for easy ingestion
#
# Requires: pip install snscrape pyyaml

import re
import sys
import json
import time
import yaml
import hashlib
from datetime import datetime, timezone
from typing import Dict, Any, Iterable, List, Optional, Set

import snscrape.modules.twitter as sntwitter  # type: ignore


URL_RE = re.compile(r"(https?://\S+)", re.IGNORECASE)


def now_utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def normalize_url(url: str) -> str:
    # cheap normalization; keep it simple & stable
    url = url.strip().rstrip(").,;!\"'")
    return url


def extract_urls(text: str) -> List[str]:
    urls = [normalize_url(u) for u in URL_RE.findall(text or "")]
    # Drop x.com t.co duplicates if needed – keep all for now
    return list(dict.fromkeys(urls))


def stable_hash(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8", errors="ignore")).hexdigest()[:24]


def passes_filters(item: Dict[str, Any], cfg: Dict[str, Any]) -> bool:
    text = (item.get("content") or "").lower()

    # require links
    if cfg.get("require_links", True) and not item.get("urls"):
        return False

    # negative keywords
    for nk in cfg.get("negative_keywords", []):
        if nk.lower() in text:
            return False

    # language filter (best-effort; snscrape may not always provide lang)
    allowed_langs = set(cfg.get("languages", []))
    lang = (item.get("lang") or "").lower()
    if allowed_langs and lang and lang not in allowed_langs:
        return False

    return True


def tweet_to_item(t) -> Dict[str, Any]:
    # snscrape Tweet object fields vary; keep robust
    content = getattr(t, "rawContent", None) or getattr(t, "content", "") or ""
    url = getattr(t, "url", "") or ""
    user = getattr(getattr(t, "user", None), "username", None) or ""
    created = getattr(t, "date", None)
    created_iso = created.replace(tzinfo=timezone.utc).isoformat() if created else None

    # heuristics for retweet/reply
    is_reply = bool(getattr(t, "inReplyToTweetId", None))
    is_retweet = bool(getattr(t, "retweetedTweet", None)) or content.strip().startswith("RT @")

    urls = extract_urls(content)
    # include the tweet URL too (helps traceability)
    if url:
        urls = [url] + [u for u in urls if u != url]

    return {
        "platform": "x",
        "tweet_url": url,
        "author": user,
        "created_at": created_iso,
        "content": content,
        "urls": urls,
        "is_reply": is_reply,
        "is_retweet": is_retweet,
        "lang": getattr(t, "lang", None) or None,  # may be None
        "like_count": getattr(t, "likeCount", None),
        "retweet_count": getattr(t, "retweetCount", None),
        "reply_count": getattr(t, "replyCount", None),
        "quote_count": getattr(t, "quoteCount", None),
    }


def iter_user_tweets(username: str, limit: int) -> Iterable[Dict[str, Any]]:
    # user timeline
    q = f"from:{username}"
    for i, t in enumerate(sntwitter.TwitterSearchScraper(q).get_items()):
        if i >= limit:
            break
        yield tweet_to_item(t)


def iter_keyword_tweets(query: str, limit: int) -> Iterable[Dict[str, Any]]:
    for i, t in enumerate(sntwitter.TwitterSearchScraper(query).get_items()):
        if i >= limit:
            break
        yield tweet_to_item(t)


def build_queries(cfg: Dict[str, Any]) -> List[str]:
    # Build keyword queries. Keep them reasonably sized.
    groups = cfg.get("keyword_groups", {})
    queries: List[str] = []
    for _, kws in groups.items():
        # OR chain
        or_part = " OR ".join([f"\"{kw}\"" if " " in kw else kw for kw in kws])
        # Prefer link-carrying items; remove replies/retweets in our own filter too
        q = f"({or_part})"
        queries.append(q)
    return queries


def dedup_key(item: Dict[str, Any]) -> str:
    # Primary: first non-x URL (prefer news link)
    urls = item.get("urls") or []
    chosen = None
    for u in urls:
        ul = u.lower()
        if "t.co/" in ul or "x.com/" in ul or "twitter.com/" in ul:
            continue
        chosen = u
        break
    if chosen:
        return "url:" + stable_hash(chosen)

    # fallback: author+minute bucket+text hash
    created = item.get("created_at") or ""
    bucket = created[:16]  # YYYY-MM-DDTHH:MM
    base = f"{item.get('author','')}|{bucket}|{item.get('content','')[:240]}"
    return "txt:" + stable_hash(base)


def main():
    if len(sys.argv) < 2:
        print("Usage: python collector.py antigravity_sources.yaml > out.ndjson", file=sys.stderr)
        sys.exit(2)

    with open(sys.argv[1], "r", encoding="utf-8") as f:
        cfg_all = yaml.safe_load(f)

    cfg = cfg_all["twitter_free"]
    max_items = int(cfg.get("max_items_per_run", 400))
    per_bucket = max(50, max_items // 4)

    allowlist = cfg.get("allowlist_accounts", [])
    queries = build_queries(cfg)

    seen: Set[str] = set()
    out: List[Dict[str, Any]] = []

    # 1) account timelines
    for u in allowlist:
        try:
            for item in iter_user_tweets(u, limit=min(30, per_bucket)):
                if cfg.get("drop_retweets", True) and item["is_retweet"]:
                    continue
                if cfg.get("drop_replies", True) and item["is_reply"]:
                    continue
                if not passes_filters(item, cfg):
                    continue
                k = dedup_key(item)
                if k in seen:
                    continue
                seen.add(k)
                out.append(item)
                if len(out) >= max_items:
                    break
        except Exception:
            pass # skip on error for one user
        if len(out) >= max_items:
            break

    # 2) keyword searches
    if len(out) < max_items:
        for q in queries:
            try:
                for item in iter_keyword_tweets(q, limit=per_bucket):
                    if cfg.get("drop_retweets", True) and item["is_retweet"]:
                        continue
                    if cfg.get("drop_replies", True) and item["is_reply"]:
                        continue
                    if not passes_filters(item, cfg):
                        continue
                    k = dedup_key(item)
                    if k in seen:
                        continue
                    seen.add(k)
                    out.append(item)
                    if len(out) >= max_items:
                        break
            except Exception:
                pass # skip on error for one query
            if len(out) >= max_items:
                break

    # Output NDJSON
    meta = {"generated_at": now_utc_iso(), "count": len(out)}
    print(json.dumps({"_meta": meta}, ensure_ascii=False))
    for item in out:
        print(json.dumps(item, ensure_ascii=False))


if __name__ == "__main__":
    main()
