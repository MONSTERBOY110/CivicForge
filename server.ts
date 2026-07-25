import path from 'path';
import dotenv from 'dotenv';
import express from 'express';
import { createServer as createViteServer } from 'vite';

// Load environment variables before initializing app modules.
dotenv.config();

const PORT = Number(process.env.PORT) || 3000;

async function bootstrap() {
  const { connectDB } = await import('./backend/src/config/db');
  await connectDB();

  const { default: app } = await import('./backend/src/app');

  // Ensure geospatial (2dsphere) and other schema indexes are built on Atlas.
  // Done here (not in connectDB) so the models are already registered.
  try {
    const { Grievance } = await import('./backend/src/models/Grievance');
    await Grievance.syncIndexes();
    console.log('Grievance indexes synced (2dsphere geospatial index ready).');
  } catch (e) {
    console.warn('Index sync warning (geo queries may fall back to haversine):', (e as any)?.message);
  }

  const { startAIPrioritizer } = await import('./backend/src/services/aiPrioritizer');
  startAIPrioritizer();

  // Setup Vite as middleware in development or serve static build in production
  if (process.env.NODE_ENV !== 'production') {
    console.log('Starting development server with Vite middleware...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    console.log('Starting production server...');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));

    // Fallback for SPA routing
    app.get('*', (req: any, res: any) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Start listening on Port 3000
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`===================================================`);
    console.log(` CivicForge Full-Stack App is LIVE!`);
    console.log(` Development URL: http://localhost:${PORT}`);
    console.log(` Dev App Panel: https://ais-dev-gqkfmfjbexwlzec66pf2v4-122371198006.asia-southeast1.run.app`);
    console.log(`===================================================`);
  });
}

// Global process error prevention
process.on('uncaughtException', (err) => {
  console.error('CRITICAL UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('CRITICAL UNHANDLED REJECTION AT:', promise, 'REASON:', reason);
});

bootstrap();
