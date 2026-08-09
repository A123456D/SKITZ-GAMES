/**
 * Cloudflare Pages Function — only runs when no static file matched.
 * Return real 404s for asset-like paths so SPA/index.html (200) cannot
 * poison browser / service-worker caches as fake images/audio.
 */
const ASSET_PATH =
  /\.(png|jpe?g|gif|webp|avif|svg|ico|bmp|mp3|ogg|wav|webm|mp4|m4a|flac|woff2?|ttf|otf|eot|map)$/i;

const ASSET_DIR = /\/(assets|sfx|music|audio|playlist|icons|images|fx|themes|ui|cards)\//i;

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const path = url.pathname;

  if (ASSET_PATH.test(path) || ASSET_DIR.test(path)) {
    return new Response("Not Found", {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  return context.next();
}
