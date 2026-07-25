import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { Grievance } from '../models/Grievance';
import { Solution } from '../models/Solution';
import { Vouch } from '../models/Vouch';
import { runAIPrioritizationTask } from '../services/aiPrioritizer';
import { synthesizeSpeech } from '../services/elevenLabsService';
import { translateText } from '../services/geminiService';

export async function getPriorityMatrix(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    // Sort by AI Priority Score first, fallback to urgency
    const grievances = await Grievance.find({})
      .sort({ aiPriorityScore: -1, urgencyScore: -1 })
      .populate('citizen')
      .exec();

    const solutions = await Solution.find({}).populate('developer').exec();
    const vouches = await Vouch.find({});

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const enrichedMatrix = grievances.map((grievance: any) => {
      const plainGrievance = typeof grievance.toObject === 'function' ? grievance.toObject() : grievance;

      const matched = solutions.filter((sol: any) => sol.targetCategory === grievance.category);

      // Sort solutions primarily by AI Suitability for THIS specific grievance, fallback to vouches
      matched.sort((a: any, b: any) => {
        const aSuit = a.aiSuitability?.find((s: any) => s.grievanceId?.toString() === grievance._id.toString())?.score || 0;
        const bSuit = b.aiSuitability?.find((s: any) => s.grievanceId?.toString() === grievance._id.toString())?.score || 0;
        if (aSuit !== bSuit) return bSuit - aSuit;
        return (b.vouchCount || 0) - (a.vouchCount || 0);
      });

      const topSol = matched[0];
      let topSolution = null;
      let weeklyMomentum = 0;

      if (topSol) {
        topSolution = {
          _id: topSol._id,
          title: topSol.title,
          developer: topSol.developer,
          vouchCount: topSol.vouchCount || 0,
          aiMatchScore: topSol.aiSuitability?.find((s: any) => s.grievanceId?.toString() === grievance._id.toString())?.score || 0
        };

        const recentVouches = vouches.filter((v: any) => {
          const vSolId = typeof v.solution === 'object' ? v.solution._id : v.solution;
          return vSolId && vSolId.toString() === topSol._id.toString() && new Date(v.createdAt) >= sevenDaysAgo;
        });

        weeklyMomentum = recentVouches.length;
      }

      return { ...plainGrievance, topSolution, weeklyMomentum };
    });

    return res.json({ success: true, matrix: enrichedMatrix });
  } catch (error) {
    next(error);
  }
}

export async function forcePrioritizeAll(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    await Grievance.updateMany(
      { status: { $in: ['pending_review', 'verified'] } },
      { $set: { aiLastEvaluatedAt: null } }
    );
    runAIPrioritizationTask();
    return res.json({ success: true, message: 'AI Priority daemon triggered for all active grievances.' });
  } catch (error) {
    next(error);
  }
}

/**
 * Languages the audio briefing can be delivered in. The script is always built
 * in English, then translated by Gemini when another language is requested;
 * ElevenLabs `eleven_multilingual_v2` handles the speech for all of them.
 */
const BRIEFING_LANGUAGES = { en: 'English', hi: 'Hindi' } as const;
type BriefingLanguage = keyof typeof BRIEFING_LANGUAGES;

function resolveBriefingLanguage(raw: unknown): BriefingLanguage {
  const requested = String(raw ?? 'en').toLowerCase();
  return (Object.prototype.hasOwnProperty.call(BRIEFING_LANGUAGES, requested)
    ? requested
    : 'en') as BriefingLanguage;
}

/**
 * English scripts pass through untouched; anything else goes via Gemini.
 *
 * Reports the language actually produced, which is not always the one asked for:
 * if translation is unavailable (rate limit, missing key) the briefing still
 * plays, but in English, and the caller must know that so the UI can say so
 * instead of highlighting Hindi over English audio.
 */
async function localizeScript(
  script: string,
  lang: BriefingLanguage
): Promise<{ script: string; lang: BriefingLanguage; translated: boolean }> {
  if (lang === 'en') return { script, lang: 'en', translated: true };

  const translated = await translateText(script, BRIEFING_LANGUAGES[lang]);
  if (!translated) {
    console.warn(`Briefing translation to ${BRIEFING_LANGUAGES[lang]} unavailable, delivering English instead.`);
    return { script, lang: 'en', translated: false };
  }
  return { script: translated, lang, translated: true };
}

/**
 * MP "Audio Briefing": spoken (ElevenLabs) executive summary of the top
 * priority grievances, so an MP can be briefed hands-free.
 * Returns a base64 MP3 (null if ElevenLabs isn't configured) plus the script
 * and the language it was actually delivered in.
 *
 * Query: ?lang=en|hi  (anything else falls back to en)
 */
export async function getBriefing(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const requestedLang = resolveBriefingLanguage(req.query.lang);

    const grievances = await Grievance.find({ status: { $in: ['pending_review', 'verified', 'matched'] } })
      .sort({ aiPriorityScore: -1, urgencyScore: -1 })
      .limit(5)
      .exec();

    if (!grievances.length) {
      const empty = await localizeScript('There are no active grievances to brief at this time.', requestedLang);
      return res.json({
        success: true,
        audioBase64: null,
        script: empty.script,
        lang: empty.lang,
        requestedLang,
        translated: empty.translated
      });
    }

    const lines = grievances.map((g: any, i: number) => {
      const loc = g.location?.address || 'an unspecified area';
      const reporters = g.recurrenceCount === 1 ? '1 citizen' : `${g.recurrenceCount} citizens`;
      return `Priority ${i + 1}: a ${g.category} issue at ${loc}, with an urgency of ${g.urgencyScore} out of 100, reported by ${reporters}.`;
    });

    const englishScript = `Good day. Here is your constituency priority briefing. ${grievances.length} ${grievances.length === 1 ? 'issue requires' : 'issues require'} your attention. ${lines.join(' ')} Please open the priority matrix to verify these issues and match them with civic engineer solutions.`;

    const localized = await localizeScript(englishScript, requestedLang);
    const audioBase64 = await synthesizeSpeech(localized.script);
    return res.json({
      success: true,
      audioBase64,
      script: localized.script,
      // The language actually spoken, which may differ from requestedLang when
      // translation was unavailable. The player keys its UI off this, not the request.
      lang: localized.lang,
      requestedLang,
      translated: localized.translated
    });
  } catch (error) {
    next(error);
  }
}