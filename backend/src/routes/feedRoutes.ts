import { Router } from 'express';
import { getSolutionsFeed, getProblemsFeed } from '../controllers/feedController';
import { verifyToken, requireRole } from '../middleware/auth';

const router = Router();

router.get('/solutions', verifyToken as any, requireRole('citizen', 'developer') as any, getSolutionsFeed as any);
router.get('/problems', verifyToken as any, requireRole('developer') as any, getProblemsFeed as any);

export default router;
