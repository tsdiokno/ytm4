/**
 * Universal YouTube & YouTube Music URL parser and metadata extractor
 */

export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const cleanUrl = url.trim();

  // Handle direct 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(cleanUrl)) {
    return cleanUrl;
  }

  // Handle standard youtube.com/watch?v=ID or music.youtube.com/watch?v=ID
  const watchMatch = cleanUrl.match(/(?:https?:\/\/)?(?:www\.|music\.)?youtube\.com\/watch\?(?:.*&)?v=([a-zA-Z0-9_-]{11})/i);
  if (watchMatch && watchMatch[1]) {
    return watchMatch[1];
  }

  // Handle short URLs youtu.be/ID
  const shortMatch = cleanUrl.match(/(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})/i);
  if (shortMatch && shortMatch[1]) {
    return shortMatch[1];
  }

  // Handle embed URLs youtube.com/embed/ID
  const embedMatch = cleanUrl.match(/(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/i);
  if (embedMatch && embedMatch[1]) {
    return embedMatch[1];
  }

  // Handle shorts youtube.com/shorts/ID
  const shortsMatch = cleanUrl.match(/(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/i);
  if (shortsMatch && shortsMatch[1]) {
    return shortsMatch[1];
  }

  // Handle live streams youtube.com/live/ID
  const liveMatch = cleanUrl.match(/(?:https?:\/\/)?(?:www\.)?youtube\.com\/live\/([a-zA-Z0-9_-]{11})/i);
  if (liveMatch && liveMatch[1]) {
    return liveMatch[1];
  }

  return null;
}

export function getYouTubeThumbnail(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

export async function fetchYouTubeMetadata(videoId: string, originalUrl?: string): Promise<{
  title: string;
  author: string;
  thumbnail: string;
}> {
  const targetUrl = originalUrl || `https://www.youtube.com/watch?v=${videoId}`;

  try {
    const res = await fetch(`/api/oembed?url=${encodeURIComponent(targetUrl)}`);
    if (res.ok) {
      const data = await res.json();
      return {
        title: data.title || 'YouTube Track',
        author: data.author_name || 'YouTube Creator',
        thumbnail: data.thumbnail_url || getYouTubeThumbnail(videoId),
      };
    }
  } catch {
    // fallback
  }

  return {
    title: `YouTube Video (${videoId})`,
    author: 'YouTube Audio',
    thumbnail: getYouTubeThumbnail(videoId),
  };
}
