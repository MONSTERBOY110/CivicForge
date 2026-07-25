import { GoogleGenAI, Type } from '@google/genai';

let aiInstance: GoogleGenAI | null = null;

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
      model: 'gemini-3.5-flash',
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
      model: 'gemini-3.5-flash',
      contents: `You are a civic triage AI. Analyze this community problem and the available developer solutions.
      
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

export async function generateBlueprint(
  grievances: any[], 
  solution: any
): Promise<{ title: string, summary: string, estimatedBudget: string }> {
  const client = getGeminiClient();
  
  const formattedGrievances = grievances.map((g, idx) => `
    [Grievance ${idx + 1}]
    Category: ${g.category}
    Description: ${g.description}
    Location: ${g.location?.address || 'Kolkata, West Bengal'} (Lat: ${g.location?.lat}, Lng: ${g.location?.lng})
    Urgency Score: ${g.urgencyScore}/100
  `).join('\n');

  const formattedSolution = solution ? `
    Title: ${solution.title}
    Description: ${solution.description}
    Tech Stack: ${solution.techStack?.join(', ')}
  ` : 'No developer solution prototype has been submitted yet. Design a standard infrastructure-level solution.';

  if (!client) {
    // Return standard fallback proposal text
    const title = `Infrastructure Improvement Blueprint for ${grievances[0]?.category || 'Civic'} development`;
    const summary = `Proposal Draft:
    This blueprint addresses ${grievances.length} public complaints regarding ${grievances[0]?.category || 'civic infrastructure'}.
    Location Focus: ${grievances[0]?.location?.address || 'Local Constituency Cluster'}.
    The planned intervention leverages developer ideas to repair and monitor public facilities, ensuring direct relief.
    Project Goals:
    1. Resolve immediate safety and utility concerns.
    2. Deliver scalable, citizen-vetted software or structural monitoring modules.`;
    const estimatedBudget = `₹ ${grievances.length * 150000} INR`;
    return { title, summary, estimatedBudget };
  }

  try {
    const response = await client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `You are an elite policy planner and budget director for a Member of Parliament (MP).
      Write a professional, funding-ready constituency development proposal draft (Project Blueprint) that aggregates the following citizen grievances and addresses them with the selected developer solution.
      
      CITIZEN GRIEVANCE CLUSTER:
      ${formattedGrievances}
      
      MATCHED DEVELOPER SOLUTION:
      ${formattedSolution}
      
      Generate a professional Title for the project, an executive Summary detailing the problem, solution, implementation plan, and public impact, and an estimated budget (in Indian Rupees, formatted clearly, e.g. "₹ 8,50,000 INR"). Make it realistic, highly detailed, and compelling.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "A formal government project title" },
            summary: { type: Type.STRING, description: "A detailed, markdown-formatted executive summary, describing the community grievances, the technical/infrastructure solution, the implementation timeline, and the positive civic outcomes." },
            estimatedBudget: { type: Type.STRING, description: "A realistic budget estimate in INR (e.g. '₹ 12,00,000 INR')" }
          },
          required: ['title', 'summary', 'estimatedBudget']
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    return {
      title: result.title || `Development Blueprint: ${grievances[0]?.category?.toUpperCase()} restoration`,
      summary: result.summary || `Detailed policy summary of ${grievances.length} grievances solved via developer prototype.`,
      estimatedBudget: result.estimatedBudget || '₹ 5,00,000 INR'
    };
  } catch (error) {
    console.error('Gemini API blueprint generation error:', error);
    return {
      title: `Development Project Blueprint: ${grievances[0]?.category || 'Civic'} infrastructure upgrade`,
      summary: `A cohesive constituency plan compiling ${grievances.length} separate public grievances.`,
      estimatedBudget: `₹ ${grievances.length * 200000} INR`
    };
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
