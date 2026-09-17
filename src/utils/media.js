/**
 * Pull the 11-char video id out of a YouTube URL. Returns null if the
 * URL doesn't look like a YouTube link. We accept the four common forms:
 *
 *   https://www.youtube.com/watch?v=<id>
 *   https://youtu.be/<id>
 *   https://www.youtube.com/embed/<id>
 *   https://www.youtube.com/shorts/<id>
 *
 * The same helper is used both in the editor (for live preview) and the
 * runtime renderer (to decide whether to embed an iframe).
 */
export function extractYouTubeId(url) {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?(?:[^#]*&)?v=)([\w-]{11})/,
    /youtu\.be\/([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
  ];
  for (const rx of patterns) {
    const m = String(url).match(rx);
    if (m) return m[1];
  }
  return null;
}

/**
 * True if the URL appears to be served from our own /uploads/ path —
 * i.e. it came through /api/upload rather than being pasted in by the user.
 * Used by MediaField to default to the right tab on open.
 */
export function isUploadedUrl(url) {
  if (!url) return false;
  return /\/uploads\//.test(String(url));
}
