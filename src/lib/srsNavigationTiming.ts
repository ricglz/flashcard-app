const SRS_NAV_START_KEY = "srs-nav-start";

export const SRS_NAV_SLOW_THRESHOLD_MS = 1500;

export function markSrsNavigationStart() {
  window.sessionStorage.setItem(SRS_NAV_START_KEY, String(performance.now()));
}

export function consumeSrsNavigationStart() {
  const rawStart = window.sessionStorage.getItem(SRS_NAV_START_KEY);
  if (rawStart === null) return null;
  window.sessionStorage.removeItem(SRS_NAV_START_KEY);

  const start = Number(rawStart);
  return Number.isFinite(start) ? start : null;
}
