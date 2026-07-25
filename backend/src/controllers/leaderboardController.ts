import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { Solution } from '../models/Solution';
import { User } from '../models/User';
import { Vouch } from '../models/Vouch';

function getId(value: any): string {
  if (!value) return '';
  if (typeof value === 'object' && value._id) return value._id.toString();
  return value.toString();
}

export async function getDeveloperLeaderboard(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Fetch all developer users to seed the leaderboard
    const developers = await User.find({ role: 'developer' });
    const leaderboardMap: { [key: string]: any } = {};

    developers.forEach((dev: any) => {
      // Remove sensitive fields
      const plainDev = typeof dev.toObject === 'function' ? dev.toObject() : dev;
      const { password, __v, ...safeDev } = plainDev;
      leaderboardMap[getId(dev._id)] = {
        developer: safeDev,
        totalVouches: 0,
        solutionCount: 0,
        hasDeployedBadge: false
      };
    });

    // Fetch all solutions and vouches. Vouch documents are the source of truth
    // when present; solution.vouchCount remains a fallback for older seeded rows.
    const [solutions, vouches] = await Promise.all([
      Solution.find({}),
      Vouch.find({})
    ]);

    const vouchesBySolution = new Map<string, number>();
    vouches.forEach((vouch: any) => {
      const solutionId = getId(vouch.solution);
      if (!solutionId) return;
      vouchesBySolution.set(solutionId, (vouchesBySolution.get(solutionId) || 0) + 1);
    });

    solutions.forEach((sol: any) => {
      const devId = getId(sol.developer);
      if (devId && leaderboardMap[devId]) {
        const solutionId = getId(sol._id);
        const recordedVouches = vouchesBySolution.get(solutionId);
        const totalForSolution = recordedVouches ?? Number(sol.vouchCount || 0);

        leaderboardMap[devId].totalVouches += totalForSolution;
        leaderboardMap[devId].solutionCount += 1;
        if (sol.status === 'deployed') {
          leaderboardMap[devId].hasDeployedBadge = true;
        }
      }
    });

    // Convert to array and sort by totalVouches DESC, then solutionCount DESC.
    const leaderboard = Object.values(leaderboardMap).sort((a: any, b: any) => {
      if (b.totalVouches !== a.totalVouches) {
        return b.totalVouches - a.totalVouches;
      }
      if (b.solutionCount !== a.solutionCount) {
        return b.solutionCount - a.solutionCount;
      }
      if (Number(b.hasDeployedBadge) !== Number(a.hasDeployedBadge)) {
        return Number(b.hasDeployedBadge) - Number(a.hasDeployedBadge);
      }
      return a.developer.name.localeCompare(b.developer.name);
    }).map((entry: any, index: number) => {
      return {
        ...entry,
        rank: index + 1
      };
    });

    return res.json({
      success: true,
      leaderboard
    });
  } catch (error) {
    next(error);
  }
}
