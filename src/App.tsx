/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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
  Database, RefreshCw, Trophy
} from 'lucide-react';
import { 
  auth, signInWithGoogle, logoutUser, 
  saveProfileToFirestore, getProfileFromFirestore, 
  savePlanToFirestore, getPlanFromFirestore, 
  getChatHistoryFromFirestore, saveChatMessageToFirestore 
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
      if (currentUser) {
        try {
          const remoteProfile = await getProfileFromFirestore(currentUser.uid);
          if (remoteProfile && (remoteProfile.name || remoteProfile.weight || remoteProfile.photoFront || remoteProfile.physiquePhoto)) {
            setProfile(prev => prev ? { ...prev, ...remoteProfile } : remoteProfile as UserProfile);
            localStorage.setItem('kai_coach_profile', JSON.stringify(remoteProfile));
          } else {
            // If remote profile is not found in Firestore yet, check local cache
            const rawCached = localStorage.getItem('kai_coach_profile');
            if (rawCached) {
              try {
                const parsedCached = JSON.parse(rawCached) as UserProfile;
                if (parsedCached && (parsedCached.name || parsedCached.weight)) {
                  await saveProfileToFirestore(currentUser.uid, parsedCached);
                  setProfile(parsedCached);
                }
              } catch (e) {
                console.error("Local profile parse error:", e);
              }
            }
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

  const handleResetProfile = () => {
    if (confirm("Are you sure you want to reset your profile details? Your past history and logs will still be preserved, but you can fill out new measurements.")) {
      setProfile(null);
      setCurrentPlan(null);
      setChatMessages([]);
    }
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

                <button
                  onClick={handleResetProfile}
                  title="Reset profile measurements"
                  className="p-2.5 text-slate-500 hover:text-red-400 hover:bg-slate-900 rounded-xl transition"
                >
                  <LogOut className="w-5 h-5" />
                </button>
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
                {/* Firebase Database Cloud Sync & Auth Banner */}
                <div className="bg-slate-950 border border-sky-500/30 rounded-2xl p-5 space-y-4 shadow-lg">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-900 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20 shrink-0">
                        <Database className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black uppercase tracking-wider text-white font-display">Firebase Cloud Database</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            user ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          }`}>
                            {user ? 'Account Linked' : 'Guest Mode (Local Only)'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {user ? `Logged in as ${user.displayName || user.email}` : 'Log in or sign up with Google to sync profile & photos with Firebase.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {user ? (
                        <>
                          <button
                            onClick={handleManualSyncProfileToFirestore}
                            disabled={syncingCloud}
                            className="px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md"
                          >
                            <span>{syncingCloud ? 'Syncing...' : 'Sync Profile & Photos'}</span>
                          </button>
                          <button
                            onClick={handleManualFetchProfileFromFirestore}
                            disabled={syncingCloud}
                            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-850 text-sky-400 border border-sky-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${syncingCloud ? 'animate-spin' : ''}`} />
                            <span>Fetch Database</span>
                          </button>
                          <button
                            onClick={() => logoutUser()}
                            className="px-2.5 py-1.5 text-slate-400 hover:text-red-400 text-xs font-bold transition"
                          >
                            Sign Out
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={handleManualSyncProfileToFirestore}
                          disabled={syncingCloud}
                          className="px-4 py-2 bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-400 hover:to-teal-400 text-slate-950 font-bold rounded-xl text-xs shadow-md transition flex items-center gap-2"
                        >
                          <LogIn className="w-4 h-4" />
                          <span>Log In / Sign Up with Google</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {syncStatusMsg && (
                    <div className="bg-sky-500/10 border border-sky-500/20 text-sky-300 rounded-xl p-3 text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />
                        <span>{syncStatusMsg}</span>
                      </div>
                      <button onClick={() => setSyncStatusMsg(null)} className="text-slate-400 hover:text-white text-xs font-bold px-1">✕</button>
                    </div>
                  )}
                </div>

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
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block font-display">Height</span>
                    <span className="text-sm font-semibold text-white">{profile.height} cm</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block font-display">Weight</span>
                    <span className="text-sm font-semibold text-white">{profile.weight} kg</span>
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

                <div className="flex gap-4 pt-4 border-t border-slate-800">
                  <button
                    onClick={() => {
                      setProfile(null);
                    }}
                    className="flex-1 bg-sky-500 hover:bg-sky-600 text-slate-950 font-bold py-3 px-4 rounded-xl text-sm transition"
                  >
                    Edit Onboarding Profile
                  </button>
                  <button
                    onClick={handleResetProfile}
                    className="flex-1 border border-slate-800 hover:border-red-900/60 hover:bg-red-950/20 text-slate-400 hover:text-red-400 font-bold py-3 px-4 rounded-xl text-sm transition"
                  >
                    Reset & Restart All Data
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

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
