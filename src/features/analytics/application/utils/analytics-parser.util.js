/**
 * Privacy-friendly User-Agent and Referrer Parser.
 * Categorizes device category, browser, OS, traffic sources, and filters bots.
 * Does not collect or log full IP addresses.
 */

export function isBot(userAgent = "") {
  if (!userAgent || typeof userAgent !== "string") {
    return false;
  }

  const botRegex =
    /\b(bot|crawler|spider|crawling|googlebot|bingbot|yandex|baidu|duckduckbot|slurp|facebookexternalhit|whatsapp|headlesschrome|phantomjs|lighthouse|ptst|screaming frog|curl|wget|python|postman|insomnia)\b/i;

  return botRegex.test(userAgent);
}

export function parseDeviceCategory(userAgent = "") {
  if (!userAgent || typeof userAgent !== "string") {
    return "desktop";
  }

  const ua = userAgent.toLowerCase();

  if (
    ua.includes("ipad") ||
    ua.includes("tablet") ||
    (ua.includes("android") && !ua.includes("mobile"))
  ) {
    return "tablet";
  }

  if (
    ua.includes("mobile") ||
    ua.includes("iphone") ||
    ua.includes("ipod") ||
    ua.includes("blackberry") ||
    ua.includes("windows phone") ||
    (ua.includes("android") && ua.includes("mobile"))
  ) {
    return "mobile";
  }

  return "desktop";
}

export function parseBrowser(userAgent = "") {
  if (!userAgent || typeof userAgent !== "string") {
    return "Other";
  }

  const ua = userAgent;

  if (/edg([ea]|ios)?\/([\d.]+)/i.test(ua)) return "Edge";
  if (/(opr|opera)\/([\d.]+)/i.test(ua)) return "Opera";
  if (/(chrome|crios)\/([\d.]+)/i.test(ua)) return "Chrome";
  if (/firefox|fxios/i.test(ua)) return "Firefox";
  if (/version\/([\d.]+).*safari/i.test(ua)) return "Safari";
  if (/trident\/7\.0/i.test(ua)) return "IE";

  return "Other";
}

export function parseOperatingSystem(userAgent = "") {
  if (!userAgent || typeof userAgent !== "string") {
    return "Other";
  }

  const ua = userAgent.toLowerCase();

  if (ua.includes("win")) return "Windows";
  if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ipod"))
    return "iOS";
  if (ua.includes("mac")) return "macOS";
  if (ua.includes("android")) return "Android";
  if (ua.includes("linux")) return "Linux";

  return "Other";
}

export function parseReferrerSource(referrer = "", currentHost = "") {
  if (!referrer || typeof referrer !== "string" || !referrer.trim()) {
    return "Direct";
  }

  try {
    const url = new URL(referrer);
    const host = url.hostname.toLowerCase();

    // If referrer host is identical to current host, count as internal/direct
    if (currentHost && (host === currentHost.toLowerCase() || host.endsWith("." + currentHost.toLowerCase()))) {
      return "Direct";
    }

    if (host.includes("google.")) return "Google";
    if (host.includes("bing.com")) return "Bing";
    if (host.includes("yahoo.com")) return "Yahoo";
    if (host.includes("duckduckgo.com")) return "DuckDuckGo";
    if (host.includes("t.co") || host.includes("twitter.com") || host.includes("x.com"))
      return "Twitter / X";
    if (host.includes("linkedin.com") || host.includes("lnkd.in")) return "LinkedIn";
    if (host.includes("facebook.com") || host.includes("fb.me")) return "Facebook";
    if (host.includes("instagram.com")) return "Instagram";
    if (host.includes("youtube.com") || host.includes("youtu.be")) return "YouTube";
    if (host.includes("reddit.com")) return "Reddit";
    if (host.includes("github.com")) return "GitHub";

    // Clean leading www.
    return host.replace(/^www\./, "");
  } catch {
    return "Referral";
  }
}

