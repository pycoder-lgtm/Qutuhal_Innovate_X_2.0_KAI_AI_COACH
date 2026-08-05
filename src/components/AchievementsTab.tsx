import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, DailyPlan, ProgressLog } from '../types';
import {
  Trophy, Flame, Sparkles, Dumbbell, Droplet, Utensils, ShieldCheck,
  Award, Zap, Target, Star, Crown, Activity, Heart, Scale, Calendar,
  CheckCircle2, Lock, Plus, RefreshCw, Cpu, FastForward, Filter, Search,
  ChevronRight, ChevronDown, ArrowUpRight, Medal
} from 'lucide-react';

interface AchievementsTabProps {
  profile: UserProfile;
  plan: DailyPlan | null;
  historyLogs?: ProgressLog[];
}

export interface AchievementItem {
  id: string;
  title: string;
  category: 'Streak & Weekly' | 'Workout & Strength' | 'Nutrition & Hydration' | 'Physique & Metrics' | 'AI & Coaching';
  weekTier: 1 | 2 | 3 | 4 | 5 | 6;
  weekTierLabel?: string;
  description: string;
  icon: React.ElementType;
  color: string; // Tailwind color key e.g. 'amber', 'sky', 'emerald', 'purple', 'rose', 'teal'
  reqDays: number; // Days required to unlock or part of week threshold
  unlocked: boolean;
  progressText: string;
  percent: number;
  rewardXP: number;
  unlockedAt?: string;
  tip?: string;
}

export default function AchievementsTab({ profile, plan, historyLogs = [] }: AchievementsTabProps) {
  // Load or initialize active streak days from localStorage
  const [activeDates, setActiveDates] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('kai_active_streak_days');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Failed to load active streak days", e);
    }
    // Default 0 active days until user logs progress or exercises
    return [];
  });

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedWeekFilter, setSelectedWeekFilter] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedBadgeModal, setSelectedBadgeModal] = useState<AchievementItem | null>(null);
  const [isEarnedOpen, setIsEarnedOpen] = useState<boolean>(true);
  const [isRemainingOpen, setIsRemainingOpen] = useState<boolean>(false);

  // Sync to localStorage when updated
  useEffect(() => {
    localStorage.getItem('kai_active_streak_days');
  }, []);

  const saveActiveDates = (dates: string[]) => {
    setActiveDates(dates);
    localStorage.setItem('kai_active_streak_days', JSON.stringify(dates));
  };

  const handleLogDay = () => {
    const nextCount = activeDates.length + 1;
    const newDay = `2026-07-${nextCount > 9 ? nextCount : '0' + nextCount}`;
    const updated = Array.from(new Set([...activeDates, newDay]));
    saveActiveDates(updated);
  };

  const handleAdvanceWeek = () => {
    // Adds 7 new active days
    const currentLen = activeDates.length;
    const newDays: string[] = [];
    for (let i = 1; i <= 7; i++) {
      newDays.push(`sim-day-${currentLen + i}-${Date.now()}`);
    }
    const updated = [...activeDates, ...newDays];
    saveActiveDates(updated);
  };

  const handleResetStreak = () => {
    saveActiveDates([]);
  };

  // Daily plan stats
  const completedExercisesCount = plan?.exercises?.filter(e => e.completed).length || 0;
  const totalExercisesCount = plan?.exercises?.length || 0;
  const completedMealsCount = plan?.meals?.filter(m => m.eaten).length || 0;
  const totalMealsCount = plan?.meals?.length || 0;
  const waterMl = plan?.waterIntakeMl || 0;

  // Metrics calculations based on actual evidence from progress logs & active logs
  const historyDates = (historyLogs || []).map(l => l.date).filter(Boolean);
  const planActiveDate = (completedExercisesCount > 0 || completedMealsCount > 0 || waterMl > 0) ? [new Date().toISOString().split('T')[0]] : [];
  const allLoggedDates = Array.from(new Set([...historyDates, ...activeDates, ...planActiveDate]));
  const totalDaysActive = allLoggedDates.length;
  const currentWeekNumber = totalDaysActive === 0 ? 0 : Math.ceil(totalDaysActive / 7);

  // Build 42 achievements (7 per week tier!)
  const allAchievements: AchievementItem[] = [
    // ==========================================
    // WEEK 1 TIER (Days 1–7) - 7 ACHIEVEMENTS
    // ==========================================
    {
      id: 'w1_kickoff',
      title: 'First Step Taken',
      category: 'AI & Coaching',
      weekTier: 1,
      description: 'Generated and launched your custom AI daily fitness routine with Coach Kai',
      icon: Sparkles,
      color: 'sky',
      reqDays: 1,
      unlocked: (historyLogs || []).length > 0 || completedExercisesCount > 0 || completedMealsCount > 0 || waterMl > 0,
      progressText: ((historyLogs || []).length > 0 || completedExercisesCount > 0) ? 'Unlocked' : `${Math.min(totalDaysActive, 1)} / 1 Day`,
      percent: ((historyLogs || []).length > 0 || completedExercisesCount > 0) ? 100 : (totalDaysActive >= 1 ? 100 : 0),
      rewardXP: 100,
      tip: 'Log a workout, meal, or progress log in the Metrics tracker to unlock.'
    },
    {
      id: 'w1_day1_pioneer',
      title: 'Day 1 Pioneer',
      category: 'Workout & Strength',
      weekTier: 1,
      description: 'Completed your very first structured workout session in the daily plan',
      icon: Dumbbell,
      color: 'emerald',
      reqDays: 1,
      unlocked: completedExercisesCount > 0 || (historyLogs || []).some(l => l.workoutsDone && l.workoutsDone.length > 0),
      progressText: completedExercisesCount > 0 ? `${completedExercisesCount} Completed` : '1 Exercise Required',
      percent: completedExercisesCount > 0 || (historyLogs || []).some(l => l.workoutsDone && l.workoutsDone.length > 0) ? 100 : 0,
      rewardXP: 100,
      tip: 'Check off at least one exercise or log a workout in your progress log.'
    },
    {
      id: 'w1_hydration_starter',
      title: 'Hydration Starter',
      category: 'Nutrition & Hydration',
      weekTier: 1,
      description: 'Logged 2,000ml or more of water intake in your daily plan',
      icon: Droplet,
      color: 'teal',
      reqDays: 1,
      unlocked: waterMl >= 2000 || (historyLogs || []).some(l => (l.waterLiters || 0) >= 2),
      progressText: `${waterMl} / 2,000 ml`,
      percent: Math.min(100, Math.round((waterMl / 2000) * 100)),
      rewardXP: 100,
      tip: 'Track 2,000ml of water using the water counter or in progress logs.'
    },
    {
      id: 'w1_nutrition_master',
      title: 'Nutrition Discipline',
      category: 'Nutrition & Hydration',
      weekTier: 1,
      description: 'Tracked and completed planned daily meals in your split',
      icon: Utensils,
      color: 'indigo',
      reqDays: 1,
      unlocked: (totalMealsCount > 0 && completedMealsCount === totalMealsCount && completedMealsCount > 0) || (historyLogs || []).some(l => l.mealsEaten && l.mealsEaten.length > 0),
      progressText: `${completedMealsCount} / ${totalMealsCount || 4} Meals Eaten`,
      percent: totalMealsCount > 0 ? Math.round((completedMealsCount / totalMealsCount) * 100) : 0,
      rewardXP: 150,
      tip: 'Mark scheduled meals as eaten or log your nutrition.'
    },
    {
      id: 'w1_profile_ready',
      title: 'Biometric Target Locked',
      category: 'Physique & Metrics',
      weekTier: 1,
      description: 'Saved your complete body weight, height, and target fitness strategy with logged evidence',
      icon: Scale,
      color: 'amber',
      reqDays: 1,
      unlocked: !!profile?.weight && ((historyLogs || []).length >= 1 || totalDaysActive >= 1),
      progressText: (profile?.weight && totalDaysActive >= 1) ? 'Profile Set & Logged' : 'Progress Log Required',
      percent: (profile?.weight && totalDaysActive >= 1) ? 100 : 0,
      rewardXP: 100,
      tip: 'Log at least 1 day of progress in Metrics or Daily Plan.'
    },
    {
      id: 'w1_coach_chat',
      title: 'AI Coach Synergy',
      category: 'AI & Coaching',
      weekTier: 1,
      description: 'Engaged with Coach Kai and logged active fitness progress',
      icon: Cpu,
      color: 'purple',
      reqDays: 1,
      unlocked: totalDaysActive >= 1 && (historyLogs || []).length >= 1,
      progressText: totalDaysActive >= 1 ? 'Active Log' : '0 / 1 Day',
      percent: totalDaysActive >= 1 && (historyLogs || []).length >= 1 ? 100 : 0,
      rewardXP: 120,
      tip: 'Log progress in Metrics to confirm AI Coach engagement.'
    },
    {
      id: 'w1_week1_complete',
      title: 'Week 1 Foundation Complete',
      category: 'Streak & Weekly',
      weekTier: 1,
      description: 'Sustained 7 active days of unbroken workout and diet tracking',
      icon: Flame,
      color: 'rose',
      reqDays: 7,
      unlocked: totalDaysActive >= 7,
      progressText: `${Math.min(totalDaysActive, 7)} / 7 Days`,
      percent: Math.min(100, Math.round((totalDaysActive / 7) * 100)),
      rewardXP: 250,
      tip: 'Reach 7 active days logged in your program.'
    },

    // ==========================================
    // WEEK 2 TIER (Days 8–14) - 7 ACHIEVEMENTS
    // ==========================================
    {
      id: 'w2_14_day_titan',
      title: '14-Day Titan',
      category: 'Streak & Weekly',
      weekTier: 2,
      description: 'Built a 14-day streak of relentless daily discipline and execution',
      icon: ShieldCheck,
      color: 'amber',
      reqDays: 14,
      unlocked: totalDaysActive >= 14,
      progressText: `${Math.min(totalDaysActive, 14)} / 14 Days`,
      percent: Math.min(100, Math.round((totalDaysActive / 14) * 100)),
      rewardXP: 300,
      tip: 'Sustain active logs through 14 full days.'
    },
    {
      id: 'w2_double_week_warrior',
      title: 'Double Week Warrior',
      category: 'Streak & Weekly',
      weekTier: 2,
      description: 'Unlocked and executed Week 2 of your professional fitness split',
      icon: Calendar,
      color: 'emerald',
      weekTierLabel: 'Week 2',
      reqDays: 8,
      unlocked: totalDaysActive >= 8,
      progressText: totalDaysActive >= 8 ? 'Week 2 Unlocked' : `${totalDaysActive} / 8 Days`,
      percent: Math.min(100, Math.round((totalDaysActive / 8) * 100)),
      rewardXP: 200,
      tip: 'Advance into your second week of training.'
    },
    {
      id: 'w2_heavy_lift_pioneer',
      title: 'Iron Will Operator',
      category: 'Workout & Strength',
      weekTier: 2,
      description: 'Completed 10 total workout sessions with full hyper-focused execution',
      icon: Dumbbell,
      color: 'sky',
      reqDays: 10,
      unlocked: totalDaysActive >= 10,
      progressText: `${Math.min(totalDaysActive, 10)} / 10 Sessions`,
      percent: Math.min(100, Math.round((totalDaysActive / 10) * 100)),
      rewardXP: 220,
      tip: 'Complete 10 total workout logs.'
    },
    {
      id: 'w2_hydration_beast',
      title: 'Hydration Beast',
      category: 'Nutrition & Hydration',
      weekTier: 2,
      description: 'Consistently logged over 2,500ml of water intake across 10 active days',
      icon: Droplet,
      color: 'teal',
      reqDays: 10,
      unlocked: totalDaysActive >= 10,
      progressText: `${Math.min(totalDaysActive, 10)} / 10 Days`,
      percent: Math.min(100, Math.round((totalDaysActive / 10) * 100)),
      rewardXP: 200,
      tip: 'Log 2,500ml water across multiple training sessions.'
    },
    {
      id: 'w2_macro_precision',
      title: 'Macro Precision Target',
      category: 'Nutrition & Hydration',
      weekTier: 2,
      description: 'Sustained high-protein anabolic nutrition alignment for 12 days straight',
      icon: Utensils,
      color: 'indigo',
      reqDays: 12,
      unlocked: totalDaysActive >= 12,
      progressText: `${Math.min(totalDaysActive, 12)} / 12 Days`,
      percent: Math.min(100, Math.round((totalDaysActive / 12) * 100)),
      rewardXP: 250,
      tip: 'Follow planned high-protein meals for 12 days.'
    },
    {
      id: 'w2_recovery_master',
      title: 'Active Mobility Specialist',
      category: 'Workout & Strength',
      weekTier: 2,
      description: 'Completed dedicated active recovery, core stability, and stretching routines',
      icon: Activity,
      color: 'purple',
      reqDays: 9,
      unlocked: totalDaysActive >= 9,
      progressText: totalDaysActive >= 9 ? 'Completed' : 'Requires Day 9+',
      percent: totalDaysActive >= 9 ? 100 : Math.round((totalDaysActive / 9) * 100),
      rewardXP: 180,
      tip: 'Complete a Wednesday Active Recovery session.'
    },
    {
      id: 'w2_week2_mastery',
      title: 'Week 2 Mastery Unlocked',
      category: 'Streak & Weekly',
      weekTier: 2,
      description: 'Successfully conquered all 14 days of Week 1 and Week 2 training tiers',
      icon: Trophy,
      color: 'rose',
      reqDays: 14,
      unlocked: totalDaysActive >= 14,
      progressText: `${Math.min(totalDaysActive, 14)} / 14 Days`,
      percent: Math.min(100, Math.round((totalDaysActive / 14) * 100)),
      rewardXP: 350,
      tip: 'Finish 14 total days in your program schedule.'
    },

    // ==========================================
    // WEEK 3 TIER (Days 15–21) - 7 ACHIEVEMENTS
    // ==========================================
    {
      id: 'w3_21_day_habit',
      title: '21-Day Habit Transformer',
      category: 'Streak & Weekly',
      weekTier: 3,
      description: 'Reached the neuroscience threshold: 21 days of automatic lifestyle habit formation',
      icon: Flame,
      color: 'amber',
      reqDays: 21,
      unlocked: totalDaysActive >= 21,
      progressText: `${Math.min(totalDaysActive, 21)} / 21 Days`,
      percent: Math.min(100, Math.round((totalDaysActive / 21) * 100)),
      rewardXP: 400,
      tip: 'Sustain active daily logging through 21 days.'
    },
    {
      id: 'w3_triple_week_vanguard',
      title: 'Triple Week Vanguard',
      category: 'Streak & Weekly',
      weekTier: 3,
      description: 'Advanced into Week 3 of your specialized strength or stamina split',
      icon: Star,
      color: 'emerald',
      reqDays: 15,
      unlocked: totalDaysActive >= 15,
      progressText: totalDaysActive >= 15 ? 'Week 3 Active' : `${totalDaysActive} / 15 Days`,
      percent: Math.min(100, Math.round((totalDaysActive / 15) * 100)),
      rewardXP: 250,
      tip: 'Cross day 15 to open Week 3 tier achievements.'
    },
    {
      id: 'w3_compound_crusher',
      title: 'Compound Heavy Crusher',
      category: 'Workout & Strength',
      weekTier: 3,
      description: 'Completed 50 total compound sets (Squats, Presses, Deadlifts, Pulldowns)',
      icon: Dumbbell,
      color: 'sky',
      reqDays: 16,
      unlocked: totalDaysActive >= 16,
      progressText: `${Math.min(totalDaysActive * 4, 50)} / 50 Sets`,
      percent: Math.min(100, Math.round((Math.min(totalDaysActive * 4, 50) / 50) * 100)),
      rewardXP: 280,
      tip: 'Complete compound lifts across 16 active days.'
    },
    {
      id: 'w3_metabolic_fire',
      title: 'Metabolic Engine',
      category: 'Workout & Strength',
      weekTier: 3,
      description: 'Burned over 10,000 active calories across sustained workout sessions',
      icon: Zap,
      color: 'rose',
      reqDays: 18,
      unlocked: totalDaysActive >= 18,
      progressText: `${Math.min(totalDaysActive * 600, 10000)} / 10,000 kcal`,
      percent: Math.min(100, Math.round(((totalDaysActive * 600) / 10000) * 100)),
      rewardXP: 300,
      tip: 'Accumulate active calories through 18 days of workout tracking.'
    },
    {
      id: 'w3_meal_prep_connoisseur',
      title: 'Meal Prep Connoisseur',
      category: 'Nutrition & Hydration',
      weekTier: 3,
      description: 'Logged 50 clean, high-performance meals generated by Coach Kai',
      icon: Utensils,
      color: 'indigo',
      reqDays: 17,
      unlocked: totalDaysActive >= 17,
      progressText: `${Math.min(totalDaysActive * 3, 50)} / 50 Meals`,
      percent: Math.min(100, Math.round(((totalDaysActive * 3) / 50) * 100)),
      rewardXP: 260,
      tip: 'Track meals consistently across 17 days.'
    },
    {
      id: 'w3_physique_tracker',
      title: 'Physique Progress Tracker',
      category: 'Physique & Metrics',
      weekTier: 3,
      description: 'Recorded 3 or more detailed weight or photo progress logs in Progress Log',
      icon: Scale,
      color: 'purple',
      reqDays: 19,
      unlocked: historyLogs.length >= 3 || totalDaysActive >= 19,
      progressText: `${Math.max(historyLogs.length, Math.min(3, Math.floor(totalDaysActive / 6)))} / 3 Logs`,
      percent: Math.min(100, Math.round(((historyLogs.length || Math.min(3, Math.floor(totalDaysActive / 6))) / 3) * 100)),
      rewardXP: 220,
      tip: 'Add entries in the Progress Log tab.'
    },
    {
      id: 'w3_week3_apex',
      title: 'Week 3 Apex Achieved',
      category: 'Streak & Weekly',
      weekTier: 3,
      description: 'Completed 21 full active days of high-performance training and diet discipline',
      icon: Crown,
      color: 'amber',
      reqDays: 21,
      unlocked: totalDaysActive >= 21,
      progressText: `${Math.min(totalDaysActive, 21)} / 21 Days`,
      percent: Math.min(100, Math.round((totalDaysActive / 21) * 100)),
      rewardXP: 450,
      tip: 'Finish 21 days in your training calendar.'
    },

    // ==========================================
    // WEEK 4 TIER (Days 22–28) - 7 ACHIEVEMENTS
    // ==========================================
    {
      id: 'w4_28_day_monthly',
      title: '28-Day Monthly Legend',
      category: 'Streak & Weekly',
      weekTier: 4,
      description: 'Conquered 28 consecutive days—a full 4-week monthly fitness cycle!',
      icon: Crown,
      color: 'amber',
      reqDays: 28,
      unlocked: totalDaysActive >= 28,
      progressText: `${Math.min(totalDaysActive, 28)} / 28 Days`,
      percent: Math.min(100, Math.round((totalDaysActive / 28) * 100)),
      rewardXP: 500,
      tip: 'Complete 28 active days logged.'
    },
    {
      id: 'w4_quad_week_master',
      title: '4-Week Program Mastery',
      category: 'Streak & Weekly',
      weekTier: 4,
      description: 'Successfully reached Week 4 of your tailored exercise split',
      icon: Calendar,
      color: 'emerald',
      reqDays: 22,
      unlocked: totalDaysActive >= 22,
      progressText: totalDaysActive >= 22 ? 'Week 4 Active' : `${totalDaysActive} / 22 Days`,
      percent: Math.min(100, Math.round((totalDaysActive / 22) * 100)),
      rewardXP: 300,
      tip: 'Pass day 22 to unlock Week 4 tier badges.'
    },
    {
      id: 'w4_heavy_metal_overload',
      title: 'Heavy Metal Overload',
      category: 'Workout & Strength',
      weekTier: 4,
      description: 'Logged over 100 total sets across Push, Pull, and Legs routines',
      icon: Dumbbell,
      color: 'sky',
      reqDays: 24,
      unlocked: totalDaysActive >= 24,
      progressText: `${Math.min(totalDaysActive * 5, 100)} / 100 Sets`,
      percent: Math.min(100, Math.round(((totalDaysActive * 5) / 100) * 100)),
      rewardXP: 350,
      tip: 'Log workouts across 24 days.'
    },
    {
      id: 'w4_hydration_elite',
      title: 'Hydration Reservoir Elite',
      category: 'Nutrition & Hydration',
      weekTier: 4,
      description: 'Cumulative total water intake passed 50,000ml of hydration',
      icon: Droplet,
      color: 'teal',
      reqDays: 25,
      unlocked: totalDaysActive >= 25,
      progressText: `${Math.min(totalDaysActive * 2000, 50000)} / 50,000 ml`,
      percent: Math.min(100, Math.round(((totalDaysActive * 2000) / 50000) * 100)),
      rewardXP: 320,
      tip: 'Accumulate 50,000ml of logged water.'
    },
    {
      id: 'w4_protein_synthesizer',
      title: 'Anabolic Protein Engine',
      category: 'Nutrition & Hydration',
      weekTier: 4,
      description: 'Consistently hit high protein target across 26 active program days',
      icon: Utensils,
      color: 'indigo',
      reqDays: 26,
      unlocked: totalDaysActive >= 26,
      progressText: `${Math.min(totalDaysActive, 26)} / 26 Days`,
      percent: Math.min(100, Math.round((totalDaysActive / 26) * 100)),
      rewardXP: 340,
      tip: 'Maintain protein discipline for 26 days.'
    },
    {
      id: 'w4_mind_muscle_mastery',
      title: 'Mind-Muscle Mastery',
      category: 'Workout & Strength',
      weekTier: 4,
      description: 'Maintained perfect execution tempo and form on all compound lifts',
      icon: Zap,
      color: 'purple',
      reqDays: 23,
      unlocked: totalDaysActive >= 23,
      progressText: totalDaysActive >= 23 ? 'Achieved' : 'In Progress',
      percent: Math.min(100, Math.round((totalDaysActive / 23) * 100)),
      rewardXP: 280,
      tip: 'Complete 23 days of workouts.'
    },
    {
      id: 'w4_week4_master_tier',
      title: 'Week 4 Grandmaster Tier',
      category: 'Streak & Weekly',
      weekTier: 4,
      description: 'Finished a complete 28-day monthly training block with 100% commitment',
      icon: Medal,
      color: 'rose',
      reqDays: 28,
      unlocked: totalDaysActive >= 28,
      progressText: `${Math.min(totalDaysActive, 28)} / 28 Days`,
      percent: Math.min(100, Math.round((totalDaysActive / 28) * 100)),
      rewardXP: 550,
      tip: 'Finish all 28 days of month 1.'
    },

    // ==========================================
    // WEEK 5 TIER (Days 29–35) - 7 ACHIEVEMENTS
    // ==========================================
    {
      id: 'w5_35_day_century',
      title: '35-Day Century Warrior',
      category: 'Streak & Weekly',
      weekTier: 5,
      description: 'Crossed 35 active streak days into elite athlete territory!',
      icon: Crown,
      color: 'amber',
      reqDays: 35,
      unlocked: totalDaysActive >= 35,
      progressText: `${Math.min(totalDaysActive, 35)} / 35 Days`,
      percent: Math.min(100, Math.round((totalDaysActive / 35) * 100)),
      rewardXP: 600,
      tip: 'Log 35 active days in your routine.'
    },
    {
      id: 'w5_vanguard_week',
      title: 'Week 5 Vanguard',
      category: 'Streak & Weekly',
      weekTier: 5,
      description: 'Entered Week 5 of advanced athletic conditioning and volume scaling',
      icon: Star,
      color: 'emerald',
      reqDays: 29,
      unlocked: totalDaysActive >= 29,
      progressText: totalDaysActive >= 29 ? 'Week 5 Active' : `${totalDaysActive} / 29 Days`,
      percent: Math.min(100, Math.round((totalDaysActive / 29) * 100)),
      rewardXP: 350,
      tip: 'Reach day 29 to unlock Week 5 badges.'
    },
    {
      id: 'w5_hypertrophy_architect',
      title: 'Hypertrophy Architect',
      category: 'Workout & Strength',
      weekTier: 5,
      description: 'Completed over 150 total exercise sets with progressive overload',
      icon: Dumbbell,
      color: 'sky',
      reqDays: 31,
      unlocked: totalDaysActive >= 31,
      progressText: `${Math.min(totalDaysActive * 5, 150)} / 150 Sets`,
      percent: Math.min(100, Math.round(((totalDaysActive * 5) / 150) * 100)),
      rewardXP: 400,
      tip: 'Complete workouts through 31 active days.'
    },
    {
      id: 'w5_vo2_max_smasher',
      title: 'VO2 Max Stamina Smasher',
      category: 'Workout & Strength',
      weekTier: 5,
      description: 'Completed 10 high-tempo cardio, sprint, or endurance conditioning sessions',
      icon: FastForward,
      color: 'rose',
      reqDays: 30,
      unlocked: totalDaysActive >= 30,
      progressText: `${Math.min(totalDaysActive, 30)} / 30 Days`,
      percent: Math.min(100, Math.round((totalDaysActive / 30) * 100)),
      rewardXP: 380,
      tip: 'Log 30 days of workout performance.'
    },
    {
      id: 'w5_calorie_precision',
      title: 'Caloric Precision Master',
      category: 'Nutrition & Hydration',
      weekTier: 5,
      description: 'Maintained strict energy surplus / deficit tracking for 32 active days',
      icon: Utensils,
      color: 'indigo',
      reqDays: 32,
      unlocked: totalDaysActive >= 32,
      progressText: `${Math.min(totalDaysActive, 32)} / 32 Days`,
      percent: Math.min(100, Math.round((totalDaysActive / 32) * 100)),
      rewardXP: 360,
      tip: 'Track meal plans across 32 days.'
    },
    {
      id: 'w5_kai_scholar',
      title: 'Coach Kai Elite Scholar',
      category: 'AI & Coaching',
      weekTier: 5,
      description: 'Utilized AI coaching intelligence across 33 training days for maximum output',
      icon: Cpu,
      color: 'purple',
      reqDays: 33,
      unlocked: totalDaysActive >= 33,
      progressText: `${Math.min(totalDaysActive, 33)} / 33 Days`,
      percent: Math.min(100, Math.round((totalDaysActive / 33) * 100)),
      rewardXP: 320,
      tip: 'Engage with Coach Kai across 33 days.'
    },
    {
      id: 'w5_week5_apex',
      title: 'Week 5 Apex Champion',
      category: 'Streak & Weekly',
      weekTier: 5,
      description: 'Conquered 35 full days of progressive physical transformation',
      icon: Trophy,
      color: 'teal',
      reqDays: 35,
      unlocked: totalDaysActive >= 35,
      progressText: `${Math.min(totalDaysActive, 35)} / 35 Days`,
      percent: Math.min(100, Math.round((totalDaysActive / 35) * 100)),
      rewardXP: 650,
      tip: 'Finish all 35 days in your schedule.'
    },

    // ==========================================
    // WEEK 6 TIER (Days 36–42) - 7 ACHIEVEMENTS
    // ==========================================
    {
      id: 'w6_42_day_hall_of_fame',
      title: '42-Day Hall of Fame',
      category: 'Streak & Weekly',
      weekTier: 6,
      description: 'Completed a 42-day active streak (6 full weeks)—the ultimate fitness milestone!',
      icon: Crown,
      color: 'amber',
      reqDays: 42,
      unlocked: totalDaysActive >= 42,
      progressText: `${Math.min(totalDaysActive, 42)} / 42 Days`,
      percent: Math.min(100, Math.round((totalDaysActive / 42) * 100)),
      rewardXP: 1000,
      tip: 'Reach 42 active days logged in your program.'
    },
    {
      id: 'w6_grandmaster_week',
      title: '6-Week Grandmaster',
      category: 'Streak & Weekly',
      weekTier: 6,
      description: 'Unlocked Week 6 of peak physical performance and elite physical conditioning',
      icon: Medal,
      color: 'emerald',
      reqDays: 36,
      unlocked: totalDaysActive >= 36,
      progressText: totalDaysActive >= 36 ? 'Week 6 Active' : `${totalDaysActive} / 36 Days`,
      percent: Math.min(100, Math.round((totalDaysActive / 36) * 100)),
      rewardXP: 450,
      tip: 'Cross day 36 to open the final Week 6 tier badges.'
    },
    {
      id: 'w6_200_sets_smashed',
      title: '200 Sets Smashed',
      category: 'Workout & Strength',
      weekTier: 6,
      description: 'Completed over 200 total exercise sets in your customized routines',
      icon: Dumbbell,
      color: 'sky',
      reqDays: 38,
      unlocked: totalDaysActive >= 38,
      progressText: `${Math.min(totalDaysActive * 5, 200)} / 200 Sets`,
      percent: Math.min(100, Math.round(((totalDaysActive * 5) / 200) * 100)),
      rewardXP: 500,
      tip: 'Log workout sets across 38 days.'
    },
    {
      id: 'w6_supreme_stamina',
      title: 'Supreme Athletic Stamina',
      category: 'Workout & Strength',
      weekTier: 6,
      description: 'Mastered high-intensity cardio, VO2 max sprints, and heavy compound lifting',
      icon: Zap,
      color: 'rose',
      reqDays: 39,
      unlocked: totalDaysActive >= 39,
      progressText: `${Math.min(totalDaysActive, 39)} / 39 Days`,
      percent: Math.min(100, Math.round((totalDaysActive / 39) * 100)),
      rewardXP: 480,
      tip: 'Sustain hybrid training across 39 days.'
    },
    {
      id: 'w6_ultimate_meal_discipline',
      title: 'Ultimate Meal Discipline',
      category: 'Nutrition & Hydration',
      weekTier: 6,
      description: 'Logged over 100 clean, planned meals and maintained peak hydration',
      icon: Utensils,
      color: 'indigo',
      reqDays: 40,
      unlocked: totalDaysActive >= 40,
      progressText: `${Math.min(totalDaysActive * 3, 100)} / 100 Meals`,
      percent: Math.min(100, Math.round(((totalDaysActive * 3) / 100) * 100)),
      rewardXP: 460,
      tip: 'Track planned nutrition across 40 days.'
    },
    {
      id: 'w6_cloud_firebase_master',
      title: 'Cloud Persistence Master',
      category: 'AI & Coaching',
      weekTier: 6,
      description: 'Synced complete profile, history logs, and daily plans to Firebase Cloud DB',
      icon: ShieldCheck,
      color: 'purple',
      reqDays: 41,
      unlocked: totalDaysActive >= 41 || (!!profile && (historyLogs || []).length >= 5 && totalDaysActive >= 5),
      progressText: totalDaysActive >= 5 ? 'Cloud Sync Active' : 'Requires 5+ Progress Logs',
      percent: Math.min(100, Math.round((totalDaysActive / 41) * 100)),
      rewardXP: 400,
      tip: 'Connect profile or reach 41 active days.'
    },
    {
      id: 'w6_apex_champion',
      title: 'Apex Fitness Champion',
      category: 'Streak & Weekly',
      weekTier: 6,
      description: 'Unlocked all 6 Weekly Tiers (42 total achievements) of elite physical transformation!',
      icon: Trophy,
      color: 'amber',
      reqDays: 42,
      unlocked: totalDaysActive >= 42,
      progressText: `${Math.min(totalDaysActive, 42)} / 42 Days`,
      percent: Math.min(100, Math.round((totalDaysActive / 42) * 100)),
      rewardXP: 1500,
      tip: 'Reach 42 total days in your program to claim Apex status!'
    }
  ];

  // Filtering logic
  const filteredAchievements = allAchievements.filter(badge => {
    // Week filter
    if (selectedWeekFilter !== 'all' && badge.weekTier !== selectedWeekFilter) {
      return false;
    }
    // Category filter
    if (selectedCategory !== 'all' && badge.category !== selectedCategory) {
      return false;
    }
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        badge.title.toLowerCase().includes(q) ||
        badge.description.toLowerCase().includes(q) ||
        badge.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const unlockedCount = allAchievements.filter(a => a.unlocked).length;
  const totalCount = allAchievements.length;
  const overallPercent = Math.round((unlockedCount / totalCount) * 100);

  const totalXP = allAchievements.reduce((acc, a) => acc + (a.unlocked ? a.rewardXP : 0), 0);

  const earnedAchievements = filteredAchievements.filter(a => a.unlocked);
  const remainingAchievements = filteredAchievements.filter(a => !a.unlocked);

  const renderBadgeCard = (badge: AchievementItem) => {
    const Icon = badge.icon;
    const isUnlocked = badge.unlocked;

    return (
      <div
        key={badge.id}
        onClick={() => setSelectedBadgeModal(badge)}
        className={`p-4 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between space-y-4 group select-none ${
          isUnlocked
            ? 'bg-gradient-to-b from-slate-900 to-slate-950 border-amber-500/40 shadow-xl shadow-amber-500/5 hover:border-amber-400 hover:scale-[1.02]'
            : 'bg-slate-950/60 border-slate-850 opacity-60 hover:opacity-90 hover:border-slate-700'
        }`}
      >
        {/* Badge Header Row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl border transition ${
              isUnlocked
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-400 shadow-md shadow-amber-500/10'
                : 'bg-slate-900 border-slate-800 text-slate-600'
            }`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block font-mono">
                WEEK {badge.weekTier} TIER
              </span>
              <h3 className={`text-sm font-black tracking-tight uppercase line-clamp-1 ${
                isUnlocked ? 'text-white' : 'text-slate-400'
              }`}>
                {badge.title}
              </h3>
            </div>
          </div>

          {isUnlocked ? (
            <span className="text-[9px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1 shrink-0">
              <CheckCircle2 className="w-3 h-3" />
              Unlocked
            </span>
          ) : (
            <span className="text-[9px] font-bold text-slate-500 bg-slate-900 px-2 py-1 rounded-full border border-slate-800 flex items-center gap-1 shrink-0">
              <Lock className="w-3 h-3" />
              Locked
            </span>
          )}
        </div>

        {/* Description */}
        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed min-h-[36px]">
          {badge.description}
        </p>

        {/* Footer Progress & XP */}
        <div className="space-y-2 pt-2 border-t border-slate-850">
          <div className="flex items-center justify-between text-[10px] font-mono font-bold">
            <span className="text-slate-400">{badge.progressText}</span>
            <span className={isUnlocked ? 'text-amber-400' : 'text-slate-500'}>
              +{badge.rewardXP} XP
            </span>
          </div>

          <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
            <div
              className={`h-full transition-all duration-500 ${
                isUnlocked
                  ? 'bg-gradient-to-r from-amber-500 to-emerald-400'
                  : 'bg-slate-800'
              }`}
              style={{ width: `${badge.percent}%` }}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Top Banner & Milestones Header */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden space-y-6">
        {/* Glow ambient background elements */}
        <div className="absolute top-0 right-1/3 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-800/80 pb-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="p-4 bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/40 rounded-2xl text-amber-400 shadow-xl shadow-amber-500/10 shrink-0">
              <Trophy className="w-9 h-9 animate-pulse" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 font-mono bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/30">
                  42 Program Milestones
                </span>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1">
                  <FastForward className="w-3 h-3" />
                  +7 Achievements Unlocked / Week
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight font-display italic">
                Achievements & Weekly Milestones
              </h1>
              <p className="text-xs text-slate-400 max-w-xl">
                Track your evolution through 42 structured badges. Every completed week of training unlocks <span className="text-amber-400 font-bold">7 new weekly tier achievements</span> to reward your consistency!
              </p>
            </div>
          </div>

          {/* Test Simulation Controls */}
          <div className="bg-slate-950/90 border border-slate-800 p-4 rounded-2xl space-y-2.5 shrink-0 shadow-inner">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-400 fill-amber-400 animate-bounce" />
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block font-mono">Current Program Progress</span>
                  <span className="text-base font-black text-white font-mono">{totalDaysActive} Days Active ({currentWeekNumber} Weeks)</span>
                </div>
              </div>
              <span className="text-xs font-black text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                {totalXP} XP
              </span>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleLogDay}
                className="flex-1 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 hover:text-white px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                title="Log 1 active day to progress streak"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Log Day</span>
              </button>
              <button
                type="button"
                onClick={handleAdvanceWeek}
                className="flex-1 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 hover:text-white px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                title="Advance 1 week (7 days) to unlock the next 7 weekly achievements!"
              >
                <FastForward className="w-3.5 h-3.5" />
                <span>+ Advance Week (+7)</span>
              </button>
              <button
                type="button"
                onClick={handleResetStreak}
                className="bg-slate-900 hover:bg-red-500/20 border border-slate-800 hover:border-red-500/30 text-slate-500 hover:text-red-300 p-2 rounded-xl text-xs font-bold transition"
                title="Reset active streak days for testing"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Global Progress Overview Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-1">
          <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Achievements Unlocked</span>
              <span className="text-xl font-black text-amber-400 font-mono mt-0.5 block">{unlockedCount} / {totalCount}</span>
            </div>
            <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <Trophy className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Completion Rate</span>
              <span className="text-xl font-black text-emerald-400 font-mono mt-0.5 block">{overallPercent}%</span>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Award className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Current Weekly Tier</span>
              <span className="text-xl font-black text-sky-400 font-mono mt-0.5 block">Week {currentWeekNumber} Tier</span>
            </div>
            <div className="p-3 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20">
              <Calendar className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Total Athlete XP</span>
              <span className="text-xl font-black text-purple-400 font-mono mt-0.5 block">{totalXP} XP</span>
            </div>
            <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
              <Zap className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs font-mono font-bold">
            <span className="text-slate-400">Total Program Achievement Unlock Mastery</span>
            <span className="text-amber-400">{unlockedCount} of 42 Unlocked ({overallPercent}%)</span>
          </div>
          <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800 p-0.5">
            <div
              className="h-full bg-gradient-to-r from-amber-500 via-emerald-400 to-sky-400 rounded-full transition-all duration-700 shadow-[0_0_12px_rgba(245,158,11,0.5)]"
              style={{ width: `${overallPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Navigation & Filtering Controls */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        {/* Weekly Tier Selector Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedWeekFilter('all')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              selectedWeekFilter === 'all'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            All Tiers (42)
          </button>
          {[1, 2, 3, 4, 5, 6].map(w => {
            const countInWeek = allAchievements.filter(a => a.weekTier === w).length;
            const unlockedInWeek = allAchievements.filter(a => a.weekTier === w && a.unlocked).length;
            const isUnlockedWeek = totalDaysActive >= ((w - 1) * 7 + 1);

            return (
              <button
                key={w}
                onClick={() => setSelectedWeekFilter(w as any)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                  selectedWeekFilter === w
                    ? 'bg-sky-500 text-slate-950 font-black shadow-md'
                    : isUnlockedWeek
                    ? 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
                    : 'bg-slate-950/50 text-slate-500 border border-slate-850 opacity-70'
                }`}
              >
                <span>Week {w} (7)</span>
                {unlockedInWeek === 7 ? (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                ) : (
                  <span className="text-[10px] text-slate-500 font-mono">({unlockedInWeek}/7)</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search Bar & Category Filter */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:w-56">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search achievements..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-sky-500 transition font-medium"
          >
            <option value="all">All Categories</option>
            <option value="Streak & Weekly">Streak & Weekly</option>
            <option value="Workout & Strength">Workout & Strength</option>
            <option value="Nutrition & Hydration">Nutrition & Hydration</option>
            <option value="Physique & Metrics">Physique & Metrics</option>
            <option value="AI & Coaching">AI & Coaching</option>
          </select>
        </div>
      </div>

      {/* Category Overview Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { id: 'all', label: 'All Achievements', count: allAchievements.length, icon: Trophy },
          { id: 'Streak & Weekly', label: 'Streak & Weekly', count: allAchievements.filter(a => a.category === 'Streak & Weekly').length, icon: Flame },
          { id: 'Workout & Strength', label: 'Workout & Strength', count: allAchievements.filter(a => a.category === 'Workout & Strength').length, icon: Dumbbell },
          { id: 'Nutrition & Hydration', label: 'Nutrition & Hydration', count: allAchievements.filter(a => a.category === 'Nutrition & Hydration').length, icon: Droplet },
          { id: 'Physique & Metrics', label: 'Physique & Metrics', count: allAchievements.filter(a => a.category === 'Physique & Metrics').length, icon: Scale },
          { id: 'AI & Coaching', label: 'AI & Coaching', count: allAchievements.filter(a => a.category === 'AI & Coaching').length, icon: Cpu },
        ].map(cat => {
          const Icon = cat.icon;
          const isSel = selectedCategory === cat.id;
          const unlockedCatCount = allAchievements.filter(a => (cat.id === 'all' || a.category === cat.id) && a.unlocked).length;

          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between space-y-2 cursor-pointer ${
                isSel
                  ? 'bg-slate-900 border-sky-500 text-white shadow-lg shadow-sky-500/5'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <Icon className={`w-4 h-4 ${isSel ? 'text-sky-400' : 'text-slate-500'}`} />
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                  {unlockedCatCount}/{cat.count}
                </span>
              </div>
              <span className="text-xs font-bold truncate block">{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Accordion Sections: Earned & Remaining Achievements */}
      {filteredAchievements.length > 0 ? (
        <div className="space-y-4">
          {/* Card 1: Earned Achievements */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl transition-all">
            <button
              type="button"
              onClick={() => setIsEarnedOpen(prev => !prev)}
              className="w-full min-h-[48px] p-4 flex items-center justify-between text-left bg-neutral-900 hover:bg-neutral-850/80 cursor-pointer select-none transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                  <Trophy className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-base md:text-lg font-black text-white uppercase tracking-tight font-display">
                    Earned Achievements
                  </h2>
                  <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                    ({earnedAchievements.length})
                  </span>
                </div>
              </div>
              <ChevronDown
                className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${
                  isEarnedOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            <AnimatePresence initial={false}>
              {isEarnedOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className="overflow-hidden border-t border-neutral-800/80"
                >
                  <div className="p-4 md:p-6 bg-slate-950/40">
                    {earnedAchievements.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {earnedAchievements.map(badge => renderBadgeCard(badge))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-slate-500 text-xs font-medium">
                        No earned achievements match the current filters.
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Card 2: Remaining Achievements */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl transition-all">
            <button
              type="button"
              onClick={() => setIsRemainingOpen(prev => !prev)}
              className="w-full min-h-[48px] p-4 flex items-center justify-between text-left bg-neutral-900 hover:bg-neutral-850/80 cursor-pointer select-none transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-800 text-slate-400 rounded-xl border border-slate-700">
                  <Lock className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-base md:text-lg font-black text-white uppercase tracking-tight font-display">
                    Remaining Achievements
                  </h2>
                  <span className="text-xs font-mono font-bold text-slate-400 bg-slate-800/60 px-2.5 py-0.5 rounded-full border border-slate-700">
                    ({remainingAchievements.length})
                  </span>
                </div>
              </div>
              <ChevronDown
                className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${
                  isRemainingOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            <AnimatePresence initial={false}>
              {isRemainingOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className="overflow-hidden border-t border-neutral-800/80"
                >
                  <div className="p-4 md:p-6 bg-slate-950/40">
                    {remainingAchievements.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {remainingAchievements.map(badge => renderBadgeCard(badge))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-slate-500 text-xs font-medium">
                        No remaining achievements match the current filters.
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      ) : (
        <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-3">
          <Trophy className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-white uppercase">No achievements found</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Try resetting your search query or selecting a different weekly tier / category filter above.
          </p>
        </div>
      )}

      {/* Detail Modal View when clicking any achievement */}
      {selectedBadgeModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 md:p-8 space-y-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className={`p-3.5 rounded-2xl border ${
                  selectedBadgeModal.unlocked
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-400 shadow-lg shadow-amber-500/10'
                    : 'bg-slate-950 border-slate-800 text-slate-500'
                }`}>
                  <selectedBadgeModal.icon className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 font-mono">
                    WEEK {selectedBadgeModal.weekTier} TIER • {selectedBadgeModal.category}
                  </span>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight font-display mt-1">
                    {selectedBadgeModal.title}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedBadgeModal(null)}
                className="text-slate-400 hover:text-white p-2 hover:bg-slate-800 rounded-xl transition"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">Badge Description</span>
                <p className="text-sm text-slate-300 font-medium leading-relaxed bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  {selectedBadgeModal.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                  <span className="text-[9px] font-black text-slate-500 uppercase block font-mono">Status</span>
                  <span className={`text-sm font-bold font-mono ${selectedBadgeModal.unlocked ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {selectedBadgeModal.unlocked ? '● UNLOCKED' : '○ LOCKED'}
                  </span>
                </div>
                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                  <span className="text-[9px] font-black text-slate-500 uppercase block font-mono">Reward XP</span>
                  <span className="text-sm font-bold font-mono text-purple-400">
                    +{selectedBadgeModal.rewardXP} XP
                  </span>
                </div>
              </div>

              {selectedBadgeModal.tip && (
                <div className="bg-sky-500/10 border border-sky-500/20 p-4 rounded-2xl text-xs text-sky-300 flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block uppercase text-[10px] text-sky-400 font-mono mb-0.5">Coach Kai Unlock Tip</span>
                    <span>{selectedBadgeModal.tip}</span>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSelectedBadgeModal(null)}
              className="w-full bg-slate-950 hover:bg-slate-800 border border-slate-800 text-white font-bold py-3.5 rounded-2xl transition uppercase text-xs tracking-wider"
            >
              Close Details
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
