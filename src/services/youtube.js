const titleCache = new Map();

/**
 * Extract YouTube Video ID from any standard YouTube / YouTube Music URL or share link.
 * Handles youtube.com, music.youtube.com, youtu.be, shorts, embeds, live, and any query parameter order.
 */
export function extractVideoId(input) {
  if (!input || typeof input !== 'string') return null;
  const raw = input.trim();

  // 1. Try URL parser first (handles query parameter order e.g. ?si=...&v=... or ?v=...)
  try {
    const urlStr = raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`;
    const urlObj = new URL(urlStr);
    const host = urlObj.hostname.toLowerCase().replace(/^www\./, '');

    // youtu.be/VIDEO_ID
    if (host === 'youtu.be') {
      const id = urlObj.pathname.slice(1).split('/')[0].split('?')[0];
      if (/^[\w-]{11}$/.test(id)) return id;
    }

    // youtube.com, music.youtube.com, m.youtube.com
    if (host === 'youtube.com' || host === 'music.youtube.com' || host === 'm.youtube.com') {
      // ?v=VIDEO_ID
      const v = urlObj.searchParams.get('v');
      if (v && /^[\w-]{11}$/.test(v)) return v;

      // /shorts/VIDEO_ID, /embed/VIDEO_ID, /live/VIDEO_ID, /v/VIDEO_ID
      const paths = urlObj.pathname.split('/').filter(Boolean);
      if (['shorts', 'embed', 'live', 'v'].includes(paths[0]) && paths[1]) {
        const id = paths[1].split('?')[0];
        if (/^[\w-]{11}$/.test(id)) return id;
      }
    }
  } catch {
    // If URL constructor fails, fall back to regex
  }

  // 2. Fallback regex patterns
  const patterns = [
    /[?&]v=([\w-]{11})(?:[^\w-]|$)/,
    /(?:youtu\.be\/|shorts\/|embed\/|live\/|v\/)([\w-]{11})(?:[^\w-]|$)/,
    /^([\w-]{11})$/,
  ];

  for (const pattern of patterns) {
    const match = raw.match(pattern);
    if (match && match[1] && match[1].length === 11) {
      return match[1];
    }
  }

  return null;
}

/**
 * Fetch video titles using YouTube Data API with batching, or fallback to oEmbed.
 */
export async function fetchVideoTitles(videoIds, apiKey = null) {
  if (!Array.isArray(videoIds) || videoIds.length === 0) {
    return titleCache;
  }

  const uncachedIds = videoIds.filter(id => !titleCache.has(id));
  if (uncachedIds.length === 0) {
    return titleCache;
  }

  // 1. If API key is available, use YouTube Data API (up to 50 items per batch)
  if (apiKey && apiKey !== 'YOUR_API_KEY') {
    try {
      const batchSize = 50;
      for (let i = 0; i < uncachedIds.length; i += batchSize) {
        const batch = uncachedIds.slice(i, i + batchSize);
        const response = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${batch.join(',')}&key=${apiKey}`
        );
        if (response.ok) {
          const data = await response.json();
          if (data.items) {
            data.items.forEach(item => {
              titleCache.set(item.id, item.snippet.title);
            });
          }
        }
      }
    } catch (err) {
      console.warn('YouTube Data API fetch failed:', err);
    }
  }

  // 2. For any remaining uncached items, attempt public oEmbed fallback
  const stillUncached = uncachedIds.filter(id => !titleCache.has(id));
  if (stillUncached.length > 0) {
    await Promise.all(
      stillUncached.map(async (id) => {
        try {
          const oembedUrl = `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${id}`;
          const res = await fetch(oembedUrl);
          if (res.ok) {
            const data = await res.json();
            if (data.title && !data.error) {
              titleCache.set(id, data.title);
              return;
            }
          }
        } catch {
          // Ignore oEmbed network failures
        }
      })
    );
  }

  return titleCache;
}
