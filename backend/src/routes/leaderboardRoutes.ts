import { Router } from 'express';
import { getDeveloperLeaderboard } from '../controllers/leaderboardController';
import { verifyToken } from '../middleware/auth';

const router = Router();

router.get('/developers', verifyToken as any, getDeveloperLeaderboard as any);

export default router;
