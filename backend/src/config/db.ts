import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';

dotenv.config();

export async function connectDB() {
  // Many campus / venue / public Wi-Fi networks (and some ISPs) refuse SRV DNS
  // lookups through the default resolver, which breaks `mongodb+srv://` with
  // "querySrv ECONNREFUSED". Node's mongo driver resolves SRV/TXT via c-ares,
  // which honours dns.setServers() — so route DNS through a reliable public
  // resolver. Host connections still use the OS resolver. Override via
  // DNS_SERVERS="1.1.1.1,8.8.8.8" if a network blocks these.
  try {
    const servers = (process.env.DNS_SERVERS || '8.8.8.8,1.1.1.1')
      .split(',').map(s => s.trim()).filter(Boolean);
    if (servers.length) dns.setServers(servers);
  } catch (e) {
    console.warn('Could not override DNS servers:', (e as any)?.message);
  }

  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    const errorMsg = 'CRITICAL CONFIG ERROR: MONGO_URI environment variable is missing. Database connection is required.';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  try {
    // dbName keeps app + seed pointed at the same database even when an Atlas
    // SRV URI omits the database segment (otherwise Mongoose defaults to "test").
    // NOTE: must match the DB where the Atlas Vector Search index lives (CivicForge).
    await mongoose.connect(mongoUri, { dbName: process.env.MONGO_DB_NAME || 'CivicForge' });
    console.log('MongoDB connected successfully!');
  } catch (error) {
    console.error('CRITICAL ERROR: MongoDB connection failed. Server cannot start.', error);
    throw error;
  }
}
