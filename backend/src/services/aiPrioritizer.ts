import { Grievance } from '../models/Grievance';
import { Solution } from '../models/Solution';
import { evaluatePriorityAndSuitability } from './geminiService';

let isRunning = false;

export async function runAIPrioritizationTask() {
  if (isRunning) return;
  isRunning = true;

  try {
    // Find grievances that are new or need re-evaluation
    const grievances = await Grievance.find({ 
      aiLastEvaluatedAt: null, 
      status: { $in: ['pending_review', 'verified'] } 
    });

    for (const grievance of grievances) {
      // Fetch available solutions for this category
      const solutions = await Solution.find({ 
        targetCategory: grievance.category, 
        status: { $ne: 'deployed' } 
      });

      const aiResult = await evaluatePriorityAndSuitability(grievance, solutions);

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