import { GoogleGenAI, Type } from '@google/genai';
import { BodyScanAnalysis } from '../types';

export interface UserMetadata {
  name?: string;
  heightCm?: number | string;
  height?: number | string;
  age?: number | string;
  gender?: string;
  weight?: number | string;
}

export interface ScanResult {
  success: boolean;
  data?: BodyScanAnalysis;
  rawText?: string;
  error?: string;
}

const getApiKey = (): string => {
  const meta = import.meta as any;
  const key = meta.env?.VITE_GEMINI_API_KEY || meta.env?.GEMINI_API_KEY || '';
  return key.trim();
};

async function compressImageBase64(base64Data: string, maxWidth = 800): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Data.startsWith('data:') ? base64Data : `data:image/jpeg;base64,${base64Data}`;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
      }
      
      resolve(canvas.toDataURL('image/jpeg', 0.75));
    };

    img.onerror = () => {
      resolve(base64Data);
    };
  });
}

export function parseScanAnalysisResponse(rawText: string): BodyScanAnalysis {
  let cleanText = rawText.trim();
  if (cleanText.startsWith("```")) {
    cleanText = cleanText.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/, "").trim();
  }
  
  const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Response did not contain valid JSON content");
  }

  const parsed = JSON.parse(jsonMatch[0]);

  const estimatedWeight = String(parsed.estimatedWeight || parsed.calculated_weight_kg || parsed.calculatedWeightKg || "88 kg");
  const somatotype = String(parsed.somatotype || parsed.frameType || parsed.bodyType || "Endomorph");
  const bodyFatPercentage = String(parsed.bodyFatPercentage || parsed.bodyFatEstimate || parsed.estimatedBodyFat || "22% - 25%");

  let personalizedDefinition = String(parsed.personalizedDefinition || "").trim();

  if (!personalizedDefinition) {
    const lowerSoma = somatotype.toLowerCase();
    if (lowerSoma.includes("ectomorph") || lowerSoma.includes("ecto")) {
      personalizedDefinition = "This body type naturally has a slender frame and a fast metabolism. Your body builds strength best with simple weight training and good daily nutrition.";
    } else if (lowerSoma.includes("mesomorph") || lowerSoma.includes("meso")) {
      personalizedDefinition = "This body type naturally builds muscle easily and has an athletic frame. Your body responds quickly to regular physical exercises and simple workout routines.";
    } else {
      personalizedDefinition = "This body type naturally has a wider frame and holds onto weight easily. Your body thrives with regular strength training and daily active movement to stay fit and energetic.";
    }
  }

  const weightNum = parseFloat(estimatedWeight.replace(/[^0-9.]/g, '')) || 88;

  return {
    id: `scan_${Date.now()}`,
    date: new Date().toISOString().split('T')[0],
    estimatedWeight,
    somatotype,
    bodyFatPercentage,
    personalizedDefinition,
    detailedSomatotypeAnalysis: {
      fatDistribution: personalizedDefinition,
      muscleMassTendencies: `Frame Classification: ${somatotype}`,
      posturalAlignment: "Standard posture scan"
    },
    simpleSummary: personalizedDefinition,
    // Backwards compatibility mapping
    estimatedWeightKg: weightNum,
    muscleMassPercentage: 0,
    structuralFlaws: [],
    bodyCompositionSummary: personalizedDefinition,
    calculatedWeightKg: estimatedWeight,
    estimatedBodyFatPercentage: bodyFatPercentage,
    muscleMassIndex: somatotype,
    structuralDeviations: [],
    physiologicalRisks: [],
    bodyFatPercentageRange: bodyFatPercentage,
    muscleMassDistribution: "",
    posturalDeviations: [],
    priorityFocusAreas: [personalizedDefinition],
    estimatedBodyFat: bodyFatPercentage,
    bodyStructure: personalizedDefinition,
    areasForImprovement: "",
    coachKaiSummary: personalizedDefinition,
    startingSummary: personalizedDefinition,
    summaryParagraph: personalizedDefinition,
    bodyType: somatotype,
    postureInsights: personalizedDefinition,
    rawAnalysisText: rawText
  };
}

export async function analyzeBodyScanSafely(
  imagesBase64: string[],
  userMetadata?: UserMetadata
): Promise<ScanResult> {
  try {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { 
        success: false, 
        error: 'Network offline. Please check your internet connection and try again.'
      };
    }

    if (!imagesBase64 || imagesBase64.length === 0) {
      return { 
        success: false, 
        error: 'Please capture or upload at least 1 body photo before starting the scan.' 
      };
    }

    const apiKey = getApiKey();
    if (!apiKey) {
      return {
        success: false,
        error: 'Gemini API key missing. Please provide a valid API key in environment or settings.'
      };
    }

    const ai = new GoogleGenAI({ apiKey });

    const compressedImages = await Promise.all(
      imagesBase64.map((img) => compressImageBase64(img))
    );

    const imageParts = compressedImages.map((imgData) => {
      const cleanBase64 = imgData.includes(',') ? imgData.split(',')[1] : imgData;
      return {
        inlineData: {
          mimeType: 'image/jpeg',
          data: cleanBase64,
        },
      };
    });

    const heightVal = userMetadata?.heightCm || userMetadata?.height || 175;
    const heightFormatted = typeof heightVal === 'number' ? `${heightVal} cm` : String(heightVal).includes('cm') || String(heightVal).includes("'") ? String(heightVal) : `${heightVal} cm`;
    const ageVal = userMetadata?.age || 25;

    const systemPrompt = `The user in these photos is ${ageVal} years old and exactly ${heightFormatted} tall. You MUST use this height as your strict mathematical anchor. Calculate the volumetric mass of their specific somatotype at this exact height to determine their estimatedWeight.

Focus the visual analysis on calculating Body Fat % Range, Somatotype Classification, and Biomechanical Posture Flags. Use visual muscle definition, tissue composition, and age-adjusted volumetric estimates to compute the values cleanly.

OUTPUT INSTRUCTIONS:
1. somatotype: Exact somatotype category (e.g. 'Endomorph', 'Ectomorph', 'Mesomorph', 'Endo-Mesomorph').
2. bodyFatPercentage: Estimated body fat percentage range (e.g. '22% - 25%').
3. estimatedWeight: Realistic weight estimate derived from age, frame volume, and somatotype (e.g. '88 kg').
4. personalizedDefinition: A clear 2-3 sentence explanation of what this body somatotype means in extremely simple, everyday English.

LINGUISTIC & READING LEVEL RULES FOR personalizedDefinition:
- Zero Jargon: You are strictly forbidden from using medical, anatomical, or clinical words (e.g., do NOT use words like adipose, visceral, hypertrophy, biomechanical, anterior, basal metabolic rate).
- 5th Grade Reading Level: Use only simple, everyday words.
  * Instead of 'adipose tissue accumulation,' say 'holding onto extra fat.'
  * Instead of 'hypertrophy potential,' say 'building muscle.'
  * Instead of 'lean skeletal frame,' say 'a naturally thin build.'
- Tone & Structure:
  * Keep it to exactly 2 or 3 short sentences.
  * Speak like a friendly, normal personal trainer talking to a beginner.
  * Example Endomorph output: "You have a naturally wider build that puts on weight easily. To get the best results, focus on adding more daily movement and lifting weights to turn that mass into strong muscle."
  * Example Ectomorph output: "You have a naturally thin build and a fast metabolism that burns energy quickly. To get stronger, you'll want to eat plenty of food and focus on heavy weightlifting to build up your muscles."

Output raw structured JSON conforming strictly to the responseSchema.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: [systemPrompt, ...imageParts],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            somatotype: {
              type: Type.STRING,
              description: "Exact somatotype category (e.g. 'Endomorph', 'Ectomorph', 'Mesomorph', 'Endo-Mesomorph')",
            },
            bodyFatPercentage: {
              type: Type.STRING,
              description: "Estimated body fat percentage range (e.g. '22% - 25%')",
            },
            estimatedWeight: {
              type: Type.STRING,
              description: "Realistic weight estimate derived from age, frame volume, and somatotype (e.g. '88 kg')",
            },
            personalizedDefinition: {
              type: Type.STRING,
              description: "A clear 2-3 sentence explanation of what this somatotype means for their specific frame and training approach in simple, everyday language.",
            },
          },
          required: [
            "somatotype",
            "bodyFatPercentage",
            "estimatedWeight",
            "personalizedDefinition",
          ],
        },
      },
    });

    const rawContent = response.text || '';
    if (!rawContent) {
      return { 
        success: false, 
        error: 'Empty response received from vision model. Please try again.' 
      };
    }

    const parsedAnalysis = parseScanAnalysisResponse(rawContent);
    return {
      success: true,
      data: parsedAnalysis,
      rawText: rawContent
    };

  } catch (err: any) {
    console.error("Body scan API error:", err);
    return {
      success: false,
      error: `API Error: ${err?.message || 'Vision API call failed. Please check network/API connection and try again.'}`
    };
  }
}