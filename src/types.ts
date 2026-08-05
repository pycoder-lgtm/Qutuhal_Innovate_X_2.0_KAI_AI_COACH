/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PostureAssessment {
  headNeck: string;
  shoulders: string;
  pelvisSpine: string;
  kneesAnkles: string;
  identifiedDeviations: string[];
  exerciseModifications: string[];
}

export interface UserProfile {
  email?: string;
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  height: number; // cm
  weight: number; // kg
  targetWeight?: number; // kg
  bodyFat?: number; // %
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  goals: ('fat_loss_muscle_gain' | 'stamina_metabolism_endurance')[];
  goal?: 'fat_loss_muscle_gain' | 'stamina_metabolism_endurance'; // legacy fallback
  dietPreference: 'none' | 'vegan' | 'vegetarian' | 'keto' | 'paleo' | 'low_carb' | 'gluten_free';
  allergies: string;
  workoutLocation: 'gym' | 'home' | 'both';
  dietType: 'veg' | 'non_veg' | 'vegan' | 'pescatarian';
  typicalFoods: string;
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  equipmentAvailable: string;
  injuriesOrConditions: string;
  focusAesthetic: ('muscular_buff_frame' | 'fat_loss_lean_figure')[];
  physiquePhoto?: string; // Base64 data URL (legacy or main front photo)
  rotationVideo?: string; // Base64 data URL for 360 rotation video
  photoFront?: string; // Base64 Front Photo
  photoLeft?: string; // Base64 Left Side Photo
  photoRight?: string; // Base64 Right Side Photo
  photoBack?: string; // Base64 Back Photo
  calculated_weight_kg?: number; // Single estimated weight baseline integer in kg (e.g. 84)
  predictedWeightRange?: string; // e.g. "72 - 78 kg" (kept for chat context)
  predictedHeightRange?: string; // e.g. "173 - 178 cm"
  valid_full_body?: boolean;
  rejection_reason?: string | null;
  postureAssessment?: PostureAssessment;
  physiqueAnalysis?: string; // Text summary from AI
  frontAngleReport?: string; // Front view analysis details
  sideAngleReport?: string; // Side views posture & pelvic tilt analysis
  backAngleReport?: string; // Back view lat/scapulae analysis
  frameType?: string; // Aesthetic frame archetype
  bmr?: number; // Basal Metabolic Rate (kcal)
  tdee?: number; // Total Daily Energy Expenditure (kcal)
  estimatedBodyFatPercent?: number; // %
  biomechanicalAlerts?: string[];
  aestheticPotential?: string;
  coachDirectives?: string[];
  recommendedMacros?: {
    protein: number;
    carbs: number;
    fat: number;
  };
}

export interface Meal {
  id: string;
  name: string;
  calories: number;
  protein: number; // grams
  carbs: number; // grams
  fat: number; // grams
  ingredients: string[];
  instructions?: string;
  eaten?: boolean;
}

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string; // e.g. "10-12" or "30s"
  rest: string; // e.g. "60s"
  completed?: boolean;
  notes?: string;
  videoUrl?: string;
}

export interface DailyPlan {
  date: string; // YYYY-MM-DD
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  meals: Meal[];
  workoutName: string;
  workoutType: string; // Strength, Cardio, HIIT, Rest, Recovery
  exercises: Exercise[];
  coachTip: string;
  warmupRoutine?: string;
  progressiveOverloadRule?: string;
  macroTimingTip?: string;
  waterIntakeMl?: number;
}

export interface GpsPoint {
  lat: number;
  lng: number;
  timestamp: number;
  speedMs?: number | null;
  accuracy?: number;
}

export interface ProgressLog {
  date: string; // YYYY-MM-DD
  mealsEaten: string; // e.g. "Breakfast: Eggs & toast, Lunch: Chicken salad"
  workoutsDone: string; // e.g. "Upper Body Strength"
  waterLiters: number; // e.g. 2.5
  stepsCount: number; // e.g. 8000
  distanceKm: number; // e.g. 5.5
  gpsTrack?: {
    durationSec: number;
    distanceKm: number;
    avgSpeedKmh: number;
    maxSpeedKmh: number;
    points: GpsPoint[];
    activityType: 'run' | 'walk' | 'cycle' | 'hike';
  };
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'coach';
  text: string;
  image?: string; // base64 data URL
  timestamp: string;
  mapLinks?: { title: string; uri: string; address?: string; snippet?: string }[];
  detectedLocation?: {
    city?: string;
    region?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
  };
  weeklyPlanProposal?: {
    overview: string;
    foodItemsNeeded: string[];
    weeklySchedule: {
      day: string;
      workoutName: string;
      workoutType: string;
      targetCalories: number;
      targetProtein: number;
      targetCarbs: number;
      targetFat: number;
      coachTip: string;
      warmupRoutine?: string;
      progressiveOverloadRule?: string;
      macroTimingTip?: string;
      exercises: {
        name: string;
        sets: number;
        reps: string;
        rest: string;
        notes: string;
        videoUrl?: string;
      }[];
      meals: {
        name: string;
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
        ingredients: string[];
        instructions: string;
      }[];
    }[];
  };
}

// Smartwatch Companion & Biometric Types
export type WatchConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'simulated';
export type HealthPermissionStatus = 'unprompted' | 'granted' | 'denied';

export interface WearableBiometrics {
  heartRate: number | null;
  activeCalories: number;
  stepCount: number;
  exerciseZone: 'REST' | 'WARMUP' | 'MODERATE' | 'INTENSE';
  targetMusicBpm: number;
  lastSyncedAt: string;
}

export interface UserHealthMetrics {
  stepCount: number;
  heartRate: number | null;
  sleepHours: number;
  activeCalories: number;
  connectedDeviceName: string;
  lastSyncedAt: string;
}

export interface WatchDevice {
  name: string; // 'Apple Watch', 'Galaxy Watch', 'Garmin', 'Simulated Watch'
  platform: 'ios' | 'android' | 'mock';
}

export interface BodyScanAnalysis {
  id: string;
  date: string;
  bodyFatEst: number;
  postureScore: number;
  postureNotes: string;
  shoulderSymmetry: string;
  pelvicTilt: string;
  muscleHighlights: string[];
  recommendations: string[];
  rawAnalysisText?: string;
}
