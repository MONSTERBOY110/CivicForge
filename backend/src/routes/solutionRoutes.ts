import { Router } from 'express';
import { 
  createSolution, 
  getAllSolutions, 
  getMySolutions, 
  vouchForSolution,
  shareSolution
} from '../controllers/solutionController';
import { createComment, getComments } from '../controllers/commentController';
import { verifyToken, requireRole } from '../middleware/auth';

const router = Router();

router.post('/', verifyToken as any, requireRole('developer') as any, createSolution as any);
router.get('/', verifyToken as any, getAllSolutions as any);
router.get('/mine', verifyToken as any, requireRole('developer') as any, getMySolutions as any);
router.post('/:id/vouch', verifyToken as any, vouchForSolution as any);
router.post('/:id/comments', verifyToken as any, requireRole('citizen', 'developer') as any, createComment as any);
router.get('/:id/comments', verifyToken as any, getComments as any);
router.post('/:id/share', verifyToken as any, shareSolution as any);

export default router;
