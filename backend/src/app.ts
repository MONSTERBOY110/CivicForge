import express from 'express';
import path from 'path';
import authRoutes from './routes/authRoutes';
import grievanceRoutes from './routes/grievanceRoutes';
import solutionRoutes from './routes/solutionRoutes';
import matchRoutes from './routes/matchRoutes';
import priorityRoutes from './routes/priorityRoutes';
import blueprintRoutes from './routes/blueprintRoutes';
import feedRoutes from './routes/feedRoutes';
import leaderboardRoutes from './routes/leaderboardRoutes';
import commentRoutes from './routes/commentRoutes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Standard CORS setup
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Static uploads folder
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/grievances', grievanceRoutes);
app.use('/api/solutions', solutionRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/priority-matrix', priorityRoutes);
app.use('/api/blueprints', blueprintRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/comments', commentRoutes);

// Simple Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Global Error Handler
app.use(errorHandler as any);

export default app;
