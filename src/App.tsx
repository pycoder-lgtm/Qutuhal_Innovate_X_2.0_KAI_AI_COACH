/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import Onboarding from './components/Onboarding';
import Dashboard from './components/Dashboard';
import CoachChat from './components/CoachChat';
import MetricsTracker from './components/MetricsTracker';
import AchievementsTab from './components/AchievementsTab';
import { UserProfile, DailyPlan, ProgressLog, ChatMessage } from './types';
import { detectUserLocation } from './utils/location';
import { 
  Dumbbell, MessageSquare, LineChart, UserCog, Sparkles, 
  Settings, LogOut, CheckCircle, Scale, Utensils, LogIn, User as UserIcon,
  Database, RefreshCw, Trophy, RotateCcw, AlertTriangle, X
} from 'lucide-react';
import { 
  auth, signInWithGoogle, logoutUser, 
  saveProfileToFirestore, getProfileFromFirestore, 
  savePlanToFirestore, getPlanFromFirestore, 
  getChatHistoryFromFirestore, saveChatMessageToFirestore,
  clearAllUserDataFromFirestore, ensureAuthenticatedUser 
} from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

const getTodayDateString = () => {
  const d = new Date();
  const month = '' + (d.getMonth() + 1);
  const day = '' + d.getDate();
  const year = d.getFullYear();
  return [year, month.padStart(2, '0'), day.padStart(2, '0')].join('-');
};

export default function App() {
  const todayDateStr = getTodayDateString();

  // Load state from LocalStorage
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    const raw = localStorage.getItem('kai_coach_profile');
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as UserProfile;
      if (parsed.goals) {
        parsed.goals = parsed.goals.filter(g => g === 'fat_loss_muscle_gain' || g === 'stamina_metabolism_endurance');
        if (parsed.goals.length === 0) parsed.goals = ['fat_loss_muscle_gain'];
      }
      if (parsed.goal) {
        if (parsed.goal !== 'fat_loss_muscle_gain' && parsed.goal !== 'stamina_metabolism_endurance') {
          parsed.goal = 'fat_loss_muscle_gain';
        }
      }
      if (parsed.focusAesthetic) {
        parsed.focusAesthetic = parsed.focusAesthetic.filter(f => f === 'muscular_buff_frame' || f === 'fat_loss_lean_figure');
        if (parsed.focusAesthetic.length === 0) parsed.focusAesthetic = ['muscular_buff_frame'];
      }
      return parsed;
    } catch {
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState<'today' | 'chat' | 'metrics' | 'achievements' | 'profile_edit'>('today');

  const [selectedDay, setSelectedDay] = useState<string>(() => {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const d = new Date();
    return days[d.getDay()];
  });

  const [currentPlan, setCurrentPlan] = useState<DailyPlan | null>(() => {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const d = new Date();
    const initialDay = days[d.getDay()];
    const raw = localStorage.getItem(`kai_coach_plan_${initialDay}`);
    if (raw) return JSON.parse(raw);
    
    const rawOld = localStorage.getItem(`kai_coach_plan_${todayDateStr}`);
    return rawOld ? JSON.parse(rawOld) : null;
  });

  const [historyLogs, setHistoryLogs] = useState<ProgressLog[]>(() => {
    const raw = localStorage.getItem('kai_coach_logs');
    return raw ? JSON.parse(raw) : [];
  });

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    const raw = localStorage.getItem('kai_coach_chat');
    return raw ? JSON.parse(raw) : [];
  });

  const [loadingPlan, setLoadingPlan] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const isResettingRef = useRef(false);

  // Firebase User Auth & Firestore State Sync
  const [user, setUser] = useState<User | null>(null);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);
  const [syncingCloud, setSyncingCloud] = useState(false);

  const handleManualSyncProfileToFirestore = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!profile) return;
    let activeUser = user || auth.currentUser;
    if (!activeUser) {
      try {
        const u = await signInWithGoogle();
        if (!u) return;
        setUser(u);
        activeUser = u;
      } catch (e: any) {
        setSyncStatusMsg(`Google sign-in error: ${e.message}`);
        return;
      }
    }
    if (activeUser) {
      setSyncingCloud(true);
      try {
        await saveProfileToFirestore(activeUser.uid, profile);
        setSyncStatusMsg(`Successfully saved profile details and 4 photos to Firebase Database for ${activeUser.email}!`);
      } catch (err: any) {
        setSyncStatusMsg(`Database sync error: ${err.message}`);
      } finally {
        setSyncingCloud(false);
      }
    }
  };

  const handleManualFetchProfileFromFirestore = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    let activeUser = user || auth.currentUser;
    if (!activeUser) {
      try {
        const u = await signInWithGoogle();
        if (!u) return;
        setUser(u);
        activeUser = u;
      } catch (e: any) {
        setSyncStatusMsg(`Google sign-in error: ${e.message}`);
        return;
      }
    }
    if (activeUser) {
      setSyncingCloud(true);
      try {
        const remote = await getProfileFromFirestore(activeUser.uid);
        if (remote) {
          setProfile(remote);
          setSyncStatusMsg(`Successfully fetched profile & photos for ${activeUser.displayName || activeUser.email} from Firebase Database.`);
        } else {
          setSyncStatusMsg(`No saved profile found in Firebase Database for ${activeUser.email} yet.`);
        }
      } catch (err: any) {
        setSyncStatusMsg(`Database load error: ${err.message}`);
      } finally {
        setSyncingCloud(false);
      }
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser && !isResettingRef.current) {
        try {
          const remoteProfile = await getProfileFromFirestore(currentUser.uid);
          if (remoteProfile && (remoteProfile.name || remoteProfile.weight || remoteProfile.photoFront || remoteProfile.physiquePhoto)) {
            setProfile(prev => prev ? { ...prev, ...remoteProfile } : remoteProfile as UserProfile);
            localStorage.setItem('kai_coach_profile', JSON.stringify(remoteProfile));
          }
          const remotePlan = await getPlanFromFirestore(currentUser.uid, selectedDay);
          if (remotePlan) {
            setCurrentPlan(remotePlan as DailyPlan);
          }
          const remoteChat = await getChatHistoryFromFirestore(currentUser.uid);
          if (remoteChat && remoteChat.length > 0) {
            setChatMessages(remoteChat as ChatMessage[]);
          }
        } catch (e) {
          console.error("Firestore initial sync error:", e);
        }
      }
    });
    return () => unsubscribe();
  }, [selectedDay]);

  // Sync state mutations back to localStorage & Firestore
  useEffect(() => {
    if (isResettingRef.current) return;
    if (profile) {
      localStorage.setItem('kai_coach_profile', JSON.stringify(profile));
      if (user) {
        saveProfileToFirestore(user.uid, profile).catch(err => console.error(err));
      }
    } else {
      localStorage.removeItem('kai_coach_profile');
    }
  }, [profile, user]);

  // Load plan for the active day whenever selectedDay changes
  useEffect(() => {
    const raw = localStorage.getItem(`kai_coach_plan_${selectedDay}`);
    if (raw) {
      setCurrentPlan(JSON.parse(raw));
    } else {
      // If we are looking at today's weekday, let's see if there was an old date-based plan we can migrate
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const todayDay = days[new Date().getDay()];
      if (selectedDay === todayDay) {
        const rawOld = localStorage.getItem(`kai_coach_plan_${todayDateStr}`);
        if (rawOld) {
          const parsed = JSON.parse(rawOld);
          setCurrentPlan(parsed);
          localStorage.setItem(`kai_coach_plan_${selectedDay}`, rawOld);
          return;
        }
      }
      setCurrentPlan(null);
    }
  }, [selectedDay, todayDateStr]);

  // Save currentPlan whenever it is generated or adjusted
  useEffect(() => {
    if (currentPlan) {
      localStorage.setItem(`kai_coach_plan_${selectedDay}`, JSON.stringify(currentPlan));
    }
  }, [currentPlan, selectedDay]);

  useEffect(() => {
    localStorage.setItem('kai_coach_logs', JSON.stringify(historyLogs));
  }, [historyLogs]);

  useEffect(() => {
    localStorage.setItem('kai_coach_chat', JSON.stringify(chatMessages));
  }, [chatMessages]);

  const handleAddProgressLog = (newLog: ProgressLog) => {
    setHistoryLogs(prev => {
      const existingIndex = prev.findIndex(l => l.date === newLog.date);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = newLog;
        return updated;
      } else {
        return [...prev, newLog];
      }
    });
  };

  const handleDeleteProgressLog = (dateStr: string) => {
    setHistoryLogs(prev => prev.filter(l => l.date !== dateStr));
  };

  const handleCompleteOnboarding = async (newProfile: UserProfile) => {
    // Clear old daily plans entirely to start fully fresh
    const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    weekdays.forEach(day => {
      localStorage.removeItem(`kai_coach_plan_${day}`);
    });
    localStorage.removeItem(`kai_coach_plan_${todayDateStr}`);
    setCurrentPlan(null);

    setProfile(newProfile);
    setErrorText(null);
    setLoadingPlan(true); // Put loader on the Daily Plan page immediately
    setActiveTab('today'); // Stay on the Daily Plan page

    // Auto-link to Firebase Database silently in background and sync 4 photos & details
    try {
      const activeUser = await ensureAuthenticatedUser();
      if (activeUser) {
        setUser(activeUser);
        await saveProfileToFirestore(activeUser.uid, newProfile);
        console.log("Auto-synced profile & 4 photos to Firebase Database.");
      }
    } catch (syncErr) {
      console.warn("Background Firebase sync notice:", syncErr);
    }

    const focusLabels = Array.isArray(newProfile.focusAesthetic)
      ? newProfile.focusAesthetic.map(f => {
          if (f === 'muscular_buff_frame') return 'Muscular and Buff frame';
          return 'Fat loss and lean figure';
        }).join(', ')
      : 'Muscular and Buff frame & Fat loss and lean figure';

    const introMsg: ChatMessage = {
      id: `welcome-${Date.now()}`,
      sender: 'coach',
      text: `Hello, ${newProfile.name}! I am Coach Kai, your AI Head Coach. Your physical metrics, physique photograph analysis, and aesthetic target strategy have been successfully processed and calibrated. Let's start with a completely fresh schedule tailored to you!\n\nI am compiling your initial Weekly Plan & grocery list now based on your physique analysis and aesthetic goals. It will display below in just a moment...`,
      timestamp: new Date().toISOString()
    };
    setChatMessages([introMsg]);

    try {
      const res = await fetch("/api/generate-proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: newProfile })
      });

      if (!res.ok) {
        throw new Error("Failed to generate weekly plan from AI server. Please try again.");
      }

      const proposal = await res.json();
      
      const proposalMsg: ChatMessage = {
        id: `proposal-${Date.now()}`,
        sender: 'coach',
        text: `Here is the optimized Weekly Blueprint I engineered specifically for your physique and aesthetic goals. Since we want maximum effectiveness, I have automatically compiled and synchronized this entire program with your schedule! If you need any adjustments, feel free to chat with me right here.`,
        weeklyPlanProposal: proposal,
        timestamp: new Date().toISOString()
      };
      
      setChatMessages(prev => [...prev, proposalMsg]);

      // Automatically sync and accept the plan for all 7 days of the week
      if (proposal && proposal.weeklySchedule) {
        proposal.weeklySchedule.forEach((dayPlan: any) => {
          const dayName = dayPlan.day.toLowerCase(); // e.g., "monday"
          
          const mappedMeals = (dayPlan.meals || []).map((m: any, idx: number) => ({
            id: `meal-${idx}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            name: m.name,
            calories: m.calories,
            protein: m.protein,
            carbs: m.carbs,
            fat: m.fat,
            ingredients: m.ingredients || [],
            instructions: m.instructions || "",
            eaten: false
          }));

          const mappedExercises = (dayPlan.exercises || []).map((e: any, idx: number) => ({
            id: `ex-${idx}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            name: e.name,
            sets: e.sets || 0,
            reps: String(e.reps || "10"),
            rest: String(e.rest || "60s"),
            completed: false,
            notes: e.notes || ""
          }));

          const fullPlan: DailyPlan = {
            date: todayDateStr,
            targetCalories: dayPlan.targetCalories || 2000,
            targetProtein: dayPlan.targetProtein || 150,
            targetCarbs: dayPlan.targetCarbs || 200,
            targetFat: dayPlan.targetFat || 70,
            meals: mappedMeals,
            workoutName: dayPlan.workoutName || "General conditioning",
            workoutType: dayPlan.workoutType || "Strength",
            exercises: mappedExercises,
            coachTip: dayPlan.coachTip || "Stay consistent!",
            warmupRoutine: dayPlan.warmupRoutine,
            progressiveOverloadRule: dayPlan.progressiveOverloadRule,
            macroTimingTip: dayPlan.macroTimingTip
          };

          localStorage.setItem(`kai_coach_plan_${dayName}`, JSON.stringify(fullPlan));
        });

        // Set the active plan state
        const currentWeekDay = selectedDay.toLowerCase();
        const activeRaw = localStorage.getItem(`kai_coach_plan_${currentWeekDay}`);
        if (activeRaw) {
          setCurrentPlan(JSON.parse(activeRaw));
        } else {
          const fallbackRaw = localStorage.getItem(`kai_coach_plan_monday`);
          if (fallbackRaw) {
            setCurrentPlan(JSON.parse(fallbackRaw));
          }
        }

        const confirmationMsg: ChatMessage = {
          id: `confirm-${Date.now()}`,
          sender: 'coach',
          text: `🎉 SUCCESS! Your 7-day training splits and nutritional programs are completely loaded and synchronized with your Daily Routine! You can view today's plan on this page. Let's start crushing these goals!`,
          timestamp: new Date().toISOString()
        };
        setChatMessages(prev => [...prev, confirmationMsg]);
      }
    } catch (err: any) {
      setErrorText(err.message || "An unexpected error occurred while compiling your initial schedule.");
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'coach',
        text: `Sorry, I ran into an issue compiling your initial weekly schedule. Please type a message to ask me to rebuild it.`,
        timestamp: new Date().toISOString()
      };
      setChatMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoadingPlan(false);
    }
  };

  const handleAcceptWeeklyPlan = (proposal: any) => {
    if (!proposal || !proposal.weeklySchedule) return;

    proposal.weeklySchedule.forEach((dayPlan: any) => {
      const dayName = dayPlan.day.toLowerCase(); // e.g., "monday"
      
      const mappedMeals = (dayPlan.meals || []).map((m: any, idx: number) => ({
        id: `meal-${idx}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name: m.name,
        calories: m.calories,
        protein: m.protein,
        carbs: m.carbs,
        fat: m.fat,
        ingredients: m.ingredients || [],
        instructions: m.instructions || "",
        eaten: false
      }));

      const mappedExercises = (dayPlan.exercises || []).map((e: any, idx: number) => ({
        id: `ex-${idx}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name: e.name,
        sets: e.sets || 0,
        reps: String(e.reps || "10"),
        rest: String(e.rest || "60s"),
        completed: false,
        notes: e.notes || ""
      }));

      const fullPlan: DailyPlan = {
        date: todayDateStr,
        targetCalories: dayPlan.targetCalories || 2000,
        targetProtein: dayPlan.targetProtein || 150,
        targetCarbs: dayPlan.targetCarbs || 200,
        targetFat: dayPlan.targetFat || 70,
        meals: mappedMeals,
        workoutName: dayPlan.workoutName || "General conditioning",
        workoutType: dayPlan.workoutType || "Strength",
        exercises: mappedExercises,
        coachTip: dayPlan.coachTip || "Stay consistent!"
      };

      localStorage.setItem(`kai_coach_plan_${dayName}`, JSON.stringify(fullPlan));
    });

    // Update active plan state for the currently selected weekday
    const currentWeekDay = selectedDay.toLowerCase();
    const activeRaw = localStorage.getItem(`kai_coach_plan_${currentWeekDay}`);
    if (activeRaw) {
      setCurrentPlan(JSON.parse(activeRaw));
    } else {
      // If none, default to the newly written monday or today's weekday
      const fallbackRaw = localStorage.getItem(`kai_coach_plan_monday`);
      if (fallbackRaw) {
        setCurrentPlan(JSON.parse(fallbackRaw));
      }
    }

    // Append confirmation chat message
    const confirmationMsg: ChatMessage = {
      id: `confirm-${Date.now()}`,
      sender: 'coach',
      text: `🎉 AWESOME! Your Weekly Plan and dietary ingredients have been completely synchronized with your Daily Routine! You can view today's plan on the main "Daily Plan" page. Let's crush this preparation phase this week and start strong next week!`,
      timestamp: new Date().toISOString()
    };
    setChatMessages(prev => [...prev, confirmationMsg]);

    // Go back to the daily plan tab
    setActiveTab('today');
  };

  const handleGeneratePlan = async (customMsg?: string) => {
    if (!profile) return;
    setLoadingPlan(true);
    setErrorText(null);

    let tailoringInstructions = customMsg || "";
    if (!tailoringInstructions && chatMessages.length > 1) {
      const userMessages = chatMessages
        .filter(m => m.sender === 'user')
        .slice(-3)
        .map(m => m.text)
        .join("; ");
      if (userMessages) {
        tailoringInstructions = `Take into account recent user wishes discussed in chat: ${userMessages}`;
      }
    }

    try {
      const res = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          date: todayDateStr,
          dayOfWeek: selectedDay,
          requestMessage: tailoringInstructions
        })
      });

      if (!res.ok) {
        throw new Error("Failed to generate plan from AI server. Please try again.");
      }

      const planData: DailyPlan = await res.json();
      setCurrentPlan(planData);

      const planNotice: ChatMessage = {
        id: `plan-notice-${Date.now()}`,
        sender: 'coach',
        text: `Success! I have compiled your customized routine for ${selectedDay.toUpperCase()} (Note: This custom schedule starts NEXT WEEK to ensure you are fully prepared!):\n💪 Workout: ${planData.workoutName} (${planData.workoutType})\n🥗 Meals: Breakfast, Lunch, Dinner, & Snacks tailored to ${profile.dietPreference.toUpperCase()}.\n\nCoach Tip: "${planData.coachTip}"`,
        timestamp: new Date().toISOString()
      };
      setChatMessages(prev => [...prev, planNotice]);

    } catch (err: any) {
      setErrorText(err.message || "An unexpected network error occurred.");
    } finally {
      setLoadingPlan(false);
    }
  };

  const handleSendMessage = async (userMsgText: string, image?: string, options?: { useThinkingMode?: boolean; useSearchGrounding?: boolean; useMapsGrounding?: boolean }) => {
    if (!profile) return;
    setLoadingChat(true);
    setErrorText(null);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: userMsgText,
      image,
      timestamp: new Date().toISOString()
    };

    const updatedMessages = [...chatMessages, userMsg];
    setChatMessages(updatedMessages);

    try {
      // Automatically detect user location without manual input
      const detectedLoc = await detectUserLocation();

      const res = await fetch("/api/chat-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          plan: currentPlan,
          history: updatedMessages.slice(-10),
          message: userMsgText,
          image,
          useThinkingMode: options?.useThinkingMode,
          useSearchGrounding: options?.useSearchGrounding,
          useMapsGrounding: options?.useMapsGrounding,
          userLocation: detectedLoc
        })
      });

      if (!res.ok) {
        throw new Error("Kai couldn't reach you back. Check your connection.");
      }

      const data = await res.json();
      const coachMsg: ChatMessage = {
        id: `coach-${Date.now()}`,
        sender: 'coach',
        text: data.reply,
        mapLinks: data.mapLinks || undefined,
        detectedLocation: data.detectedLocation || detectedLoc || undefined,
        weeklyPlanProposal: data.updatedProposal || undefined,
        timestamp: new Date().toISOString()
      };
      setChatMessages(prev => [...prev, coachMsg]);

    } catch (err: any) {
      const errMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'coach',
        text: "Sorry, I had an issue connecting to my nutrition model. Please try sending that again.",
        timestamp: new Date().toISOString()
      };
      setChatMessages(prev => [...prev, errMsg]);
    } finally {
      setLoadingChat(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logoutUser();
      setUser(null);
      setProfile(null);
      setCurrentPlan(null);
      setHistoryLogs([]);
      setChatMessages([]);
      setErrorText(null);
      setSyncStatusMsg(null);
      setActiveTab('today');
    } catch (e) {
      console.error("Sign out error:", e);
    }
  };

  const handleHeaderGoogleLogin = async () => {
    try {
      const loggedInUser = await signInWithGoogle();
      if (loggedInUser) {
        setUser(loggedInUser);
        const remoteProfile = await getProfileFromFirestore(loggedInUser.uid);
        if (remoteProfile && (remoteProfile.name || remoteProfile.weight)) {
          setProfile(remoteProfile);
          localStorage.setItem('kai_coach_profile', JSON.stringify(remoteProfile));
        }
        const remotePlan = await getPlanFromFirestore(loggedInUser.uid, selectedDay);
        if (remotePlan) {
          setCurrentPlan(remotePlan);
        }
        const remoteChat = await getChatHistoryFromFirestore(loggedInUser.uid);
        if (remoteChat && remoteChat.length > 0) {
          setChatMessages(remoteChat);
        }
      }
    } catch (e: any) {
      console.error("Header Google sign-in error:", e);
    }
  };

  const handleOpenResetModal = () => {
    setShowResetModal(true);
  };

  const executeResetAllData = async () => {
    setIsResetting(true);
    isResettingRef.current = true;
    const currentUid = user?.uid || auth.currentUser?.uid;

    // 1. Clear Firestore while authenticated
    if (currentUid) {
      try {
        await clearAllUserDataFromFirestore(currentUid);
      } catch (e) {
        console.error("Firestore clear error:", e);
      }
    }

    // 2. Clear all local storage
    try {
      localStorage.clear();
    } catch (e) {
      console.error("Local storage clear error:", e);
    }

    // 3. Reset React states
    setProfile(null);
    setCurrentPlan(null);
    setHistoryLogs([]);
    setChatMessages([]);
    setErrorText(null);
    setSyncStatusMsg(null);
    setActiveTab('today');

    // 4. Logout if logged in
    try {
      await logoutUser();
    } catch (e) {
      console.error("Logout error:", e);
    }

    isResettingRef.current = false;
    setIsResetting(false);
    setShowResetModal(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col">
      {/* Upper Navigation Bar */}
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-30 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-sky-500 p-2.5 rounded-lg text-slate-950 shadow-md flex items-center justify-center">
              <Dumbbell className="w-6 h-6 rotate-45" />
            </div>
            <div>
              <span className="font-display font-black text-xl tracking-tight text-white uppercase">
                Kai AI <span className="text-sky-500">Coach</span>
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <p className="text-[10px] text-slate-500 font-bold tracking-[0.15em] uppercase">Geometric Balance Engine</p>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)] animate-pulse" title="Active (Hybrid AI / Offline Auto-Fallback)"></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            {profile && (
              <>
                <nav className="flex items-center bg-slate-950 border border-slate-800 p-1 rounded-xl">
                  <button
                    onClick={() => setActiveTab('today')}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs md:text-sm font-semibold transition ${
                      activeTab === 'today'
                        ? 'bg-slate-900 text-sky-400 shadow-md border border-slate-800'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <CheckCircle className="w-4 h-4 text-sky-500" />
                    <span className="hidden sm:inline">Daily Plan</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('chat')}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs md:text-sm font-semibold transition ${
                      activeTab === 'chat'
                        ? 'bg-slate-900 text-sky-400 shadow-md border border-slate-800'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4 text-sky-500" />
                    <span className="hidden sm:inline">Coach Chat</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('metrics')}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs md:text-sm font-semibold transition ${
                      activeTab === 'metrics'
                        ? 'bg-slate-900 text-sky-400 shadow-md border border-slate-800'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <LineChart className="w-4 h-4 text-sky-500" />
                    <span className="hidden sm:inline">Progress Log</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('achievements')}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs md:text-sm font-semibold transition ${
                      activeTab === 'achievements'
                        ? 'bg-slate-900 text-sky-400 shadow-md border border-slate-800'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Trophy className="w-4 h-4 text-sky-500" />
                    <span className="hidden sm:inline">Achievements</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('profile_edit')}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs md:text-sm font-semibold transition ${
                      activeTab === 'profile_edit'
                        ? 'bg-slate-900 text-sky-400 shadow-md border border-slate-800'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Settings className="w-4 h-4 text-sky-500" />
                    <span className="hidden sm:inline">Profile</span>
                  </button>
                </nav>

                <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                  {user ? (
                    <button
                      onClick={handleSignOut}
                      title="Sign Out (Your data remains safely stored in the database)"
                      className="px-3 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0"
                    >
                      <LogOut className="w-4 h-4 text-sky-400" />
                      <span className="hidden sm:inline">Sign Out</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleHeaderGoogleLogin}
                      title="Sign In with Google to auto-restore your saved data"
                      className="px-3 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-md shrink-0"
                    >
                      <LogIn className="w-4 h-4" />
                      <span className="hidden sm:inline">Sign In</span>
                    </button>
                  )}

                  <button
                    onClick={handleOpenResetModal}
                    title="Reset & Restart All Data (Permanently erases data)"
                    className="p-2.5 text-slate-500 hover:text-red-400 hover:bg-slate-900 rounded-xl transition flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-5 h-5 text-slate-400 hover:text-red-400" />
                    <span className="hidden lg:inline text-xs font-semibold text-slate-400 hover:text-red-400">Reset & Restart</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Pane */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        
        {/* Connection/Plan error banner */}
        {errorText && (
          <div className="bg-red-950/40 border border-red-900/60 rounded-2xl p-4 mb-6 text-sm text-red-200 flex items-center justify-between">
            <span>{errorText}</span>
            <button 
              onClick={() => setErrorText(null)}
              className="text-xs font-bold underline hover:no-underline text-red-400"
            >
              Dismiss
            </button>
          </div>
        )}

        {!profile ? (
          <div className="py-8">
            <div className="text-center max-w-md mx-auto mb-10 space-y-3">
              <span className="text-xs bg-sky-500/10 text-sky-400 border border-sky-500/20 px-3 py-1 rounded-full font-bold uppercase tracking-wider font-display">Personal Consultation</span>
              <h1 className="text-3xl font-extrabold tracking-tight text-white uppercase italic">Your Bespoke AI Coach Is Waiting.</h1>
              <p className="text-sm text-slate-400">
                Provide your body metrics, workout preferences, and nutrition criteria so Coach Kai can engineer your high-performance routine.
              </p>
            </div>
            <Onboarding onComplete={handleCompleteOnboarding} />
          </div>
        ) : (
          <div>
            {activeTab === 'today' && (
              <Dashboard 
                profile={profile}
                plan={currentPlan}
                onUpdatePlan={setCurrentPlan}
                onGeneratePlan={handleGeneratePlan}
                loading={loadingPlan}
                onUpdateProfile={setProfile}
                selectedDay={selectedDay}
                onSelectDay={setSelectedDay}
                onChangeTab={setActiveTab}
              />
            )}

            {activeTab === 'chat' && (
              <CoachChat 
                profile={profile}
                plan={currentPlan}
                messages={chatMessages}
                onSendMessage={handleSendMessage}
                loading={loadingChat}
                onGeneratePlan={handleGeneratePlan}
                loadingPlan={loadingPlan}
                onAcceptWeeklyPlan={handleAcceptWeeklyPlan}
              />
            )}

            {activeTab === 'metrics' && (
              <MetricsTracker 
                profile={profile}
                plan={currentPlan}
                historyLogs={historyLogs}
                onAddProgressLog={handleAddProgressLog}
                onDeleteProgressLog={handleDeleteProgressLog}
              />
            )}

            {activeTab === 'achievements' && (
              <AchievementsTab
                profile={profile}
                plan={currentPlan}
                historyLogs={historyLogs}
              />
            )}

            {activeTab === 'profile_edit' && (
              <div className="max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl space-y-8">
                <div className="border-b border-slate-800 pb-4">
                  <h2 className="text-xl font-bold text-white uppercase tracking-tight">Current Coach Settings</h2>
                  <p className="text-xs text-slate-500 mt-1">Review your recorded biological and performance parameters</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block font-display">Name</span>
                    <span className="text-sm font-semibold text-white">{profile.name}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block font-display">Age</span>
                    <span className="text-sm font-semibold text-white">{profile.age} years</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block font-display">Gender</span>
                    <span className="text-sm font-semibold text-white uppercase">{profile.gender}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block font-display">
                      {profile.predictedHeightRange ? "Estimated Height Range" : "Height"}
                    </span>
                    <span className="text-sm font-semibold text-white">
                      {profile.predictedHeightRange || `${profile.height} cm`}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block font-display">
                      {profile.predictedWeightRange ? "Estimated Weight Range" : "Weight"}
                    </span>
                    <span className="text-sm font-semibold text-white">
                      {profile.predictedWeightRange || `${profile.weight} kg`}
                    </span>
                  </div>
                  {profile.targetWeight && (
                    <div className="space-y-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block font-display">Target Weight</span>
                      <span className="text-sm font-semibold text-sky-400">{profile.targetWeight} kg</span>
                    </div>
                  )}
                  <div className="space-y-1 col-span-2 md:col-span-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block font-display">Fitness Targets</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(profile.goals || (profile.goal ? [profile.goal] : ['fat_loss_muscle_gain'])).map((g, idx) => (
                        <span key={idx} className="text-sm font-bold text-slate-300 uppercase bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-md text-[9px] inline-block">
                          {g.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1 col-span-2 md:col-span-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block font-display">Activity Habits</span>
                    <span className="text-sm font-bold text-slate-300 uppercase bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-md text-[10px] inline-block mt-0.5">
                      {profile.activityLevel}
                    </span>
                  </div>
                  <div className="space-y-1 col-span-2 md:col-span-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block font-display">Diet Preference</span>
                    <span className="text-sm font-bold text-slate-300 uppercase bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-md text-[10px] inline-block mt-0.5">
                      {profile.dietPreference}
                    </span>
                  </div>
                  <div className="space-y-1 col-span-2 md:col-span-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block font-display">Diet Type</span>
                    <span className="text-sm font-bold text-slate-300 uppercase bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-md text-[10px] inline-block mt-0.5">
                      {profile.dietType || 'non_veg'}
                    </span>
                  </div>
                  <div className="space-y-1 col-span-2 md:col-span-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block font-display">Workout Venue</span>
                    <span className="text-sm font-bold text-slate-300 uppercase bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-md text-[10px] inline-block mt-0.5">
                      {profile.workoutLocation || 'both'}
                    </span>
                  </div>
                  <div className="space-y-1 col-span-2 md:col-span-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block font-display">Experience Level</span>
                    <span className="text-sm font-bold text-slate-300 uppercase bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-md text-[10px] inline-block mt-0.5">
                      {profile.experienceLevel || 'intermediate'}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-display block">Available Gear / Equipment</span>
                    <span className="text-sm font-semibold text-white">{profile.equipmentAvailable || "Full Gym Access"}</span>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-display block">Recorded Food Allergies & Exclusions</span>
                    <span className="text-sm font-semibold text-white">{profile.allergies || "None"}</span>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-display block">Staple/Favorite Foods Consumed</span>
                    <span className="text-sm font-semibold text-white">{profile.typicalFoods || "Standard balanced options"}</span>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-1 border-l-4 border-l-amber-500/80">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-display block">Medical Conditions or Injury Logs</span>
                    <span className="text-sm font-semibold text-amber-200">{profile.injuriesOrConditions || "No active injuries recorded"}</span>
                  </div>

                  {(profile.photoFront || profile.photoLeft || profile.photoRight || profile.photoBack || profile.physiquePhoto) && (
                    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-display block">Uploaded Physique Portfolio (360° Calibration)</span>
                        <p className="text-[10px] text-slate-500 font-medium">Your 4 multi-angle views recorded for postural and structural frame alignment.</p>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                          { key: 'photoFront' as const, label: 'Front View', fallback: profile.physiquePhoto },
                          { key: 'photoLeft' as const, label: 'Left Side' },
                          { key: 'photoRight' as const, label: 'Right Side' },
                          { key: 'photoBack' as const, label: 'Back View' }
                        ].map((item) => {
                          const src = profile[item.key] || item.fallback;
                          return (
                            <div key={item.key} className="bg-slate-900 border border-slate-850 rounded-xl p-2 flex flex-col items-center">
                              <span className="text-[9px] uppercase font-bold text-slate-400 mb-1.5 block tracking-wide">{item.label}</span>
                              <div className="w-full h-[120px] overflow-hidden rounded-lg flex items-center justify-center bg-slate-950 border border-slate-900">
                                {src ? (
                                  <img 
                                    src={src} 
                                    alt={item.label} 
                                    className="h-full w-full object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <span className="text-[9px] text-slate-700 font-bold uppercase">Not Provided</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="space-y-3 pt-2 border-t border-slate-900">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-sky-400 font-display block">Coach Kai's AI Vision Assessment</span>
                          {profile.frameType && (
                            <span className="text-[10px] uppercase font-extrabold text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2.5 py-0.5 rounded-md font-display">
                              Archetype: {profile.frameType}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line bg-slate-900/40 p-3 rounded-xl border border-slate-900">
                          {profile.physiqueAnalysis || "Physique photo successfully logged. Core alignment and anatomical balances mapped into training engine."}
                        </p>

                        {(profile.frontAngleReport || profile.sideAngleReport || profile.backAngleReport) && (
                          <div className="space-y-2 pt-1">
                            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block">360° Multi-Angle Frame Breakdown</span>
                            
                            {profile.frontAngleReport && (
                              <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-850 text-xs">
                                <div className="font-bold text-emerald-400 text-[10px] uppercase mb-0.5 flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Front View Assessment
                                </div>
                                <p className="text-slate-300 text-[11px] leading-relaxed">{profile.frontAngleReport}</p>
                              </div>
                            )}

                            {profile.sideAngleReport && (
                              <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-850 text-xs">
                                <div className="font-bold text-sky-400 text-[10px] uppercase mb-0.5 flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span> Profiles & Posture Alignment
                                </div>
                                <p className="text-slate-300 text-[11px] leading-relaxed">{profile.sideAngleReport}</p>
                              </div>
                            )}

                            {profile.backAngleReport && (
                              <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-850 text-xs">
                                <div className="font-bold text-amber-400 text-[10px] uppercase mb-0.5 flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span> Back View & Lat Insertion
                                </div>
                                <p className="text-slate-300 text-[11px] leading-relaxed">{profile.backAngleReport}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-800 space-y-4">
                  <div className="bg-slate-950 p-4.5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20 shrink-0">
                        <Database className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white uppercase tracking-wider font-display">
                            {user ? (user.displayName || user.email || 'Connected Account') : 'Guest Account'}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            user ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}>
                            {user ? 'Database Active' : 'Not Signed In'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {user 
                            ? 'All profile details, 4 photos & workout plans are safely preserved in the database when signing out.' 
                            : 'Sign in to automatically sync and restore your saved data.'}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {user ? (
                        <button
                          onClick={handleSignOut}
                          className="px-4 py-2 bg-slate-900 hover:bg-slate-850 text-slate-200 hover:text-white border border-slate-800 hover:border-slate-700 font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-md"
                        >
                          <LogOut className="w-4 h-4 text-sky-400" />
                          <span>Sign Out</span>
                        </button>
                      ) : (
                        <button
                          onClick={handleHeaderGoogleLogin}
                          className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-md"
                        >
                          <LogIn className="w-4 h-4" />
                          <span>Sign In / Link Google</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={handleOpenResetModal}
                    className="w-full border border-slate-800 hover:border-red-900/60 hover:bg-red-950/20 text-slate-400 hover:text-red-400 font-bold py-3.5 px-4 rounded-xl text-sm transition flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4 text-red-400" />
                    <span>Reset & Restart All Data</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => !isResetting && setShowResetModal(false)}
              disabled={isResetting}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 text-red-400 mb-4">
              <div className="bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Reset & Restart All Data?</h3>
                <p className="text-xs text-red-400/80 font-medium">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed mb-6">
              This will permanently delete your saved profile metrics, AI workout plans, daily logs, and chat history with Coach Kai, returning you to the fresh onboarding consultation screen.
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                disabled={isResetting}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-3 px-4 rounded-xl text-sm transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeResetAllData}
                disabled={isResetting}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-4 rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-red-900/30 disabled:opacity-50"
              >
                {isResetting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Resetting...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>Yes, Reset All</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Styled Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-6 mt-12 shrink-0">
        <div className="max-w-7xl mx-auto px-6 text-center space-y-1.5">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 font-display">Powered by Gemini 3.5 & Google AI Studio</p>
          <p className="text-[11px] text-slate-400/80">Strictly adhere to your customized macronutrients. Consult a physician before embarking on heavy physical exercise schedules.</p>
        </div>
      </footer>
    </div>
  );
}
