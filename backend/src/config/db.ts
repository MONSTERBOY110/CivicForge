import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';

dotenv.config();

/**
 * Why this file is more than one mongoose.connect() call.
 *
 * `mongodb+srv://` URIs require an SRV DNS lookup before the driver can find a
 * single host. Many campus / venue / hotspot networks answer SRV queries with
 * REFUSED (c-ares reports that as ECONNREFUSED), and the Mongo driver retries
 * DNS *only* on TIMEOUT, so one refused packet kills the whole boot with
 * "querySrv ECONNREFUSED _mongodb._tcp.<cluster>".
 *
 * Defence in depth, cheapest first:
 *   1. MONGO_URI_DIRECT: if set, skip DNS resolution entirely.
 *   2. Route plaintext DNS through public resolvers (dns.setServers).
 *   3. If SRV still fails, resolve SRV+TXT over DNS-over-HTTPS *addressed by IP*
 *      (https://1.1.1.1, https://8.8.8.8, whose certs cover the IP), build a
 *      standard `mongodb://host1,host2,host3` seed-list URI and connect with
 *      that. Port 443 only, so no plaintext DNS is involved at all.
 *
 * Replica-set monitoring after connect uses A-record lookups via the OS
 * resolver (dns.lookup / getaddrinfo), which is unaffected by SRV refusals.
 */

const DOH_ENDPOINTS = [
  'https://1.1.1.1/dns-query',
  'https://8.8.8.8/resolve'
];

/** True for the DNS-layer failures that a seed-list fallback can rescue. */
function isDnsFailure(error: any): boolean {
  const code = error?.code;
  return (
    error?.syscall === 'querySrv' ||
    error?.syscall === 'queryTxt' ||
    code === 'ECONNREFUSED' ||
    code === 'ETIMEOUT' ||
    code === 'ETIMEDOUT' ||
    code === 'ENOTFOUND' ||
    code === 'EAI_AGAIN' ||
    code === 'ESERVFAIL' ||
    code === 'EREFUSED' ||
    /querySrv|queryTxt|ENOTFOUND|ECONNREFUSED/i.test(error?.message || '')
  );
}

/** One DNS-over-HTTPS query. Returns the matching answer records' data strings. */
async function dohQuery(name: string, type: 'SRV' | 'TXT'): Promise<string[]> {
  const wanted = type === 'SRV' ? 33 : 16;
  let lastError: any;

  for (const endpoint of DOH_ENDPOINTS) {
    try {
      const url = `${endpoint}?name=${encodeURIComponent(name)}&type=${type}`;
      const res = await fetch(url, {
        headers: { accept: 'application/dns-json' },
        signal: AbortSignal.timeout(8000)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const body: any = await res.json();
      const answers = (body?.Answer || [])
        .filter((a: any) => a?.type === wanted)
        .map((a: any) => String(a.data));

      if (answers.length) return answers;
      throw new Error(`no ${type} records in response`);
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(`DoH ${type} lookup for ${name} failed: ${(lastError as any)?.message}`);
}

/**
 * Converts a `mongodb+srv://` URI into a plain `mongodb://` seed-list URI by
 * resolving the SRV hosts and TXT options over HTTPS. Credentials and any
 * user-supplied options are preserved verbatim (URI options win over TXT ones,
 * per the connection-string spec).
 */
export async function srvUriToSeedListUri(srvUri: string): Promise<string> {
  const parsed = /^mongodb\+srv:\/\/(?:([^@/]*)@)?([^/?]+)(\/[^?]*)?(\?.*)?$/.exec(srvUri);
  if (!parsed) throw new Error('MONGO_URI is not a valid mongodb+srv:// connection string');

  const [, userInfo, srvHost, rawPath, rawQuery] = parsed;

  // SRV data looks like: "0 0 27017 ac-xxx-shard-00-00.abcde.mongodb.net."
  const srvRecords = await dohQuery(`_mongodb._tcp.${srvHost}`, 'SRV');
  const hosts = srvRecords.map(record => {
    const parts = record.trim().split(/\s+/);
    const port = parts[2] || '27017';
    const host = (parts[3] || '').replace(/\.$/, '');
    if (!host) throw new Error(`unparseable SRV record: ${record}`);
    return `${host}:${port}`;
  });
  if (!hosts.length) throw new Error('SRV lookup returned no hosts');

  // TXT carries cluster options, e.g. "authSource=admin&replicaSet=atlas-x-shard-0"
  const options = new URLSearchParams();
  try {
    for (const txt of await dohQuery(srvHost, 'TXT')) {
      for (const [key, value] of new URLSearchParams(txt.trim().replace(/^"|"$/g, ''))) {
        options.set(key, value);
      }
    }
  } catch (error) {
    console.warn('TXT options lookup failed, continuing without them:', (error as any)?.message);
  }

  // mongodb+srv implies TLS; a plain mongodb:// URI must say so explicitly.
  if (!options.has('ssl') && !options.has('tls')) options.set('tls', 'true');

  // Caller-supplied options take precedence over anything from TXT.
  for (const [key, value] of new URLSearchParams((rawQuery || '').replace(/^\?/, ''))) {
    options.set(key, value);
  }

  const credentials = userInfo ? `${userInfo}@` : '';
  const path = rawPath && rawPath !== '/' ? rawPath : '/';
  return `mongodb://${credentials}${hosts.join(',')}${path}?${options.toString()}`;
}

/** Masks credentials so a URI can be logged safely. */
function redact(uri: string): string {
  return uri.replace(/\/\/[^@/]*@/, '//<credentials>@');
}

export async function connectDB() {
  // Step 2: route plaintext DNS through resolvers that actually answer SRV.
  // Host connections still use the OS resolver. Override with
  // DNS_SERVERS="1.1.1.1,8.8.8.8" if a network blocks these.
  try {
    const servers = (process.env.DNS_SERVERS || '8.8.8.8,1.1.1.1,9.9.9.9')
      .split(',').map(s => s.trim()).filter(Boolean);
    if (servers.length) dns.setServers(servers);
  } catch (e) {
    console.warn('Could not override DNS servers:', (e as any)?.message);
  }

  const mongoUri = process.env.MONGO_URI;
  const directUri = process.env.MONGO_URI_DIRECT;

  if (!mongoUri && !directUri) {
    const errorMsg = 'CRITICAL CONFIG ERROR: MONGO_URI environment variable is missing. Database connection is required.';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  // dbName keeps app + seed pointed at the same database even when an Atlas
  // SRV URI omits the database segment (otherwise Mongoose defaults to "test").
  // NOTE: must match the DB where the Atlas Vector Search index lives (CivicForge).
  const options = { dbName: process.env.MONGO_DB_NAME || 'CivicForge' };

  // Step 1: an explicit seed-list URI skips DNS resolution completely.
  if (directUri) {
    await mongoose.connect(directUri, options);
    console.log('MongoDB connected successfully! (via MONGO_URI_DIRECT, no SRV lookup)');
    return;
  }

  // Two attempts: transient DNS/network flaps on venue Wi-Fi are common.
  let srvError: any;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await mongoose.connect(mongoUri!, options);
      console.log('MongoDB connected successfully!');
      return;
    } catch (error) {
      srvError = error;
      if (!isDnsFailure(error)) break;
      console.warn(`SRV lookup failed (attempt ${attempt}/2): ${(error as any)?.message}`);
      if (attempt < 2) await new Promise(r => setTimeout(r, 1500));
    }
  }

  // Step 3: plaintext DNS is unusable, so resolve over HTTPS instead.
  if (isDnsFailure(srvError)) {
    console.warn('Plaintext DNS cannot resolve SRV on this network. Falling back to DNS-over-HTTPS...');
    try {
      const seedListUri = await srvUriToSeedListUri(mongoUri!);
      await mongoose.connect(seedListUri, options);
      console.log('MongoDB connected successfully! (SRV resolved over HTTPS)');
      console.log('   Tip: add this line to .env to skip DNS entirely on this network:');
      console.log(`   MONGO_URI_DIRECT=${redact(seedListUri)}`);
      return;
    } catch (fallbackError) {
      console.error('DNS-over-HTTPS fallback also failed:', (fallbackError as any)?.message);
    }
  }

  console.error('CRITICAL ERROR: MongoDB connection failed. Server cannot start.', srvError);
  throw srvError;
}
