import { GoogleGenAI } from '@google/genai';
import { BodyScanAnalysis } from '../types';

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

function parseScanAnalysisResponse(rawText: string): BodyScanAnalysis {
  let bodyFatEst = 15;
  let postureScore = 85;
  let summaryParagraph = "Your body posture looks balanced and overall shape is healthy and natural. You have a good standing posture, so keep your shoulders relaxed, stand tall, and stay active with regular daily movement.";
  let postureNotes = "Good standing posture with balanced shoulders and neck.";
  let shoulderSymmetry = "Shoulders are level and balanced.";
  let pelvicTilt = "Standing straight with normal natural alignment.";
  let muscleHighlights: string[] = ["Chest", "Back", "Core"];
  let recommendations: string[] = [
    "Stand tall with relaxed shoulders.",
    "Do light daily walking and stretching.",
    "Keep your core engaged when sitting."
  ];

  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.bodyFatEst) bodyFatEst = Number(parsed.bodyFatEst);
      if (parsed.postureScore) postureScore = Number(parsed.postureScore);
      if (parsed.summaryParagraph) summaryParagraph = String(parsed.summaryParagraph);
      if (parsed.postureNotes) postureNotes = String(parsed.postureNotes);
      if (parsed.shoulderSymmetry) shoulderSymmetry = String(parsed.shoulderSymmetry);
      if (parsed.pelvicTilt) pelvicTilt = String(parsed.pelvicTilt);
      if (Array.isArray(parsed.muscleHighlights)) muscleHighlights = parsed.muscleHighlights;
      if (Array.isArray(parsed.recommendations)) recommendations = parsed.recommendations;
    }
  } catch (e) {
    console.warn("Using text fallback for scan analysis parsing");
  }

  // Ensure summaryParagraph is clean and present
  if (!summaryParagraph || summaryParagraph.length < 10) {
    summaryParagraph = `${postureNotes} ${shoulderSymmetry} ${pelvicTilt}`.replace(/\s+/g, ' ').trim();
  }

  const currentDate = new Date().toISOString().split('T')[0];

  return {
    id: `scan_${Date.now()}`,
    date: currentDate,
    summaryParagraph: summaryParagraph,
    bodyFatEst: bodyFatEst,
    postureScore: postureScore,
    postureNotes: postureNotes,
    shoulderSymmetry: shoulderSymmetry,
    pelvicTilt: pelvicTilt,
    muscleHighlights: muscleHighlights,
    recommendations: recommendations,
    rawAnalysisText: summaryParagraph
  };
}

export async function analyzeBodyScanSafely(imagesBase64: string[]): Promise<ScanResult> {
  try {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { success: false, error: 'No internet connection detected.' };
    }

    if (!imagesBase64 || imagesBase64.length === 0) {
      return { success: false, error: 'No photos detected.' };
    }

    const apiKey = getApiKey();
    if (!apiKey) {
      return { success: false, error: 'Gemini API key is not configured.' };
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

    const systemPrompt = "You are Coach Kai, a friendly fitness coach. Analyze the provided 4 body posture photos (Front, Back, Left, Right). Write your complete scan analysis result in VERY simple, friendly, everyday language in EXACTLY ONE short paragraph (2 to 4 simple sentences max). Common everyday people will use this app, so YOU ARE STRICTLY FORBIDDEN from using complex, medical, or scientific jargon words like 'endomorph', 'ectomorph', 'mesomorph', 'anterior pelvic tilt', 'scapular', 'hypertrophy', 'cervical', 'lumbar', 'BMR', 'TDEE', etc. Use simple everyday words everyone knows (e.g. 'good standing posture', 'straight back', 'slight shoulder tilt', 'healthy overall shape'). End your response with a JSON block in this exact format: { \"summaryParagraph\": \"Your posture looks balanced and overall body shape is healthy and natural. You have a good standing posture, so keep your shoulders relaxed and stay active with light daily walking and stretching.\", \"bodyFatEst\": 15, \"postureScore\": 85, \"postureNotes\": \"Good standing posture with balanced shoulders.\", \"shoulderSymmetry\": \"Shoulders are level and steady.\", \"pelvicTilt\": \"Standing straight with normal alignment.\", \"muscleHighlights\": [\"Chest\", \"Back\", \"Core\"], \"recommendations\": [\"Stand tall with relaxed shoulders.\", \"Do light daily walking and stretching.\"] }";

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: [systemPrompt, ...imageParts],
    });

    const rawContent = response.text || '';

    if (!rawContent) {
      return { success: false, error: 'Empty AI response.' };
    }

    const parsedAnalysis = parseScanAnalysisResponse(rawContent);

    return {
      success: true,
      data: parsedAnalysis,
      rawText: rawContent
    };

  } catch (err) {
    const error = err as Error;
    return { success: false, error: error.message || 'An unexpected error occurred.' };
  }
}