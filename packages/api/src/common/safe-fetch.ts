import dns from 'node:dns/promises';
import net from 'node:net';
import { BadRequestError } from './errors';

const FETCH_TIMEOUT_MS = 5000;
const MAX_BODY_BYTES = 1024 * 1024;

/**
 * Blocks fetching URLs that resolve to non-routable ranges, which would otherwise
 * turn this endpoint into an SSRF proxy into the private network.
 */
function isBlockedAddress(address: string): boolean {
  if (net.isIPv4(address)) {
    const [a, b] = address.split('.').map(Number);
    if (a === 0 || a === 127 || a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true; // link-local / cloud metadata
    if (a === 100 && b >= 64 && b <= 127) return true; // carrier-grade NAT
    if (a >= 224) return true; // multicast + reserved
    return false;
  }

  if (net.isIPv6(address)) {
    const normalized = address.toLowerCase();
    if (normalized === '::' || normalized === '::1') return true;
    if (normalized.startsWith('fe80')) return true; // link-local
    const firstByte = parseInt(normalized.split(':')[0].padStart(4, '0').slice(0, 2), 16);
    if ((firstByte & 0xfe) === 0xfc) return true; // unique local fc00::/7
    if (normalized.startsWith('::ffff:')) {
      const mapped = normalized.slice('::ffff:'.length);
      if (net.isIPv4(mapped)) return isBlockedAddress(mapped);
    }
    return false;
  }

  return true;
}

/**
 * Validates that a URL is an https URL and is not addressed to a literal
 * non-routable IP. Does no DNS resolution, so it is safe on the write path.
 */
export function assertHttpsUrl(rawUrl: string): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new BadRequestError(`Invalid URL: ${rawUrl}`);
  }

  if (url.protocol !== 'https:') {
    throw new BadRequestError('URL must use the https scheme');
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(hostname) !== 0 && isBlockedAddress(hostname)) {
    throw new BadRequestError('URL must point to a publicly accessible host');
  }

  return url;
}

/**
 * Validates that a URL is an https URL whose host resolves to a publicly
 * routable address. Throws BadRequestError otherwise.
 */
export async function assertPublicHttpsUrl(rawUrl: string): Promise<URL> {
  const url = assertHttpsUrl(rawUrl);

  if (net.isIP(url.hostname) === 0) {
    let records: { address: string }[];
    try {
      records = await dns.lookup(url.hostname, { all: true });
    } catch {
      throw new BadRequestError(`Could not resolve host: ${url.hostname}`);
    }
    if (records.some((record) => isBlockedAddress(record.address))) {
      throw new BadRequestError('URL must point to a publicly accessible host');
    }
  }

  return url;
}

/**
 * Fetches a JSON document over https from a publicly routable host, with a
 * request timeout, a response size cap and redirects disabled.
 */
export async function fetchPublicJson(
  rawUrl: string
): Promise<Record<string, unknown>> {
  const url = await assertPublicHttpsUrl(rawUrl);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'GET',
      redirect: 'error',
      signal: controller.signal,
      headers: { Accept: 'application/json, application/schema+json' },
    });
  } catch {
    throw new BadRequestError(`Could not retrieve document from ${url.href}`);
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new BadRequestError(
      `Document request failed with status ${response.status}`
    );
  }

  const declaredLength = Number(response.headers.get('content-length'));
  if (declaredLength > MAX_BODY_BYTES) {
    throw new BadRequestError('Document is too large (max 1 MB)');
  }

  const body = await response.text();
  if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
    throw new BadRequestError('Document is too large (max 1 MB)');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new BadRequestError('Document is not valid JSON');
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new BadRequestError('Document must be a JSON object');
  }

  return parsed as Record<string, unknown>;
}
