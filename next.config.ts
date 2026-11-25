import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : "*.supabase.co";

// Crawlers that read the plain HTML get the page's head tags in the first response instead of
// streamed later: Next's own list, plus Google and the AI crawlers (most run no JavaScript).
const NEXT_BOTS = String.raw`[\w-]+-Google|Google-[\w-]+|Chrome-Lighthouse|Slurp|DuckDuckBot|baiduspider|yandex|sogou|bitlybot|tumblr|vkShare|quora link preview|redditbot|ia_archiver|Bingbot|BingPreview|applebot|facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview|Yeti|googleweblight`;
const MORE_BOTS = "Googlebot|GPTBot|OAI-SearchBot|ChatGPT-User|ClaudeBot|Claude-User|Claude-SearchBot|anthropic-ai|PerplexityBot|Perplexity-User|CCBot|Bytespider|Amazonbot|meta-externalagent|meta-externalfetcher|MistralAI-User|cohere-ai|DuckAssistBot|YouBot|TelegramBot|Pinterestbot|Qwantify|Bravebot|PetalBot|SeznamBot";

const DEMO_PHOTOS = ["photo-1623852990731-472e0d1b047f", "photo-1635711517978-3b0ff0a53550", "photo-1488345979593-09db0f85545f", "photo-1702308954905-341065817003", "photo-1579751626657-72bc17010498", "photo-1778209031600-7d29fbe649a9", "photo-1506377247377-2a5b3b417ebb", "photo-1607301405418-780ee5e6dd10", "photo-1552196563-55cd4e45efb3", "photo-1684443726764-6a236cb33ccb", "photo-1612966874574-e0a92ad2bc43", "photo-1470229722913-7c0e2dbbafd3", "photo-1641799540167-44c4865934e9", "photo-1549638441-b787d2e11f14", "photo-1757834787931-ddd70f3379a5", "photo-1496889196885-5ddcec5eef4d", "photo-1470337458703-46ad1756a187", "photo-1623334044303-241021148842", "photo-1632946269126-0f8edbe8b068", "photo-1633118325558-c817f0259943"];

// Inline scripts stay allowed (pages are cached, so no nonce per request); scripts from elsewhere only
// from the services in use. What may embed or replace our pages is closed.
const CSP = [
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""} 'wasm-unsafe-eval' https://js.stripe.com https://*.js.stripe.com https://challenges.cloudflare.com https://www.googletagmanager.com https://*.googletagmanager.com https://connect.facebook.net https://vercel.live`,
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'self'",
  "form-action 'self' https:",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), usb=(), browsing-topics=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
];

const nextConfig: NextConfig = {
  // Cache Components (Next 16 default): the shop pages are cached per tenant with `use cache` +
  // `cacheTag`, everything that reads the session streams in behind <Suspense>.
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: SECURITY_HEADERS },
      // Addresses that are secrets never travel on as referrer.
      { source: "/:area(v|my|order|alert)/:rest*", headers: [{ key: "Referrer-Policy", value: "no-referrer" }] },
    ];
  },
  cacheComponents: true,
  partialPrefetching: true,
  htmlLimitedBots: new RegExp(`${NEXT_BOTS}|${MORE_BOTS}`),
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // A second `next dev` in the same folder (e2e on another port) needs its own build directory.
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  images: {
    remotePatterns: [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }, ...DEMO_PHOTOS.map((p) => ({ protocol: "https" as const, hostname: "images.unsplash.com", pathname: `/${p}` }))],
    // Uploads get a fresh file name on every change, so optimized copies can be kept for long.
    minimumCacheTTL: 2_678_400,
  },
};

export default nextConfig;
