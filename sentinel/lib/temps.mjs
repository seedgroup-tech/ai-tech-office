// Dates de Sentinel : ISO avec décalage de Douala (UTC+1, pas d'heure d'été).

const DECALAGE_MS = 3600 * 1000;

// 2026-11-15T17:58:00Z -> "2026-11-15T18:58:00+01:00"
export function isoDouala(date) {
  const d = new Date(date.getTime() + DECALAGE_MS);
  return d.toISOString().slice(0, 19) + "+01:00";
}

// Jour du compteur : date de Douala, AAAA-MM-JJ.
export function jourDouala(date) {
  return isoDouala(date).slice(0, 10);
}

// Date ISO -> millisecondes ; NaN si illisible.
export function enMs(iso) {
  return typeof iso === "string" ? Date.parse(iso) : NaN;
}
