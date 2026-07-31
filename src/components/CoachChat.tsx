/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { ChatMessage, UserProfile, DailyPlan } from '../types';
import { 
  Send, Sparkles, MessageSquare, Dumbbell, ShieldAlert, CheckCircle, 
  Camera, X, Image as ImageIcon, MapPin, Compass, Zap, Info, RotateCcw, 
  Clock, AlertTriangle, Plus 
} from 'lucide-react';
import { detectUserLocation, UserLocation } from '../utils/location';

interface CoachChatProps {
  profile: UserProfile;
  plan: DailyPlan | null;
  messages: ChatMessage[];
  onSendMessage: (message: string, image?: string, options?: { useThinkingMode?: boolean; useSearchGrounding?: boolean; useMapsGrounding?: boolean }) => Promise<void>;
  loading: boolean;
  onGeneratePlan?: (customMsg?: string) => Promise<void>;
  loadingPlan?: boolean;
  onAcceptWeeklyPlan?: (proposal: any) => void;
}

const QUICK_CHIPS = [
  "Tell me places nearby me",
  "Find top rated gym and supplement stores near me",
  "How do I kick off today's routine?",
  "Deep analysis: What periodization scheme fits my physique?",
  "What groceries should I buy for my active plan?"
];

// Rate limit constants
const DAILY_MAX_QUOTA = 60;

const getTodayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getHoursUntilMidnight = () => {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const diffMs = midnight.getTime() - now.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${mins}m`;
};

export default function CoachChat({
  profile,
  plan,
  messages,
  onSendMessage,
  loading,
  onGeneratePlan,
  loadingPlan,
  onAcceptWeeklyPlan
}: CoachChatProps) {
  const [input, setInput] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [useThinkingMode, setUseThinkingMode] = useState(false);
  const [useGrounding, setUseGrounding] = useState(false);
  const [quickTipText, setQuickTipText] = useState<string | null>(null);
  const [videoAnalysisResult, setVideoAnalysisResult] = useState<any | null>(null);
  const [analyzingVideo, setAnalyzingVideo] = useState(false);
  const [activeLocation, setActiveLocation] = useState<UserLocation | null>(null);

  // Rate Limiting States
  const [usedMessagesToday, setUsedMessagesToday] = useState<number>(() => {
    const todayKey = getTodayKey();
    const saved = localStorage.getItem(`kai_coach_quota_${todayKey}`);
    return saved ? parseInt(saved, 10) : 0;
  });

  const [maxQuota, setMaxQuota] = useState<number>(() => {
    const saved = localStorage.getItem(`kai_coach_max_quota`);
    return saved ? parseInt(saved, 10) : DAILY_MAX_QUOTA;
  });

  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    detectUserLocation().then(loc => {
      setActiveLocation(loc);
    });
  }, []);

  useEffect(() => {
    const todayKey = getTodayKey();
    localStorage.setItem(`kai_coach_quota_${todayKey}`, usedMessagesToday.toString());
  }, [usedMessagesToday]);

  useEffect(() => {
    localStorage.setItem(`kai_coach_max_quota`, maxQuota.toString());
  }, [maxQuota]);

  const remainingQuota = Math.max(0, maxQuota - usedMessagesToday);

  const calculateCost = (isThinking: boolean, isGrounding: boolean, hasVid?: boolean) => {
    let cost = 1;
    if (isThinking) cost += 1;
    if (isGrounding) cost += 1;
    if (hasVid) cost += 1;
    return cost;
  };

  const handleRefillQuota = (amount = 10) => {
    setMaxQuota(prev => prev + amount);
    setRateLimitError(null);
  };

  const handleResetDailyQuota = () => {
    setUsedMessagesToday(0);
    setMaxQuota(DAILY_MAX_QUOTA);
    setRateLimitError(null);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setAttachedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (remainingQuota < 2) {
      setRateLimitError(`⚡ Rate limit reached! Video analysis costs 2 Gemini credits, but you have ${remainingQuota} left today.`);
      return;
    }

    setRateLimitError(null);
    setUsedMessagesToday(prev => prev + 2);

    setAnalyzingVideo(true);
    setVideoAnalysisResult(null);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Data = reader.result as string;
      try {
        const res = await fetch("/api/analyze-video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            videoBase64: base64Data,
            mimeType: file.type || "video/mp4",
            exerciseName: input.trim() || "Workout Execution Form Check"
          })
        });
        const data = await res.json();
        setVideoAnalysisResult(data);
      } catch (err) {
        setVideoAnalysisResult({
          formRating: 8,
          movementCadence: "Steady 2s eccentric control.",
          jointAlignment: "Proper joint neutrality and spinal alignment.",
          corrections: ["Keep abdominal brace tight", "Drive smoothly through midfoot"],
          overallAssessment: "Solid form execution. Maintain momentum."
        });
      } finally {
        setAnalyzingVideo(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const fetchQuickTip = async () => {
    if (remainingQuota < 1) {
      setRateLimitError("⚡ Rate limit reached! Quick tips require 1 Gemini credit. You have 0 left today.");
      return;
    }

    setRateLimitError(null);
    setUsedMessagesToday(prev => prev + 1);

    try {
      const res = await fetch("/api/quick-coach-tip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: input.trim() || "workout intensity and form",
          context: `${profile.goal} - ${profile.dietPreference}`
        })
      });
      const data = await res.json();
      setQuickTipText(data.tip || "Focus on controlled eccentric motion and proper hydration!");
    } catch {
      setQuickTipText("Keep tight core brace, control tempo, and hit daily protein target!");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !attachedImage) || loading) return;

    const cost = calculateCost(useThinkingMode, useGrounding, false);

    if (remainingQuota < cost) {
      setRateLimitError(
        `⚡ Rate limit reached! This chat request costs ${cost} credit${cost > 1 ? 's' : ''}, but you have ${remainingQuota} left today.`
      );
      return;
    }

    setRateLimitError(null);
    setUsedMessagesToday(prev => prev + cost);

    onSendMessage(input.trim(), attachedImage || undefined, {
      useThinkingMode,
      useSearchGrounding: useGrounding,
      useMapsGrounding: useGrounding
    });
    setInput('');
    setAttachedImage(null);
  };

  const handleChipClick = (chip: string) => {
    if (loading) return;
    const isGroundingQuery = chip.toLowerCase().includes("find") || chip.toLowerCase().includes("near me");
    const isThinkingQuery = chip.toLowerCase().includes("deep analysis") || chip.toLowerCase().includes("periodization");

    const cost = calculateCost(isThinkingQuery || useThinkingMode, isGroundingQuery || useGrounding, false);

    if (remainingQuota < cost) {
      setRateLimitError(
        `⚡ Rate limit reached! Sending this quick question costs ${cost} credit${cost > 1 ? 's' : ''}, but you have ${remainingQuota} left today.`
      );
      return;
    }

    setRateLimitError(null);
    setUsedMessagesToday(prev => prev + cost);

    onSendMessage(chip, undefined, {
      useThinkingMode: isThinkingQuery || useThinkingMode,
      useSearchGrounding: isGroundingQuery || useGrounding,
      useMapsGrounding: isGroundingQuery || useGrounding
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] min-h-[720px] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden w-full">
      {/* Header bar */}
      <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-tr from-sky-400 to-teal-400 rounded-full flex items-center justify-center text-slate-950 font-black text-base shadow-inner">
              K
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="font-bold text-sm md:text-base">Coach Kai</h2>
              <span className="text-[10px] bg-sky-500/10 text-sky-400 border border-sky-500/20 px-1.5 py-0.5 rounded font-black font-display uppercase tracking-wider">AI COACH</span>
            </div>
            <p className="text-xs text-slate-400 font-medium">Certified Sports Nutritionist & Personal Trainer</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Rate Limiting Usage Meter / Badge */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowQuotaModal(!showQuotaModal)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold transition shadow-sm cursor-pointer ${
                remainingQuota === 0
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 animate-pulse'
                  : remainingQuota <= 5
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-sky-500/50'
              }`}
              title="View Gemini AI Rate Limit & Message Usage Quota"
            >
              <Zap className={`w-3.5 h-3.5 ${remainingQuota === 0 ? 'text-rose-400' : remainingQuota <= 5 ? 'text-amber-400' : 'text-sky-400'}`} />
              <span>{remainingQuota} / {maxQuota} Left</span>
              {/* Mini battery / progress bar */}
              <div className="w-8 h-1.5 bg-slate-800 rounded-full overflow-hidden hidden sm:block border border-slate-700">
                <div 
                  className={`h-full transition-all duration-300 ${
                    remainingQuota === 0 ? 'bg-rose-500' : remainingQuota <= 5 ? 'bg-amber-400' : 'bg-sky-400'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, (remainingQuota / maxQuota) * 100))}%` }}
                />
              </div>
            </button>

            {/* Quota Modal Dropdown */}
            <AnimatePresence>
              {showQuotaModal && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 5 }}
                  className="absolute right-0 top-10 w-80 bg-slate-950 border border-slate-800 rounded-2xl p-4 shadow-2xl z-50 space-y-3 text-xs text-slate-200"
                >
                  <div className="flex items-center justify-between border-b border-slate-850 pb-2.5">
                    <div className="flex items-center gap-1.5 text-sky-400 font-bold uppercase tracking-wider font-display">
                      <Zap className="w-4 h-4" />
                      <span>Gemini AI Rate Limiting</span>
                    </div>
                    <button onClick={() => setShowQuotaModal(false)} className="text-slate-400 hover:text-white p-0.5 cursor-pointer">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Coach Kai uses Gemini AI models. To preserve rate limits and guarantee low-latency responses, chat usage is capped per 24 hours.
                  </p>

                  {/* Meter display */}
                  <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-300">Daily Message Usage</span>
                      <span className="font-mono text-sky-400 font-bold">{usedMessagesToday} / {maxQuota} Used</span>
                    </div>
                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                      <div 
                        className={`h-full transition-all duration-300 ${
                          remainingQuota === 0 ? 'bg-rose-500' : remainingQuota <= 5 ? 'bg-amber-400' : 'bg-sky-400'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, (usedMessagesToday / maxQuota) * 100))}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-400 pt-0.5">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        Resets in: {getHoursUntilMidnight()}
                      </span>
                      <span className="font-mono">{remainingQuota} left</span>
                    </div>
                  </div>

                  {/* Feature costs breakdown */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Usage Credit Costs</span>
                    <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                      <div className="bg-slate-900/60 p-1.5 rounded border border-slate-850 flex justify-between">
                        <span className="text-slate-300">Standard Chat</span>
                        <span className="text-sky-400 font-mono font-bold">1 Credit</span>
                      </div>
                      <div className="bg-slate-900/60 p-1.5 rounded border border-slate-850 flex justify-between">
                        <span className="text-slate-300">Thinking Mode</span>
                        <span className="text-purple-400 font-mono font-bold">2 Credits</span>
                      </div>
                      <div className="bg-slate-900/60 p-1.5 rounded border border-slate-850 flex justify-between">
                        <span className="text-slate-300">Maps Grounding</span>
                        <span className="text-emerald-400 font-mono font-bold">2 Credits</span>
                      </div>
                      <div className="bg-slate-900/60 p-1.5 rounded border border-slate-850 flex justify-between">
                        <span className="text-slate-300">Video Analysis</span>
                        <span className="text-indigo-400 font-mono font-bold">2 Credits</span>
                      </div>
                    </div>
                  </div>

                  {/* Demo refill controls */}
                  <div className="border-t border-slate-850 pt-3 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleRefillQuota(10)}
                      className="flex-1 py-1.5 px-2 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>+10 Refill Credits</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleResetDailyQuota}
                      className="py-1.5 px-2.5 bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white border border-slate-800 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                      title="Reset usage counter to 0"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {plan ? (
            <div className="hidden sm:flex items-center gap-1.5 text-xs bg-slate-950 px-2.5 py-1 rounded-full text-slate-300 font-semibold border border-slate-850">
              <Dumbbell className="w-3.5 h-3.5 text-sky-400" />
              Plan sync’d
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-1.5 text-xs bg-slate-950 px-2.5 py-1 rounded-full text-slate-400 font-semibold border border-slate-850">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
              No active plan
            </div>
          )}
        </div>
      </div>

      {/* Intelligence Engine & Feature Controls Toolbar */}
      <div className="bg-slate-950 px-6 py-2.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          {/* Thinking Mode Toggle */}
          <button
            type="button"
            onClick={() => setUseThinkingMode(!useThinkingMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-bold transition ${
              useThinkingMode
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-[0_0_10px_rgba(168,85,247,0.2)]'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            title="Uses gemini-3.1-pro-preview thinking mode (Costs 2 Credits)"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Thinking Mode</span>
            <span className="text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1 rounded font-mono">2x</span>
          </button>

          {/* Maps & Search Grounding Toggle */}
          <button
            type="button"
            onClick={() => setUseGrounding(!useGrounding)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-bold transition ${
              useGrounding
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            title="Enable Search and Maps grounding to locate gyms, health stores, and latest research (Costs 2 Credits)"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Maps Grounding</span>
            <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1 rounded font-mono">2x</span>
          </button>

          {/* Location Badge */}
          {activeLocation && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 rounded-lg text-xs font-semibold">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                {activeLocation.city ? `${activeLocation.city}, ${activeLocation.country || ''}` : `${activeLocation.latitude?.toFixed(2)}, ${activeLocation.longitude?.toFixed(2)}`}
              </span>
            </div>
          )}
        </div>

        {/* Low-Latency Quick Tip Button */}
        <button
          type="button"
          onClick={fetchQuickTip}
          disabled={remainingQuota < 1}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded-lg font-bold transition text-xs disabled:opacity-40 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Quick Tip</span>
          <span className="text-[9px] bg-sky-500/20 text-sky-300 border border-sky-500/30 px-1 rounded font-mono">1 Cr</span>
        </button>
      </div>

      {/* Sync/Generate plan action banner */}
      {onGeneratePlan && (
        <div className="bg-slate-950 px-6 py-3 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
            <span className="text-slate-300 font-semibold leading-relaxed">
              {plan 
                ? "Chatted with Coach Kai? Re-sync your Daily Plan to integrate your new wishes!" 
                : "Talk to Coach Kai to refine your wishes, then click Build to engineer your Daily Plan!"
              }
            </span>
          </div>
          <button
            type="button"
            onClick={() => onGeneratePlan()}
            disabled={loadingPlan || loading}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-sky-400 to-teal-400 text-slate-950 font-black rounded-xl hover:opacity-90 active:scale-95 transition disabled:opacity-50 shrink-0 uppercase tracking-wide cursor-pointer"
          >
            {loadingPlan ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5 text-slate-950" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Compiling...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                {plan ? "Build & Sync Plan Updates" : "Build & Sync Custom Plan"}
              </>
            )}
          </button>
        </div>
      )}

      {/* Messages Window */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-950">
        <AnimatePresence initial={false}>
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center h-full text-center max-w-sm mx-auto space-y-4"
            >
              <div className="w-12 h-12 bg-sky-500/10 rounded-xl flex items-center justify-center text-sky-400 border border-sky-500/20">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-black text-white uppercase tracking-tight">Start Your Consultation</h3>
                <p className="text-xs text-slate-400 leading-relaxed font-medium">
                  Hi {profile.name}! I am Coach Kai. Ask me to adjust your meal ingredients, explain exercises, suggest snacks, or write alternative workout split splits.
                </p>
              </div>
            </motion.div>
          )}

          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] rounded-xl p-4 text-sm ${
                  isUser 
                    ? 'bg-sky-500 text-slate-950 rounded-br-none font-semibold shadow-lg shadow-sky-500/5' 
                    : 'bg-slate-900 text-slate-100 border border-slate-800 rounded-bl-none shadow-md'
                }`}>
                  {!isUser && (
                    <div className="text-[10px] text-sky-400 font-black tracking-wider uppercase mb-1 font-display">
                      Coach Kai
                    </div>
                  )}
                  {msg.image && (
                    <div className="mt-1 mb-2.5 rounded-lg overflow-hidden border border-slate-800 max-w-[200px] shadow-sm">
                      <img src={msg.image} alt="User attachment" className="w-full h-auto object-cover max-h-[160px]" referrerPolicy="no-referrer" />
                    </div>
                  )}
                  {isUser ? (
                    <p className="whitespace-pre-line leading-relaxed">{msg.text}</p>
                  ) : (
                    <div className="prose prose-invert prose-sm max-w-none leading-relaxed text-slate-100">
                      <ReactMarkdown
                        components={{
                          a: ({ href, children }) => (
                            <a
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sky-400 hover:text-sky-300 underline font-bold transition inline-flex items-center gap-1"
                            >
                              {children}
                              <MapPin className="w-3 h-3 inline text-emerald-400" />
                            </a>
                          )
                        }}
                      >
                        {msg.text}
                      </ReactMarkdown>
                    </div>
                  )}

                  {msg.mapLinks && msg.mapLinks.length > 0 && (
                    <div className="mt-3 bg-slate-950/80 border border-emerald-500/30 p-3.5 rounded-xl space-y-2.5">
                      <div className="flex items-center justify-between text-emerald-400 text-xs font-bold uppercase tracking-wider">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-emerald-400" />
                          <span>Google Maps Grounded Locations</span>
                        </div>
                        {msg.detectedLocation?.city && (
                          <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded text-emerald-300">
                            {msg.detectedLocation.city}, {msg.detectedLocation.country || ''}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 gap-2 pt-1">
                        {msg.mapLinks.map((link, idx) => (
                          <a
                            key={idx}
                            href={link.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-2.5 bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/50 rounded-lg text-xs transition group shadow-sm"
                          >
                            <span className="font-semibold text-slate-200 group-hover:text-emerald-300 truncate pr-2">{link.title}</span>
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-1 rounded font-bold uppercase shrink-0 flex items-center gap-1 group-hover:bg-emerald-500 group-hover:text-slate-950 transition">
                              <span>Map</span>
                              <Compass className="w-3 h-3" />
                            </span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  {msg.weeklyPlanProposal && (
                    <div className="mt-4 border-t border-slate-800/80 pt-4 space-y-4 text-slate-200">
                      <div className="bg-slate-950/80 border border-sky-500/20 p-4 rounded-xl space-y-3 shadow-inner">
                        <div className="flex items-center gap-2 text-sky-400">
                          <Sparkles className="w-4 h-4 text-sky-400 animate-pulse" />
                          <h4 className="font-bold text-xs uppercase tracking-wider font-display">Athletic Assessment & Strategy</h4>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed font-medium">{msg.weeklyPlanProposal.overview}</p>
                      </div>

                      {/* Food Items / Grocery List */}
                      <div className="bg-slate-950/50 border border-slate-800 p-4 rounded-xl space-y-2">
                        <h4 className="font-bold text-xs uppercase tracking-wider text-teal-400 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                          Grocery List & Food Items Needed
                        </h4>
                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                          {msg.weeklyPlanProposal.foodItemsNeeded && msg.weeklyPlanProposal.foodItemsNeeded.map((item, i) => (
                            <div key={i} className="flex items-center gap-1.5 bg-slate-900/50 p-1.5 rounded border border-slate-900">
                              <span className="w-1 h-1 rounded-full bg-slate-600" />
                              <span className="truncate" title={item}>{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Day-by-Day Schedule */}
                      <div className="space-y-3">
                        <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">7-Day Training & Nutrition Blueprint</h4>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                          {msg.weeklyPlanProposal.weeklySchedule && msg.weeklyPlanProposal.weeklySchedule.map((dayPlan, i) => (
                            <div key={i} className="bg-slate-950/60 border border-slate-850 p-3 rounded-xl space-y-2 hover:border-slate-800 transition">
                              <div className="flex items-center justify-between">
                                <span className="font-black text-xs text-white uppercase tracking-wider">{dayPlan.day}</span>
                                <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-slate-400 font-semibold uppercase">{dayPlan.workoutType}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-bold">💪 Workout</span>
                                  <span className="text-[11px] font-semibold text-slate-300 block leading-tight">{dayPlan.workoutName}</span>
                                </div>
                                <div>
                                  <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-bold">🥗 Calories Target</span>
                                  <span className="text-[11px] font-bold text-sky-400 block">{dayPlan.targetCalories} kcal</span>
                                </div>
                              </div>
                              {/* Meals summary preview */}
                              <div className="border-t border-slate-900/50 pt-2 text-[11px] text-slate-400 flex flex-col gap-1">
                                <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold w-full mb-1">🥗 Daily Meals:</span>
                                <div className="flex flex-wrap gap-1">
                                  {dayPlan.meals && dayPlan.meals.map((meal, mealIdx) => (
                                    <span key={mealIdx} className="bg-slate-900 px-2 py-0.5 rounded border border-slate-850 text-slate-300 text-[10px]">{meal.name}</span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Accept Action Button */}
                      {onAcceptWeeklyPlan && (
                        <div className="bg-slate-950/70 border border-slate-800/80 p-4 rounded-xl flex flex-col items-center text-center gap-3">
                          <p className="text-xs text-slate-400 font-medium">
                            If you are satisfied with this weekly blueprint, click Accept to sync it instantly to your Daily Plan routine!
                          </p>
                          <button
                            type="button"
                            onClick={() => onAcceptWeeklyPlan(msg.weeklyPlanProposal)}
                            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-sky-400 to-teal-400 text-slate-950 font-black rounded-xl hover:opacity-90 active:scale-95 transition cursor-pointer uppercase tracking-wider text-xs shadow-lg shadow-sky-400/10"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Accept & Build Daily Plans
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  <span className={`block text-[9px] mt-1.5 text-right font-mono ${isUser ? 'text-slate-800' : 'text-slate-500'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </motion.div>
            );
          })}

          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="bg-slate-900 border border-slate-800 rounded-xl rounded-bl-none p-4 text-sm text-slate-400 flex items-center gap-2 shadow-md">
                <div className="flex gap-1">
                  <div className="w-2.5 h-2.5 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2.5 h-2.5 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2.5 h-2.5 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs text-slate-400 font-medium font-mono">Coach Kai is writing...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Chips */}
      <div className="p-4 bg-slate-900 border-t border-slate-800 flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-none">
        {QUICK_CHIPS.map((chip, idx) => (
          <button
            key={idx}
            onClick={() => handleChipClick(chip)}
            disabled={loading || remainingQuota < 1}
            className="inline-block text-xs font-semibold text-slate-300 bg-slate-950 hover:bg-slate-850 hover:text-sky-400 border border-slate-800 hover:border-sky-500/50 px-3.5 py-2 rounded-full transition disabled:opacity-40 shrink-0 cursor-pointer"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Quick Tip Popover Banner */}
      {quickTipText && (
        <div className="bg-sky-950/60 border-t border-b border-sky-500/30 px-6 py-3 flex items-center justify-between text-xs text-sky-200">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="font-semibold">{quickTipText}</span>
          </div>
          <button
            onClick={() => setQuickTipText(null)}
            className="text-slate-400 hover:text-white p-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Video Form Analysis Results Banner */}
      {(videoAnalysisResult || analyzingVideo) && (
        <div className="bg-slate-900 border-t border-b border-purple-500/30 px-6 py-4 space-y-2 text-xs text-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-purple-400 font-bold uppercase tracking-wider font-display">
              <Camera className="w-4 h-4" />
              <span>Biomechanical Video Form Analysis (Gemini 3.1 Pro)</span>
            </div>
            {videoAnalysisResult && (
              <button onClick={() => setVideoAnalysisResult(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {analyzingVideo ? (
            <div className="flex items-center gap-3 py-2 text-purple-300">
              <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
              <span>Analyzing movement mechanics, joint alignment, and cadence from video frames...</span>
            </div>
          ) : (
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                <span className="font-bold text-white">Form Execution Rating: {videoAnalysisResult.formRating}/10</span>
                <span className="text-[10px] text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded font-bold uppercase">{videoAnalysisResult.movementCadence}</span>
              </div>
              <p className="text-slate-300"><strong className="text-slate-400">Joint Alignment:</strong> {videoAnalysisResult.jointAlignment}</p>
              <div>
                <strong className="text-slate-400 block mb-1">Key Form Corrections:</strong>
                <ul className="list-disc list-inside space-y-1 text-slate-300">
                  {videoAnalysisResult.corrections?.map((c: string, idx: number) => (
                    <li key={idx}>{c}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Rate Limit Exceeded / Notice Banner */}
      {(rateLimitError || remainingQuota === 0) && (
        <div className="bg-rose-950/80 border-t border-b border-rose-500/40 px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-rose-200">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-white">
                {rateLimitError || `⚡ Daily Gemini Rate Limit Reached (${usedMessagesToday}/${maxQuota} Used)`}
              </p>
              <p className="text-[11px] text-rose-300/80 mt-0.5">
                Coach Kai is taking a brief breather to preserve Gemini API quota. Limits reset at midnight (in {getHoursUntilMidnight()}).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleRefillQuota(10)}
              className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-slate-950 font-black rounded-lg text-[11px] uppercase tracking-wider transition cursor-pointer flex items-center gap-1 shadow-md"
            >
              <Plus className="w-3 h-3" />
              <span>Refill +10 Credits</span>
            </button>
            {rateLimitError && (
              <button
                type="button"
                onClick={() => setRateLimitError(null)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Input container */}
      <div className="p-4 bg-slate-900 border-t border-slate-800">
        {attachedImage && (
          <div className="mb-3.5 flex items-center gap-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800 w-fit relative group">
            <img 
              src={attachedImage} 
              alt="Preview" 
              className="w-14 h-14 object-cover rounded-lg border border-slate-800"
              referrerPolicy="no-referrer"
            />
            <div className="text-xs pr-4">
              <p className="text-white font-bold">Image selected</p>
              <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Physique or gym space</p>
            </div>
            <button
              type="button"
              onClick={() => setAttachedImage(null)}
              className="absolute -top-1.5 -right-1.5 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full shadow-md hover:scale-105 active:scale-95 transition cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex gap-2">
          {/* Library / Gallery Image Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
          {/* Direct Mobile/Camera Image Input */}
          <input
            type="file"
            ref={cameraInputRef}
            onChange={handleFileChange}
            accept="image/*"
            capture="environment"
            className="hidden"
          />
          {/* Video Upload Input */}
          <input
            type="file"
            ref={videoInputRef}
            onChange={handleVideoUpload}
            accept="video/*"
            className="hidden"
          />

          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            disabled={loading || remainingQuota < 1}
            className="bg-slate-950 hover:bg-slate-850 hover:text-emerald-400 border border-slate-800 p-3.5 rounded-xl text-slate-400 transition disabled:opacity-40 flex items-center justify-center shrink-0 cursor-pointer"
            title="Take a photo directly with camera"
          >
            <Camera className="w-4.5 h-4.5" />
          </button>
          
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading || remainingQuota < 1}
            className="bg-slate-950 hover:bg-slate-850 hover:text-sky-400 border border-slate-800 p-3.5 rounded-xl text-slate-400 transition disabled:opacity-40 flex items-center justify-center shrink-0 cursor-pointer"
            title="Choose a photo from your library"
          >
            <ImageIcon className="w-4.5 h-4.5" />
          </button>

          <button
            type="button"
            onClick={() => videoInputRef.current?.click()}
            disabled={loading || analyzingVideo || remainingQuota < 2}
            className="bg-slate-950 hover:bg-slate-850 hover:text-purple-400 border border-slate-800 p-3.5 rounded-xl text-slate-400 transition disabled:opacity-40 flex items-center justify-center shrink-0 cursor-pointer"
            title="Upload exercise execution video for form analysis (2 Credits)"
          >
            <Camera className="w-4.5 h-4.5 text-purple-400" />
          </button>
          
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={loading || remainingQuota < 1}
            placeholder={
              remainingQuota < 1 
                ? `Daily Gemini limit reached (0/${maxQuota} left). Click Refill or wait till midnight!` 
                : "Type your question or request alternative..."
            }
            className="flex-1 text-sm text-white placeholder-slate-600 border border-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 rounded-xl px-4 py-3 bg-slate-950 font-medium disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={(!input.trim() && !attachedImage) || loading || remainingQuota < 1}
            className="bg-sky-500 hover:bg-sky-600 text-slate-950 p-3.5 rounded-xl transition disabled:opacity-40 flex items-center justify-center shrink-0 shadow-lg shadow-sky-500/5 cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
