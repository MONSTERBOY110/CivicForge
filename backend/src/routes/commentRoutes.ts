import { Router } from 'express';
import { deleteComment } from '../controllers/commentController';
import { verifyToken } from '../middleware/auth';

const router = Router();

router.delete('/:id', verifyToken as any, deleteComment as any);

export default router;
