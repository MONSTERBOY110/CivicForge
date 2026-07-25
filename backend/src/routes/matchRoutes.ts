import { Router } from 'express';
import { getMatchingSuggestions } from '../controllers/matchController';
import { verifyToken, requireRole } from '../middleware/auth';

const router = Router();

router.get('/suggestions/:grievanceId', verifyToken as any, requireRole('mp') as any, getMatchingSuggestions as any);

export default router;
