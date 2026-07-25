import { Grievance } from '../models/Grievance';
import { Solution } from '../models/Solution';
import { evaluatePriorityAndSuitability } from './geminiService';

let isRunning = false;

/**
 * How many grievances one sweep may score.
 *
 * The Gemini free tier allows only a handful of generate requests per minute and
 * this daemon is the only unbounded consumer, so an uncapped sweep over every
 * unscored grievance exhausts the quota and starves the calls a human is waiting
 * on: the MP's funding blueprint and audio briefing. Capping the sweep leaves
 * headroom for those. Raise it when running on a paid key.
 */
const MAX_PER_SWEEP = Number(process.env.AI_SCORING_BATCH || 3);

export async function runAIPrioritizationTask() {
  if (isRunning) return;
  isRunning = true;

  try {
    // Highest urgency first, so the cap spends quota on what an MP sees at the top.
    const grievances = await Grievance.find({
      aiLastEvaluatedAt: null,
      status: { $in: ['pending_review', 'verified'] }
    })
      .sort({ urgencyScore: -1 })
      .limit(MAX_PER_SWEEP);

    for (const grievance of grievances) {
      // Fetch available solutions for this category
      const solutions = await Solution.find({ 
        targetCategory: grievance.category, 
        status: { $ne: 'deployed' } 
      });

      const aiResult = await evaluatePriorityAndSuitability(grievance, solutions);

      // A null result means Gemini was unavailable, most often a rate-limit. The
      // grievance keeps aiLastEvaluatedAt = null and is retried next tick, so stop
      // the sweep here rather than spending the remaining quota on calls that will
      // fail the same way.
      if (!aiResult) break;

      if (aiResult) {
        // Update Grievance
        grievance.aiPriorityScore = aiResult.aiPriorityScore;
        grievance.aiPriorityExplanation = aiResult.aiPriorityExplanation;
        grievance.aiLastEvaluatedAt = new Date();
        await grievance.save();

        // Update Solutions with suitability scores
        if (aiResult.solutionSuitability && aiResult.solutionSuitability.length > 0) {
          for (const match of aiResult.solutionSuitability) {
            await Solution.updateOne(
              { _id: match.solutionId },
              { 
                $pull: { aiSuitability: { grievanceId: grievance._id } } // Remove old score if exists
              }
            );
            await Solution.updateOne(
              { _id: match.solutionId },
              { 
                $push: { 
                  aiSuitability: { 
                    grievanceId: grievance._id, 
                    score: match.score, 
                    explanation: match.explanation 
                  } 
                } 
              }
            );
          }
        }
      }
    }
  } catch (error) {
    console.error('AI Prioritization Task Error:', error);
  } finally {
    isRunning = false;
  }
}

export function startAIPrioritizer() {
  console.log('🤖 Starting Gemini AI Background Prioritization Daemon...');
  // Run immediately on boot
  runAIPrioritizationTask();
  // Run every 60 seconds
  setInterval(runAIPrioritizationTask, 60000);
}