import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { ProjectBlueprint } from '../models/ProjectBlueprint';
import { Grievance } from '../models/Grievance';
import { Solution } from '../models/Solution';
import { generateBlueprint as aiGenerateBlueprint } from '../services/geminiService';

/**
 * Open grievances of OTHER categories within 1 km of the cluster's centroid,
 * capped at 5. Failure here must never block blueprint generation, so any error
 * (missing geo data, index problems) degrades to an empty list and the pipeline
 * simply sequences the cluster's own work.
 */
async function findNearbyCrossCategoryGrievances(clusterGrievances: any[]): Promise<any[]> {
  try {
    const points = clusterGrievances
      .map(g => g.geoLocation?.coordinates)
      .filter((c: any) => Array.isArray(c) && c.length === 2);
    if (!points.length) return [];

    const centroid = [
      points.reduce((sum: number, c: number[]) => sum + c[0], 0) / points.length,
      points.reduce((sum: number, c: number[]) => sum + c[1], 0) / points.length
    ];
    const clusterCategory = clusterGrievances[0]?.category;
    const clusterIds = clusterGrievances.map(g => g._id);

    return await Grievance.find({
      geoLocation: {
        $near: {
          $geometry: { type: 'Point', coordinates: centroid },
          $maxDistance: 1000
        }
      },
      category: { $ne: clusterCategory },
      status: { $in: ['pending_review', 'verified'] },
      _id: { $nin: clusterIds }
    }).limit(5);
  } catch (error) {
    console.warn('Nearby cross-category scan failed, generating single-project pipeline:', (error as any)?.message);
    return [];
  }
}

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

    // 2. Fetch the matched civic engineer solution
    let solution = null;
    if (solutionId) {
      solution = await Solution.findById(solutionId);
    }

    // 3. Cross-department scan: open grievances of OTHER categories within 1 km of
    // the cluster centroid. These feed the execution pipeline so subsurface work
    // (water lines, cable ducts) is sequenced BEFORE surface work, and the street
    // is opened up once instead of once per department.
    const nearbyGrievances = await findNearbyCrossCategoryGrievances(grievances);

    // 4. Trigger Gemini proposal + execution pipeline generation (one call)
    const { title, summary, estimatedBudget, executionPipeline } =
      await aiGenerateBlueprint(grievances, solution, nearbyGrievances);

    // 5. Create ProjectBlueprint draft
    const blueprintDoc = new ProjectBlueprint({
      mp: req.user.id,
      grievanceCluster: grievanceIds,
      matchedSolution: solutionId || null,
      generatedTitle: title,
      generatedSummary: summary,
      estimatedBudget,
      generatedByAI: true,
      status: 'draft',
      executionPipeline: executionPipeline.map(stage => ({ ...stage, status: 'pending' })),
      executionStatus: 'not_started'
    });
    const newBlueprint = await blueprintDoc.save();

    // 6. Update statuses of grievances and solutions to keep states synchronized
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

/** Every grievance a pipeline's stages claim to cover, deduplicated. */
function collectCoveredGrievanceIds(blueprint: any): any[] {
  const ids = (blueprint.executionPipeline || [])
    .flatMap((stage: any) => stage.coveredGrievanceIds || []);
  return [...new Set(ids.map((id: any) => String(id)))];
}

/** Final-stage cascade: everything the project touched is now delivered. */
async function completeExecution(blueprint: any) {
  blueprint.executionStatus = 'completed';
  await blueprint.save();

  const resolvedIds = [
    ...(blueprint.grievanceCluster || []).map((id: any) => String(id)),
    ...collectCoveredGrievanceIds(blueprint)
  ];
  await Grievance.updateMany({ _id: { $in: resolvedIds } }, { status: 'resolved' });

  if (blueprint.matchedSolution) {
    await Solution.findByIdAndUpdate(blueprint.matchedSolution, { status: 'deployed' });
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

    // With an execution pipeline, approval STARTS the work instead of finishing
    // it: stage 1 goes active, and every nearby grievance the pipeline covers is
    // claimed as 'matched'. Resolution happens when the final stage completes
    // (see advanceBlueprint), because funding something is not fixing it.
    if (blueprint.executionPipeline && blueprint.executionPipeline.length > 0) {
      blueprint.executionStatus = 'executing';
      blueprint.executionPipeline[0].status = 'active';
      await blueprint.save();

      const coveredIds = collectCoveredGrievanceIds(blueprint);
      if (coveredIds.length) {
        await Grievance.updateMany(
          { _id: { $in: coveredIds }, status: { $in: ['pending_review', 'verified'] } },
          { status: 'matched' }
        );
      }

      return res.json({
        success: true,
        message: 'Blueprint approved. Execution pipeline started at stage 1.',
        blueprint
      });
    }

    // Legacy blueprints (no pipeline): the original instant-resolve cascade.
    await blueprint.save();
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

/**
 * Advances the execution pipeline one stage: the active stage is marked done and
 * the next one activated. Completing the FINAL stage triggers the delivery
 * cascade: cluster + covered grievances resolve, the solution deploys.
 */
export async function advanceBlueprint(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const blueprint = await ProjectBlueprint.findById(id);

    if (!blueprint) {
      return res.status(404).json({ message: 'Project Blueprint not found.' });
    }
    if (!blueprint.executionPipeline || blueprint.executionPipeline.length === 0) {
      return res.status(400).json({ message: 'This blueprint has no execution pipeline.' });
    }
    if (blueprint.status !== 'approved') {
      return res.status(400).json({ message: 'Approve the blueprint before advancing its execution.' });
    }
    if (blueprint.executionStatus === 'completed') {
      return res.status(400).json({ message: 'Execution is already completed.' });
    }

    const stages = blueprint.executionPipeline;
    const currentIndex = stages.findIndex((s: any) => s.status !== 'done');
    if (currentIndex === -1) {
      // Statuses say all stages are done but executionStatus never flipped; heal it.
      await completeExecution(blueprint);
      return res.json({ success: true, completed: true, message: 'Execution completed.', blueprint });
    }

    stages[currentIndex].status = 'done';

    if (currentIndex + 1 < stages.length) {
      stages[currentIndex + 1].status = 'active';
      await blueprint.save();
      return res.json({
        success: true,
        completed: false,
        message: `Stage ${currentIndex + 1} completed. Stage ${currentIndex + 2} is now active.`,
        blueprint
      });
    }

    await completeExecution(blueprint);
    return res.json({
      success: true,
      completed: true,
      message: 'Final stage completed. All covered grievances resolved and the solution marked deployed.',
      blueprint
    });
  } catch (error) {
    next(error);
  }
}
