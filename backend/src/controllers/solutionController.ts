import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { Solution } from '../models/Solution';
import { Vouch } from '../models/Vouch';
import { Grievance } from '../models/Grievance';
import { runAIPrioritizationTask } from '../services/aiPrioritizer';

export async function createSolution(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { title, description, techStack, targetCategory, repoUrl, demoUrl, docsUrl } = req.body;

    if (!req.user) return res.status(401).json({ message: 'Authentication required' });

    if (!title || !description || !targetCategory) {
      return res.status(400).json({ message: 'Missing required solution fields: title, description, targetCategory.' });
    }

    const solutionDoc = new Solution({
      developer: req.user.id,
      title,
      description,
      techStack: Array.isArray(techStack) ? techStack : techStack?.split(',').map((s: string) => s.trim()).filter(Boolean) || [],
      targetCategory,
      repoUrl,
      demoUrl,
      docsUrl,
      vouchCount: 0,
      status: 'submitted'
    });
    const newSolution = await solutionDoc.save();

    await Grievance.updateMany(
      {
        category: targetCategory, 
        status: {
          $in: [
            'pending_review',
            'verified'
          ]
        }
      }, {
        $set: {
          aiLastEvaluatedAt: null
        }
      }
    );

    runAIPrioritizationTask();
    
    return res.status(201).json({
      success: true,
      solution: newSolution
    });
  } catch (error) {
    next(error);
  }
}

export async function getAllSolutions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { category } = req.query;
    const filter: any = {};
    if (category) filter.targetCategory = category;

    const solutions = await Solution.find(filter)
      .sort({ vouchCount: -1 })
      .populate('developer');

    return res.json({ success: true, solutions });
  } catch (error) {
    next(error);
  }
}

export async function getMySolutions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ message: 'Authentication required' });

    const solutions = await Solution.find({ developer: req.user.id }).sort({ createdAt: -1 });
    return res.json({ success: true, solutions });
  } catch (error) {
    next(error);
  }
}

export async function vouchForSolution(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params; // solution ID
    const { comment } = req.body;

    if (!req.user) return res.status(401).json({ message: 'Authentication required' });

    const solution = await Solution.findById(id);
    if (!solution) {
      return res.status(404).json({ message: 'Solution not found.' });
    }

    // Citizen and Developer role constraints for vouching
    if (req.user.role === 'mp') {
      return res.status(403).json({ message: 'MPs/Admins are evaluators and cannot vouch for solutions.' });
    }

    // Check if user already vouched
    const existingVouch = await Vouch.findOne({ solution: id, user: req.user.id });
    if (existingVouch) {
      await Vouch.deleteMany({ solution: id, user: req.user.id });
      solution.vouchCount = Math.max(0, (solution.vouchCount || 0) - 1);
      await solution.save();
      return res.json({
        success: true,
        message: 'Vouch removed successfully!',
        vouched: false,
        solution
      });
    }

    // Create vouch
    const vouchDoc = new Vouch({
      solution: id,
      user: req.user.id,
      comment: comment || 'Verified and vouched!'
    });
    await vouchDoc.save();

    // Increment vouchCount on solution
    solution.vouchCount = (solution.vouchCount || 0) + 1;
    await solution.save();

    return res.json({
      success: true,
      message: 'Vouch registered successfully!',
      vouched: true,
      solution
    });
  } catch (error) {
    next(error);
  }
}

export async function shareSolution(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const solution = await Solution.findById(id);
    if (!solution) {
      return res.status(404).json({ message: 'Solution not found.' });
    }

    solution.shareCount = (solution.shareCount || 0) + 1;
    await solution.save();

    const clientUrl = req.headers.origin || process.env.CLIENT_URL || 'http://localhost:3000';
    const shareableLink = `${clientUrl}/solutions/${id}`;

    return res.json({
      success: true,
      shareCount: solution.shareCount,
      shareableLink
    });
  } catch (error) {
    next(error);
  }
}

