import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { Solution } from '../models/Solution';
import { Grievance } from '../models/Grievance';
import { Vouch } from '../models/Vouch';

export async function getSolutionsFeed(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (req.user.role !== 'citizen' && req.user.role !== 'developer') {
      return res.status(403).json({ message: 'Only citizens and developers can access the solutions feed.' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    let solutions = await Solution.find({}).sort({ createdAt: -1 }).populate('developer');

    if (req.query.category) {
      solutions = solutions.filter((s: any) => s.targetCategory === req.query.category);
    }

    if (req.query.region) {
      solutions = solutions.filter((s: any) => {
        const dev = s.developer;
        return dev && dev.region && dev.region.toLowerCase().includes((req.query.region as string).toLowerCase());
      });
    }

    // Attach whether current user has already vouched
    const vouchedSolutions = await Vouch.find({ user: req.user.id });
    const vouchedIds = new Set(vouchedSolutions.map((v: any) => {
      const solId = typeof v.solution === 'object' ? v.solution._id : v.solution;
      return solId ? solId.toString() : '';
    }));

    const enrichedSolutions = solutions.map((s: any) => {
      const plainObj = typeof s.toObject === 'function' ? s.toObject() : s;
      return {
        ...plainObj,
        vouched: vouchedIds.has(s._id.toString())
      };
    });

    const paginated = enrichedSolutions.slice(startIndex, endIndex);
    const hasMore = enrichedSolutions.length > endIndex;

    return res.json({
      success: true,
      solutions: paginated,
      page,
      hasMore,
      total: enrichedSolutions.length
    });
  } catch (error) {
    next(error);
  }
}

export async function getProblemsFeed(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (req.user.role !== 'developer') {
      return res.status(403).json({ message: 'Only developers can access the problems feed.' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    let grievances = await Grievance.find({});
    // Filter status in ['pending_review', 'verified']
    grievances = grievances.filter((g: any) => ['pending_review', 'verified'].includes(g.status));

    if (req.query.category) {
      grievances = grievances.filter((g: any) => g.category === req.query.category);
    }

    // Sort
    const sort = req.query.sort;
    if (sort === 'newest') {
      grievances.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sort === 'urgency') {
      grievances.sort((a: any, b: any) => (b.urgencyScore || 0) - (a.urgencyScore || 0));
    } else {
      // default: ai-priority DESC
      grievances.sort((a: any, b: any) => (b.aiPriorityScore || 0) - (a.aiPriorityScore || 0));
    }
    const paginated = grievances.slice(startIndex, endIndex);
    const hasMore = grievances.length > endIndex;

    return res.json({
      success: true,
      problems: paginated,
      page,
      hasMore,
      total: grievances.length
    });
  } catch (error) {
    next(error);
  }
}
