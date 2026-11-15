// En-têtes de sécurité ajoutés par le middleware à toutes les réponses
// (pages, fichiers et API). Ils doublent console/public/_headers, qui ne
// s'applique pas aux réponses produites par les Functions.

export const CSP = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com",
  "img-src 'self'",
  "connect-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
].join("; ");

export function avecEntetes(reponse, chemin) {
  const r = new Response(reponse.body, reponse);
  const h = r.headers;
  h.set("Content-Security-Policy", CSP);
  h.set("X-Frame-Options", "DENY");
  h.set("Referrer-Policy", "no-referrer");
  h.set("X-Content-Type-Options", "nosniff");
  h.set("Cross-Origin-Opener-Policy", "same-origin");
  h.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  h.set("Strict-Transport-Security", "max-age=31536000");
  if (chemin.startsWith("/api/") || r.status >= 400) h.set("Cache-Control", "no-store");
  return r;
}

export function refus() {
  return avecEntetes(new Response("Accès refusé.", {
    status: 403,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  }), "/api/");
}
