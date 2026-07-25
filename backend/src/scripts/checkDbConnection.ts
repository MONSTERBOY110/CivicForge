/**
 * Database connectivity diagnostic.
 *
 *   npm run db:check                    connect exactly like the app does
 *   npm run db:check -- --refuse-dns    prove the DoH fallback works by pointing
 *                                       plaintext DNS at a resolver that refuses
 *                                       everything (reproduces the venue-Wi-Fi
 *                                       "querySrv ECONNREFUSED" failure)
 *   npm run db:check -- --reveal        print the seed-list URI with credentials,
 *                                       ready to paste into .env as MONGO_URI_DIRECT
 *
 * Exit code 0 = connected, 1 = failed.
 */
import mongoose from 'mongoose';

const args = process.argv.slice(2);
const refuseDns = args.includes('--refuse-dns');
const reveal = args.includes('--reveal');

// Nothing listens on 127.0.0.1:53, so every SRV query is refused, which is what
// a hotspot gateway answering REFUSED looks like to the Mongo driver.
if (refuseDns) {
  process.env.DNS_SERVERS = '127.0.0.1';
  console.log('Simulating a network that refuses all plaintext DNS (DNS_SERVERS=127.0.0.1)\n');
}

const { connectDB, srvUriToSeedListUri } = await import('../config/db');

try {
  await connectDB();

  const connection = mongoose.connection;
  const db = connection.db!;
  console.log(`\nConnected. host=${connection.host} db=${db.databaseName}`);

  const collections = await db.listCollections().toArray();
  for (const name of collections.map(c => c.name).sort()) {
    console.log(`  ${name}: ${await db.collection(name).countDocuments()} docs`);
  }

  // Confirm the two Atlas features the product depends on are actually queryable.
  const grievances = db.collection('grievances');
  const hasGeoIndex = (await grievances.indexes()).some(i => i.name === 'geoLocation_2dsphere');
  console.log(`\n2dsphere geo index: ${hasGeoIndex ? 'ready' : 'MISSING'}`);
  try {
    // The driver types this as { name: string }[], but Atlas also returns
    // status/queryable, which is exactly what we want to report.
    const searchIndexes: any[] = await grievances.listSearchIndexes().toArray();
    const vector = searchIndexes.find(i => i.name === 'grievance_vector_index');
    console.log(`vector search index: ${vector ? `${vector.status} queryable=${vector.queryable}` : 'MISSING'}`);
  } catch {
    console.log('vector search index: could not be listed (tier may not support it)');
  }

  if (reveal && process.env.MONGO_URI && !process.env.MONGO_URI_DIRECT) {
    console.log('\nPaste into .env to skip DNS entirely on this network:');
    console.log(`MONGO_URI_DIRECT=${await srvUriToSeedListUri(process.env.MONGO_URI)}`);
  }

  await mongoose.disconnect();
  process.exit(0);
} catch (error: any) {
  console.error(`\nConnection FAILED: ${error?.code || ''} ${error?.message}`);
  process.exit(1);
}
