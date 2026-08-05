import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useWearableSync } from '../utils/useWearableSync';
import {
  Watch, Heart, Activity, Moon, Footprints, ShieldCheck, CheckCircle2,
  X, RefreshCw, Zap, ArrowRight, Sparkles, Smartphone
} from 'lucide-react';

interface SmartwatchConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SmartwatchConnectModal: React.FC<SmartwatchConnectModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    healthPermissionStatus,
    userHealthMetrics,
    requestPermissions,
    fetchHealthMetrics,
  } = useWearableSync();

  const [isLoading, setIsLoading] = useState(false);

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      await requestPermissions();
    } catch (err) {
      console.error('Error requesting health permissions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await fetchHealthMetrics();
    } catch (err) {
      console.error('Error fetching health metrics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const isGranted = healthPermissionStatus === 'granted';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 text-left relative overflow-hidden"
        >
          {/* Background Ambient Glow */}
          <div className="absolute -right-16 -top-16 w-56 h-56 bg-emerald-500/10 blur-3xl pointer-events-none rounded-full" />
          <div className="absolute -left-16 -bottom-16 w-56 h-56 bg-amber-500/10 blur-3xl pointer-events-none rounded-full" />

          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-800 pb-5 relative z-10">
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Watch className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white uppercase tracking-tight font-display flex items-center gap-2">
                  Connect Your Smartwatch
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Sync your daily Steps, Heart Rate, and Sleep Hours with Coach Kai.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Main Body */}
          {!isGranted ? (
            /* Permission Request State */
            <div className="space-y-6 relative z-10">
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-850 space-y-3">
                <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold block">
                  Permissions Required
                </span>
                <ul className="space-y-2 text-xs text-slate-300">
                  <li className="flex items-center gap-2.5">
                    <Footprints className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Daily Steps & Active Calories sync</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Heart className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>Real-time Heart Rate zone calculation</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Moon className="w-4 h-4 text-purple-400 shrink-0" />
                    <span>Sleep duration recovery analysis</span>
                  </li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleConnect}
                  disabled={isLoading}
                  className="flex-1 py-3.5 px-5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-black font-display uppercase tracking-tight flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <ShieldCheck className="w-5 h-5" />
                      Connect My Watch
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="py-3.5 px-5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold font-mono text-xs transition cursor-pointer"
                >
                  Skip For Now
                </button>
              </div>
            </div>
          ) : (
            /* Connected Dashboard State */
            <div className="space-y-5 relative z-10">
              {/* Linked Status Indicator */}
              <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-sm font-bold text-emerald-400 font-mono">
                    🟢 Smartwatch Linked
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  {userHealthMetrics.connectedDeviceName}
                </span>
              </div>

              {/* 3 Quick Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. Steps Card */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-850 space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[10px] font-mono uppercase font-bold">Steps</span>
                    <Footprints className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-lg font-black font-mono text-white">
                    {userHealthMetrics.stepCount.toLocaleString()}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">
                    / 10,000 steps
                  </div>
                </div>

                {/* 2. Heart Rate Card */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-850 space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[10px] font-mono uppercase font-bold">Heart Rate</span>
                    <Heart className="w-4 h-4 text-rose-500" />
                  </div>
                  <div className="text-lg font-black font-mono text-white">
                    {userHealthMetrics.heartRate || '--'} <span className="text-xs text-rose-400">BPM</span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">
                    Active Zone
                  </div>
                </div>

                {/* 3. Sleep Card */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-850 space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[10px] font-mono uppercase font-bold">Sleep</span>
                    <Moon className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="text-lg font-black font-mono text-white">
                    {userHealthMetrics.sleepHours} <span className="text-xs text-purple-400">hrs</span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">
                    last night
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold transition cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isLoading ? 'animate-spin' : ''}`} />
                  Sync Metrics
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black font-display text-xs uppercase tracking-tight transition cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
