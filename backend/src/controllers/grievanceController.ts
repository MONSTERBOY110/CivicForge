import { Response, NextFunction } from 'express';
import fs from 'fs';
import { AuthenticatedRequest } from '../middleware/auth';
import { Grievance } from '../models/Grievance';
import { categorizeAndScoreText, generateEmbedding } from '../services/geminiService';
import { getInfrastructureGap } from '../services/dataFusionService';
import { computeUrgencyScore, getGeoNearIds, applyClusterMetrics } from '../services/scoringService';
import { findSimilarGrievanceIds } from '../services/vectorClusterService';
import { synthesizeSpeech } from '../services/elevenLabsService';
import { uploadToCloud } from '../utils/uploadAdapter';
import { runAIPrioritizationTask } from '../services/aiPrioritizer';
import { GoogleGenAI } from '@google/genai';

// Initialize Gemini client globally for audio transcription
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function createGrievance(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { inputType, lat, lng, address } = req.body;
    let description = req.body.description || '';
    
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!inputType || !lat || !lng || !address) {
      return res.status(400).json({ message: 'Missing required location or inputType fields.' });
    }

    const latitude = Number(lat);
    const longitude = Number(lng);

    let mediaUrl = null;
    let transcript = null;

    // Handle photo or voice note uploads from multer
    if (req.file) {
      // 1. Upload to Cloudinary (via your existing adapter). If Cloudinary is
      // unavailable this falls back to serving the file from /uploads, in which
      // case the local file must survive (see the cleanup step below).
      const upload = await uploadToCloud(req.file.path);
      mediaUrl = upload.url;

      // 2. Transcribe and Translate Audio using Gemini
      if (inputType === 'voice') {
        const fileBuffer = fs.readFileSync(req.file.path);
        const base64Audio = fileBuffer.toString('base64');

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            {
              role: 'user',
              parts: [
                { inlineData: { data: base64Audio, mimeType: req.file.mimetype } },
                { text: "Listen to this audio. Transcribe it directly into English. Provide only the translated English transcription without any conversational filler, markdown, or quotation marks." }
              ]
            }
          ]
        });

        transcript = response.text?.trim() || '';
        description = transcript; // Make transcribed text the description
      }

      // 3. Clean up the local temp file to prevent server bloat, but ONLY when the
      // media actually reached Cloudinary. On the local fallback this file IS the
      // asset behind mediaUrl, so deleting it would leave a broken /uploads/ link.
      if (!upload.storedLocally) {
        fs.unlinkSync(req.file.path);
      }
    }

    if (!description && inputType !== 'voice') {
      return res.status(400).json({ message: 'Grievance description text is required.' });
    }

    // AI Classification and tone-urgency scoring
    const { category, stressScore, summary } = await categorizeAndScoreText(description);

    // Semantic embedding (Gemini) powers Atlas Vector Search meaning-based clustering.
    // Null when no Gemini key; clustering then falls back to geography only.
    const embedding = await generateEmbedding(description);

    // Geographic data fusion with local Indian census metrics
    const { gapScore } = getInfrastructureGap(latitude, longitude, category);

    // Create the grievance (initial recurrenceCount of 1)
    const initialUrgency = computeUrgencyScore(1, stressScore, gapScore);

    const grievanceDoc = new Grievance({
      citizen: req.user.id,
      category,
      description,
      inputType,
      mediaUrl,
      transcript,
      location: { lat: latitude, lng: longitude, address },
      // GeoJSON mirror for Atlas 2dsphere queries ([lng, lat] order)
      geoLocation: { type: 'Point', coordinates: [longitude, latitude] },
      embedding: embedding || undefined,
      stressScore,
      recurrenceCount: 1,
      infrastructureGapScore: gapScore,
      urgencyScore: initialUrgency,
      status: 'pending_review',
      aiLastEvaluatedAt: null
    });

    const newGrievance = await grievanceDoc.save();

    runAIPrioritizationTask(); // Trigger AI prioritization after new grievance creation

    // Cluster membership = union of GEOGRAPHY (2dsphere $geoNear within 2km) and
    // MEANING (Atlas Vector Search on the Gemini embedding). Merging the two lets
    // duplicate reports of the same problem stack urgency even when worded differently
    // or just outside the GPS radius.
    const geoIds = await getGeoNearIds(category, latitude, longitude, 2000);
    const semanticIds = await findSimilarGrievanceIds(embedding, category, newGrievance._id);
    const clusterMemberIds = [newGrievance._id, ...geoIds, ...semanticIds];
    await applyClusterMetrics(clusterMemberIds);

    // Re-fetch the updated grievance to return accurate computed scores
    const updatedGrievance = await Grievance.findById(newGrievance._id);

    // Optional spoken confirmation (ElevenLabs), accessibility for citizens who
    // can't easily read a screen. Returns null silently if ELEVENLABS_API_KEY is
    // unset or on error, so it never blocks or breaks the submission.
    let audioBase64: string | null = null;
    const priorityWord = ((updatedGrievance as any)?.urgencyScore ?? 0) > 75 ? 'high' : 'standard';
    const confirmationLine = `Your ${category} complaint at ${address} has been logged and marked ${priorityWord} priority. Thank you for helping improve your community.`;
    audioBase64 = await synthesizeSpeech(confirmationLine);

    const responseGrievance = updatedGrievance
      ? { ...(updatedGrievance as any).toObject(), audioBase64 }
      : updatedGrievance;

    return res.status(201).json({
      success: true,
      grievance: responseGrievance
    });
  } catch (error) {
    // Ensure temp files are cleaned up even if the transaction fails
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
}

export async function getMyGrievances(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ message: 'Authentication required' });

    const grievances = await Grievance.find({ citizen: req.user.id }).sort({ createdAt: -1 });
    return res.json({ success: true, grievances });
  } catch (error) {
    next(error);
  }
}

export async function getAllGrievances(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { category, region, status } = req.query;
    const filter: any = {};

    if (category) filter.category = category;
    if (status) filter.status = status;
    
    // In our mock and standard Mongo setup, we search within address fields for region matches
    if (region) {
      filter['location.address'] = { $regex: String(region), $options: 'i' };
    }

    // Populate the citizen data
    const grievances = await Grievance.find(filter)
      .sort({ urgencyScore: -1 })
      .populate('citizen');

    return res.json({ success: true, grievances });
  } catch (error) {
    next(error);
  }
}

export async function getGrievancesHeatmap(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    // Only return required minimal payload for high-performance map rendering
    const grievances = await Grievance.find({});
    const heatmapData = grievances.map((g: any) => ({
      _id: g._id,
      lat: g.location?.lat,
      lng: g.location?.lng,
      urgencyScore: g.urgencyScore,
      category: g.category,
      address: g.location?.address
    }));

    return res.json({ success: true, heatmap: heatmapData });
  } catch (error) {
    next(error);
  }
}

export async function verifyGrievance(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const grievance = await Grievance.findById(id);

    if (!grievance) {
      return res.status(404).json({ message: 'Grievance not found.' });
    }

    grievance.status = 'verified';
    grievance.aiLastEvaluatedAt = null;
    await grievance.save();

    runAIPrioritizationTask();

    return res.json({
      success: true,
      message: 'Grievance successfully verified.',
      grievance
    });
  } catch (error) {
    next(error);
  }
}