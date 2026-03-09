import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title?: string;
  description?: string;
  canonicalPath?: string;
  ogImage?: string;
  ogType?: 'website' | 'article';
  noIndex?: boolean;
}

const SITE_NAME = 'PulseMap';
const DEFAULT_DESCRIPTION =
  'Real-time global conflict and security events map. Breaking news, military movements, and strategic assets compiled from multiple sources.';
const BASE_URL =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_APP_URL) ||
  'https://pulsemap.io';

export default function SEOHead({
  title,
  description = DEFAULT_DESCRIPTION,
  canonicalPath = '',
  ogImage = '/og-image.png',
  ogType = 'website',
  noIndex = false,
}: SEOHeadProps) {
  const fullTitle = title
    ? `${title} — ${SITE_NAME}`
    : `${SITE_NAME} — Real-Time Global Conflict Map`;
  const canonicalUrl = `${BASE_URL}${canonicalPath}`;

  return (
    <Helmet>
      {/* Basic */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph */}
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={`${BASE_URL}${ogImage}`} />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={`${BASE_URL}${ogImage}`} />

      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: SITE_NAME,
          description,
          url: BASE_URL,
          applicationCategory: 'NewsApplication',
          operatingSystem: 'Web',
        })}
      </script>
    </Helmet>
  );
}
