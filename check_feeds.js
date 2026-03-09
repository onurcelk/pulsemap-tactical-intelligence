import fs from 'fs';
import Parser from 'rss-parser';

const parser = new Parser({ timeout: 5000 });

async function checkFeeds() {
  const content = fs.readFileSync('server.ts', 'utf-8');
  const feedMatch = content.match(/const FEEDS = \[([\s\S]*?)\];/);
  if (!feedMatch) {
    console.error('Could not find FEEDS array');
    return;
  }

  const feedsBlock = feedMatch[1];
  const urlMatches = feedsBlock.matchAll(/url:\s*"([^"]+)"/g);
  const urls = Array.from(urlMatches).map((m) => m[1]);

  console.log(`Testing ${urls.length} feeds...`);

  const failed = [];
  const start = Date.now();

  const chunkSize = 20;
  for (let i = 0; i < urls.length; i += chunkSize) {
    const chunk = urls.slice(i, i + chunkSize);
    await Promise.allSettled(
      chunk.map(async (url) => {
        try {
          await parser.parseURL(url);
          process.stdout.write('.');
        } catch (e) {
          process.stdout.write('X');
          failed.push(url);
        }
      })
    );
  }

  console.log(`\n\nTested in ${(Date.now() - start) / 1000}s`);
  console.log(`Failed feeds: ${failed.length}`);
  fs.writeFileSync('failed_feeds.json', JSON.stringify(failed, null, 2));
}

checkFeeds().catch(console.error);
