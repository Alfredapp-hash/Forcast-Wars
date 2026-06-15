export function initSentry() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  if (typeof window !== "undefined") {
    window.addEventListener("error", (event) => {
      console.error("[sentry]", event.error?.message ?? event.message);
    });
    window.addEventListener("unhandledrejection", (event) => {
      console.error("[sentry]", event.reason);
    });
  }
}
