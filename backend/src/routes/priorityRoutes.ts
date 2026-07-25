import { Router } from 'express';
import { getPriorityMatrix, forcePrioritizeAll, getBriefing } from '../controllers/priorityController';
import { verifyToken, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', verifyToken as any, requireRole('mp') as any, getPriorityMatrix as any);
router.post('/prioritize-all', verifyToken as any, requireRole('mp') as any, forcePrioritizeAll as any);
router.get('/briefing', verifyToken as any, requireRole('mp') as any, getBriefing as any);

export default router;