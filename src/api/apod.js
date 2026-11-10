/*
 * NASA APOD Data Layer: science.nasa.gov WordPress REST Adapter
 * ---------------------------------------------------------------------------
 * Queries NASA's keyless `apod-basic/{YYMMDD}` endpoint with a two-tier
 * (Map + sessionStorage) cache, in-flight request deduplication, calibrated
 * CDN image sizing, and async image preloading for zero-latency navigation.
 */

const APOD_API_BASE = 'https://science.nasa.gov/wp-json/wp/v2/apod-basic';
const PLACEHOLDER_THUMB_FRAGMENT = 'news-thumbnail.png';
const DYNAMIC_IMAGE_HOST = 'assets.science.nasa.gov/dynamicimage/';
const SESSION_CACHE_KEY = 'nasa-apod-cache-v1';

const memoryCache = new Map();
const inFlightRequests = new Map();
const preloadedImageUrls = new Set();

function hydrateCacheFromSession() {
  if (typeof window === 'undefined') return;
  try {
    const raw = sessionStorage.getItem(SESSION_CACHE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      for (const [slug, value] of Object.entries(parsed)) {
        memoryCache.set(slug, value);
      }
    }
  } catch {
    // Ignore storage access or quota errors in restricted browsing contexts.
  }
}

let persistTimeoutId = null;

function scheduleSessionCachePersist() {
  if (typeof window === 'undefined' || persistTimeoutId !== null) return;
  persistTimeoutId = window.setTimeout(() => {
    persistTimeoutId = null;
    try {
      const serialized = Object.fromEntries(memoryCache.entries());
      sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(serialized));
    } catch {
      // Ignore quota exceeded errors; in-memory Map remains authoritative.
    }
  }, 250);
}

hydrateCacheFromSession();

export function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

// WHY: NASA's `apod-basic` endpoint ignores `?date=YYYY-MM-DD` and requires a
// 6-digit `YYMMDD` path slug; e.g., (1995, 7, 16) -> "950716".
export function formatApodSlug(year, month, day) {
  const yy = String(year).slice(-2);
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${yy}${mm}${dd}`;
}

export function getValidApodYears(month, day, now = new Date()) {
  const m = Number(month);
  const d = Number(day);
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentDay = now.getDate();

  const hasOccurredThisYear =
    m < currentMonth || (m === currentMonth && d <= currentDay);
  const latestYear = hasOccurredThisYear ? currentYear : currentYear - 1;

  // APOD launched on June 16, 1995, skipped June 17–19, and ran daily from
  // June 20, 1995 onward.
  const launchedIn1995 =
    m > 6 || (m === 6 && (d === 16 || d >= 20));
  const startYear = launchedIn1995 ? 1995 : 1996;

  const years = [];
  for (let year = latestYear; year >= startYear; year -= 1) {
    if (m === 2 && d === 29 && !isLeapYear(year)) {
      continue;
    }
    years.push(year);
  }

  return years;
}

function decodeHtmlEntities(text) {
  return text
    .replace(/&nbsp;|\u00a0/g, ' ')
    .replace(/&#0*39;|&apos;/g, "'")
    .replace(/&#8211;|&ndash;/g, '–')
    .replace(/&#8212;|&mdash;/g, '—')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

export function sanitizeExplanation(rawHtml = '') {
  // WHY: NASA's raw `explanation` markup prefixes prose with an inline
  // "Explanation:" header and appends a "Tomorrow's picture:" footer containing
  // broken relative links to the legacy `apod.nasa.gov` server.
  const withoutFooter = rawHtml
    .replace(
      /<br\s*\/?>\s*(?:<br\s*\/?>\s*)?<(?:strong|b)>\s*Tomorrow['’]s picture:[\s\S]*$/i,
      ''
    )
    .replace(/^[\s\S]*?<(?:strong|b)>\s*Explanation:\s*<\/(?:strong|b)>\s*/i, '');

  const plain = decodeHtmlEntities(
    withoutFooter
      .replace(/<(?:br|p)\b[^>]*>/gi, ' ')
      .replace(/<[^>]+>/g, '')
  );

  return plain
    .replace(/\s+([.,!?;:])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

export function sanitizeCredit(rawCredit = '') {
  const plain = decodeHtmlEntities(
    rawCredit
      .replace(/<(?:br|p)\b[^>]*>/gi, ' / ')
      .replace(/<[^>]+>/g, '')
      .replace(/^(?:Image\s+Credit(?:\s*&\s*Copyright)?\s*:?\s*)/i, '')
  );

  return plain.replace(/\s+/g, ' ').trim();
}

function normalizeProtocolUrl(url) {
  if (!url) return null;
  const trimmed = url.trim().replace(/&#0*38;|&amp;/g, '&');
  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }
  return trimmed;
}

// WHY: NASA's `dynamicimage` CDN often defaults to `?w=5252` or `?w=7200`
// (~1–3 MB per image). Requesting `?w=1800&fit=clip` for the primary stage and
// `?w=640&fit=clip` (~40 KB) for Contact Sheet cards cuts transfer and decode
// latency by 90–96% without sacrificing Retina crispness.
export function buildSizedImageUrl(url, targetWidth) {
  if (!url || !url.includes(DYNAMIC_IMAGE_HOST)) {
    return url;
  }

  const basePath = url.split('?')[0];
  if (basePath.toLowerCase().endsWith('.gif')) {
    return url;
  }

  const widthMatch = url.match(/[?&]w=(\d+)/);
  const declaredWidth = widthMatch ? Number(widthMatch[1]) : 0;

  if (declaredWidth > 0 && declaredWidth <= targetWidth) {
    return url;
  }

  return `${basePath}?w=${targetWidth}&fit=clip`;
}

function extractYouTubeThumbnail(embedUrl) {
  if (!embedUrl) return null;
  const match = embedUrl.match(
    /(?:youtube(?:-nocookie)?\.com\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/i
  );
  return match ? `https://i.ytimg.com/vi/${match[1]}/hqdefault.jpg` : null;
}

async function resolveVimeoThumbnail(embedUrl) {
  if (!embedUrl || !embedUrl.includes('vimeo.com')) return null;
  try {
    const cleanVimeoUrl = embedUrl.split('?')[0];
    const oembedUrl = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(
      cleanVimeoUrl
    )}`;
    const res = await fetch(oembedUrl);
    if (!res.ok) return null;
    const data = await res.json();
    return data.thumbnail_url || null;
  } catch {
    return null;
  }
}

export function normalizeApodRecord(raw, requestedYear) {
  if (!raw || typeof raw !== 'object') return null;

  // WHY: Pre-2015 entries and video posts in NASA's WordPress migration often
  // set top-level `hdurl` to a generic `news-thumbnail.png` graphic while
  // embedding the real `<img>`, `<source>`, or `<iframe>` URL in `basic_html`.
  const basicHtml = raw.basic_html || '';
  const htmlImgMatch = basicHtml.match(/<img[^>]+src=["']([^"']+)["']/i);
  const htmlFullLinkMatch = basicHtml.match(
    /<a[^>]+href=["']([^"']+\.(?:jpg|jpeg|png|gif|webp))["'][^>]*>\s*<img/i
  );
  const htmlVideoSourceMatch = basicHtml.match(
    /<source[^>]+src=["']([^"']+)["']/i
  );
  const htmlIframeMatch = basicHtml.match(
    /<iframe[^>]+src=["']([^"']+)["']/i
  );

  const rawHdUrl = normalizeProtocolUrl(raw.hdurl);
  const hasValidHdUrl =
    Boolean(rawHdUrl) && !rawHdUrl.includes(PLACEHOLDER_THUMB_FRAGMENT);

  const htmlImgUrl = normalizeProtocolUrl(htmlImgMatch?.[1]);
  const htmlFullImgUrl = normalizeProtocolUrl(htmlFullLinkMatch?.[1]);
  const videoUrl = normalizeProtocolUrl(htmlVideoSourceMatch?.[1]);
  const iframeUrl = normalizeProtocolUrl(htmlIframeMatch?.[1]);

  let mediaType = 'image';
  if (videoUrl) {
    mediaType = 'video';
  } else if (iframeUrl || raw.media_type === 'iframe') {
    mediaType = 'iframe';
  } else if (raw.media_type === 'video' && !htmlImgUrl && !hasValidHdUrl) {
    mediaType = 'video';
  }

  const validImageUrl = hasValidHdUrl ? rawHdUrl : htmlImgUrl || null;
  const ytThumbUrl = extractYouTubeThumbnail(iframeUrl);
  const rawPosterUrl = validImageUrl || ytThumbUrl || null;

  const stageImageUrl = buildSizedImageUrl(
    mediaType === 'image' ? validImageUrl : rawPosterUrl,
    1800
  );
  const thumbUrl = buildSizedImageUrl(rawPosterUrl, 640);
  const posterUrl = buildSizedImageUrl(rawPosterUrl, 1600);
  const hdImageUrl = htmlFullImgUrl || validImageUrl;

  const dateStr = raw.date || `${requestedYear}`;
  const year = Number(String(dateStr).slice(0, 4)) || requestedYear;

  return {
    date: dateStr,
    year,
    title: decodeHtmlEntities(
      raw.title || 'Untitled Cosmic Observation'
    ).trim(),
    mediaType,
    imageUrl: stageImageUrl,
    thumbUrl,
    hdImageUrl,
    videoUrl,
    iframeUrl,
    posterUrl,
    explanation: sanitizeExplanation(raw.explanation),
    credit: sanitizeCredit(raw.credit || raw.copyright || ''),
    alt: decodeHtmlEntities(
      raw.alt || raw.title || 'NASA Astronomy Picture of the Day'
    ).trim(),
    permalink: raw.permalink || raw.url || null,
  };
}

export function getCachedApodByDate(year, month, day) {
  const slug = formatApodSlug(year, month, day);
  return memoryCache.get(slug);
}

export function preloadApodImage(url) {
  if (typeof window === 'undefined' || !url || preloadedImageUrls.has(url)) {
    return;
  }
  preloadedImageUrls.add(url);
  const img = new window.Image();
  img.decoding = 'async';
  img.src = url;
}

export async function fetchApodByDate(year, month, day) {
  const slug = formatApodSlug(year, month, day);

  if (memoryCache.has(slug)) {
    const cached = memoryCache.get(slug);
    return cached === 'unavailable' ? null : cached;
  }

  if (inFlightRequests.has(slug)) {
    return inFlightRequests.get(slug);
  }

  const requestPromise = (async () => {
    try {
      const response = await fetch(`${APOD_API_BASE}/${slug}`);

      if (response.status === 404) {
        memoryCache.set(slug, 'unavailable');
        scheduleSessionCachePersist();
        return null;
      }

      if (!response.ok) {
        throw new Error(
          `NASA APOD request failed for ${slug} (HTTP ${response.status})`
        );
      }

      const data = await response.json();
      const record = normalizeApodRecord(data, year);

      if (
        record &&
        record.mediaType === 'iframe' &&
        !record.posterUrl &&
        record.iframeUrl?.includes('vimeo.com')
      ) {
        const vimeoThumb = await resolveVimeoThumbnail(record.iframeUrl);
        if (vimeoThumb) {
          record.posterUrl = vimeoThumb;
          record.imageUrl = vimeoThumb;
          record.thumbUrl = vimeoThumb;
        }
      }

      memoryCache.set(slug, record || 'unavailable');
      scheduleSessionCachePersist();
      return record;
    } finally {
      inFlightRequests.delete(slug);
    }
  })();

  inFlightRequests.set(slug, requestPromise);
  return requestPromise;
}
