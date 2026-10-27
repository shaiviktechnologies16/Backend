import dns from "node:dns/promises";
import net from "node:net";

const MAX_REDIRECTS = 5;
const REQUEST_TIMEOUT_MS = 10000;
const MAX_CONTENT_LENGTH_BYTES = 1024 * 1024; // 1 MB
const MAX_EXTRACTED_TEXT_LENGTH = 4000; // Concise length for LLM context

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "loopback",
  "0.0.0.0",
  "metadata.google.internal",
  "metadata.google",
  "169.254.169.254",
  "instance-data",
  "metadata",
]);

const ALLOWED_CONTENT_TYPES = [
  "text/html",
  "text/plain",
  "text/markdown",
  "application/xhtml+xml",
  "application/xml",
  "application/json",
];

export class WebsiteFetcherService {
  constructor(options = {}) {
    this.timeoutMs = options.timeoutMs || REQUEST_TIMEOUT_MS;
    this.maxRedirects = options.maxRedirects || MAX_REDIRECTS;
    this.maxBytes = options.maxBytes || MAX_CONTENT_LENGTH_BYTES;
    this.maxTextLength = options.maxTextLength || MAX_EXTRACTED_TEXT_LENGTH;
    this.userAgent =
      options.userAgent ||
      "ShaivikAI-Bot/1.0 (+https://shaiviktechnologies.in; Customer Support Assistant)";
  }

  /**
   * Determine if an IP address is private, loopback, link-local, or cloud metadata.
   */
  isPrivateOrRestrictedIp(ip) {
    if (!ip || typeof ip !== "string") {
      return true;
    }

    let normalized = ip.trim().toLowerCase();

    // Check for IPv4 mapped into IPv6 (e.g. ::ffff:127.0.0.1 or ::ffff:7f00:1)
    if (normalized.startsWith("::ffff:")) {
      const remainder = normalized.slice(7);
      if (net.isIPv4(remainder)) {
        normalized = remainder;
      }
    }

    const version = net.isIP(normalized);
    if (version === 0) {
      return true; // Not a valid IP
    }

    if (version === 4) {
      const octets = normalized.split(".").map(Number);
      if (octets.length !== 4 || octets.some(Number.isNaN)) {
        return true;
      }

      const [a, b] = octets;

      // 0.0.0.0/8 (Broadcast/source)
      if (a === 0) return true;
      // 127.0.0.0/8 (Loopback)
      if (a === 127) return true;
      // 10.0.0.0/8 (Private)
      if (a === 10) return true;
      // 172.16.0.0/12 (Private)
      if (a === 172 && b >= 16 && b <= 31) return true;
      // 192.168.0.0/16 (Private)
      if (a === 192 && b === 168) return true;
      // 169.254.0.0/16 (Link-local & AWS/GCP/Azure Metadata 169.254.169.254)
      if (a === 169 && b === 254) return true;
      // 100.64.0.0/10 (Carrier-Grade NAT)
      if (a === 100 && b >= 64 && b <= 127) return true;
      // 192.0.0.0/24 (IETF Protocol Assignments)
      if (a === 192 && b === 0 && octets[2] === 0) return true;
      // 198.18.0.0/15 (Benchmarking)
      if (a === 198 && (b === 18 || b === 19)) return true;
      // 224.0.0.0/4 (Multicast) & 240.0.0.0/4 (Reserved)
      if (a >= 224) return true;

      return false;
    }

    if (version === 6) {
      // Loopback ::1 or unspecified ::
      if (normalized === "::1" || normalized === "::") return true;
      // Unique Local Addresses (fc00::/7 -> fc or fd)
      if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
      // Link-local Unicast (fe80::/10 -> fe8, fe9, fea, feb)
      if (
        normalized.startsWith("fe8") ||
        normalized.startsWith("fe9") ||
        normalized.startsWith("fea") ||
        normalized.startsWith("feb")
      ) {
        return true;
      }
      // Multicast ff00::/8
      if (normalized.startsWith("ff")) return true;

      return false;
    }

    return true;
  }

  /**
   * Validate a target URL for SSRF prevention, protocol validity, and host safety.
   */
  async validateUrl(targetUrl) {
    if (!targetUrl || typeof targetUrl !== "string") {
      throw new Error("A valid URL is required.");
    }

    let parsed;
    try {
      parsed = new URL(targetUrl);
    } catch {
      throw new Error(`The provided URL "${targetUrl}" is not a valid URL.`);
    }

    // Protocol check: Only HTTP and HTTPS
    const protocol = parsed.protocol.toLowerCase();
    if (protocol !== "http:" && protocol !== "https:") {
      throw new Error(`Protocol "${protocol}" is not supported. Only HTTP and HTTPS are allowed.`);
    }

    // Disallow credentials in URL (e.g. http://user:pass@host)
    if (parsed.username || parsed.password) {
      throw new Error("URLs containing embedded authentication credentials are not permitted.");
    }

    const hostname = parsed.hostname.toLowerCase().trim();
    if (!hostname) {
      throw new Error("URL must contain a valid hostname.");
    }

    // Check restricted hostnames
    if (
      BLOCKED_HOSTNAMES.has(hostname) ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal")
    ) {
      throw new Error(`Access to restricted or private host "${hostname}" is blocked for security reasons.`);
    }

    // Check if hostname is directly an IP literal
    if (net.isIP(hostname)) {
      if (this.isPrivateOrRestrictedIp(hostname)) {
        throw new Error(`Access to private/local IP address "${hostname}" is blocked.`);
      }
      return parsed;
    }

    // DNS Resolution check: resolve all addresses and verify none are private
    let resolvedAddresses = [];
    try {
      resolvedAddresses = await dns.lookup(hostname, { all: true });
    } catch (dnsErr) {
      throw new Error(`Could not resolve hostname "${hostname}": ${dnsErr.message}`);
    }

    if (!resolvedAddresses || resolvedAddresses.length === 0) {
      throw new Error(`No IP addresses could be resolved for "${hostname}".`);
    }

    for (const record of resolvedAddresses) {
      if (this.isPrivateOrRestrictedIp(record.address)) {
        throw new Error(
          `Host "${hostname}" resolved to a private or restricted IP address (${record.address}). Access blocked.`
        );
      }
    }

    return parsed;
  }

  /**
   * Safely read response body with size limit to prevent memory exhaustion / zip bombs.
   */
  async readLimitedResponseBody(response) {
    if (!response.body) {
      return "";
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8", { fatal: false });
    const chunks = [];
    let bytesReceived = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        bytesReceived += value.byteLength;
        if (bytesReceived > this.maxBytes) {
          try {
            await reader.cancel();
          } catch (_) {}
          throw new Error(`Website response exceeded maximum allowed size of 1 MB.`);
        }

        chunks.push(value);
      }
    } finally {
      try {
        reader.releaseLock();
      } catch (_) {}
    }

    const totalBuffer = new Uint8Array(bytesReceived);
    let offset = 0;
    for (const chunk of chunks) {
      totalBuffer.set(chunk, offset);
      offset += chunk.length;
    }

    return decoder.decode(totalBuffer);
  }

  /**
   * Extract page title and clean readable text from HTML markup.
   */
  extractReadableContent(html, rawUrl) {
    if (!html || typeof html !== "string") {
      return { title: "", content: "" };
    }

    // 1. Extract <title>
    let title = "";
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      title = this.decodeHtmlEntities(titleMatch[1].trim());
    }

    // 2. Strip non-content blocks: script, style, noscript, svg, iframe, head
    let cleaned = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
      .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, " ")
      .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, " ")
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, " ")
      .replace(/<head\b[^<]*(?:(?!<\/head>)<[^<]*)*<\/head>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ");

    // 3. Convert structural/block elements to newlines
    cleaned = cleaned
      .replace(/<\/(p|div|section|article|header|footer|nav|main|h[1-6]|li|tr|table)>/gi, "\n")
      .replace(/<(br|hr)\s*\/?>/gi, "\n")
      .replace(/<li[^>]*>/gi, "• ");

    // 4. Strip all remaining HTML tags
    cleaned = cleaned.replace(/<[^>]+>/g, " ");

    // 5. Decode HTML entities
    cleaned = this.decodeHtmlEntities(cleaned);

    // 6. Normalize whitespace: collapse horizontal whitespace and excessive newlines
    cleaned = cleaned
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join("\n");

    cleaned = cleaned.replace(/\n{3,}/g, "\n\n").trim();

    // 7. Concise truncation with indicator
    let isTruncated = false;
    if (cleaned.length > this.maxTextLength) {
      cleaned = cleaned.slice(0, this.maxTextLength);
      // Clean cut at last line break or period if possible
      const lastBreak = Math.max(cleaned.lastIndexOf("\n"), cleaned.lastIndexOf(". "));
      if (lastBreak > this.maxTextLength * 0.7) {
        cleaned = cleaned.slice(0, lastBreak + 1);
      }
      isTruncated = true;
    }

    if (isTruncated) {
      cleaned += `\n\n[Note: Content truncated for brevity. Showing first ${cleaned.length} characters.]`;
    }

    if (!title) {
      title = `Website: ${rawUrl}`;
    }

    return { title, content: cleaned };
  }

  /**
   * Decode common HTML entities.
   */
  decodeHtmlEntities(str) {
    if (!str) return "";
    return str
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&apos;/gi, "'")
      .replace(/&#(\d+);/g, (_, dec) => {
        try {
          return String.fromCharCode(Number(dec));
        } catch {
          return "";
        }
      })
      .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
        try {
          return String.fromCharCode(parseInt(hex, 16));
        } catch {
          return "";
        }
      });
  }

  /**
   * Fetch a public website with manual redirect following, SSRF checks at every hop,
   * timeout handling, and clean text extraction.
   *
   * @param {string} url - Public URL to retrieve
   * @returns {Promise<{ status: "SUCCESS" | "ERROR", url: string, title?: string, content?: string, error?: string }>}
   */
  async fetch(url) {
    const startedAt = Date.now();
    let currentUrl = (url || "").trim();

    // If user provided a URL with a non-HTTP scheme, reject immediately
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(currentUrl)) {
      if (!/^https?:\/\//i.test(currentUrl)) {
        console.warn("[WEBSITE_FETCHER_BLOCKED_SCHEME]", { url: currentUrl });
        return {
          status: "ERROR",
          url: currentUrl,
          error: "Could not retrieve website: Protocol is not supported. Only HTTP and HTTPS are allowed.",
        };
      }
    } else if (currentUrl) {
      // If user provided a domain without protocol (e.g. "shaiviktechnologies.in"), default to https://
      currentUrl = `https://${currentUrl}`;
    }

    console.log("[WEBSITE_FETCHER_START]", { url: currentUrl });

    try {
      let redirectCount = 0;
      let finalResponse = null;
      let finalUrl = currentUrl;

      while (redirectCount <= this.maxRedirects) {
        // Validate URL and host for SSRF safety at each hop
        await this.validateUrl(currentUrl);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

        let response;
        try {
          response = await fetch(currentUrl, {
            method: "GET",
            headers: {
              "User-Agent": this.userAgent,
              Accept:
                "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.5",
              "Accept-Language": "en-US,en;q=0.9,te;q=0.8",
            },
            redirect: "manual", // Crucial for SSRF: prevent automatic unverified redirection
            signal: controller.signal,
          });
        } catch (fetchErr) {
          if (fetchErr.name === "AbortError" || controller.signal.aborted) {
            throw new Error(`Request timed out after ${this.timeoutMs / 1000} seconds.`);
          }
          throw new Error(`Failed to establish connection: ${fetchErr.message}`);
        } finally {
          clearTimeout(timeoutId);
        }

        // Handle redirects manually
        if ([301, 302, 303, 307, 308].includes(response.status)) {
          redirectCount++;
          if (redirectCount > this.maxRedirects) {
            throw new Error(`Exceeded maximum redirect limit of ${this.maxRedirects}.`);
          }

          const locationHeader = response.headers.get("location");
          if (!locationHeader) {
            throw new Error(`Received HTTP ${response.status} redirect without a Location header.`);
          }

          const nextUrl = new URL(locationHeader, currentUrl).href;
          console.log("[WEBSITE_FETCHER_REDIRECT]", {
            from: currentUrl,
            to: nextUrl,
            hop: redirectCount,
          });
          currentUrl = nextUrl;
          finalUrl = currentUrl;
          continue;
        }

        finalResponse = response;
        finalUrl = currentUrl;
        break;
      }

      if (!finalResponse) {
        throw new Error("No response received from target website.");
      }

      if (!finalResponse.ok) {
        throw new Error(
          `Website returned HTTP error ${finalResponse.status} (${finalResponse.statusText || "Error"}).`
        );
      }

      const contentTypeHeader = finalResponse.headers.get("content-type") || "";
      const isAllowedType = ALLOWED_CONTENT_TYPES.some((type) =>
        contentTypeHeader.toLowerCase().includes(type),
      );

      if (!isAllowedType && contentTypeHeader) {
        throw new Error(
          `Unsupported website content-type: "${contentTypeHeader}". Only HTML and text documents can be retrieved.`
        );
      }

      const rawBody = await this.readLimitedResponseBody(finalResponse);

      let extractedTitle = "";
      let extractedContent = "";

      if (contentTypeHeader.toLowerCase().includes("application/json")) {
        extractedTitle = `JSON Content from ${finalUrl}`;
        extractedContent = rawBody.slice(0, this.maxTextLength);
      } else {
        const extracted = this.extractReadableContent(rawBody, finalUrl);
        extractedTitle = extracted.title;
        extractedContent = extracted.content;
      }

      const durationMs = Date.now() - startedAt;
      console.log("[WEBSITE_FETCHER_SUCCESS]", {
        url: finalUrl,
        title: extractedTitle,
        contentLength: extractedContent.length,
        durationMs,
      });

      return {
        status: "SUCCESS",
        url: finalUrl,
        title: extractedTitle,
        content: extractedContent,
        fetchedAt: new Date().toISOString(),
      };
    } catch (err) {
      const durationMs = Date.now() - startedAt;
      console.warn("[WEBSITE_FETCHER_ERROR]", {
        url: currentUrl,
        error: err.message,
        durationMs,
      });

      return {
        status: "ERROR",
        url: currentUrl,
        error: `Could not retrieve website: ${err.message}`,
      };
    }
  }
}

export const websiteFetcherService = new WebsiteFetcherService();
