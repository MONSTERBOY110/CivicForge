import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { Grievance } from '../models/Grievance';
import { Solution } from '../models/Solution';

export async function getMatchingSuggestions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { grievanceId } = req.params;

    const grievance = await Grievance.findById(grievanceId);
    if (!grievance) {
      return res.status(404).json({ message: 'Grievance not found.' });
    }

    // Match solutions based on category classification
    const solutions = await Solution.find({ 
      targetCategory: grievance.category,
      status: { $in: ['submitted', 'under_review', 'matched'] }
    })
    .sort({ vouchCount: -1 })
    .populate('developer')
    .exec();

    return res.json({
      success: true,
      category: grievance.category,
      suggestions: solutions
    });
  } catch (error) {
    next(error);
  }
}
