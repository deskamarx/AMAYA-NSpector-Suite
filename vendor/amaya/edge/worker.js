const ORIGIN = "https://abraar05.github.io";

const COMMON = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Content-Security-Policy": "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; worker-src 'self'; object-src 'none'; frame-src 'none'; manifest-src 'self'; media-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; upgrade-insecure-requests"
};

const BY_PATH = [
  {
    test: (p) => p === "/verify.html",
    headers: {
      "Cache-Control": "public, max-age=0, must-revalidate",
      "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'none'; object-src 'none'; frame-src 'none'; frame-ancestors 'none'"
    }
  },
  {
    test: (p) => p === "/amaya-glass-demo.html",
    headers: {
      "Content-Security-Policy": "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; worker-src 'self'; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
    }
  },
  {
    test: (p) => p === "/sw.js",
    headers: { "Cache-Control": "public, max-age=0, must-revalidate", "Service-Worker-Allowed": "/" }
  },
  {
    test: (p) => p === "/index.html" || p === "/",
    headers: { "Cache-Control": "public, max-age=0, must-revalidate" }
  },
  {
    test: (p) => p.startsWith("/data/") || p.startsWith("/update/"),
    headers: { "Cache-Control": "public, max-age=0, must-revalidate", "X-Robots-Tag": "noindex, nofollow" }
  },
  {
    test: (p) => p.startsWith("/verification/"),
    headers: { "Cache-Control": "public, max-age=0, must-revalidate", "X-Robots-Tag": "noindex, nofollow" }
  },
  {
    test: (p) => p.startsWith("/assets/") && /-[A-Za-z0-9_]{8,}\./.test(p),
    headers: { "Cache-Control": "public, max-age=31536000, immutable" }
  }
];

export default {
  async fetch(request) {
    const url = new URL(request.url);
    let upstream;
    try {
      upstream = new URL(url.pathname + url.search, ORIGIN);
    } catch {
      return new Response("Bad request", { status: 400 });
    }
    const res = await fetch(upstream, request);
    const headers = new Headers(res.headers);
    for (const [name, value] of Object.entries(COMMON)) headers.set(name, value);
    for (const rule of BY_PATH) {
      if (rule.test(url.pathname)) {
        for (const [name, value] of Object.entries(rule.headers)) headers.set(name, value);
      }
    }
    headers.delete("Access-Control-Allow-Origin");
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
  }
};
