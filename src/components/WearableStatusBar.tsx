import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useWearable } from '../context/WearableContext';
import { SmartwatchConnectModal } from './SmartwatchConnectModal';
import {
  Watch, Heart, Activity, Flame, ShieldCheck, Zap, RefreshCw, Sliders,
  Radio, Battery, Cpu, CheckCircle2, ChevronRight, X, Play, Pause, AlertCircle, Link
} from 'lucide-react';
import { WorkoutPhase } from '../services/WearableSyncService';

interface WearableStatusBarProps {
  className?: string;
  showControlsInline?: boolean;
}

export const WearableStatusBar: React.FC<WearableStatusBarProps> = ({
  className = '',
  showControlsInline = false,
}) => {
  const {
    isWatchConnected,
    watchDeviceName,
    currentHeartRate,
    activeExercise,
    workoutPhase,
    targetBpmZone,
    effortZoneName,
    effortZoneColor,
    isSimulating,
    caloriesBurned,
    batteryLevel,
    toggleSimulation,
    setHeartRate,
    setWorkoutPhase,
    setActiveExercise,
    processWearablePacket,
  } = useWearable();

  const [showDevModal, setShowDevModal] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);

  // Helper for phase colors
  const getPhaseBadge = (phase: WorkoutPhase) => {
    switch (phase) {
      case 'WARMUP':
        return { label: 'Warmup Phase', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' };
      case 'ACTIVE_SET':
        return { label: 'Active Set', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 font-bold' };
      case 'REST':
        return { label: 'Rest Period', color: 'bg-purple-500/10 text-purple-400 border-purple-500/30' };
      case 'COOLDOWN':
        return { label: 'Cooldown', color: 'bg-teal-500/10 text-teal-400 border-teal-500/30' };
      default:
        return { label: phase, color: 'bg-slate-800 text-slate-300 border-slate-700' };
    }
  };

  const phaseBadge = getPhaseBadge(workoutPhase);

  return (
    <div className={`w-full ${className}`}>
      {/* Top Banner Card */}
      <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800/90 rounded-2xl p-3 md:p-4 shadow-xl relative overflow-hidden transition-all">
        {/* Ambient background glow matching heart zone */}
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-amber-500/5 blur-3xl pointer-events-none rounded-full" />

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 relative z-10">
          
          {/* Left Column: Device Connection & Heart Rate */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Watch Connection Badge */}
            <div
              onClick={() => setShowDevModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 cursor-pointer transition select-none group"
            >
              <div className="relative flex items-center justify-center">
                <Watch className={`w-4 h-4 group-hover:scale-110 transition-transform ${isWatchConnected ? 'text-emerald-400' : 'text-slate-500'}`} />
                {isWatchConnected && (
                  <>
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400" />
                  </>
                )}
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-white tracking-tight uppercase font-display line-clamp-1">
                    {watchDeviceName || 'Smartwatch'}
                  </span>
                  <span className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded border font-bold ${
                    isWatchConnected
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    {isWatchConnected ? 'Active' : 'Offline'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                  <span className="flex items-center gap-1">
                    <Battery className="w-3 h-3 text-emerald-400" /> {batteryLevel}%
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-slate-300">
                    <Flame className="w-3 h-3 text-amber-400" /> {caloriesBurned} kcal
                  </span>
                </div>
              </div>
            </div>

            {/* Live Pulsing Heart Rate Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-850">
              <motion.div
                animate={{ scale: [1, 1.25, 1] }}
                transition={{
                  repeat: Infinity,
                  duration: currentHeartRate ? Math.max(0.4, 60 / currentHeartRate) : 0.8,
                  ease: 'easeInOut',
                }}
                className="p-1.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-500 shadow-sm shadow-rose-500/20"
              >
                <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
              </motion.div>

              <div>
                <span className="text-[9px] font-mono font-bold uppercase text-slate-400 block tracking-wider">
                  Live Heart Rate
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-base font-black font-mono text-white tracking-tight">
                    {currentHeartRate ? currentHeartRate : '--'}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-rose-400">BPM</span>
                </div>
              </div>
            </div>

            {/* Current Effort Zone Badge */}
            <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 ${effortZoneColor}`}>
              <Zap className="w-4 h-4 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider opacity-80">
                  Effort Zone
                </span>
                <span className="text-xs font-black tracking-tight font-display">
                  {effortZoneName}
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Workout Phase & Exercise / Dev Controls Button */}
          <div className="flex items-center gap-2 justify-between sm:justify-end border-t sm:border-t-0 border-slate-800/80 pt-2 sm:pt-0">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-mono uppercase px-2.5 py-1 rounded-lg border ${phaseBadge.color}`}>
                {phaseBadge.label}
              </span>
              <span className="text-xs font-bold text-slate-300 hidden md:inline line-clamp-1 max-w-[160px]">
                {activeExercise}
              </span>
            </div>

            {/* Connect Watch & Dev Simulator Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowConnectModal(true)}
                className="px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold font-mono border border-emerald-500/30 flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm"
              >
                <Watch className="w-3.5 h-3.5 text-emerald-400" />
                <span>Connect Watch</span>
              </button>

              <button
                type="button"
                onClick={() => setShowDevModal(true)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-bold font-mono border border-slate-700 flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden xs:inline">Bridge</span>
                {isSimulating && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SMARTWATCH PERMISSION & HEALTH HUB MODAL */}
      <SmartwatchConnectModal
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
      />

      {/* DEV / SIMULATION MODAL & CONTROLS */}
      <AnimatePresence>
        {showDevModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-6 text-left relative overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                    <Watch className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-white uppercase tracking-tight font-display">
                      Smartwatch Companion Bridge
                    </h2>
                    <p className="text-xs text-slate-400 font-mono">
                      Apple Watch (WatchConnectivity) & Wear OS DataLayer
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDevModal(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status Info */}
              <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                <div className="p-3 bg-slate-950 rounded-2xl border border-slate-850">
                  <span className="text-slate-500 text-[10px] block uppercase font-bold">Watch Connection</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                  </span>
                </div>
                <div className="p-3 bg-slate-950 rounded-2xl border border-slate-850">
                  <span className="text-slate-500 text-[10px] block uppercase font-bold">Target BPM Zone</span>
                  <span className="text-amber-400 font-bold mt-0.5 block">
                    {targetBpmZone} BPM
                  </span>
                </div>
              </div>

              {/* Simulation Mode Toggle Section */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-850 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Radio className={`w-5 h-5 ${isSimulating ? 'text-amber-400 animate-pulse' : 'text-slate-500'}`} />
                    <div>
                      <h4 className="text-sm font-bold text-white uppercase font-mono">
                        Simulate Watch Data
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Generates live heart rates (100-165 BPM) & cycles workout phases every 30s.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleSimulation()}
                    className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition flex items-center gap-2 cursor-pointer ${
                      isSimulating
                        ? 'bg-amber-500 text-black hover:bg-amber-400 shadow-lg shadow-amber-500/20'
                        : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700'
                    }`}
                  >
                    {isSimulating ? <Pause className="w-4 h-4 fill-black" /> : <Play className="w-4 h-4 fill-slate-200" />}
                    {isSimulating ? 'Simulating' : 'Start Simulation'}
                  </button>
                </div>

                {/* Manual Override Controls */}
                <div className="space-y-3 pt-3 border-t border-slate-800/80">
                  <span className="text-[10px] font-mono font-bold uppercase text-slate-400 tracking-wider block">
                    Manual Biometric Controls
                  </span>

                  {/* Heart Rate Slider */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-400">Override Heart Rate:</span>
                      <span className="text-rose-400 font-bold">{currentHeartRate || 120} BPM</span>
                    </div>
                    <input
                      type="range"
                      min="80"
                      max="185"
                      value={currentHeartRate || 120}
                      onChange={(e) => setHeartRate(Number(e.target.value))}
                      className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                    />
                  </div>

                  {/* Phase Buttons */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-mono text-slate-400 block">Set Workout Phase:</span>
                    <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                      {(['WARMUP', 'ACTIVE_SET', 'REST', 'COOLDOWN'] as WorkoutPhase[]).map((phase) => (
                        <button
                          key={phase}
                          type="button"
                          onClick={() => setWorkoutPhase(phase)}
                          className={`px-3 py-1.5 rounded-xl border text-center transition cursor-pointer ${
                            workoutPhase === phase
                              ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {phase}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Send Test Packet Button */}
                  <button
                    type="button"
                    onClick={() => {
                      processWearablePacket({
                        deviceName: 'Apple Watch Ultra 2',
                        heartRate: Math.floor(Math.random() * 35) + 135,
                        activeExercise: 'Sprints & Plyometrics',
                        workoutPhase: 'ACTIVE_SET',
                      });
                    }}
                    className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-800 text-xs font-mono font-bold flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4 text-emerald-400" />
                    Dispatch Native Watch Packet
                  </button>
                </div>
              </div>

              {/* Close Footer */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowDevModal(false)}
                  className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black font-display uppercase tracking-tight transition cursor-pointer"
                >
                  Apply & Close Bridge
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
