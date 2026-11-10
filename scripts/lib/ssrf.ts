import { promises as dns } from 'node:dns';
import net from 'node:net';

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'metadata.google.internal',
  'metadata.google',
  'instance-data',
  '169.254.169.254',
]);

const PRIVATE_V4 = [
  { network: '0.0.0.0', prefix: 8 },
  { network: '10.0.0.0', prefix: 8 },
  { network: '100.64.0.0', prefix: 10 },
  { network: '127.0.0.0', prefix: 8 },
  { network: '169.254.0.0', prefix: 16 },
  { network: '172.16.0.0', prefix: 12 },
  { network: '192.0.0.0', prefix: 24 },
  { network: '192.0.2.0', prefix: 24 },
  { network: '192.168.0.0', prefix: 16 },
  { network: '198.18.0.0', prefix: 15 },
  { network: '198.51.100.0', prefix: 24 },
  { network: '203.0.113.0', prefix: 24 },
  { network: '224.0.0.0', prefix: 4 },
  { network: '240.0.0.0', prefix: 4 },
  { network: '255.255.255.255', prefix: 32 },
];

function ipv4ToInt(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
}

function isPrivateIpv4(ip: string): boolean {
  const value = ipv4ToInt(ip);
  return PRIVATE_V4.some(({ network, prefix }) => {
    const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
    return (value & mask) >>> 0 === (ipv4ToInt(network) & mask) >>> 0;
  });
}

function isPrivateIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === '::1' || normalized === '::') return true;
  if (normalized.startsWith('fe80') || normalized.startsWith('fc') || normalized.startsWith('fd')) {
    return true;
  }
  if (normalized.startsWith('::ffff:')) {
    const mapped = normalized.slice(7);
    if (net.isIP(mapped) === 4) return isPrivateIpv4(mapped);
  }
  return false;
}

export function isPrivateAddress(address: string): boolean {
  const family = net.isIP(address);
  if (family === 4) return isPrivateIpv4(address);
  if (family === 6) return isPrivateIpv6(address);
  return true;
}

/**
 * Validates a URL for server-side fetching. Blocks credentials in URLs, non-HTTP(S)
 * schemes, private/loopback/link-local/metadata IPs and hostnames that resolve to them.
 * Must be called again for every redirect target.
 */
export async function assertPublicHttpUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`Invalid URL: ${raw}`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`Blocked non-HTTP(S) URL: ${url.protocol}`);
  }
  if (url.username || url.password) {
    throw new Error('Blocked URL with embedded credentials');
  }
  const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
  if (!hostname || BLOCKED_HOSTNAMES.has(hostname)) {
    throw new Error(`Blocked hostname: ${hostname}`);
  }
  if (net.isIP(hostname)) {
    if (isPrivateAddress(hostname)) throw new Error(`Blocked private address: ${hostname}`);
    return url;
  }
  if (hostname.endsWith('.local') || hostname.endsWith('.internal') || hostname.endsWith('.home.arpa')) {
    throw new Error(`Blocked internal hostname: ${hostname}`);
  }
  let records: { address: string }[];
  try {
    records = await dns.lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new Error(`DNS resolution failed for ${hostname}`);
  }
  if (records.length === 0) throw new Error(`No DNS records for ${hostname}`);
  for (const record of records) {
    if (isPrivateAddress(record.address)) {
      throw new Error(`Hostname ${hostname} resolves to a blocked private address`);
    }
  }
  return url;
}
