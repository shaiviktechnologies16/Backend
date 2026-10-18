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

export function parseUtmParameters(pagePath = "") {
  const result = {
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    utm_term: null,
    utm_content: null,
    gclid: null,
    fbclid: null,
  };

  if (!pagePath || typeof pagePath !== "string" || !pagePath.includes("?")) {
    return result;
  }

  try {
    const dummyUrl = new URL(pagePath, "https://internal.shaivik.ai");
    const params = dummyUrl.searchParams;

    if (params.get("utm_source")) result.utm_source = params.get("utm_source").slice(0, 128);
    if (params.get("utm_medium")) result.utm_medium = params.get("utm_medium").slice(0, 128);
    if (params.get("utm_campaign")) result.utm_campaign = params.get("utm_campaign").slice(0, 128);
    if (params.get("utm_term")) result.utm_term = params.get("utm_term").slice(0, 128);
    if (params.get("utm_content")) result.utm_content = params.get("utm_content").slice(0, 128);
    if (params.get("gclid")) result.gclid = params.get("gclid").slice(0, 128);
    if (params.get("fbclid")) result.fbclid = params.get("fbclid").slice(0, 128);
  } catch {
    // Ignore URL parse error
  }

  return result;
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

export function classifyAcquisitionChannel({ referrer = "", pagePath = "", utmParams = null }) {
  const utm = utmParams || parseUtmParameters(pagePath);
  const medium = (utm.utm_medium || "").toLowerCase().trim();

  // Paid Search detection
  if (
    utm.gclid ||
    ["cpc", "ppc", "paid", "paidsearch", "ad", "paid-search"].includes(medium)
  ) {
    return "Paid Search";
  }

  // Social detection
  if (
    ["social", "paid-social", "social-network", "sm"].includes(medium) ||
    utm.fbclid
  ) {
    return "Social";
  }

  // Email detection
  if (["email", "newsletter", "edm"].includes(medium)) {
    return "Email";
  }

  // Check referrer domain
  const source = parseReferrerSource(referrer);

  if (["Google", "Bing", "Yahoo", "DuckDuckGo"].includes(source)) {
    return "Organic Search";
  }

  if (["Twitter / X", "LinkedIn", "Facebook", "Instagram", "YouTube", "Reddit"].includes(source)) {
    return "Social";
  }

  if (source === "Direct") {
    if (utm.utm_source) {
      return utm.utm_source;
    }
    return "Direct";
  }

  return "Referral";
}

