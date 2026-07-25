import { Router } from 'express';
import { 
  createGrievance, 
  getMyGrievances, 
  getAllGrievances, 
  getGrievancesHeatmap, 
  verifyGrievance 
} from '../controllers/grievanceController';
import { verifyToken, requireRole } from '../middleware/auth';
import { upload } from '../utils/uploadAdapter';

const router = Router();

// Citizen submission (accepts file under 'file' key)
router.post('/', verifyToken as any, requireRole('citizen') as any, upload.single('file'), createGrievance as any);
router.get('/mine', verifyToken as any, requireRole('citizen') as any, getMyGrievances as any);

// MP & Developer dashboard and data fetching
router.get('/', verifyToken as any, requireRole('mp', 'developer') as any, getAllGrievances as any);
router.get('/heatmap', verifyToken as any, requireRole('mp', 'developer') as any, getGrievancesHeatmap as any);
router.patch('/:id/verify', verifyToken as any, requireRole('mp') as any, verifyGrievance as any);

export default router;
