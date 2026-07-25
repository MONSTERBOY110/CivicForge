import { GoogleGenAI, Type } from '@google/genai';

let aiInstance: GoogleGenAI | null = null;

/**
 * Model tiers, split by call volume rather than by importance.
 *
 * FAST_MODEL handles everything that runs per grievance: categorisation, the
 * background priority daemon, and briefing translation. These are short,
 * schema-constrained tasks a lite model does well, and they dominate request
 * count, so this is where cost and free-tier quota are won or lost.
 *
 * QUALITY_MODEL handles the funding blueprint only. That is one call per MP
 * authorisation and it produces the document an MP actually reads, so it is
 * worth the stronger model.
 *
 * Free-tier request quota is per project PER MODEL, so these two tiers also draw
 * from separate buckets. Override either without touching code.
 */
const FAST_MODEL = process.env.GEMINI_FAST_MODEL || 'gemini-3.5-flash-lite';
const QUALITY_MODEL = process.env.GEMINI_QUALITY_MODEL || 'gemini-flash-lite-latest';

function getGeminiClient(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY is not defined in environment. Using fallback heuristic-based service.');
      return null as any;
    }
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

// Fallback heuristic scoring if Gemini API Key is missing
function fallbackCategorizeAndScore(description: string) {
  const descLower = description.toLowerCase();
  let category = 'other';
  if (descLower.includes('water') || descLower.includes('pipe') || descLower.includes('drain')) {
    category = 'water';
  } else if (descLower.includes('road') || descLower.includes('pothole') || descLower.includes('bridge') || descLower.includes('street')) {
    category = 'road';
  } else if (descLower.includes('electricity') || descLower.includes('power') || descLower.includes('wire') || descLower.includes('light')) {
    category = 'electricity';
  } else if (descLower.includes('garbage') || descLower.includes('trash') || descLower.includes('sanitation') || descLower.includes('waste')) {
    category = 'sanitation';
  } else if (descLower.includes('hospital') || descLower.includes('clinic') || descLower.includes('health') || descLower.includes('doctor')) {
    category = 'health';
  } else if (descLower.includes('school') || descLower.includes('education') || descLower.includes('college') || descLower.includes('class')) {
    category = 'education';
  }

  // Guess stress score from words
  let stressScore = 40;
  if (descLower.includes('urgent') || descLower.includes('danger') || descLower.includes('injury') || descLower.includes('broken')) {
    stressScore = 85;
  } else if (descLower.includes('terrible') || descLower.includes('severe') || descLower.includes('stink') || descLower.includes('accident')) {
    stressScore = 70;
  }

  const summary = description.substring(0, 80) + (description.length > 80 ? '...' : '');

  return { category, stressScore, summary };
}

export async function categorizeAndScoreText(description: string): Promise<{ category: string, stressScore: number, summary: string }> {
  const client = getGeminiClient();
  if (!client) {
    return fallbackCategorizeAndScore(description);
  }

  try {
    const response = await client.models.generateContent({
      model: FAST_MODEL,
      contents: `You are a civic analytics AI. Analyze this citizen complaint description and classify it into one of these categories: 'water', 'road', 'electricity', 'sanitation', 'health', 'education', 'other'. Also estimate a stress/urgency score (0 to 100) based on the tone, language intensity, safety hazards, and distress level of the text. Finally, write a one-sentence summary of the grievance.
      
      Grievance Description: "${description}"`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { 
              type: Type.STRING, 
              description: "Must be exactly one of: 'water', 'road', 'electricity', 'sanitation', 'health', 'education', 'other'" 
            },
            stressScore: { 
              type: Type.INTEGER, 
              description: "An urgency/distress rating from 0 (very low) to 100 (life-threatening/extreme urgency)" 
            },
            summary: { 
              type: Type.STRING, 
              description: "A highly clear, objective one-sentence summary of the issue." 
            }
          },
          required: ['category', 'stressScore', 'summary']
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    // Ensure scores are within bounds and values are clean
    const allowedCategories = ['water', 'road', 'electricity', 'sanitation', 'health', 'education', 'other'];
    const category = allowedCategories.includes(result.category) ? result.category : 'other';
    const stressScore = Math.min(Math.max(Number(result.stressScore) || 50, 0), 100);
    const summary = result.summary || description.substring(0, 100);

    return { category, stressScore, summary };
  } catch (error) {
    console.error('Gemini API categorization error:', error);
    return fallbackCategorizeAndScore(description);
  }
}

// ... (keep existing imports and functions)

export async function evaluatePriorityAndSuitability(grievance: any, solutions: any[]): Promise<any> {
  const client = getGeminiClient();
  if (!client) return null;

  const solutionsText = solutions.map(s => 
    `ID: ${s._id} | Title: ${s.title} | Tech: ${s.techStack.join(', ')} | Desc: ${s.description}`
  ).join('\n');

  try {
    const response = await client.models.generateContent({
      model: FAST_MODEL,
      contents: `You are a civic triage AI. Analyze this community problem and the available civic engineer solutions.
      
      PROBLEM:
      Description: ${grievance.description}
      Category: ${grievance.category}
      Recurrence Count: ${grievance.recurrenceCount}
      
      AVAILABLE SOLUTIONS:
      ${solutionsText || 'No solutions available for this category yet.'}
      
      Calculate a priority score (0-100) based strictly on human distress and safety. Write a 1-2 sentence explanation. 
      Then, score how well each available solution addresses this specific problem (0-100) with a brief explanation.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            aiPriorityScore: { type: Type.INTEGER },
            aiPriorityExplanation: { type: Type.STRING },
            solutionSuitability: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  solutionId: { type: Type.STRING },
                  score: { type: Type.INTEGER },
                  explanation: { type: Type.STRING }
                }
              }
            }
          },
          required: ['aiPriorityScore', 'aiPriorityExplanation']
        }
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error('Gemini API Priority Evaluation Error:', error);
    return null;
  }
}

export interface PipelineStage {
  order: number;
  title: string;
  detail: string;
  category: string;
  coveredGrievanceIds: string[];
}

const PIPELINE_CATEGORIES = ['water', 'road', 'electricity', 'sanitation', 'health', 'education', 'general'];

/** Depth order for the fallback: deepest utilities first, so nothing built on top is reopened. */
const SUBSURFACE_ORDER = ['water', 'sanitation', 'electricity'];

/**
 * Deterministic execution pipeline used when Gemini is unavailable. Follows the
 * same site-engineering rule the prompt teaches the model: subsurface utilities
 * (water, sewage, electrical ducts) before any surface work, restoration last.
 */
function buildFallbackPipeline(grievances: any[], nearbyGrievances: any[]): PipelineStage[] {
  const clusterCategory = grievances[0]?.category || 'general';
  const idsByCategory = new Map<string, string[]>();
  for (const g of [...grievances, ...nearbyGrievances]) {
    const cat = g.category || 'general';
    idsByCategory.set(cat, [...(idsByCategory.get(cat) || []), String(g._id)]);
  }

  const stages: Omit<PipelineStage, 'order'>[] = [{
    title: 'Site survey and utility mapping',
    detail: 'Mapping every existing utility line first prevents accidental damage and fixes the work sequence for all later stages.',
    category: 'general',
    coveredGrievanceIds: []
  }];

  for (const cat of SUBSURFACE_ORDER) {
    if (!idsByCategory.has(cat)) continue;
    const labels: Record<string, string> = {
      water: 'Excavate and lay water supply and drainage lines',
      sanitation: 'Install sewage and waste conduits',
      electricity: 'Lay electrical cable ducts and crossings'
    };
    stages.push({
      title: labels[cat],
      detail: 'Subsurface work goes in before anything is built on top, so the finished surface is never dug up again for a utility that was already known.',
      category: cat,
      coveredGrievanceIds: idsByCategory.get(cat) || []
    });
  }

  if (!SUBSURFACE_ORDER.includes(clusterCategory)) {
    stages.push({
      title: clusterCategory === 'road'
        ? 'Roadbed preparation, drainage grading and paving'
        : `Primary ${clusterCategory} works`,
      detail: 'Surface construction begins only after every underground utility on this stretch is in place.',
      category: clusterCategory,
      coveredGrievanceIds: idsByCategory.get(clusterCategory) || []
    });
  }

  stages.push({
    title: 'Surface restoration and quality walkthrough',
    detail: 'Final finishing, site clearance and a verification walkthrough before the works are signed off.',
    category: 'general',
    coveredGrievanceIds: []
  });

  return stages.map((s, i) => ({ ...s, order: i + 1 }));
}

/**
 * Cleans a model-emitted pipeline: reindexes order, clamps categories to the
 * known set, and drops any coveredGrievanceIds that were not in the lists we
 * actually showed the model (never trust generated ids).
 */
function normalizePipeline(raw: any, allowedIds: Set<string>): PipelineStage[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  return raw
    .filter((s: any) => s && typeof s.title === 'string' && s.title.trim())
    .sort((a: any, b: any) => (Number(a.order) || 0) - (Number(b.order) || 0))
    .slice(0, 8)
    .map((s: any, i: number) => ({
      order: i + 1,
      title: String(s.title).trim(),
      detail: String(s.detail || '').trim(),
      category: PIPELINE_CATEGORIES.includes(s.category) ? s.category : 'general',
      coveredGrievanceIds: (Array.isArray(s.coveredGrievanceIds) ? s.coveredGrievanceIds : [])
        .map((id: any) => String(id))
        .filter((id: string) => allowedIds.has(id))
    }));
}

export async function generateBlueprint(
  grievances: any[],
  solution: any,
  nearbyGrievances: any[] = []
): Promise<{ title: string, summary: string, estimatedBudget: string, executionPipeline: PipelineStage[] }> {
  const client = getGeminiClient();

  const formattedGrievances = grievances.map((g, idx) => `
    [Grievance ${idx + 1}] (id: ${g._id})
    Category: ${g.category}
    Description: ${g.description}
    Location: ${g.location?.address || 'Kolkata, West Bengal'} (Lat: ${g.location?.lat}, Lng: ${g.location?.lng})
    Urgency Score: ${g.urgencyScore}/100
  `).join('\n');

  const formattedNearby = nearbyGrievances.length
    ? nearbyGrievances.map((g) => `
    (id: ${g._id}) [${g.category}] ${g.description} — ${g.location?.address || 'nearby'}`).join('\n')
    : 'None found.';

  const allowedIds = new Set<string>([...grievances, ...nearbyGrievances].map(g => String(g._id)));

  // Costing guidance differs sharply by delivery type, and the budget line is the
  // number the MP actually authorises, so the type is stated explicitly.
  const BUDGET_GUIDANCE: Record<string, string> = {
    software: 'This is a SOFTWARE solution. Budget for development, hosting, integration with municipal systems, training and support. There is no per-unit hardware cost.',
    hardware: 'This is a HARDWARE solution. Budget per unit and state the unit count, plus site installation labour, power and connectivity, spares, calibration and annual maintenance.',
    hybrid: 'This is a HYBRID hardware plus software solution. Budget the physical units (per-unit cost x unit count, installation, maintenance) AND the software platform (development, hosting, integration) as separate line items.'
  };

  const solutionType = solution?.solutionType || 'software';

  const formattedSolution = solution ? `
    Title: ${solution.title}
    Description: ${solution.description}
    Delivery Type: ${solutionType}
    Tech Stack / Components: ${solution.techStack?.join(', ')}

    BUDGETING RULES FOR THIS DELIVERY TYPE:
    ${BUDGET_GUIDANCE[solutionType] || BUDGET_GUIDANCE.software}
  ` : 'No civic engineer solution prototype has been submitted yet. Design a standard infrastructure-level solution.';

  if (!client) {
    // Return standard fallback proposal text
    const title = `Infrastructure Improvement Blueprint for ${grievances[0]?.category || 'Civic'} development`;
    const summary = `Proposal Draft:
    This blueprint addresses ${grievances.length} public complaints regarding ${grievances[0]?.category || 'civic infrastructure'}.
    Location Focus: ${grievances[0]?.location?.address || 'Local Constituency Cluster'}.
    The planned intervention leverages civic engineer-built solutions to repair and monitor public facilities, ensuring direct relief.
    Project Goals:
    1. Resolve immediate safety and utility concerns.
    2. Deliver scalable, citizen-vetted software or structural monitoring modules.`;
    const estimatedBudget = `₹ ${grievances.length * 150000} INR`;
    return { title, summary, estimatedBudget, executionPipeline: buildFallbackPipeline(grievances, nearbyGrievances) };
  }

  try {
    const response = await client.models.generateContent({
      model: QUALITY_MODEL,
      contents: `You are an elite policy planner and budget director for a Member of Parliament (MP).
      Write a professional, funding-ready constituency development proposal draft (Project Blueprint) that aggregates the following citizen grievances and addresses them with the selected civic engineer solution.
      
      CITIZEN GRIEVANCE CLUSTER:
      ${formattedGrievances}
      
      MATCHED CIVIC ENGINEER SOLUTION:
      ${formattedSolution}

      NEARBY OPEN ISSUES FROM OTHER DEPARTMENTS (within 1 km of this cluster):
      ${formattedNearby}

      Generate a professional Title for the project, an executive Summary detailing the problem, solution, implementation plan, and public impact, and an estimated budget (in Indian Rupees, formatted clearly, e.g. "₹ 8,50,000 INR"). Make it realistic, highly detailed, and compelling.

      Also generate an executionPipeline: 3 to 6 ordered stages describing how the work is physically sequenced on site, the way a site engineer plans it.
      SEQUENCING RULES:
      - Underground or subsurface work (water pipelines, sewage, electrical cable ducts) MUST come before surface work (roadbed, paving, footpaths). A freshly built surface must never be dug up again for a utility that was already known.
      - If a NEARBY OPEN ISSUE can be solved by work inside this same project (for example laying water lines under a road before it is paved), give that work its own early stage and put that issue's id in the stage's coveredGrievanceIds.
      - Every stage's detail must state in one sentence why this stage comes before the next one.
      - coveredGrievanceIds may ONLY contain ids that appear in the lists above. Use an empty array otherwise.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "A formal government project title" },
            summary: { type: Type.STRING, description: "A detailed, markdown-formatted executive summary, describing the community grievances, the technical/infrastructure solution, the implementation timeline, and the positive civic outcomes." },
            estimatedBudget: { type: Type.STRING, description: "A realistic budget estimate in INR (e.g. '₹ 12,00,000 INR')" },
            executionPipeline: {
              type: Type.ARRAY,
              description: "Ordered on-site work stages, subsurface utilities before surface construction.",
              items: {
                type: Type.OBJECT,
                properties: {
                  order: { type: Type.INTEGER, description: "1-based position in the sequence" },
                  title: { type: Type.STRING, description: "Short imperative stage name, e.g. 'Excavate and lay water supply lines'" },
                  detail: { type: Type.STRING, description: "What the stage covers and why it precedes the next stage" },
                  category: { type: Type.STRING, description: "One of: water, road, electricity, sanitation, health, education, general" },
                  coveredGrievanceIds: { type: Type.ARRAY, items: { type: Type.STRING }, description: "ids from the provided lists that this stage resolves; empty if none" }
                },
                required: ['order', 'title', 'detail', 'category']
              }
            }
          },
          required: ['title', 'summary', 'estimatedBudget', 'executionPipeline']
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    const pipeline = normalizePipeline(result.executionPipeline, allowedIds);
    return {
      title: result.title || `Development Blueprint: ${grievances[0]?.category?.toUpperCase()} restoration`,
      summary: result.summary || `Detailed policy summary of ${grievances.length} grievances solved via civic engineer prototype.`,
      estimatedBudget: result.estimatedBudget || '₹ 5,00,000 INR',
      executionPipeline: pipeline.length ? pipeline : buildFallbackPipeline(grievances, nearbyGrievances)
    };
  } catch (error) {
    console.error('Gemini API blueprint generation error:', error);
    return {
      title: `Development Project Blueprint: ${grievances[0]?.category || 'Civic'} infrastructure upgrade`,
      summary: `A cohesive constituency plan compiling ${grievances.length} separate public grievances.`,
      estimatedBudget: `₹ ${grievances.length * 200000} INR`,
      executionPipeline: buildFallbackPipeline(grievances, nearbyGrievances)
    };
  }
}

/**
 * Translates text into `targetLanguage` for the MP audio briefing, so ElevenLabs
 * can speak the summary in the language the MP picked.
 *
 * The output is fed straight to text-to-speech, so the prompt forbids any
 * preamble, quoting or markdown.
 *
 * Returns null when the translation could not be produced (no API key, rate
 * limit, empty reply). It deliberately does NOT fall back to the original text:
 * callers must be able to tell that they are about to speak English, otherwise
 * the UI highlights Hindi while English plays and the failure is invisible.
 */
export async function translateText(text: string, targetLanguage: string): Promise<string | null> {
  const client = getGeminiClient();
  if (!client || !text?.trim()) return null;

  try {
    const response = await client.models.generateContent({
      model: FAST_MODEL,
      contents: `Translate the text below into ${targetLanguage}.
      It will be read aloud by a text-to-speech engine, so reply with ONLY the translated text: no preamble, no quotation marks, no markdown.
      Translate EVERY word into the native script of ${targetLanguage}. Do not leave ordinary words in Latin script.
      Keep numbers as digits. Place names may stay in their usual form.

      Text: "${text}"`
    });

    return response.text?.trim() || null;
  } catch (error) {
    console.error('Gemini translation error:', error);
    return null;
  }
}

/**
 * Generates a 768-dimension text embedding for a grievance description using
 * Gemini `gemini-embedding-001` (reduced to 768 dims). Powers Atlas Vector
 * Search semantic clustering. Returns null when no API key or on error (callers
 * fall back to geo-only clustering), matching this service's graceful degradation.
 *
 * NOTE: outputDimensionality (768) must match the Atlas Vector Search index
 * (`numDimensions: 768`). Cosine similarity is magnitude-invariant, so the
 * reduced-dimension vectors need no manual normalization.
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  const client = getGeminiClient();
  if (!client) return null;

  try {
    const response = await client.models.embedContent({
      model: 'gemini-embedding-001',
      contents: text,
      config: { outputDimensionality: 768 }
    });
    // @google/genai returns { embeddings: [{ values: number[] }] }
    const values = response.embeddings?.[0]?.values;
    return Array.isArray(values) && values.length > 0 ? values : null;
  } catch (error) {
    console.error('Gemini embedding generation error:', error);
    return null;
  }
}
