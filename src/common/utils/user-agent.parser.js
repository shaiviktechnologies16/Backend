export function parseUserAgent(userAgent) {
  if (!userAgent) {
    return {
      browser: "Unknown",
      device: "Unknown",
      os: "Unknown",
    };
  }

  return {
    browser: detectBrowser(userAgent),
    device: detectDevice(userAgent),
    os: detectOS(userAgent),
  };
}
