import { Router } from 'express';
import { 
  generateBlueprint, 
  getAllBlueprints, 
  approveBlueprint 
} from '../controllers/blueprintController';
import { verifyToken, requireRole } from '../middleware/auth';

const router = Router();

router.post('/generate', verifyToken as any, requireRole('mp') as any, generateBlueprint as any);
router.get('/', verifyToken as any, requireRole('mp') as any, getAllBlueprints as any);
router.patch('/:id/approve', verifyToken as any, requireRole('mp') as any, approveBlueprint as any);

export default router;
