/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DailyPlan, UserProfile } from '../types';
import { 
  Flame, Dumbbell, Utensils, Droplet, CheckCircle2, 
  Circle, ChevronDown, ChevronUp, Sparkles, AlertCircle, RefreshCw,
  Plus, Minus, Info, CalendarClock, Search, Database, PlusCircle, Check,
  Bell, AlarmClock, Volume2, VolumeX, Video, ExternalLink, TrendingUp, Zap,
  Trophy, Award, Crown, ShieldCheck, Star, Target, Medal, Play, ChevronRight
} from 'lucide-react';
// @ts-expect-error - dynamic image asset
import muscleAnatomyBase from '../assets/images/muscle_anatomy_base_1784623731039.jpg';

interface DashboardProps {
  profile: UserProfile;
  plan: DailyPlan | null;
  onUpdatePlan: (updatedPlan: DailyPlan) => void;
  onGeneratePlan: (customMsg?: string) => Promise<void>;
  loading: boolean;
  onUpdateProfile: (profile: UserProfile) => void;
  selectedDay: string;
  onSelectDay: (day: string) => void;
  onChangeTab?: (tab: 'today' | 'chat' | 'metrics' | 'profile_edit') => void;
}

const musclesData = [
  { id: 'chest', name: 'Chest', technicalName: 'Pectoralis Major', x: 28, y: 27 },
  { id: 'back', name: 'Back', technicalName: 'Latissimus Dorsi & Rhomboids', x: 70, y: 29 },
  { id: 'biceps', name: 'Biceps', technicalName: 'Biceps Brachii', x: 13, y: 35 },
  { id: 'triceps', name: 'Triceps', technicalName: 'Triceps Brachii', x: 86, y: 34 },
  { id: 'abs', name: 'Abs', technicalName: 'Rectus Abdominis', x: 30, y: 40 },
  { id: 'legs', name: 'Legs', technicalName: 'Quadriceps, Hamstrings & Calves', x: 26, y: 64 },
  { id: 'forearms', name: 'Forearms', technicalName: 'Brachioradialis & Flexors', x: 10, y: 45 },
  { id: 'shoulders', name: 'Shoulders', technicalName: 'Deltoids', x: 19, y: 26 }
];

const DEFAULT_SPLIT_EXERCISES: Record<string, any[]> = {
  monday: [
    // Chest (Push)
    { name: "Incline Dumbbell Bench Press", category: "Chest", description: "Press dumbbells upward at a 30-45 degree incline to target the upper clavicular head of the pectorals.", muscles: ["Chest", "Shoulders (Anterior)", "Triceps"], sets: 4, reps: "8-10 reps", rest: "90s" },
    { name: "Dumbbell Flat Bench Press", category: "Chest", description: "Lie flat on a bench, lower dumbbells with elbows at a 45-degree angle to chest, and press up to target middle and lower chest.", muscles: ["Chest", "Triceps", "Shoulders"], sets: 4, reps: "10 reps", rest: "90s" },
    { name: "Barbell Flat Bench Press", category: "Chest", description: "Standard barbell press on a flat bench to build overall chest mass, anterior deltoids, and tricep power.", muscles: ["Chest", "Shoulders", "Triceps"], sets: 4, reps: "8-10 reps", rest: "120s" },
    { name: "Decline Dumbbell Bench Press", category: "Chest", description: "Press dumbbells on a decline bench to target the lower costal fibers of the pectoralis major.", muscles: ["Chest (Lower)", "Triceps"], sets: 3, reps: "10-12 reps", rest: "90s" },
    { name: "Cable Crossovers (High-to-Low)", category: "Chest", description: "Squeeze cable pulleys downward and forward to isolate the lower pectorals and build strong inner chest definition.", muscles: ["Chest (Lower/Inner)"], sets: 3, reps: "12-15 reps", rest: "60s" },
    { name: "Pec Deck Chest Flyes", category: "Chest", description: "Keep a slight bend in the elbows and squeeze handles together to isolate the sternal head of the chest without shoulder stress.", muscles: ["Chest"], sets: 3, reps: "12-15 reps", rest: "60s" },
    { name: "Classic Bodyweight Push-ups", category: "Chest", description: "Support body on toes and hands, lowering chest to the floor. Focus on a rigid core and full pectoralis stretch.", muscles: ["Chest", "Triceps", "Shoulders"], sets: 3, reps: "15-20 reps", rest: "60s" },
    
    // Delts / Shoulders (Push)
    { name: "Seated Dumbbell Shoulder Press", category: "Shoulders", description: "Sit upright, press dumbbells vertically overhead to target lateral and anterior deltoids.", muscles: ["Shoulders", "Triceps"], sets: 3, reps: "8-10 reps", rest: "90s" },
    { name: "Dumbbell Lateral Raises", category: "Shoulders", description: "Raise dumbbells to the sides with a slight elbow bend to isolate the lateral deltoid head for visual shoulder width.", muscles: ["Shoulders (Lateral)"], sets: 4, reps: "12-15 reps", rest: "45s" },
    { name: "Overhead Barbell Press", category: "Shoulders", description: "Standing military press pushing a barbell from collarbones overhead to build raw front-delt and core power.", muscles: ["Shoulders (Anterior)", "Triceps", "Core"], sets: 4, reps: "6-8 reps", rest: "120s" },
    { name: "Dumbbell Arnold Press", category: "Shoulders", description: "Rotate palms from facing in to facing out during the upward press phase to target all three deltoid heads.", muscles: ["Shoulders", "Triceps"], sets: 3, reps: "10 reps", rest: "75s" },
    { name: "Cable Lateral Raises", category: "Shoulders", description: "Perform lateral raises using a low cable pulley to maintain constant tension throughout the entire range of motion.", muscles: ["Shoulders (Lateral)"], sets: 3, reps: "12-15 reps", rest: "45s" },
    
    // Triceps (Push)
    { name: "Overhead Rope Tricep Extensions", category: "Arms", description: "Extend rope attachment overhead using cables or a dumbbell to isolate the long head of the triceps.", muscles: ["Triceps (Long Head)"], sets: 3, reps: "12 reps", rest: "60s" },
    { name: "Cable Tricep Pushdowns (Rope)", category: "Arms", description: "Push cable rope down and flare wrists at the bottom to maximize lateral tricep recruitment and lockout power.", muscles: ["Triceps (Lateral/Medial Head)"], sets: 3, reps: "12-15 reps", rest: "60s" },
    { name: "Weighted Bench Dips", category: "Arms", description: "Brace hands on a bench behind you and lower hips, loading legs with weight to blast the triceps.", muscles: ["Triceps", "Chest (Lower)", "Shoulders"], sets: 3, reps: "10-12 reps", rest: "75s" }
  ],
  tuesday: [
    // Back (Pull)
    { name: "Wide Grip Lat Pulldown", category: "Back", description: "Pull bar downward to your upper chest while squeezing your shoulder blades together to build back width.", muscles: ["Back (Lats)", "Biceps", "Forearms"], sets: 4, reps: "10-12 reps", rest: "75s" },
    { name: "Single-Arm Dumbbell Row", category: "Back", description: "Row dumbbell to your hip while bracing on a bench to target the lats and lower traps.", muscles: ["Back (Lats)", "Traps", "Biceps"], sets: 4, reps: "10-12 reps", rest: "60s" },
    { name: "Barbell Bent-Over Row", category: "Back", description: "Hinge at 45 degrees and row the barbell to your lower sternum to build incredible back thickness and spinal density.", muscles: ["Back (Lats)", "Rhomboids", "Rear Delts"], sets: 4, reps: "8-10 reps", rest: "90s" },
    { name: "Seated Cable Row (Close Grip)", category: "Back", description: "Pull handle to lower ribs while keeping chest high and shoulders back to target mid-back thickness.", muscles: ["Back", "Rhomboids", "Traps"], sets: 3, reps: "10-12 reps", rest: "75s" },
    { name: "Weighted Pull-Ups", category: "Back", description: "Hang from a pull-up bar and pull your collarbones up to the bar under strict control, adding external load for absolute strength.", muscles: ["Back (Lats)", "Biceps", "Core"], sets: 3, reps: "6-8 reps", rest: "120s" },
    { name: "Chin-Ups", category: "Back", description: "Use an underhand grip to perform bodyweight pullups, heavily shifting focus to the biceps brachii and lower lats.", muscles: ["Back (Lats)", "Biceps"], sets: 3, reps: "8-10 reps", rest: "90s" },
    { name: "Chest-Supported T-Bar Row", category: "Back", description: "Lie chest-down on a pad and row handles to isolate the upper back, traps, and lats without lower back fatigue.", muscles: ["Back (Upper)", "Rhomboids", "Traps"], sets: 3, reps: "10-12 reps", rest: "75s" },
    
    // Biceps (Pull)
    { name: "Dumbbell Hammer Curls", category: "Arms", description: "Curl dumbbells with a neutral grip to target the brachialis and brachioradialis for forearm and arm thickness.", muscles: ["Biceps", "Forearms"], sets: 3, reps: "12 reps", rest: "60s" },
    { name: "Standing Dumbbell Bicep Curls", category: "Arms", description: "Curl dumbbells while supinating your wrists at the top to isolate the biceps brachii.", muscles: ["Biceps"], sets: 3, reps: "12 reps", rest: "60s" },
    { name: "Incline Dumbbell Curls", category: "Arms", description: "Sit on a 45-degree incline bench and curl dumbbells to place the bicep long-head under a deep, growth-inducing stretch.", muscles: ["Biceps (Long Head)"], sets: 3, reps: "10-12 reps", rest: "75s" },
    { name: "EZ-Bar Preacher Curls", category: "Arms", description: "Rest arms on a preacher pad to prevent momentum and isolate the short head of the biceps.", muscles: ["Biceps (Short Head)"], sets: 3, reps: "10-12 reps", rest: "75s" },
    
    // Rear Delts (Pull)
    { name: "Dumbbell Rear Delt Flyes", category: "Shoulders", description: "Hinge forward and raise dumbbells out in a wide arc to target the posterior deltoid head.", muscles: ["Shoulders (Rear)", "Upper Back"], sets: 3, reps: "15 reps", rest: "45s" },
    { name: "Face Pulls (Rope Cable)", category: "Shoulders", description: "Pull rope to your forehead while flaring elbows and rotating wrists out to build healthy shoulders and thick rear delts.", muscles: ["Shoulders (Rear)", "Traps", "Rotator Cuff"], sets: 4, reps: "15-20 reps", rest: "60s" }
  ],
  wednesday: [
    // Core (Recovery)
    { name: "Cobra to Child's Pose Flow", category: "Core", description: "Alternate between lying cobra stretch and back-releasing child's pose to stretch abs, spine, and lower back.", muscles: ["Core", "Lower Back", "Shoulders"], sets: 3, reps: "45 seconds", rest: "30s" },
    { name: "Bird Dog Core Stability", category: "Core", description: "Extend opposite arm and leg while maintaining a flat, stable torso to engage deep core stabilizers.", muscles: ["Core (Abs)", "Glutes", "Lower Back"], sets: 3, reps: "12 reps per side", rest: "45s" },
    { name: "Deadbug Core Activation", category: "Core", description: "Lie on your back, keep lower back glued to floor, and extend opposite limbs under deep control.", muscles: ["Core (Abs)", "Hip Flexors"], sets: 3, reps: "12 reps per side", rest: "45s" },
    { name: "Plank Core Hold", category: "Core", description: "Hold a rigid bridge on elbows and toes, actively pulling navel to spine and squeezing glutes to activate the transverse abdominis.", muscles: ["Core (Abs)", "Shoulders"], sets: 3, reps: "60 seconds", rest: "45s" },
    { name: "Hanging Knee Raises", category: "Core", description: "Hang from a pull-up bar and curl your knees up towards your chest, flexing the pelvis upward to target the lower rectus abdominis.", muscles: ["Core (Lower Abs)", "Hip Flexors"], sets: 3, reps: "12-15 reps", rest: "60s" },
    { name: "Cable Crunches (Kneeling)", category: "Core", description: "Kneel before a cable stack, holding the rope behind your head, and contract your abs to pull elbows to thighs under tension.", muscles: ["Core (Abs)"], sets: 3, reps: "15 reps", rest: "60s" },
    { name: "Russian Twists", category: "Core", description: "Sit on floor, lean back slightly, elevate feet, and rotate torso side-to-side with a light weight to develop oblique definition.", muscles: ["Core (Obliques)", "Abs"], sets: 3, reps: "20 reps per side", rest: "45s" },
    
    // Stretching & Mobility (Recovery)
    { name: "World's Greatest Stretch", category: "Core", description: "Step forward in a deep lunge, rotate your chest up to the sky, and stretch hip flexors, thoracic spine, and hamstrings.", muscles: ["Core", "Hip Flexors", "Thoracic Spine"], sets: 2, reps: "6 reps per side", rest: "30s" },
    { name: "Cat-Cow Spine Mobilization", category: "Core", description: "On hands and knees, cycle between arching and rounding your spine to lubricate vertebrae and release lower back stress.", muscles: ["Spine", "Lower Back"], sets: 2, reps: "12 cycles", rest: "30s" },
    { name: "Hip Flexor Couch Stretch", category: "Core", description: "Place one knee back against a wall or couch in a deep lunge to open tight hips and alleviate back stiffness.", muscles: ["Hip Flexors", "Quads"], sets: 2, reps: "45 seconds per side", rest: "15s" },
    { name: "Pigeon Pose Glute Stretch", category: "Core", description: "Bring one knee forward and rotate it outwards on the floor, laying your upper body over it to stretch deep glute muscles.", muscles: ["Glutes", "Piriformis"], sets: 2, reps: "45 seconds per side", rest: "15s" },
    { name: "Thoracic Spine Extension", category: "Core", description: "Lean your upper back over a foam roller, extending arms overhead to release posture and open up ribcage space.", muscles: ["Thoracic Spine", "Chest"], sets: 2, reps: "60 seconds", rest: "30s" }
  ],
  thursday: [
    // Legs Focus (Quads)
    { name: "Dumbbell Goblet Squats", category: "Legs", description: "Hold dumbbell vertically at chest level, squat down deep with a upright torso to target the quadriceps.", muscles: ["Legs (Quads)", "Glutes", "Core"], sets: 4, reps: "12 reps", rest: "75s" },
    { name: "Bulgarian Split Squats", category: "Legs", description: "Place one foot back on a bench, squatting down on the single front leg to fix muscular imbalances.", muscles: ["Legs (Quads/Glutes)"], sets: 3, reps: "12 reps per leg", rest: "60s" },
    { name: "Barbell Back Squats", category: "Legs", description: "Set bar on upper traps, descend below parallel while maintaining a flat back, and push back up through heels.", muscles: ["Legs (Quads)", "Glutes", "Lower Back"], sets: 4, reps: "8-10 reps", rest: "120s" },
    { name: "Leg Press (Machine)", category: "Legs", description: "Place feet mid-width on platform, lower knees to 90 degrees under strict control, and press upward to build massive quads.", muscles: ["Legs (Quads)", "Glutes"], sets: 4, reps: "10-12 reps", rest: "90s" },
    { name: "Leg Extensions (Machine)", category: "Legs", description: "Isolate the quadriceps by fully extending knees upward and squeezing at the peak of the motion.", muscles: ["Legs (Quads)"], sets: 3, reps: "15 reps", rest: "60s" },
    
    // Legs Focus (Hamstrings & Glutes)
    { name: "Romanian Dumbbell Deadlifts", category: "Legs", description: "Hinge at hips, stretching hamstrings and glutes while lowering dumbbells close to legs.", muscles: ["Legs (Hamstrings/Glutes)"], sets: 4, reps: "12 reps", rest: "75s" },
    { name: "Barbell Hip Thrusts", category: "Legs", description: "Rest upper back on a bench, load a padded barbell over hips, and drive hips vertically up to blast the gluteus maximus.", muscles: ["Legs (Glutes)", "Hamstrings"], sets: 4, reps: "10-12 reps", rest: "90s" },
    { name: "Lying Leg Curls (Machine)", category: "Legs", description: "Isolate the hamstrings by curling pad towards glutes, controlling the downward eccentric phase deeply.", muscles: ["Legs (Hamstrings)"], sets: 3, reps: "12 reps", rest: "60s" },
    { name: "Walking Lunges", category: "Legs", description: "Lunge forward alternately to develop single-leg power, balance, and coordination.", muscles: ["Legs (Quads)", "Glutes", "Hamstrings"], sets: 3, reps: "12 steps per leg", rest: "60s" },
    
    // Calves
    { name: "Dumbbell Calf Raises (On Step)", category: "Legs", description: "Hold dumbbells and raise heels on an elevated step to get full range calf extension.", muscles: ["Legs (Calves)"], sets: 4, reps: "15-20 reps", rest: "45s" },
    { name: "Seated Calf Raises (Machine)", category: "Legs", description: "Bend knees at 90 degrees to isolate the soleus muscle, performing high-rep slow-tempo extensions.", muscles: ["Legs (Calves - Soleus)"], sets: 3, reps: "15-20 reps", rest: "45s" }
  ],
  friday: [
    // Arm Sculpting (Triceps)
    { name: "Close-Grip Barbell Bench Press", category: "Chest", description: "Perform bench press with hands shoulder-width apart to transfer maximum tension to the triceps.", muscles: ["Triceps", "Chest", "Shoulders"], sets: 4, reps: "8-10 reps", rest: "90s" },
    { name: "EZ-Bar Skull Crushers", category: "Arms", description: "Lie flat, lower EZ-bar to forehead bending only at elbows, then extend to target the lateral and long tricep heads.", muscles: ["Triceps"], sets: 3, reps: "10-12 reps", rest: "75s" },
    { name: "Overhead Dumbbell Tricep Extension", category: "Arms", description: "Hold dumbbell with both hands overhead, lowering behind neck to stretch and target long head of triceps.", muscles: ["Triceps (Long Head)"], sets: 3, reps: "12 reps", rest: "60s" },
    { name: "Overhead Rope Tricep Extensions", category: "Arms", description: "Extend rope attachment overhead using cables or a dumbbell to isolate the long head of the triceps.", muscles: ["Triceps (Long Head)"], sets: 3, reps: "12 reps", rest: "60s" },
    { name: "Cable Tricep Pushdowns (Rope)", category: "Arms", description: "Push cable rope down and flare wrists at the bottom to maximize lateral tricep recruitment and lockout power.", muscles: ["Triceps (Lateral/Medial Head)"], sets: 3, reps: "12-15 reps", rest: "60s" },
    
    // Arm Sculpting (Biceps)
    { name: "Dumbbell Hammer Curls", category: "Arms", description: "Build brachialis and forearm thickness with neutral-grip bicep curling.", muscles: ["Biceps", "Forearms"], sets: 3, reps: "12 reps", rest: "60s" },
    { name: "EZ-Bar Bicep Curls (Standing)", category: "Arms", description: "Curl EZ-bar standing, keeping elbows pinned to sides, to build major biceps size without wrist strain.", muscles: ["Biceps"], sets: 3, reps: "10-12 reps", rest: "75s" },
    { name: "Concentration Curls", category: "Arms", description: "Sit down, brace elbow against inner thigh, and curl dumbbell to isolate and peak the biceps brachii.", muscles: ["Biceps (Peak)"], sets: 3, reps: "12 reps", rest: "60s" },
    { name: "Cable Bicep Curls (Straight Bar)", category: "Arms", description: "Perform curls using a straight bar on a low cable pulley to maintain continuous tension throughout the curl.", muscles: ["Biceps"], sets: 3, reps: "12-15 reps", rest: "60s" },
    
    // Core Balance
    { name: "Plank with Shoulder Taps", category: "Core", description: "Hold a rigid plank position while tapping opposite shoulders to build anti-rotation core power.", muscles: ["Core (Abs)", "Shoulders"], sets: 3, reps: "15 taps per side", rest: "45s" },
    { name: "Decline Bench Sit-Ups", category: "Core", description: "Secure feet on decline bench, lower torso fully, and crunch upward to intensely target upper abs.", muscles: ["Core (Abs)", "Hip Flexors"], sets: 3, reps: "12-15 reps", rest: "60s" },
    { name: "Hanging Leg Raises", category: "Core", description: "Hang from bar and raise toes straight up to bar with locked legs to target lower abdominal sheath.", muscles: ["Core (Lower Abs)", "Hip Flexors"], sets: 3, reps: "10-12 reps", rest: "60s" }
  ],
  saturday: [
    // Cardio Conditioning
    { name: "High-Intensity Jumping Jacks", category: "Cardio", description: "Perform explosive jumping jacks to build cardiovascular stamina and athletic conditioning.", muscles: ["Cardio", "Full Body"], sets: 3, reps: "45 seconds", rest: "15s" },
    { name: "Mountain Climbers (Explosive)", category: "Cardio", description: "Drive knees straight to chest in a pushup position to raise heart rate and burn calories.", muscles: ["Cardio", "Core"], sets: 3, reps: "45 seconds", rest: "15s" },
    { name: "Bodyweight Air Squats (High Speed)", category: "Cardio", description: "Perform fast squats to maintain metabolic stress and target leg muscular endurance.", muscles: ["Cardio", "Legs"], sets: 3, reps: "45 seconds", rest: "15s" },
    { name: "Burpees (Metabolic)", category: "Cardio", description: "Drop to floor, jump feet out, jump back in, and explode into a vertical leap to maximize oxygen intake.", muscles: ["Cardio", "Full Body"], sets: 3, reps: "30 seconds", rest: "30s" },
    { name: "Kettlebell Swings", category: "Cardio", description: "Hinge at hips and explosively drive kettlebell to shoulder height to build functional stamina and glute power.", muscles: ["Cardio", "Glutes", "Hamstrings"], sets: 4, reps: "20 reps", rest: "45s" },
    { name: "Box Jumps (Plyometric)", category: "Cardio", description: "Jump explosively onto a tall plyometric box, landing softly, to develop lower-body explosive power and anaerobic capacity.", muscles: ["Cardio", "Quads", "Calves"], sets: 3, reps: "10 reps", rest: "60s" },
    { name: "Battle Ropes Intervals", category: "Cardio", description: "Whip thick heavy ropes into rapid alternating waves while holding a half-squat to blast shoulders and core.", muscles: ["Cardio", "Shoulders", "Core"], sets: 3, reps: "30 seconds", rest: "30s" },
    { name: "High Knees Sprint (In Place)", category: "Cardio", description: "Sprint rapidly in place, driving knees to chest height to maximize caloric burn and elevate anaerobic conditioning.", muscles: ["Cardio", "Quads", "Calves"], sets: 3, reps: "45 seconds", rest: "15s" },
    
    // Core Stability Core
    { name: "Plank Hold", category: "Core", description: "Squeeze glutes, core, and quads in a straight-line position to develop full body core endurance.", muscles: ["Core (Abs)", "Shoulders"], sets: 3, reps: "60 seconds", rest: "30s" },
    { name: "Plank Jacks", category: "Core", description: "Hold a forearm plank while jumping your feet out and in laterally, building dynamic trunk stability.", muscles: ["Core (Abs)", "Cardio"], sets: 3, reps: "45 seconds", rest: "30s" }
  ],
  sunday: [
    // Recovery & Rest
    { name: "Thoracic Spine Foam Rolling / Stretching", category: "Core", description: "Decompress your thoracic spine and release upper back tightness.", muscles: ["Back", "Core"], sets: 2, reps: "60 seconds", rest: "30s" },
    { name: "Passive Hamstring Stretch", category: "Core", description: "Lie on your back, lift one leg with a towel or band to lengthen hamstring fibers and release lower back pressure.", muscles: ["Hamstrings", "Lower Back"], sets: 2, reps: "45 seconds per leg", rest: "15s" },
    { name: "Cobra Stretch Hold", category: "Core", description: "Arch back slowly in a prone position to release tension in abdominal wall and hip flexors.", muscles: ["Core (Abs)", "Lower Back"], sets: 2, reps: "30 seconds", rest: "30s" },
    { name: "Child's Pose Rest Hold", category: "Core", description: "Kneel, sit hips back on heels, and fold forward with arms extended to stretch traps, shoulders, and lower lumbar fascia.", muscles: ["Lower Back", "Shoulders"], sets: 2, reps: "60 seconds", rest: "15s" },
    { name: "Kneeling Quadriceps Stretch", category: "Core", description: "Hold your back ankle while kneeling to deeply elongate the quadriceps and hip flexors after leg training.", muscles: ["Quads", "Hip Flexors"], sets: 2, reps: "45 seconds per leg", rest: "15s" },
    { name: "Deep Breathing Meditation (Vagus Nerve)", category: "Core", description: "Sit comfortably, inhale slowly for 4 seconds, hold for 4, exhale for 6, calming the nervous system and maximizing recovery.", muscles: ["Mindset", "Nervous System Recovery"], sets: 1, reps: "5 minutes", rest: "none" },
    { name: "Calf Stretch Against Wall", category: "Core", description: "Press your hands and front foot against a wall, extending your back heel down to stretch gastroc/soleus muscles.", muscles: ["Calves"], sets: 2, reps: "45 seconds per leg", rest: "15s" },
    { name: "Doorframe Chest Opener", category: "Core", description: "Brace forearm against a doorframe and turn torso away to release high-tension pectoral and anterior deltoid fibers.", muscles: ["Chest", "Shoulders"], sets: 2, reps: "45 seconds per arm", rest: "15s" }
  ]
};

export default function Dashboard({ 
  profile, 
  plan, 
  onUpdatePlan, 
  onGeneratePlan, 
  loading,
  onUpdateProfile,
  selectedDay,
  onSelectDay,
  onChangeTab
}: DashboardProps) {
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null);
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
  const [customRequest, setCustomRequest] = useState('');
  const [showCustomPrompt, setShowCustomPrompt] = useState(false);
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);
  const [showAllExercises, setShowAllExercises] = useState(false);

  const [openDailyAccordions, setOpenDailyAccordions] = useState<Record<string, boolean>>({
    dailyFocus: true,
    nutrition: false,
    bodyMap: false,
    searchHub: false
  });

  const toggleDailyAccordion = (key: string) => {
    setOpenDailyAccordions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSelectMuscle = (muscleId: string) => {
    const newSelected = selectedMuscle === muscleId ? null : muscleId;
    setSelectedMuscle(newSelected);

    if (newSelected) {
      const muscleObj = musclesData.find(m => m.id === newSelected);
      const searchCategory = muscleObj ? muscleObj.name : newSelected;
      setDbMode('exercises');
      setExerciseQuery(searchCategory);
      searchWgerExercises(searchCategory);

      // Auto-open Live Search Hub accordion when selecting a muscle
      setOpenDailyAccordions(prev => ({ ...prev, searchHub: true }));

      setTimeout(() => {
        const el = document.getElementById('search-swap-hub');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } else {
      setExerciseQuery('');
      searchWgerExercises('');
    }
  };

  useEffect(() => {
    setShowAllExercises(false);
  }, [selectedDay]);

  // Active Streak & Achievement Badges System
  const [activeDates, setActiveDates] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('kai_active_streak_days');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Failed to parse active streak days", e);
    }
    return [
      '2026-07-22', '2026-07-23', '2026-07-24', '2026-07-25', '2026-07-26', '2026-07-27', new Date().toISOString().split('T')[0]
    ];
  });

  // Log active day when user performs plan interactions
  const logActiveDay = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    if (!activeDates.includes(todayStr)) {
      const updated = [...activeDates, todayStr];
      setActiveDates(updated);
      localStorage.setItem('kai_active_streak_days', JSON.stringify(updated));
    }
  };

  // Exercise form modal state
  const [selectedExerciseForModal, setSelectedExerciseForModal] = useState<any | null>(null);
  const [modalImageUrl, setModalImageUrl] = useState<string | null>(null);
  const [loadingModalImage, setLoadingModalImage] = useState<boolean>(false);
  const [modalImageError, setModalImageError] = useState<string | null>(null);

  const handleOpenExerciseModal = async (exercise: any) => {
    setSelectedExerciseForModal(exercise);
    setLoadingModalImage(true);
    setModalImageError(null);
    setModalImageUrl(null);

    try {
      const response = await fetch("/api/generate-exercise-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          exerciseName: exercise.name,
          notes: exercise.notes || ""
        })
      });
      const data = await response.json();
      if (response.ok && data.imageUrl) {
        setModalImageUrl(data.imageUrl);
      } else {
        setModalImageError(data.error || "No visual asset returned.");
      }
    } catch (err: any) {
      setModalImageError(err.message || "Failed to contact Coach Kai visualizer.");
    } finally {
      setLoadingModalImage(false);
    }
  };

  // Live Database Explorer state
  const [dbMode, setDbMode] = useState<'exercises' | 'foods'>('exercises');
  const [exerciseQuery, setExerciseQuery] = useState('');
  const [foodQuery, setFoodQuery] = useState('');
  const [exercises, setExercises] = useState<any[]>([]);
  const [foods, setFoods] = useState<any[]>([]);
  const [loadingDb, setLoadingDb] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  // Get current split exercises (custom generated plan if present, otherwise default split exercises)
  const getSplitExercises = () => {
    if (plan && plan.exercises && plan.exercises.length > 0) {
      return plan.exercises;
    }
    const normalizedDay = selectedDay.toLowerCase();
    return DEFAULT_SPLIT_EXERCISES[normalizedDay] || [];
  };

  const getExercisesToDisplay = () => {
    const normalizedDay = selectedDay.toLowerCase();
    const defaults = DEFAULT_SPLIT_EXERCISES[normalizedDay] || [];
    const planExercises = plan?.exercises || [];
    const merged = [...planExercises];
    
    defaults.forEach(defEx => {
      if (!merged.some(pe => pe.name.toLowerCase() === defEx.name.toLowerCase())) {
        merged.push({
          id: `ex-merged-${defEx.name.replace(/\s+/g, '-')}-${Date.now()}`,
          name: defEx.name,
          sets: defEx.sets || 4,
          reps: defEx.reps || "10-12 reps",
          rest: defEx.rest || "90s",
          notes: defEx.description || defEx.notes || "Focused form execution.",
          completed: false,
          videoUrl: defEx.videoUrl
        });
      }
    });

    if (showAllExercises) {
      return merged;
    }
    return merged.slice(0, 10);
  };

  // Helper to get raw total exercises count for the day
  const getTotalExercisesCount = () => {
    const normalizedDay = selectedDay.toLowerCase();
    const defaults = DEFAULT_SPLIT_EXERCISES[normalizedDay] || [];
    const planExercises = plan?.exercises || [];
    const merged = [...planExercises];
    defaults.forEach(defEx => {
      if (!merged.some(pe => pe.name.toLowerCase() === defEx.name.toLowerCase())) {
        merged.push(defEx);
      }
    });
    return merged.length;
  };

  // Custom addition inline parameters
  const [addingExerciseId, setAddingExerciseId] = useState<string | number | null>(null);
  const [customSets, setCustomSets] = useState(4);
  const [customReps, setCustomReps] = useState('10-12 reps');
  const [customRest, setCustomRest] = useState('90 sec');
  const [customNotes, setCustomNotes] = useState('');

  const [addingFoodId, setAddingFoodId] = useState<string | number | null>(null);
  const [selectedMealCategory, setSelectedMealCategory] = useState<'Breakfast' | 'Lunch' | 'Dinner' | 'Snack'>('Breakfast');

  // Search Filter States
  const [selectedEquipmentFilter, setSelectedEquipmentFilter] = useState<string>('all');
  const [selectedNutrientFilter, setSelectedNutrientFilter] = useState<string>('all');

  // Trigger search on mode change or query
  const searchWgerExercises = async (term: string, equipFilter: string = selectedEquipmentFilter) => {
    setLoadingDb(true);
    setDbError(null);
    try {
      const locationQuery = encodeURIComponent(profile?.workoutLocation || 'both');
      const experienceQueryStr = encodeURIComponent(profile?.experienceLevel || 'intermediate');
      const equipQuery = encodeURIComponent(equipFilter);
      const res = await fetch(`/api/wger/exercises?term=${encodeURIComponent(term)}&location=${locationQuery}&experience=${experienceQueryStr}&equipment=${equipQuery}`);
      if (!res.ok) throw new Error("Could not retrieve exercises from server proxy.");
      const data = await res.json();
      setExercises(data);
    } catch (err: any) {
      setDbError(err.message || "Failed to query exercises database.");
    } finally {
      setLoadingDb(false);
    }
  };

  const searchOpenFoodFacts = async (term: string, nutFilter: string = selectedNutrientFilter) => {
    setLoadingDb(true);
    setDbError(null);
    try {
      const nutQuery = encodeURIComponent(nutFilter === 'all' ? '' : nutFilter);
      const res = await fetch(`/api/openfoodfacts/foods?term=${encodeURIComponent(term)}&nutrient=${nutQuery}`);
      if (!res.ok) throw new Error("Could not retrieve nutrition entries from server proxy.");
      const data = await res.json();
      setFoods(data);
    } catch (err: any) {
      setDbError(err.message || "Failed to query foods database.");
    } finally {
      setLoadingDb(false);
    }
  };

  useEffect(() => {
    if (dbMode === 'exercises') {
      searchWgerExercises(exerciseQuery, selectedEquipmentFilter);
    } else if (dbMode === 'foods') {
      searchOpenFoodFacts(foodQuery, selectedNutrientFilter);
    }
  }, [dbMode]);



  // Handle adding custom items
  const handleAddCustomExercise = (ex: any) => {
    if (!plan) return;
    const newExercise = {
      id: `ex-added-${Date.now()}`,
      name: ex.name,
      sets: Number(customSets) || 4,
      reps: customReps || "10-12 reps",
      rest: customRest || "90s",
      notes: customNotes || ex.description || "Focused form execution.",
      completed: false
    };
    const updatedExercises = [...(plan.exercises || []), newExercise];
    onUpdatePlan({ ...plan, exercises: updatedExercises });
    setAddingExerciseId(null);
    
    // reset inputs
    setCustomSets(4);
    setCustomReps('10-12 reps');
    setCustomRest('90 sec');
    setCustomNotes('');
  };

  const handleAddCustomFood = (food: any) => {
    if (!plan) return;
    
    const newMeal = {
      id: `meal-added-${Date.now()}`,
      name: `[${selectedMealCategory}] ${food.name} (${food.brand || "Generic"})`,
      calories: Number(food.calories) || 0,
      protein: Number(food.protein) || 0,
      carbs: Number(food.carbs) || 0,
      fat: Number(food.fat) || 0,
      ingredients: food.ingredients ? [food.ingredients] : ["Custom food addition"],
      instructions: "Tracked directly from Live Open Food Facts Database.",
      eaten: true
    };
    
    const updatedMeals = [...(plan.meals || []), newMeal];
    onUpdatePlan({ ...plan, meals: updatedMeals });
    setAddingFoodId(null);
  };

  // Nutrition calculations
  const totalCaloriesPlanned = plan ? plan.targetCalories : 2000;
  const totalProteinPlanned = plan ? plan.targetProtein : 130;
  const totalCarbsPlanned = plan ? plan.targetCarbs : 200;
  const totalFatPlanned = plan ? plan.targetFat : 65;

  // Active metrics based on logged foods
  const eatenMeals = plan ? (plan.meals || []).filter(m => m.eaten) : [];
  const currentCalories = eatenMeals.reduce((acc, m) => acc + m.calories, 0);
  const currentProtein = eatenMeals.reduce((acc, m) => acc + m.protein, 0);
  const currentCarbs = eatenMeals.reduce((acc, m) => acc + m.carbs, 0);
  const currentFat = eatenMeals.reduce((acc, m) => acc + m.fat, 0);

  const calProgress = Math.min((currentCalories / totalCaloriesPlanned) * 100, 100);
  const proProgress = Math.min((currentProtein / totalProteinPlanned) * 100, 100);
  const carbProgress = Math.min((currentCarbs / totalCarbsPlanned) * 100, 100);
  const fatProgress = Math.min((currentFat / totalFatPlanned) * 100, 100);

  const activeMuscles = new Set<string>();
  if (plan && plan.exercises) {
    plan.exercises.forEach(ex => {
      const name = ex.name.toLowerCase();
      if (name.includes("push-up") || name.includes("press") || name.includes("chest") || name.includes("pec") || name.includes("dip")) {
        activeMuscles.add("chest");
      }
      if (name.includes("row") || name.includes("pull-up") || name.includes("chin-up") || name.includes("lat") || name.includes("back") || name.includes("cobra") || name.includes("angel")) {
        activeMuscles.add("back");
      }
      if (name.includes("curl") || name.includes("bicep") || name.includes("pull-up") || name.includes("chin-up") || name.includes("row")) {
        activeMuscles.add("biceps");
      }
      if (name.includes("dip") || name.includes("tricep") || name.includes("extension") || name.includes("press") || name.includes("push-up")) {
        activeMuscles.add("triceps");
      }
      if (name.includes("twist") || name.includes("plank") || name.includes("ab ") || name.includes("crunch") || name.includes("core") || name.includes("sit-up")) {
        activeMuscles.add("abs");
      }
      if (name.includes("squat") || name.includes("lung") || name.includes("deadlift") || name.includes("bridge") || name.includes("leg") || name.includes("calf") || name.includes("hamstring") || name.includes("quad")) {
        activeMuscles.add("legs");
      }
      if (name.includes("forearm") || name.includes("wrist") || name.includes("grip")) {
        activeMuscles.add("forearms");
      }
      if (name.includes("raise") || name.includes("shoulder") || name.includes("delt") || name.includes("press") || name.includes("push-up")) {
        activeMuscles.add("shoulders");
      }
    });
  }

  const toggleMealEaten = (mealId: string) => {
    if (!plan) return;
    const updatedMeals = (plan.meals || []).map(m => m.id === mealId ? { ...m, eaten: !m.eaten } : m);
    onUpdatePlan({ ...plan, meals: updatedMeals });
    logActiveDay();
  };

  const toggleExerciseCompleted = (exId: string) => {
    if (!plan) return;
    const updatedExercises = (plan.exercises || []).map(ex => ex.id === exId ? { ...ex, completed: !ex.completed } : ex);
    onUpdatePlan({ ...plan, exercises: updatedExercises });
    logActiveDay();
  };

  const handleIncrementWater = (amount: number) => {
    if (!plan) return;
    const currentWater = plan.waterIntakeMl || 0;
    onUpdatePlan({ ...plan, waterIntakeMl: Math.max(0, currentWater + amount) });
    logActiveDay();
  };

  const goalsList = profile.goals || (profile.goal ? [profile.goal] : ['fat_loss_muscle_gain']);
  const hasFatLossAndMuscleGain = goalsList.includes('fat_loss_muscle_gain');
  const hasStaminaAndEndurance = goalsList.includes('stamina_metabolism_endurance');

  const isOnlyStamina = hasStaminaAndEndurance && !hasFatLossAndMuscleGain;
  const isOnlyPPL = hasFatLossAndMuscleGain && !hasStaminaAndEndurance;

  let WEEK_DAYS = [
    { key: 'monday', label: 'MON', title: 'Push Day', desc: 'Chest, Delts & Triceps' },
    { key: 'tuesday', label: 'TUE', title: 'Pull Day', desc: 'Back, Biceps & Rear Delts' },
    { key: 'wednesday', label: 'WED', title: 'Active Recovery', desc: 'Stretching & Core' },
    { key: 'thursday', label: 'THU', title: 'Legs Focus', desc: 'Quads, Hams & Calves' },
    { key: 'friday', label: 'FRI', title: 'Upper Sculpt', desc: 'Arms & Core Balance' },
    { key: 'saturday', label: 'SAT', title: 'Stamina Cardio', desc: 'Conditioning & HIIT' },
    { key: 'sunday', label: 'SUN', title: 'Full Rest', desc: 'Decompression & Growth' }
  ];

  if (isOnlyStamina) {
    WEEK_DAYS = [
      { key: 'monday', label: 'MON', title: 'HIIT Sprints', desc: 'VO2 Max & Speed' },
      { key: 'tuesday', label: 'TUE', title: 'Zone 2 Cardio', desc: 'Aerobic Endurance & Core' },
      { key: 'wednesday', label: 'WED', title: 'Active Recovery', desc: 'Dynamic Mobility' },
      { key: 'thursday', label: 'THU', title: 'Metabolic Circuit', desc: 'High-Tempo Functional' },
      { key: 'friday', label: 'FRI', title: 'Endurance Agility', desc: 'Calisthenics & Plyo' },
      { key: 'saturday', label: 'SAT', title: 'Aerobic Capacity', desc: 'Long-Distance Stamina' },
      { key: 'sunday', label: 'SUN', title: 'Full Rest', desc: 'Active Regeneration' }
    ];
  } else if (isOnlyPPL) {
    WEEK_DAYS = [
      { key: 'monday', label: 'MON', title: 'Push Focus I', desc: 'Chest, Delts & Triceps' },
      { key: 'tuesday', label: 'TUE', title: 'Pull Focus I', desc: 'Back, Biceps & Rear Delts' },
      { key: 'wednesday', label: 'WED', title: 'Legs Focus I', desc: 'Quads, Hams & Calves' },
      { key: 'thursday', label: 'THU', title: 'Push Focus II', desc: 'Incline & Shoulders' },
      { key: 'friday', label: 'FRI', title: 'Pull Focus II', desc: 'Width & Bicep Peak' },
      { key: 'saturday', label: 'SAT', title: 'Legs Focus II', desc: 'Posterior Chain & Calves' },
      { key: 'sunday', label: 'SUN', title: 'Full Rest', desc: 'Decompression & Growth' }
    ];
  }

  return (
    <div className="space-y-8">
      {/* Massive "Start Today's Plan" One-Button Hero Dashboard */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 p-6 sm:p-8 rounded-3xl shadow-2xl space-y-6 text-center relative overflow-hidden">
        <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-sky-500/10 rounded-full blur-2xl" />
        <div className="absolute -left-12 -top-12 w-48 h-48 bg-teal-500/10 rounded-full blur-2xl" />

        <div className="max-w-md mx-auto space-y-2 relative z-10">
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-sky-400 bg-sky-500/10 border border-sky-500/20 px-3.5 py-1 rounded-full inline-block">
            Today's Daily Plan
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Welcome, {profile.name}! 👋
          </h1>
          <p className="text-xs text-slate-300">
            Your daily workout and meal plan are ready. Tap below to begin!
          </p>
        </div>

        {/* MASSIVE ONE-BUTTON PRIMARY ACTION */}
        <div className="relative z-10">
          <button
            onClick={() => {
              if (!plan) {
                onGeneratePlan();
              } else {
                const el = document.getElementById("today-workout-section");
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth' });
                }
              }
            }}
            disabled={loading}
            className="w-full max-w-lg mx-auto py-5 sm:py-6 px-8 rounded-3xl bg-gradient-to-r from-sky-400 via-sky-500 to-teal-400 hover:from-sky-300 hover:to-teal-300 text-slate-950 font-black text-xl sm:text-2xl uppercase tracking-wider shadow-2xl shadow-sky-500/30 hover:shadow-sky-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3.5 cursor-pointer border-2 border-white/20 disabled:opacity-50"
          >
            {loading && <RefreshCw className="w-8 h-8 animate-spin text-slate-950" />}
            <span>{loading ? "Generating Plan..." : "Start Today's Plan"}</span>
          </button>
        </div>
      </div>

      {/* Weekly Schedule Planner Split */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <CalendarClock className="w-4.5 h-4.5 text-sky-400" />
              Coach's 7-Day Training Split
            </h2>
            <p className="text-[11px] text-slate-500 uppercase tracking-wide font-semibold mt-0.5">
              Select a weekday to sync, log, or compile your dynamic split
            </p>
          </div>
          <div className="text-xs text-sky-400 font-bold bg-sky-500/10 px-3.5 py-1.5 border border-sky-500/20 rounded-xl w-fit uppercase font-mono tracking-wider">
            Selected Day: {selectedDay}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {WEEK_DAYS.map((day) => {
            const isSelected = selectedDay === day.key;
            const hasPlan = localStorage.getItem(`kai_coach_plan_${day.key}`) !== null;
            
            return (
              <button
                key={day.key}
                type="button"
                onClick={() => onSelectDay(day.key)}
                className={`text-left p-3.5 rounded-xl border transition-all relative flex flex-col justify-between h-24 select-none cursor-pointer group ${
                  isSelected
                    ? 'bg-slate-950 border-sky-500 shadow-md shadow-sky-500/10 ring-1 ring-sky-500/20'
                    : 'bg-slate-950/60 hover:bg-slate-950 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                {/* Header of weekday card */}
                <div className="flex items-center justify-between w-full">
                  <span className={`text-[10px] font-black tracking-widest uppercase ${
                    isSelected ? 'text-sky-400' : 'text-slate-500 group-hover:text-slate-400'
                  }`}>
                    {day.label}
                  </span>
                  {hasPlan ? (
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse border border-emerald-950" title="Routine generated" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-800" title="No routine compiled" />
                  )}
                </div>

                {/* Focus Title */}
                <div className="space-y-0.5 mt-2">
                  <span className={`text-xs font-bold uppercase tracking-tight block ${
                    isSelected ? 'text-white' : 'text-slate-300'
                  }`}>
                    {day.title}
                  </span>
                  <span className="text-[9px] font-semibold text-slate-500 block truncate leading-tight uppercase tracking-wider">
                    {day.desc}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>



      {/* Dynamic Coach Banner */}
      <div className="bg-slate-900 rounded-2xl text-white p-6 md:p-8 shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-sky-500/10 rounded-full blur-2xl" />
        <div className="absolute -left-12 -top-12 w-48 h-48 bg-teal-500/10 rounded-full blur-2xl" />
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight uppercase italic">Welcome, {profile.name}!</h1>
          </div>
          
          <div className="flex flex-col gap-2 shrink-0">
            {plan ? (
              <button 
                onClick={() => setShowCustomPrompt(!showCustomPrompt)}
                className="flex items-center justify-center gap-2 bg-slate-950 hover:bg-slate-800 text-sky-400 hover:text-sky-300 px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider border border-slate-800 transition"
              >
                <RefreshCw className="w-4 h-4" />
                Adjust Routine
              </button>
            ) : (
              <button
                onClick={() => onGeneratePlan()}
                disabled={loading}
                className="flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-600 text-slate-950 px-6 py-3.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-sky-500/10 transition disabled:opacity-50"
              >
                <CalendarClock className="w-5 h-5" />
                Generate Daily Routine
              </button>
            )}
          </div>
        </div>

        {/* Custom prompt request input */}
        <AnimatePresence>
          {showCustomPrompt && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6 pt-6 border-t border-slate-800"
            >
              <p className="text-sm text-slate-300 mb-3 font-medium">Have a special request? (e.g. "I want a home workout with no equipment", "I'm busy, make quick meals", etc.)</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customRequest}
                  onChange={e => setCustomRequest(e.target.value)}
                  placeholder="Tell Kai what to tweak..."
                  className="bg-slate-950 border border-slate-800 text-white placeholder-slate-600 text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-sky-500 flex-1 font-semibold"
                />
                <button
                  onClick={() => {
                    onGeneratePlan(customRequest);
                    setCustomRequest('');
                    setShowCustomPrompt(false);
                  }}
                  disabled={loading}
                  className="bg-sky-500 hover:bg-sky-600 text-slate-950 font-bold px-5 py-3 rounded-xl text-xs uppercase tracking-wide transition disabled:opacity-50 shrink-0"
                >
                  Generate Plan
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 space-y-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
          <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
          <div className="text-center px-4">
            <h3 className="font-black text-lg text-white uppercase tracking-tight">Coach Kai is crafting your schedule...</h3>
            <p className="text-sm text-slate-400 mt-2 max-w-sm mx-auto">Calculating custom macronutrients, recipes, and dynamic physical training tailored strictly to you.</p>
          </div>
        </div>
      )}

      {!plan && !loading && (
        <div className="p-8 md:p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-6">
          <div className="mx-auto w-16 h-16 bg-sky-500/10 rounded-full flex items-center justify-center text-sky-500">
            <Sparkles className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h2 className="text-xl font-black text-white uppercase tracking-tight">Your AI Coach is ready!</h2>
            <p className="text-sm text-slate-400">
              Generate a fully bespoke meal plan and workout routine designed just for you, matching your goals of {(profile.goals || (profile.goal ? [profile.goal] : ['fat_loss_muscle_gain'])).map((g, idx) => (
                <strong key={idx} className="text-sky-400 uppercase text-[11px] bg-slate-950 px-2 py-0.5 border border-slate-800 rounded mr-1 inline-block">
                  {g.replace('_', ' ')}
                </strong>
              ))}.
            </p>
          </div>
          <button
            onClick={() => onGeneratePlan()}
            className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-slate-950 px-8 py-3.5 rounded-xl font-bold uppercase tracking-wider text-xs shadow-md transition"
          >
            Generate Plan for {selectedDay.toUpperCase()}
          </button>
        </div>
      )}

      {plan && !loading && (
        <>
          <div className="flex flex-col gap-4 mt-8">
            
            {/* Card 1: Daily Focus */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden transition-all duration-200">
              <button
                type="button"
                onClick={() => toggleDailyAccordion('dailyFocus')}
                className="w-full min-h-[48px] p-4 flex items-center justify-between text-left select-none cursor-pointer hover:bg-slate-850/60 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div className="p-2 bg-sky-500/10 rounded-xl text-sky-400 shrink-0">
                    <Dumbbell className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm sm:text-base font-black text-white uppercase tracking-tight font-display truncate">
                        Daily Focus: {plan.workoutName}
                      </h2>
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-full font-mono shrink-0 hidden sm:inline-block">
                        {plan.workoutType}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                      {getTotalExercisesCount()} exercises scheduled for {selectedDay.toUpperCase()} split
                    </p>
                  </div>
                </div>
                <div className="p-1 text-slate-400 shrink-0">
                  <ChevronDown 
                    className={`w-5 h-5 transition-transform duration-200 ${
                      openDailyAccordions.dailyFocus ? 'rotate-180 text-sky-400' : ''
                    }`} 
                  />
                </div>
              </button>

              <AnimatePresence initial={false}>
                {openDailyAccordions.dailyFocus && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-t border-slate-800/80 p-4 sm:p-6 space-y-6"
                  >
                    {(plan.warmupRoutine || plan.progressiveOverloadRule || plan.macroTimingTip) && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                        {plan.warmupRoutine && (
                          <div className="space-y-1">
                            <div className="text-[10px] uppercase font-bold text-sky-400 flex items-center gap-1">
                              <Flame className="w-3.5 h-3.5" />
                              3-Min Warm-Up
                            </div>
                            <p className="text-xs text-slate-300 leading-snug">{plan.warmupRoutine}</p>
                          </div>
                        )}
                        {plan.progressiveOverloadRule && (
                          <div className="space-y-1">
                            <div className="text-[10px] uppercase font-bold text-amber-400 flex items-center gap-1">
                              <TrendingUp className="w-3.5 h-3.5" />
                              Overload Rule
                            </div>
                            <p className="text-xs text-slate-300 leading-snug">{plan.progressiveOverloadRule}</p>
                          </div>
                        )}
                        {plan.macroTimingTip && (
                          <div className="space-y-1">
                            <div className="text-[10px] uppercase font-bold text-teal-400 flex items-center gap-1">
                              <Zap className="w-3.5 h-3.5" />
                              Anabolic Timing
                            </div>
                            <p className="text-xs text-slate-300 leading-snug">{plan.macroTimingTip}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {getExercisesToDisplay().length === 0 ? (
                      <div className="p-6 text-center space-y-2 bg-slate-950 border border-slate-800/60 rounded-xl">
                        <CalendarClock className="w-8 h-8 text-slate-500 mx-auto" />
                        <h3 className="font-bold text-sm text-slate-300 uppercase tracking-wide">Rest & Recovery Day</h3>
                        <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">Coach Kai recommends focused stretching, light walking, active hydration, and deep biological sleep today.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-800">
                        {getExercisesToDisplay().map((ex) => {
                          const isExpanded = expandedExercise === ex.id;

                          return (
                            <div key={ex.id} className="py-4 first:pt-0 last:pb-0">
                              <div className="flex items-start justify-between gap-4">
                                <div className="mt-1.5 shrink-0 w-2 h-2 rounded-full bg-sky-500/60" />

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <button
                                      onClick={() => handleOpenExerciseModal(ex)}
                                      className="font-bold text-sm md:text-base text-left transition hover:text-sky-400 flex items-center gap-1.5 group text-slate-200"
                                      title="Click to view proper form & visual instruction"
                                    >
                                      <span>{ex.name}</span>
                                      <Sparkles className="w-3.5 h-3.5 text-sky-500/60 group-hover:text-sky-400 transition" />
                                    </button>
                                    <button
                                      onClick={() => setExpandedExercise(isExpanded ? null : ex.id)}
                                      className="text-slate-500 hover:text-slate-300 p-1 rounded-lg hover:bg-slate-950 transition"
                                    >
                                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </button>
                                  </div>
                                  <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400 font-bold uppercase tracking-wide font-mono">
                                    <span>{ex.sets > 0 ? `${ex.sets} Sets` : 'Duration'}</span>
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                                    <span className="text-sky-400">{ex.reps}</span>
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                                    <span>Rest: {ex.rest}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Expanded details */}
                              <AnimatePresence>
                                {isExpanded && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="ml-5 mt-4 p-4 bg-slate-950 rounded-xl border border-slate-800/80 space-y-3.5"
                                  >
                                    <div className="flex gap-2 items-start text-xs text-slate-300 leading-relaxed">
                                      <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                                      <div>
                                        <span className="font-bold text-slate-400 uppercase tracking-wide block mb-1">Coach's Pro Tip:</span>
                                        {ex.notes || "Maintain controlled negative motion, focus on proper diaphragmatic breathing, and keep perfect spinal posture."}
                                      </div>
                                    </div>

                                    <div className="flex gap-2 items-center text-xs text-slate-300 pt-2.5 border-t border-slate-900">
                                      <Video className="w-4 h-4 text-emerald-400 shrink-0" />
                                      <div>
                                        <span className="font-bold text-slate-400 uppercase tracking-wide block mb-0.5">Form Demonstration:</span>
                                        <a
                                          href={ex.videoUrl || `https://www.youtube.com/results?search_query=${encodeURIComponent(ex.name + " exercise form tutorial")}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 font-bold hover:underline"
                                        >
                                          Watch form tutorial video
                                          <ExternalLink className="w-3 h-3" />
                                        </a>
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {getTotalExercisesCount() > 10 && (
                      <div className="pt-4 border-t border-slate-800 flex justify-center">
                        <button
                          type="button"
                          onClick={() => setShowAllExercises(!showAllExercises)}
                          className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-sky-400 hover:text-sky-300 bg-sky-500/10 hover:bg-sky-500/15 border border-sky-500/20 px-5 py-3 rounded-xl transition cursor-pointer"
                        >
                          {showAllExercises ? (
                            <>
                              <span>Show Less</span>
                              <ChevronUp className="w-4 h-4" />
                            </>
                          ) : (
                            <>
                              <span>Show All {getTotalExercisesCount()} Exercises for {selectedDay} Split</span>
                              <ChevronDown className="w-4 h-4" />
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Card 2: Nutrition Schedule */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden transition-all duration-200">
              <button
                type="button"
                onClick={() => toggleDailyAccordion('nutrition')}
                className="w-full min-h-[48px] p-4 flex items-center justify-between text-left select-none cursor-pointer hover:bg-slate-850/60 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div className="p-2 bg-sky-500/10 rounded-xl text-sky-400 shrink-0">
                    <Utensils className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm sm:text-base font-black text-white uppercase tracking-tight font-display truncate">
                        Nutrition Schedule
                      </h2>
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono shrink-0 hidden sm:inline-block">
                        {profile.dietPreference.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                      {(plan.meals || []).length} meals • Formulated for {profile.dietPreference} style
                    </p>
                  </div>
                </div>
                <div className="p-1 text-slate-400 shrink-0">
                  <ChevronDown 
                    className={`w-5 h-5 transition-transform duration-200 ${
                      openDailyAccordions.nutrition ? 'rotate-180 text-sky-400' : ''
                    }`} 
                  />
                </div>
              </button>

              <AnimatePresence initial={false}>
                {openDailyAccordions.nutrition && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-t border-slate-800/80 p-4 sm:p-6 space-y-6"
                  >
                    <div className="divide-y divide-slate-800">
                      {(plan.meals || []).map((meal) => {
                        const isExpanded = expandedMeal === meal.id;

                        return (
                          <div key={meal.id} className="py-4 first:pt-0 last:pb-0">
                            <div className="flex items-start justify-between gap-4">
                              <div className="mt-1.5 shrink-0 w-2 h-2 rounded-full bg-sky-500/60" />

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <h3 className="font-bold text-sm md:text-base text-slate-200">
                                    {meal.name}
                                  </h3>
                                  <button
                                    onClick={() => setExpandedMeal(isExpanded ? null : meal.id)}
                                    className="text-slate-500 hover:text-slate-300 p-1 rounded-lg hover:bg-slate-950 transition"
                                  >
                                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                  </button>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-1.5">
                                  <span className="text-[10px] font-bold text-slate-400 bg-slate-950 border border-slate-800 px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
                                    {meal.calories} kcal
                                  </span>
                                  <span className="text-[10px] font-bold text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-full font-mono">
                                    P: {meal.protein}g
                                  </span>
                                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono">
                                    C: {meal.carbs}g
                                  </span>
                                  <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full font-mono">
                                    F: {meal.fat}g
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Expanded recipe details */}
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="ml-5 sm:ml-10 mt-4 p-4 bg-slate-950 rounded-xl border border-slate-800/80 space-y-3"
                                >
                                  <div>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Ingredients:</h4>
                                    <ul className="list-disc list-inside text-sm text-slate-300 space-y-1">
                                      {meal.ingredients.map((ing, i) => (
                                        <li key={i}>{ing}</li>
                                      ))}
                                    </ul>
                                  </div>
                                  {meal.instructions && (
                                    <div>
                                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Preparation:</h4>
                                      <p className="text-sm text-slate-300 leading-relaxed">{meal.instructions}</p>
                                    </div>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Card 3: Interactive Body Map */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden transition-all duration-200">
              <button
                type="button"
                onClick={() => toggleDailyAccordion('bodyMap')}
                className="w-full min-h-[48px] p-4 flex items-center justify-between text-left select-none cursor-pointer hover:bg-slate-850/60 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div className="p-2 bg-sky-500/10 rounded-xl text-sky-400 shrink-0">
                    <Dumbbell className="w-5 h-5 animate-pulse" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm sm:text-base font-black text-white uppercase tracking-tight font-display truncate">
                        Interactive Body Map
                      </h2>
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                      Targeted muscle reference guide & active hotspots
                    </p>
                  </div>
                </div>
                <div className="p-1 text-slate-400 shrink-0">
                  <ChevronDown 
                    className={`w-5 h-5 transition-transform duration-200 ${
                      openDailyAccordions.bodyMap ? 'rotate-180 text-sky-400' : ''
                    }`} 
                  />
                </div>
              </button>

              <AnimatePresence initial={false}>
                {openDailyAccordions.bodyMap && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-t border-slate-800/80 p-4 sm:p-6 space-y-4"
                  >
                    <div className="relative w-full aspect-[16/9] bg-slate-950 rounded-xl overflow-hidden border border-slate-800/80 group">
                      <img 
                        src={muscleAnatomyBase} 
                        alt="Target Muscle Anatomy Map" 
                        className="w-full h-full object-cover opacity-85 group-hover:scale-[1.015] transition-transform duration-700"
                        referrerPolicy="no-referrer"
                      />

                      {/* Absolute Hotspot Markers */}
                      {musclesData.map((muscle) => {
                        const isActive = activeMuscles.has(muscle.id);
                        const isSelected = selectedMuscle === muscle.id;
                        const matchingExercises = (plan.exercises || []).filter(ex => {
                          const name = ex.name.toLowerCase();
                          if (muscle.id === 'chest' && (name.includes("push-up") || name.includes("press") || name.includes("chest") || name.includes("pec") || name.includes("dip"))) return true;
                          if (muscle.id === 'back' && (name.includes("row") || name.includes("pull-up") || name.includes("chin-up") || name.includes("lat") || name.includes("back") || name.includes("cobra") || name.includes("angel"))) return true;
                          if (muscle.id === 'biceps' && (name.includes("curl") || name.includes("bicep") || name.includes("pull-up") || name.includes("chin-up") || name.includes("row"))) return true;
                          if (muscle.id === 'triceps' && (name.includes("dip") || name.includes("tricep") || name.includes("extension") || name.includes("press") || name.includes("push-up"))) return true;
                          if (muscle.id === 'abs' && (name.includes("twist") || name.includes("plank") || name.includes("ab ") || name.includes("crunch") || name.includes("core") || name.includes("sit-up"))) return true;
                          if (muscle.id === 'legs' && (name.includes("squat") || name.includes("lung") || name.includes("deadlift") || name.includes("bridge") || name.includes("leg") || name.includes("calf") || name.includes("hamstring") || name.includes("quad"))) return true;
                          if (muscle.id === 'forearms' && (name.includes("forearm") || name.includes("wrist") || name.includes("grip"))) return true;
                          if (muscle.id === 'shoulders' && (name.includes("raise") || name.includes("shoulder") || name.includes("delt") || name.includes("press") || name.includes("push-up"))) return true;
                          return false;
                        });

                        return (
                          <div 
                            key={muscle.id}
                            className="absolute"
                            style={{ left: `${muscle.x}%`, top: `${muscle.y}%` }}
                          >
                            <button
                              type="button"
                              onClick={() => handleSelectMuscle(muscle.id)}
                              className="relative flex items-center justify-center focus:outline-none cursor-pointer group/dot"
                            >
                              <span className={`absolute inline-flex h-4 w-4 rounded-full opacity-75 ${
                                isActive ? 'bg-emerald-400 animate-ping' : isSelected ? 'bg-sky-400 animate-ping' : ''
                              }`} />
                              <span className={`relative rounded-full h-3.5 w-3.5 border border-white flex items-center justify-center transition-all ${
                                isSelected ? 'scale-125 bg-white' : isActive ? 'bg-emerald-500 shadow-md shadow-emerald-500/20' : 'bg-sky-500 shadow-md shadow-sky-500/20'
                              }`} />
                              
                              {/* Interactive Tooltip bubble */}
                              <div className={`absolute bottom-6 pointer-events-none transition-all duration-300 flex flex-col items-center ${
                                isSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-95 group-hover/dot:opacity-100 group-hover/dot:scale-100'
                              } z-20`}>
                                <div className="bg-slate-950/95 border border-slate-800 text-white rounded-lg p-3.5 shadow-2xl whitespace-nowrap text-left space-y-1 backdrop-blur-md">
                                  <div className="flex items-center gap-2.5 justify-between">
                                    <span className="font-black text-xs uppercase tracking-wider">{muscle.name}</span>
                                    {isActive && (
                                      <span className="text-[8px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 font-mono tracking-wider font-bold">Active Today</span>
                                    )}
                                  </div>
                                  <div className="text-[9px] text-slate-500 font-mono italic tracking-wide">{muscle.technicalName}</div>
                                  {matchingExercises.length > 0 && (
                                    <div className="pt-2 border-t border-slate-900 mt-2 space-y-1">
                                      <span className="text-[8px] text-slate-400 font-black uppercase tracking-wider block">Today's Exercises:</span>
                                      {matchingExercises.map((e, idx) => (
                                        <span key={idx} className="text-[10px] text-sky-400 font-bold block">• {e.name}</span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <div className="w-2.5 h-2.5 bg-slate-950 border-r border-b border-slate-850 rotate-45 -mt-1.5" />
                              </div>
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {/* Badges navigation panel for muscle selection */}
                    <div className="space-y-1.5 pt-1.5">
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Select Muscle to Highlight:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {musclesData.map((muscle) => {
                          const isActive = activeMuscles.has(muscle.id);
                          const isSelected = selectedMuscle === muscle.id;
                          return (
                            <button
                              key={muscle.id}
                              type="button"
                              onClick={() => handleSelectMuscle(muscle.id)}
                              className={`text-[9px] font-black uppercase px-2 py-1.5 rounded-lg border transition-all duration-250 cursor-pointer ${
                                isSelected 
                                  ? 'bg-sky-500 text-slate-950 border-sky-400 font-black shadow-lg shadow-sky-500/10' 
                                  : isActive 
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20' 
                                    : 'bg-slate-950 text-slate-400 border-slate-800/80 hover:text-slate-300 hover:border-slate-700'
                              }`}
                            >
                              {muscle.name}
                              {isActive && <span className="ml-1 text-[7px] px-1 py-0.2 bg-emerald-500 text-slate-950 rounded font-black tracking-widest">ACTIVE</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Card 4: Live Search Hub */}
            <div id="search-swap-hub" className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden transition-all duration-200">
              <button
                type="button"
                onClick={() => toggleDailyAccordion('searchHub')}
                className="w-full min-h-[48px] p-4 flex items-center justify-between text-left select-none cursor-pointer hover:bg-slate-850/60 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div className="p-2 bg-sky-500/10 rounded-xl text-sky-400 shrink-0">
                    <Database className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm sm:text-base font-black text-white uppercase tracking-tight font-display truncate">
                        Live Search Hub
                      </h2>
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full font-mono shrink-0 hidden sm:inline-block">
                        AI & OFF Engine
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                      Query Kai's exercise database & Open Food Facts to swap routine items
                    </p>
                  </div>
                </div>
                <div className="p-1 text-slate-400 shrink-0">
                  <ChevronDown 
                    className={`w-5 h-5 transition-transform duration-200 ${
                      openDailyAccordions.searchHub ? 'rotate-180 text-sky-400' : ''
                    }`} 
                  />
                </div>
              </button>

              <AnimatePresence initial={false}>
                {openDailyAccordions.searchHub && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-t border-slate-800/80 p-4 sm:p-6 space-y-6"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
                      <div className="flex items-start gap-3.5">
                        <div className="p-3 bg-sky-500/10 rounded-2xl text-sky-400 shrink-0">
                          <Database className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-lg md:text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                            Coach Kai's Live Search & Swap Hub
                          </h3>
                          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-0.5 max-w-2xl leading-relaxed">
                            Directly query <strong className="text-sky-400">Coach Kai's AI Exercise Engine</strong> and the <strong className="text-sky-400">Open Food Facts Database</strong> to add, modify, or swap exercises and nutrition options live.
                          </p>
                        </div>
                      </div>

                      {/* Mode Selector */}
                      <div className="flex flex-wrap items-center bg-slate-950 p-1.5 border border-slate-800/60 rounded-2xl shrink-0 gap-1 sm:gap-0">
                        <button
                          type="button"
                          onClick={() => setDbMode('exercises')}
                          className={`px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                            dbMode === 'exercises'
                              ? 'bg-sky-500 text-slate-950 shadow-lg shadow-sky-500/10'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          🏋️ AI Search Explorer
                        </button>
                        <button
                          type="button"
                          onClick={() => setDbMode('foods')}
                          className={`px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                            dbMode === 'foods'
                              ? 'bg-sky-500 text-slate-950 shadow-lg shadow-sky-500/10'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          🥗 Nutrition Index (OFF)
                        </button>
                      </div>
                    </div>

          {/* Search Bar or Target Split Banner */}
          <div className="space-y-4">
            {dbMode === 'exercises' ? (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-3.5 w-4.5 h-4.5 text-slate-500" />
                    <input
                      type="text"
                      value={exerciseQuery}
                      onChange={(e) => setExerciseQuery(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') searchWgerExercises(exerciseQuery, selectedEquipmentFilter); }}
                      placeholder="Search Kai's exercise database (100+ per muscle group, e.g. Chest, Biceps, Press, Squat)..."
                      className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500/60 pl-11 pr-4 py-3.5 rounded-2xl text-sm font-semibold text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500/20 transition-all"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => searchWgerExercises(exerciseQuery, selectedEquipmentFilter)}
                    className="bg-sky-500 hover:bg-sky-600 active:scale-95 text-slate-950 font-black px-6 py-3.5 rounded-2xl text-xs uppercase tracking-wider shadow-md shadow-sky-500/5 transition cursor-pointer shrink-0"
                  >
                    Search Engine
                  </button>
                </div>

                {/* Equipment Filter Bar */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider mr-1">Equipment:</span>
                  {[
                    { label: 'All Equipment', val: 'all' },
                    { label: '🏋️ Barbell', val: 'barbell' },
                    { label: '💪 Dumbbell', val: 'dumbbell' },
                    { label: '🔌 Cable', val: 'cable' },
                    { label: '🧱 Machine', val: 'machine' },
                    { label: '🤸 Bodyweight', val: 'bodyweight' },
                    { label: '🔔 Kettlebell', val: 'kettlebell' },
                  ].map((eq) => {
                    const isSelected = selectedEquipmentFilter === eq.val;
                    return (
                      <button
                        key={eq.val}
                        type="button"
                        onClick={() => {
                          setSelectedEquipmentFilter(eq.val);
                          searchWgerExercises(exerciseQuery, eq.val);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition cursor-pointer ${
                          isSelected
                            ? 'bg-amber-400 text-slate-950 shadow-sm'
                            : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                        }`}
                      >
                        {eq.label}
                      </button>
                    );
                  })}
                </div>

                {/* Quick Muscle Category Filter Pills */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider mr-1">Muscle Group:</span>
                  {[
                    { label: 'All Muscles', query: '' },
                    { label: '🏋️ Chest', query: 'Chest' },
                    { label: '🚣 Back', query: 'Back' },
                    { label: '💪 Biceps', query: 'Biceps' },
                    { label: '⚡ Triceps', query: 'Triceps' },
                    { label: '🎯 Shoulders', query: 'Shoulders' },
                    { label: '🦵 Legs', query: 'Legs' },
                    { label: '🔥 Abs & Core', query: 'Abs' },
                    { label: '✊ Forearms', query: 'Forearms' },
                    { label: '🏃 Cardio & HIIT', query: 'Cardio' },
                  ].map((pill) => {
                    const isCurrent = exerciseQuery.toLowerCase().trim() === pill.query.toLowerCase().trim();
                    return (
                      <button
                        key={pill.label}
                        type="button"
                        onClick={() => {
                          setExerciseQuery(pill.query);
                          searchWgerExercises(pill.query, selectedEquipmentFilter);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer ${
                          isCurrent
                            ? 'bg-sky-500 text-slate-950 border-sky-400 shadow-md shadow-sky-500/10'
                            : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                        }`}
                      >
                        {pill.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-3.5 w-4.5 h-4.5 text-slate-500" />
                    <input
                      type="text"
                      value={foodQuery}
                      onChange={(e) => setFoodQuery(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') searchOpenFoodFacts(foodQuery, selectedNutrientFilter); }}
                      placeholder="Search Open Food Facts database (e.g. Salmon, Whey, Spinach, Tofu, Oats)..."
                      className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500/60 pl-11 pr-4 py-3.5 rounded-2xl text-sm font-semibold text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500/20 transition-all"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => searchOpenFoodFacts(foodQuery, selectedNutrientFilter)}
                    className="bg-sky-500 hover:bg-sky-600 active:scale-95 text-slate-950 font-black px-6 py-3.5 rounded-2xl text-xs uppercase tracking-wider shadow-md shadow-sky-500/5 transition cursor-pointer"
                  >
                    Search Foods
                  </button>
                </div>

                {/* Nutrient Richness Index Filter Pills */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider mr-1">Rich In Nutrient:</span>
                  {[
                    { label: 'All Nutrients', val: 'all' },
                    { label: '🥩 High Protein', val: 'protein' },
                    { label: '🌾 Fiber Rich', val: 'fiber' },
                    { label: '🥑 Healthy Fats / Ω3', val: 'fats' },
                    { label: '🩸 Iron Rich', val: 'iron' },
                    { label: '🦴 High Calcium', val: 'calcium' },
                    { label: '⚡ Potassium Boost', val: 'potassium' },
                    { label: '🧠 Zinc & Mag', val: 'magnesium' },
                    { label: '🍊 Vitamin C / D', val: 'vitaminc' },
                    { label: '🔥 Low Calorie', val: 'lowcal' },
                  ].map((nut) => {
                    const isSelected = selectedNutrientFilter === nut.val;
                    return (
                      <button
                        key={nut.val}
                        type="button"
                        onClick={() => {
                          setSelectedNutrientFilter(nut.val);
                          searchOpenFoodFacts(foodQuery, nut.val);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-400 text-slate-950 border-emerald-300 shadow-md shadow-emerald-400/10'
                            : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                        }`}
                      >
                        {nut.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Error Message */}
            {dbError && (
              <div className="p-4 bg-red-950/20 border border-red-900/40 rounded-2xl text-red-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span className="font-medium">{dbError}</span>
              </div>
            )}

            {/* Loading Indicator */}
            {loadingDb ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-3 bg-slate-950/50 border border-slate-800/60 rounded-2xl">
                <div className="w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Accessing live endpoints...</span>
              </div>
            ) : (
              <div>
                {dbMode === 'exercises' ? (
                  exercises.length === 0 ? (
                    <div className="text-center py-10 bg-slate-950/20 border border-slate-800/40 rounded-2xl">
                      <p className="text-xs text-slate-500 uppercase font-black tracking-wider">No matching exercises found in this filter category. Try clearing equipment filters!</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                      {exercises.map((ex) => (
                        <div key={ex.id} className="bg-slate-950 border border-slate-800/80 hover:border-slate-700/80 p-4.5 rounded-2xl flex flex-col justify-between gap-4 transition relative overflow-hidden group">
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <button
                                onClick={() => handleOpenExerciseModal(ex)}
                                className="font-bold text-white text-sm uppercase tracking-tight text-left transition hover:text-sky-400 flex items-center gap-1.5 group cursor-pointer"
                                title="Click to view proper form & visual instruction"
                              >
                                <span>{ex.name}</span>
                                <Sparkles className="w-3.5 h-3.5 text-sky-500/60 group-hover:text-sky-400 transition" />
                              </button>
                              <div className="flex items-center gap-1 shrink-0">
                                {ex.equipment && (
                                  <span className="text-[8px] font-black tracking-wider uppercase bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-amber-300 rounded-lg">
                                    {ex.equipment}
                                  </span>
                                )}
                                <span className="text-[8px] font-black tracking-wider uppercase bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 text-sky-400 rounded-lg">
                                  {ex.category}
                                </span>
                              </div>
                            </div>
                            
                            {ex.muscles && ex.muscles.length > 0 && (
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                                🎯 Muscles: <span className="text-sky-300 font-semibold">{ex.muscles.join(', ')}</span>
                              </p>
                            )}
                            
                            <p className="text-xs text-slate-400 leading-relaxed">
                              {ex.description || "Maintain controlled movement patterns. Ensure full range of motion."}
                            </p>

                            <div className="pt-2 border-t border-slate-900 flex items-center gap-1.5">
                              <Video className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <a
                                href={ex.videoUrl || `https://www.youtube.com/results?search_query=${encodeURIComponent(ex.name + " exercise form tutorial")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] text-sky-400 hover:text-sky-300 font-bold hover:underline inline-flex items-center gap-1"
                              >
                                Watch video guide
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            </div>
                          </div>

                          {addingExerciseId === ex.id ? (
                            <div className="border-t border-slate-800/80 pt-4 space-y-3">
                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider block mb-1">Sets</label>
                                  <input
                                    type="number"
                                    value={customSets}
                                    onChange={(e) => setCustomSets(Number(e.target.value))}
                                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500 font-mono font-bold"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider block mb-1">Reps / Time</label>
                                  <input
                                    type="text"
                                    value={customReps}
                                    onChange={(e) => setCustomReps(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500 font-bold"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider block mb-1">Rest</label>
                                  <input
                                    type="text"
                                    value={customRest}
                                    onChange={(e) => setCustomRest(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500 font-bold"
                                  />
                                </div>
                              </div>
                              
                              <div>
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider block mb-1">Notes / Coaching Cues</label>
                                <input
                                  type="text"
                                  value={customNotes}
                                  onChange={(e) => setCustomNotes(e.target.value)}
                                  placeholder="e.g. focus on deep stretch, keep shoulders back..."
                                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                                />
                              </div>

                              <div className="flex gap-2 justify-end pt-1">
                                <button
                                  type="button"
                                  onClick={() => setAddingExerciseId(null)}
                                  className="px-3.5 py-1.5 text-[10px] uppercase font-black text-slate-400 hover:text-slate-200 transition"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAddCustomExercise(ex)}
                                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black px-4.5 py-2 rounded-xl text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5" /> Confirm Add
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setAddingExerciseId(ex.id);
                                setCustomNotes(ex.description ? ex.description.slice(0, 80) + "..." : "");
                              }}
                              className="w-full mt-2 bg-slate-900 hover:bg-slate-800/80 border border-slate-800/80 hover:border-sky-500/30 text-slate-300 hover:text-white font-bold py-2.5 px-4 rounded-xl text-[11px] uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
                            >
                              <PlusCircle className="w-4 h-4 text-sky-400" />
                              Add to Program Split
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )) : (
                  foods.length === 0 ? (
                    <div className="text-center py-10 bg-slate-950/20 border border-slate-800/40 rounded-2xl">
                      <p className="text-xs text-slate-500 uppercase font-black tracking-wider">No matching foods in this nutrient category. Try clearing nutrient filters!</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                      {foods.map((food) => {
                        const isHighProtein = food.protein >= 12;
                        return (
                          <div key={food.id} className="bg-slate-950 border border-slate-800/80 hover:border-slate-700/80 p-4.5 rounded-2xl flex flex-col justify-between gap-4 transition relative overflow-hidden group">
                            {food.keyNutrient && (
                              <span className="absolute top-2.5 right-2.5 text-[8px] font-black bg-emerald-500 text-slate-950 px-2.5 py-0.5 rounded-full uppercase tracking-widest z-10 shadow-lg">
                                {food.keyNutrient}
                              </span>
                            )}

                            <div className="flex gap-3.5">
                              {food.image ? (
                                <img
                                  src={food.image}
                                  alt={food.name}
                                  className="w-16 h-16 object-contain rounded-xl bg-slate-900 p-1 border border-slate-800 shrink-0 self-center"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-16 h-16 rounded-xl bg-slate-900 border border-slate-800 shrink-0 self-center flex items-center justify-center text-slate-600">
                                  <Utensils className="w-6 h-6 text-emerald-400" />
                                </div>
                              )}
                              
                              <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-white text-sm truncate uppercase tracking-tight" title={food.name}>
                                  {food.name}
                                </h4>
                                <p className="text-[10px] text-slate-500 font-bold uppercase truncate mt-0.5">
                                  {food.brand || "Generic Brand"}
                                </p>

                                {/* Highlights / Badges */}
                                {food.highlights && food.highlights.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    {food.highlights.map((h: string, idx: number) => (
                                      <span key={idx} className="text-[7.5px] font-bold bg-slate-900 text-slate-300 border border-slate-800 px-1.5 py-0.5 rounded-md uppercase">
                                        {h}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {/* Nutrition Stats Grid */}
                                <div className="grid grid-cols-4 gap-1.5 mt-2 text-center text-[9px] font-mono font-bold">
                                  <div className="bg-slate-900/60 p-1 rounded-lg">
                                    <span className="text-slate-500 block text-[7px] tracking-wide uppercase">kcal</span>
                                    <span className="text-slate-200">{food.calories}</span>
                                  </div>
                                  <div className="bg-sky-500/10 p-1 rounded-lg border border-sky-500/10">
                                    <span className="text-sky-400 block text-[7px] tracking-wide uppercase">Prot</span>
                                    <span className="text-sky-400">{food.protein}g</span>
                                  </div>
                                  <div className="bg-emerald-500/10 p-1 rounded-lg border border-emerald-500/10">
                                    <span className="text-emerald-400 block text-[7px] tracking-wide uppercase">Carb</span>
                                    <span className="text-emerald-400">{food.carbs}g</span>
                                  </div>
                                  <div className="bg-amber-500/10 p-1 rounded-lg border border-amber-500/10">
                                    <span className="text-amber-400 block text-[7px] tracking-wide uppercase">Fat</span>
                                    <span className="text-amber-400">{food.fat}g</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {addingFoodId === food.id ? (
                              <div className="border-t border-slate-800/80 pt-4 space-y-3">
                                <div>
                                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider block mb-2">Assign Meal Target Category</label>
                                  <div className="grid grid-cols-4 gap-1.5">
                                    {(['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const).map((cat) => (
                                      <button
                                        key={cat}
                                        type="button"
                                        onClick={() => setSelectedMealCategory(cat)}
                                        className={`py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border cursor-pointer ${
                                          selectedMealCategory === cat
                                            ? 'bg-sky-500 text-slate-950 border-sky-500 font-black'
                                            : 'bg-slate-900 text-slate-400 border-slate-800/80 hover:border-slate-700'
                                        }`}
                                      >
                                        {cat}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                <div className="flex gap-2 justify-end pt-1">
                                  <button
                                    type="button"
                                    onClick={() => setAddingFoodId(null)}
                                    className="px-3.5 py-1.5 text-[10px] uppercase font-black text-slate-400 hover:text-slate-200 transition"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleAddCustomFood(food)}
                                    className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black px-4.5 py-2 rounded-xl text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                                  >
                                    <Check className="w-3.5 h-3.5" /> Log Macro Item
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setAddingFoodId(food.id)}
                                className="w-full mt-2 bg-slate-900 hover:bg-slate-800/80 border border-slate-800/80 hover:border-sky-500/30 text-slate-300 hover:text-white font-bold py-2.5 px-4 rounded-xl text-[11px] uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
                              >
                                <PlusCircle className="w-4 h-4 text-sky-400" />
                                Add to Meal Routine
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )
                )
              }
            </div>
          )}
        </div>
      </motion.div>
    )}
  </AnimatePresence>
</div>

            {/* Coach Support Card */}
            <div className="bg-slate-950 rounded-2xl p-6 text-white border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-sky-400" />
                <h3 className="font-black text-white uppercase tracking-tight text-sm">Stuck or Unsatisfied?</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                You can talk to Coach Kai at any time by clicking the{" "}
                <button
                  type="button"
                  onClick={() => onChangeTab?.('chat')}
                  className="text-sky-400 hover:text-sky-300 font-black uppercase underline cursor-pointer inline"
                >
                  Coach Chat
                </button>{" "}
                hyperlink to swap out recipes, change reps, configure exercises, or ask for motivation!
              </p>
            </div>
          </div>

        {/* Exercise Instruction Modal */}
        <AnimatePresence>
          {selectedExerciseForModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
            >
              <style>{`
                @keyframes squat {
                  0%, 100% { transform: translateY(-10px); }
                  50% { transform: translateY(22px); }
                }
                @keyframes bench {
                  0%, 100% { transform: translateY(-15px); }
                  50% { transform: translateY(18px); }
                }
                @keyframes curl {
                  0%, 100% { transform: rotate(70deg); }
                  50% { transform: rotate(-55deg); }
                }
                @keyframes pull {
                  0%, 100% { transform: translateY(-12px); }
                  50% { transform: translateY(12px); }
                }
                @keyframes raise {
                  0%, 100% { transform: rotate(75deg); }
                  50% { transform: rotate(0deg); }
                }
                @keyframes raiseRight {
                  0%, 100% { transform: rotate(-75deg); }
                  50% { transform: rotate(0deg); }
                }
              `}</style>

              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
              >
                {/* Header */}
                <div className="flex items-start justify-between p-6 border-b border-slate-800">
                  <div>
                    <span className="text-[10px] font-black tracking-wider uppercase bg-sky-500/10 border border-sky-500/20 px-2.5 py-1 text-sky-400 rounded-lg">
                      {selectedExerciseForModal.category || "General"}
                    </span>
                    <h2 className="text-xl md:text-2xl font-black text-white mt-2 uppercase tracking-tight">
                      {selectedExerciseForModal.name}
                    </h2>
                    {selectedExerciseForModal.muscles && selectedExerciseForModal.muscles.length > 0 && (
                      <p className="text-xs text-slate-400 mt-1 font-bold uppercase tracking-wide">
                        Target: <span className="text-sky-300">{selectedExerciseForModal.muscles.join(', ')}</span>
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedExerciseForModal(null)}
                    className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {/* Content body */}
                <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar flex-1">
                  {/* Static Exercise Visual / Diagram Card (No Animations) */}
                  <div className="relative w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 p-5 flex flex-col items-center justify-center min-h-[200px]">
                    {loadingModalImage ? (
                      <div className="flex flex-col items-center justify-center p-8 text-center space-y-3">
                        <RefreshCw className="w-8 h-8 text-sky-400 animate-spin" />
                        <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Loading Form Guide Diagram...</span>
                      </div>
                    ) : modalImageUrl ? (
                      <div className="relative w-full max-h-[320px] flex items-center justify-center overflow-hidden rounded-xl bg-slate-900 border border-slate-800">
                        <img
                          src={modalImageUrl}
                          alt={selectedExerciseForModal.name}
                          className="w-full h-auto object-contain max-h-[300px]"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ) : (
                      <div className="w-full flex flex-col items-center text-center p-6 space-y-3 bg-gradient-to-b from-slate-900/80 to-slate-950/80 rounded-xl border border-slate-800/60">
                        <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                          <Dumbbell className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-base font-black text-white uppercase tracking-tight">{selectedExerciseForModal.name}</h3>
                          <p className="text-xs text-sky-400 font-bold uppercase mt-0.5">
                            {selectedExerciseForModal.category || "Exercise Form & Mechanics Guide"}
                          </p>
                        </div>
                        {selectedExerciseForModal.muscles && selectedExerciseForModal.muscles.length > 0 && (
                          <div className="flex flex-wrap justify-center gap-1.5 pt-2">
                            {selectedExerciseForModal.muscles.map((m: string, i: number) => (
                              <span key={i} className="px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-mono border border-slate-700">
                                {m}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Descriptive instructions */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Coach Kai Execution Notes</h4>
                      <p className="text-sm text-slate-300 leading-relaxed bg-slate-950/40 border border-slate-800/40 p-4 rounded-xl font-medium">
                        {selectedExerciseForModal.notes || selectedExerciseForModal.description || "Maintain controlled movement patterns. Exert power on the concentric (pushing/pulling) phase and control the eccentric (lowering) phase for absolute maximum fiber recruitment."}
                      </p>
                    </div>

                    {/* Video Demonstration CTA */}
                    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4.5 flex gap-3.5 items-center">
                      <Video className="w-5 h-5 text-emerald-400 shrink-0" />
                      <div className="flex-1">
                        <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider">Video Demonstration</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">Learn correct form and posture cues directly from a visual tutorial.</p>
                      </div>
                      <a
                        href={selectedExerciseForModal.videoUrl || `https://www.youtube.com/results?search_query=${encodeURIComponent(selectedExerciseForModal.name + " exercise form tutorial")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 font-black px-4.5 py-2 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                      >
                        Watch Video
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>

                    {/* Micro details panel */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-950/20 p-4 rounded-2xl border border-slate-800/40">
                      <div className="text-center p-2 rounded-xl bg-slate-950/40 border border-slate-800/20">
                        <span className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Target Reps</span>
                        <span className="text-xs font-mono font-bold text-sky-400">{selectedExerciseForModal.reps || "10-12 Reps"}</span>
                      </div>
                      <div className="text-center p-2 rounded-xl bg-slate-950/40 border border-slate-800/20">
                        <span className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Total Sets</span>
                        <span className="text-xs font-mono font-bold text-sky-400">{selectedExerciseForModal.sets || "4 Sets"}</span>
                      </div>
                      <div className="text-center p-2 rounded-xl bg-slate-950/40 border border-slate-800/20">
                        <span className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Ideal Rest</span>
                        <span className="text-xs font-mono font-bold text-sky-400">{selectedExerciseForModal.rest || "90 sec"}</span>
                      </div>
                      <div className="text-center p-2 rounded-xl bg-slate-950/40 border border-slate-800/20">
                        <span className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Tempo Pattern</span>
                        <span className="text-xs font-mono font-bold text-sky-400">3-1-2-1</span>
                      </div>
                    </div>

                    {/* Safety Guidelines */}
                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4.5 flex gap-3.5 items-start">
                      <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <h5 className="text-xs font-black text-amber-400 uppercase tracking-wide">Form & Injury Avoidance Checklist</h5>
                        <p className="text-[11px] text-slate-400 leading-relaxed mt-1.5 font-medium">
                          Never sacrifice proper alignment to lift heavier. Initiate the movement with the target muscles rather than momentum. Exhale on exertion and maintain full control over the weights during the entire trajectory.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-800 flex justify-end bg-slate-950/20">
                  <button
                    onClick={() => setSelectedExerciseForModal(null)}
                    className="bg-sky-500 hover:bg-sky-600 text-slate-950 font-black px-6 py-2.5 rounded-xl text-xs uppercase tracking-wider transition active:scale-95 cursor-pointer"
                  >
                    Got it, Let's Lift!
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    )}
  </div>
);
}
