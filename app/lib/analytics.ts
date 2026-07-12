// Thin wrapper over the GA4 gtag queue. Safe everywhere: no-ops during SSR,
// in tests, and when the tag is blocked by an ad blocker.
export function track(event: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const gtag = (window as { gtag?: (...args: unknown[]) => void }).gtag;
  if (typeof gtag === "function") gtag("event", event, params);
}
