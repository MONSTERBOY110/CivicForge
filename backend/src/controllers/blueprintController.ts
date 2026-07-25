import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { ProjectBlueprint } from '../models/ProjectBlueprint';
import { Grievance } from '../models/Grievance';
import { Solution } from '../models/Solution';
import { generateBlueprint as aiGenerateBlueprint } from '../services/geminiService';

export async function generateBlueprint(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { grievanceIds, solutionId } = req.body;

    if (!req.user) return res.status(401).json({ message: 'Authentication required' });

    if (!grievanceIds || !Array.isArray(grievanceIds) || grievanceIds.length === 0) {
      return res.status(400).json({ message: 'A valid non-empty array of grievanceIds is required.' });
    }

    // 1. Fetch all grievances in the cluster
    const grievances = await Grievance.find({ _id: { $in: grievanceIds } });
    if (grievances.length === 0) {
      return res.status(404).json({ message: 'No matching grievances found for the provided IDs.' });
    }

    // 2. Fetch the matched developer solution
    let solution = null;
    if (solutionId) {
      solution = await Solution.findById(solutionId);
    }

    // 3. Trigger Gemini proposal generation
    const { title, summary, estimatedBudget } = await aiGenerateBlueprint(grievances, solution);

    // 4. Create ProjectBlueprint draft
    const blueprintDoc = new ProjectBlueprint({
      mp: req.user.id,
      grievanceCluster: grievanceIds,
      matchedSolution: solutionId || null,
      generatedTitle: title,
      generatedSummary: summary,
      estimatedBudget,
      generatedByAI: true,
      status: 'draft'
    });
    const newBlueprint = await blueprintDoc.save();

    // 5. Update statuses of grievances and solutions to keep states synchronized
    await Grievance.updateMany({ _id: { $in: grievanceIds } }, { status: 'matched' });
    if (solutionId) {
      await Solution.findByIdAndUpdate(solutionId, { status: 'matched' });
    }

    return res.status(201).json({
      success: true,
      message: 'Funding-ready Project Blueprint generated successfully via Gemini.',
      blueprint: newBlueprint
    });
  } catch (error) {
    next(error);
  }
}

export async function getAllBlueprints(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const blueprints = await ProjectBlueprint.find({})
      .sort({ createdAt: -1 })
      .populate('mp')
      .populate('grievanceCluster')
      .populate('matchedSolution');

    return res.json({ success: true, blueprints });
  } catch (error) {
    next(error);
  }
}

export async function approveBlueprint(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const blueprint = await ProjectBlueprint.findById(id);

    if (!blueprint) {
      return res.status(404).json({ message: 'Project Blueprint not found.' });
    }

    blueprint.status = 'approved';
    await blueprint.save();

    // Also update matched grievances to resolved status on final approval!
    if (blueprint.grievanceCluster && blueprint.grievanceCluster.length > 0) {
      await Grievance.updateMany({ _id: { $in: blueprint.grievanceCluster } }, { status: 'resolved' });
    }
    
    if (blueprint.matchedSolution) {
      await Solution.findByIdAndUpdate(blueprint.matchedSolution, { status: 'deployed' });
    }

    return res.json({
      success: true,
      message: 'Project Blueprint approved and marked as funded! All matching grievances marked as resolved.',
      blueprint
    });
  } catch (error) {
    next(error);
  }
}
