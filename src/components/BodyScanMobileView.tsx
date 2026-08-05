import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Upload, CheckCircle2, AlertTriangle, RefreshCw, Sparkles, Activity, ShieldCheck, User } from 'lucide-react';
import { BodyScanAnalysis } from '../types';
import { analyzeBodyScanSafely } from '../services/geminiService';

import { UserProfile } from '../types';

interface BodyScanMobileViewProps {
  profile?: UserProfile;
  user?: any;
  onSignOut?: () => void;
  onHeaderGoogleLogin?: () => void;
  onOpenResetModal?: () => void;
}

interface ScanAngleSlot {
  id: 'front' | 'back' | 'left' | 'right';
  label: string;
  photoUrl: string | null;
}

export const BodyScanMobileView: React.FC<BodyScanMobileViewProps> = () => {
  const [slots, setSlots] = useState<ScanAngleSlot[]>([
    { id: 'front', label: 'Front Pose', photoUrl: null },
    { id: 'back', label: 'Back Pose', photoUrl: null },
    { id: 'left', label: 'Left Profile', photoUrl: null },
    { id: 'right', label: 'Right Profile', photoUrl: null },
  ]);

  const [activeSlotId, setActiveSlotId] = useState<'front' | 'back' | 'left' | 'right' | null>(null);
  const [isCalibrating, setIsCalibrating] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<BodyScanAnalysis | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Trigger camera or gallery input for a photo slot
  const handleSlotClick = (slotId: 'front' | 'back' | 'left' | 'right') => {
    setActiveSlotId(slotId);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Convert uploaded image to Base64 data URL
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeSlotId) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Data = event.target?.result as string;
      if (base64Data) {
        setSlots((prevSlots) =>
          prevSlots.map((slot) =>
            slot.id === activeSlotId ? { ...slot, photoUrl: base64Data } : slot
          )
        );
        setErrorMessage(null);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Main scan execution
  const handleCalibrate = async () => {
    if (isCalibrating) return; // Prevent double taps

    const activePhotos = slots
      .map((s) => s.photoUrl)
      .filter((url): url is string => url !== null);

    if (activePhotos.length === 0) {
      setErrorMessage('Please capture or upload at least one photo before calibrating.');
      return;
    }

    setIsCalibrating(true);
    setErrorMessage(null);

    const result = await analyzeBodyScanSafely(activePhotos);

    if (result.success && result.data) {
      setScanResult(result.data);
    } else {
      setErrorMessage(result.error || 'Failed to analyze scan photos. Please try again.');
    }

    setIsCalibrating(false);
  };

  // Reset scan state
  const handleResetScan = () => {
    setSlots([
      { id: 'front', label: 'Front Pose', photoUrl: null },
      { id: 'back', label: 'Back Pose', photoUrl: null },
      { id: 'left', label: 'Left Profile', photoUrl: null },
      { id: 'right', label: 'Right Profile', photoUrl: null },
    ]);
    setScanResult(null);
    setErrorMessage(null);
  };

  const capturedCount = slots.filter((s) => s.photoUrl !== null).length;

  return (
    <div className="w-full max-w-md mx-auto p-4 space-y-6 text-white pb-20">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Screen Title */}
      <div className="text-center space-y-1">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" /> AI Biomechanics Calibration
        </div>
        <h2 className="text-2xl font-black uppercase tracking-tight text-white font-display">
          Posture & Frame Scan
        </h2>
        <p className="text-xs text-slate-400">
          Capture 4 structural angles for estimated body fat, symmetry, and alignment analysis.
        </p>
      </div>

      {!scanResult ? (
        <div className="space-y-6">
          {/* Photo Grid (4 Slots) */}
          <div className="grid grid-cols-2 gap-3">
            {slots.map((slot) => (
              <div
                key={slot.id}
                onClick={() => handleSlotClick(slot.id)}
                className={`relative aspect-[3/4] rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center p-2 cursor-pointer overflow-hidden ${
                  slot.photoUrl
                    ? 'border-emerald-500/80 bg-slate-900'
                    : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                }`}
              >
                {slot.photoUrl ? (
                  <>
                    <img
                      src={slot.photoUrl}
                      alt={slot.label}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <div className="absolute top-2 right-2 p-1 rounded-full bg-emerald-500 text-black shadow-lg">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <span className="absolute bottom-2 left-2 text-[11px] font-bold font-mono text-emerald-300 uppercase tracking-wide bg-black/60 px-2 py-0.5 rounded-md backdrop-blur-sm">
                      {slot.label}
                    </span>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-500 hover:text-slate-300">
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-400">
                      <Camera className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold font-mono text-slate-400 uppercase tracking-wider">
                      {slot.label}
                    </span>
                    <span className="text-[10px] text-slate-600 font-mono">Tap to capture</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Error Banner */}
          <AnimatePresence>
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-3.5 rounded-2xl bg-red-950/80 border border-red-500/50 text-red-200 text-xs font-mono flex items-center gap-2.5 shadow-lg"
              >
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span className="flex-1">{errorMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Calibrate Button */}
          <button
            onClick={handleCalibrate}
            disabled={isCalibrating || capturedCount === 0}
            className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-wider font-display flex items-center justify-center gap-2 transition-all shadow-xl cursor-pointer ${
              isCalibrating || capturedCount === 0
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20 active:scale-[0.98]'
            }`}
          >
            {isCalibrating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
                <span>CALIBRATING FRAME ({capturedCount}/4)...</span>
              </>
            ) : (
              <>
                <Activity className="w-4 h-4" />
                <span>CALIBRATE POSTURE & FRAME ({capturedCount}/4)</span>
              </>
            )}
          </button>
        </div>
      ) : (
        /* Results Report Display */
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-5"
        >
          {/* Header Metric Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
                Estimated Body Fat
              </span>
              <div className="text-2xl font-black font-mono text-emerald-400">
                {scanResult.bodyFatEst}%
              </div>
              <div className="text-[10px] font-mono text-slate-500">Visual estimate</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
                Posture Score
              </span>
              <div className="text-2xl font-black font-mono text-cyan-400">
                {scanResult.postureScore}/100
              </div>
              <div className="text-[10px] font-mono text-slate-500">Alignment score</div>
            </div>
          </div>

          {/* Breakdown Card */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-white">
                Biomechanics & Alignment Breakdown
              </h3>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div>
                <span className="font-bold font-mono text-slate-400 block uppercase text-[10px]">
                  Posture Notes:
                </span>
                <p className="mt-0.5 text-slate-200">{scanResult.postureNotes}</p>
              </div>

              <div>
                <span className="font-bold font-mono text-slate-400 block uppercase text-[10px]">
                  Shoulder Symmetry:
                </span>
                <p className="mt-0.5 text-slate-200">{scanResult.shoulderSymmetry}</p>
              </div>

              <div>
                <span className="font-bold font-mono text-slate-400 block uppercase text-[10px]">
                  Pelvic Alignment:
                </span>
                <p className="mt-0.5 text-slate-200">{scanResult.pelvicTilt}</p>
              </div>
            </div>

            {/* Recommendations */}
            <div className="border-t border-slate-800 pt-3 space-y-2">
              <span className="font-bold font-mono text-emerald-400 block uppercase text-[10px]">
                Kai Coach Recommendations:
              </span>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {scanResult.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-emerald-400 font-mono font-bold">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Raw Text Output Accordion */}
          {scanResult.rawAnalysisText && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-850 space-y-2">
              <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">
                Full Kai Coach Transcript
              </span>
              <p className="text-[11px] font-mono text-slate-400 leading-relaxed whitespace-pre-line">
                {scanResult.rawAnalysisText}
              </p>
            </div>
          )}

          {/* Scan Again Button */}
          <button
            onClick={handleResetScan}
            className="w-full py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition"
          >
            <RefreshCw className="w-4 h-4 text-emerald-400" />
            <span>Recalibrate & New Scan</span>
          </button>
        </motion.div>
      )}
    </div>
  );
};

export default BodyScanMobileView;