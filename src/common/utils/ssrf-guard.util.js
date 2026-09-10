import net from "net";
import dns from "dns/promises";

export const isPrivateOrLoopbackIpAddress = (ipAddressString) => {
  if (!ipAddressString || typeof ipAddressString !== "string") {
    return true;
  }

  const normalizedIpString = ipAddressString.trim();
  const ipVersionFamilyNumber = net.isIP(normalizedIpString);

  if (ipVersionFamilyNumber === 0) {
    return false;
  }

  if (ipVersionFamilyNumber === 4) {
    const ipOctetNumbersList = normalizedIpString.split(".").map(Number);
    const firstOctetNumber = ipOctetNumbersList[0];
    const secondOctetNumber = ipOctetNumbersList[1];

    if (firstOctetNumber === 0 || firstOctetNumber === 127) {
      return true;
    }

    if (firstOctetNumber === 10) {
      return true;
    }

    if (
      firstOctetNumber === 172 &&
      secondOctetNumber >= 16 &&
      secondOctetNumber <= 31
    ) {
      return true;
    }

    if (firstOctetNumber === 192 && secondOctetNumber === 168) {
      return true;
    }

    if (firstOctetNumber === 169 && secondOctetNumber === 254) {
      return true;
    }

    return false;
  }

  if (ipVersionFamilyNumber === 6) {
    const normalizedIpv6Lower = normalizedIpString.toLowerCase();

    if (
      normalizedIpv6Lower === "::1" ||
      normalizedIpv6Lower === "::" ||
      normalizedIpv6Lower.startsWith("fe8") ||
      normalizedIpv6Lower.startsWith("fe9") ||
      normalizedIpv6Lower.startsWith("fea") ||
      normalizedIpv6Lower.startsWith("feb") ||
      normalizedIpv6Lower.startsWith("fc") ||
      normalizedIpv6Lower.startsWith("fd")
    ) {
      return true;
    }

    return false;
  }

  return true;
};

export const validateUrlForSsrfPrevention = async (targetUrlString) => {
  if (!targetUrlString || typeof targetUrlString !== "string") {
    throw new Error("INVALID_URL_REQUIRED");
  }

  let parsedUrlInstance;
  try {
    parsedUrlInstance = new URL(targetUrlString);
  } catch {
    throw new Error("INVALID_SOURCE_URL");
  }

  const allowedProtocolsList = ["http:", "https:"];
  if (
    !allowedProtocolsList.includes(parsedUrlInstance.protocol.toLowerCase())
  ) {
    throw new Error("UNSUPPORTED_URL_PROTOCOL");
  }

  const hostnameString = parsedUrlInstance.hostname.toLowerCase().trim();

  if (
    hostnameString === "localhost" ||
    hostnameString.endsWith(".localhost") ||
    hostnameString === "loopback" ||
    hostnameString === "0.0.0.0"
  ) {
    throw new Error("SSRF_PRIVATE_ADDRESS_BLOCKED");
  }

  if (net.isIP(hostnameString)) {
    if (isPrivateOrLoopbackIpAddress(hostnameString)) {
      throw new Error("SSRF_PRIVATE_ADDRESS_BLOCKED");
    }
    return true;
  }

  try {
    const dnsLookupResults = await dns.lookup(hostnameString, { all: true });
    for (const lookupEntryItem of dnsLookupResults) {
      if (isPrivateOrLoopbackIpAddress(lookupEntryItem.address)) {
        throw new Error("SSRF_PRIVATE_ADDRESS_BLOCKED");
      }
    }
  } catch (dnsResolutionError) {
    if (dnsResolutionError.message === "SSRF_PRIVATE_ADDRESS_BLOCKED") {
      throw dnsResolutionError;
    }
  }

  return true;
};
