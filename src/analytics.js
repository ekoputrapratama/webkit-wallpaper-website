const GA_ID = import.meta.env.VITE_GOOGLE_ANALYTICS_ID || "";

export function isAnalyticsEnabled() {
  return Boolean(GA_ID);
}

export function initAnalytics() {
  if (!GA_ID || typeof window === "undefined" || window.gtag) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);

  window.gtag("js", new Date());
  window.gtag("config", GA_ID, { send_page_view: false });
}

export function trackPageView(path) {
  if (!GA_ID || typeof window.gtag !== "function") return;
  window.gtag("config", GA_ID, { page_path: path });
}

export function trackEvent(name, params = {}) {
  if (!GA_ID || typeof window.gtag !== "function") return;
  window.gtag("event", name, params);
}