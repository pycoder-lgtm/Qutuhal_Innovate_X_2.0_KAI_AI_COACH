import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useWearableSync } from '../utils/useWearableSync';
import {
  Watch, Heart, Activity, Footprints,
  X, RefreshCw, Zap, Radio, AlertCircle, Unplug, ExternalLink
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
    connectionStatus,
    device,
    biometrics,
    userHealthMetrics,
    connectWebBluetooth,
    disconnectWebBluetooth,
    toggleSimulation,
  } = useWearableSync();

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isIframe = typeof window !== 'undefined' && window.self !== window.top;

  const handleConnectBluetooth = async (acceptAll = false) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const result = await connectWebBluetooth(acceptAll);
      if (!result.success) {
        setErrorMessage(result.error || 'Failed to connect Bluetooth device.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error initializing Web Bluetooth request.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setIsLoading(true);
    try {
      await disconnectWebBluetooth();
    } catch (err) {
      console.error('Error disconnecting:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const isConnected = connectionStatus === 'connected';

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
                  Connect Smartwatch
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Web Bluetooth API (navigator.bluetooth.requestDevice)
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
          {!isConnected ? (
            /* Bluetooth Device Discovery State */
            <div className="space-y-6 relative z-10">
              <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-850 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-1.5">
                    <Radio className="w-4 h-4 animate-pulse text-emerald-400" />
                    Bluetooth GATT Device Scanner
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-bold">
                    BLE 0x180D
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  Search for real Bluetooth smartwatches, Apple Watch, Garmin, Polar, Wahoo, Whoop, or chest strap heart rate monitors in range.
                </p>

                <ul className="space-y-2 text-xs text-slate-300 pt-1 border-t border-slate-850">
                  <li className="flex items-center gap-2.5">
                    <Heart className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>Live GATT Heart Rate streaming (0x2A37)</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Activity className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Real-time effort zone & BPM music sync</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Footprints className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Active fitness calories and step telemetry</span>
                  </li>
                </ul>
              </div>

              {/* Error Alert Box */}
              {errorMessage && (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-2">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <span className="font-bold block">Bluetooth Permissions Note:</span>
                      <span>{errorMessage}</span>
                    </div>
                  </div>
                  <div className="pt-1 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => window.open(window.location.href, '_blank')}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold font-mono text-[11px] flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open App in New Tab
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        toggleSimulation(true);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold font-mono text-[11px] flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      Enable Simulated Watch
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => handleConnectBluetooth(false)}
                  disabled={isLoading}
                  className="w-full py-3.5 px-5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-black font-display uppercase tracking-tight flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Scanning for Bluetooth Devices...
                    </>
                  ) : (
                    <>
                      <Radio className="w-5 h-5" />
                      Scan for Heart Rate & Fitness Devices
                    </>
                  )}
                </button>

                {isIframe && (
                  <button
                    type="button"
                    onClick={() => window.open(window.location.href, '_blank')}
                    className="w-full py-2.5 px-4 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold font-mono text-xs transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4 text-cyan-400" />
                    <span>Open App in New Tab to Pair Bluetooth</span>
                  </button>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleConnectBluetooth(true)}
                    disabled={isLoading}
                    className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold font-mono text-[11px] transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>All BLE Devices</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      toggleSimulation(true);
                      onClose();
                    }}
                    className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-amber-300 font-bold font-mono text-[11px] transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Demo Watch</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2 text-center text-slate-500 hover:text-slate-400 text-xs font-mono transition cursor-pointer"
                >
                  Cancel
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
                    🟢 Bluetooth Watch Linked
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-white bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                  {device.name || userHealthMetrics.connectedDeviceName}
                </span>
              </div>

              {/* Quick Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. Live Heart Rate Card */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-850 space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[10px] font-mono uppercase font-bold">Live HR</span>
                    <Heart className="w-4 h-4 text-rose-500 animate-pulse" />
                  </div>
                  <div className="text-xl font-black font-mono text-white">
                    {biometrics.heartRate ? biometrics.heartRate : '--'} <span className="text-xs text-rose-400">BPM</span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">
                    GATT Notification
                  </div>
                </div>

                {/* 2. Steps Card */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-850 space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[10px] font-mono uppercase font-bold">Steps</span>
                    <Footprints className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-xl font-black font-mono text-white">
                    {biometrics.stepCount.toLocaleString()}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">
                    Daily Telemetry
                  </div>
                </div>

                {/* 3. Calories Card */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-850 space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[10px] font-mono uppercase font-bold">Calories</span>
                    <Zap className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-xl font-black font-mono text-white">
                    {biometrics.activeCalories} <span className="text-xs text-amber-400">kcal</span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">
                    Active Burn
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-between pt-2 gap-3">
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-mono font-bold transition cursor-pointer"
                >
                  <Unplug className="w-3.5 h-3.5" />
                  Disconnect Device
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black font-display text-xs uppercase tracking-tight transition cursor-pointer"
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
