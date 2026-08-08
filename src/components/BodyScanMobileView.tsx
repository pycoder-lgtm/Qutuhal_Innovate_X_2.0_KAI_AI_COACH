import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Camera, CheckCircle2, AlertTriangle, RefreshCw, Sparkles, Activity, 
  ShieldCheck, User, Scale, Flame, LogOut, RotateCcw, 
  Edit3, Save, ChevronRight, Target, ShieldAlert, ListChecks, Layers,
  ChevronDown, Dumbbell, Crosshair, Zap
} from 'lucide-react';
import { BodyScanAnalysis, UserProfile } from '../types';
import { analyzeBodyScanSafely } from '../services/geminiService';
import { simplifyAnalysisText, getSomatotypeDefinition } from '../utils/simplifyAnalysis';

interface BodyScanMobileViewProps {
  profile?: UserProfile;
  user?: any;
  onSignOut?: () => void;
  onHeaderGoogleLogin?: () => void;
  onOpenResetModal?: () => void;
  onUpdateProfile?: (updated: UserProfile) => void;
}

interface ScanAngleSlot {
  id: 'front' | 'back' | 'left' | 'right';
  label: string;
  photoUrl: string | null;
}

export const BodyScanMobileView: React.FC<BodyScanMobileViewProps> = ({
  profile,
  user,
  onSignOut,
  onHeaderGoogleLogin,
  onOpenResetModal,
  onUpdateProfile
}) => {
  // Main sub-tab toggle: 'scan' vs 'profile'
  const [activeSubTab, setActiveSubTab] = useState<'scan' | 'profile'>('scan');

  // Profile Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<UserProfile>>({
    name: profile?.name || '',
    age: profile?.age || 25,
    gender: profile?.gender || 'male',
    height: profile?.height || 175,
    weight: profile?.weight || 70,
    targetWeight: profile?.targetWeight || profile?.weight || 70,
    activityLevel: profile?.activityLevel || 'moderate',
    dietType: profile?.dietType || 'veg',
    workoutLocation: profile?.workoutLocation || 'home',
    experienceLevel: profile?.experienceLevel || 'beginner',
  });

  const [saveSuccess, setSaveSuccess] = useState(false);

  // Initialize Body Scan Slots with profile photos if available
  const [slots, setSlots] = useState<ScanAngleSlot[]>([
    { id: 'front', label: 'Front View', photoUrl: profile?.photoFront || profile?.physiquePhoto || null },
    { id: 'back', label: 'Back View', photoUrl: profile?.photoBack || null },
    { id: 'left', label: 'Left Profile', photoUrl: profile?.photoLeft || null },
    { id: 'right', label: 'Right Profile', photoUrl: profile?.photoRight || null },
  ]);

  // Sync slots if profile updates
  useEffect(() => {
    if (profile) {
      setSlots([
        { id: 'front', label: 'Front View', photoUrl: profile.photoFront || profile.physiquePhoto || null },
        { id: 'back', label: 'Back View', photoUrl: profile.photoBack || null },
        { id: 'left', label: 'Left Profile', photoUrl: profile.photoLeft || null },
        { id: 'right', label: 'Right Profile', photoUrl: profile.photoRight || null },
      ]);
    }
  }, [profile?.photoFront, profile?.photoBack, profile?.photoLeft, profile?.photoRight, profile?.physiquePhoto]);

  const [activeSlotId, setActiveSlotId] = useState<'front' | 'back' | 'left' | 'right' | null>(null);
  const [isCalibrating, setIsCalibrating] = useState<boolean>(false);
  const [expandedSection, setExpandedSection] = useState<{ [key: string]: boolean }>({ fat: true, muscle: true, posture: true });
  const toggleSection = (key: string) => setExpandedSection(prev => ({ ...prev, [key]: !prev[key] }));
  
  // Initialize scanResult with existing profile analysis if present
  const [scanResult, setScanResult] = useState<BodyScanAnalysis | null>(() => {
    if (profile) {
      const estWeight = profile.estimatedWeight || (profile.estimatedWeightKg ? `${profile.estimatedWeightKg} kg` : undefined);
      const somatotypeVal = profile.somatotype || profile.bodyType || undefined;
      const personalizedDef = profile.personalizedDefinition || profile.simpleSummary || profile.bodyCompositionSummary;

      if (estWeight || somatotypeVal || personalizedDef) {
        return {
          id: `scan_profile`,
          date: new Date().toISOString().split('T')[0],
          estimatedWeight: estWeight || '108 kg',
          somatotype: somatotypeVal || 'Endomorph',
          personalizedDefinition: personalizedDef || "This body type naturally has a wider frame and holds onto weight easily. Your body thrives with regular strength training and daily active movement to stay fit and energetic.",
          detailedSomatotypeAnalysis: {
            fatDistribution: personalizedDef || "",
            muscleMassTendencies: "",
            posturalAlignment: ""
          },
          simpleSummary: personalizedDef || "",
          estimatedWeightKg: profile.estimatedWeightKg || 0,
          bodyFatPercentage: profile.bodyFatPercentage || 0,
          muscleMassPercentage: profile.muscleMassPercentage || 0,
          structuralFlaws: profile.structuralFlaws || [],
          bodyCompositionSummary: personalizedDef || ''
        };
      }
    }
    return null;
  });

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDeepDive, setShowDeepDive] = useState(false);
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

        // Update profile if callback provided
        if (onUpdateProfile && profile) {
          const fieldKey = activeSlotId === 'front' ? 'photoFront' : activeSlotId === 'back' ? 'photoBack' : activeSlotId === 'left' ? 'photoLeft' : 'photoRight';
          onUpdateProfile({ ...profile, [fieldKey]: base64Data });
        }
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Main 4-Angle Scan execution
  const handleCalibrate = async () => {
    if (isCalibrating) return;

    const activePhotos = slots
      .map((s) => s.photoUrl)
      .filter((url): url is string => url !== null);

    if (activePhotos.length === 0) {
      setErrorMessage('Please capture or upload at least one photo before calibrating.');
      return;
    }

    setIsCalibrating(true);
    setErrorMessage(null);

    try {
      // Pass Height, Age, & Gender to the Vision API along with photos
      const userBiometrics = profile ? {
        heightCm: profile.height,
        height: profile.height,
        age: profile.age,
        gender: profile.gender,
        weight: profile.weight
      } : undefined;

      const result = await analyzeBodyScanSafely(activePhotos, userBiometrics);

      if (result.success && result.data) {
        setScanResult(result.data);
        setErrorMessage(null);

        // Persist scan analysis to profile
        if (onUpdateProfile && profile) {
          onUpdateProfile({
            ...profile,
            estimatedWeight: result.data.estimatedWeight,
            somatotype: result.data.somatotype,
            detailedSomatotypeAnalysis: result.data.detailedSomatotypeAnalysis,
            simpleSummary: result.data.simpleSummary,
            estimatedWeightKg: result.data.estimatedWeightKg,
            bodyFatPercentage: result.data.bodyFatPercentage,
            muscleMassPercentage: result.data.muscleMassPercentage,
            structuralFlaws: result.data.structuralFlaws,
            bodyCompositionSummary: result.data.simpleSummary,
            bodyType: result.data.somatotype,
            frameType: result.data.somatotype,
            physiqueAnalysis: result.data.simpleSummary
          });
        }
      } else {
        const errorDetail = result.error || 'Body scan API call failed. Please check your API key or connection and try again.';
        console.error("API Error:", errorDetail);
        setScanResult(null);
        setErrorMessage(errorDetail.startsWith('API Error:') ? errorDetail : `API Error: ${errorDetail}`);
      }
    } catch (err: any) {
      console.error("Scan analysis error caught:", err);
      setScanResult(null);
      setErrorMessage(`API Error: ${err?.message || 'Body scan API call failed. Please try again.'}`);
    } finally {
      setIsCalibrating(false);
    }
  };

  const handleResetScan = () => {
    setSlots([
      { id: 'front', label: 'Front View', photoUrl: null },
      { id: 'back', label: 'Back View', photoUrl: null },
      { id: 'left', label: 'Left Profile', photoUrl: null },
      { id: 'right', label: 'Right Profile', photoUrl: null },
    ]);
    setScanResult(null);
    setErrorMessage(null);
  };

  const capturedCount = slots.filter((s) => s.photoUrl !== null).length;

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !onUpdateProfile) return;

    const updated: UserProfile = {
      ...profile,
      ...editForm,
      name: editForm.name || profile.name,
      age: Number(editForm.age) || profile.age,
      height: Number(editForm.height) || profile.height,
      weight: Number(editForm.weight) || profile.weight,
      targetWeight: Number(editForm.targetWeight) || profile.targetWeight,
    };

    onUpdateProfile(updated);
    setIsEditing(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-6 text-white pb-12">
      {/* Hidden File Input for Pose Photos */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Sub-Tab Selector Navigation */}
      <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800/80 shadow-lg">
        <button
          onClick={() => setActiveSubTab('scan')}
          className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2 ${
            activeSubTab === 'scan'
              ? 'bg-gradient-to-r from-sky-500 to-teal-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>4-Angle Body Scan</span>
        </button>

        <button
          onClick={() => setActiveSubTab('profile')}
          className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2 ${
            activeSubTab === 'profile'
              ? 'bg-gradient-to-r from-sky-500 to-teal-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Profile & Biometrics</span>
        </button>
      </div>

      {/* SUB-TAB 1: 4-ANGLE BODY SCAN & AI REPORT */}
      {activeSubTab === 'scan' && (
        <div className="space-y-6 animate-fade-in">
          {/* Photo Capture Grid Card */}
          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-850 pb-3">
              <div>
                <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
                  <span>4-Angle Body Scan</span>
                  <span className="px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 text-[10px] font-bold border border-sky-500/20">
                    {capturedCount}/4 Photos
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400 font-medium">
                  Coach Kai's AI engine will process your 4 photos to estimate your body fat percentage, muscle mass index, exact baseline weight, and biomechanical posture alignment.
                </p>
              </div>

              {capturedCount > 0 && (
                <button
                  onClick={handleResetScan}
                  className="text-[11px] font-bold text-slate-400 hover:text-sky-400 transition cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              )}
            </div>

            {/* 4 Angle Slots Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {slots.map((slot) => (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => handleSlotClick(slot.id)}
                  className={`relative aspect-[3/4] rounded-xl border flex flex-col items-center justify-center overflow-hidden transition cursor-pointer group ${
                    slot.photoUrl
                      ? 'border-emerald-500/40 bg-slate-900'
                      : 'border-slate-800 hover:border-sky-500/50 bg-slate-900/60 hover:bg-slate-900'
                  }`}
                >
                  {slot.photoUrl ? (
                    <>
                      <img
                        src={slot.photoUrl}
                        alt={slot.label}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent" />
                      <div className="absolute top-2 right-2 bg-emerald-500 text-slate-950 p-1 rounded-full shadow">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                      <span className="absolute bottom-2 text-[10px] font-bold text-white tracking-wide uppercase px-2 py-0.5 bg-slate-950/80 backdrop-blur rounded">
                        {slot.label}
                      </span>
                    </>
                  ) : (
                    <div className="p-3 text-center space-y-1.5">
                      <div className="w-9 h-9 rounded-full bg-slate-800 group-hover:bg-sky-500/10 text-slate-400 group-hover:text-sky-400 flex items-center justify-center mx-auto transition">
                        <Camera className="w-4 h-4" />
                      </div>
                      <span className="text-[11px] font-bold text-slate-300 block">
                        {slot.label}
                      </span>
                      <span className="text-[9px] text-slate-500 block">
                        Tap to add
                      </span>
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Error / Notice Banner */}
            {errorMessage && (
              <div className="p-3 bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs font-medium rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Trigger AI Scan Button */}
            <button
              onClick={handleCalibrate}
              disabled={isCalibrating || capturedCount === 0}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-sky-500 via-teal-400 to-sky-500 hover:from-sky-400 hover:to-teal-300 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCalibrating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Analyzing Body Photos with Kai AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-slate-950" />
                  <span>Run 4-Angle AI Body Scan</span>
                </>
              )}
            </button>
          </div>

          {/* AI BODY SCAN SOMATOTYPE ANALYSIS REPORT */}
          {scanResult && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 shadow-xl relative overflow-hidden">
                
                {/* 1. SOMATOTYPE HEADER & EST. BODY FAT % */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-900 pb-3">
                  <div>
                    <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                      <Layers className="w-4 h-4 text-sky-400" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400">Somatotype Classification</span>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-white font-display uppercase tracking-tight text-sky-400">
                      {scanResult.somatotype || 'Endomorph'}
                    </div>
                  </div>

                  {/* EST. BODY FAT % BADGE */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex items-center gap-2.5 shadow-inner">
                    <Activity className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Est. Body Fat</div>
                      <div className="text-sm sm:text-base font-black text-amber-400 font-mono tracking-tight">
                        {scanResult.bodyFatPercentage || scanResult.estimatedBodyFat || scanResult.bodyFatPercentageRange || '22% - 25%'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. DEFINITION OF BODY SOMATOTYPE (UNDER THE SOMATOTYPE) */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-sky-400">
                    <Sparkles className="w-4 h-4 text-sky-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-sky-400">Body Somatotype Definition</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-850 space-y-1">
                    <p className="text-sm text-slate-200 leading-relaxed font-sans">
                      {simplifyAnalysisText(
                        scanResult.personalizedDefinition || 
                        scanResult.simpleSummary || 
                        scanResult.bodyCompositionSummary || 
                        getSomatotypeDefinition(scanResult.somatotype)
                      )}
                    </p>
                  </div>
                </div>

                {/* 3. EST. WEIGHT BASELINE (BELOW THE SOMATOTYPE & DEFINITION) */}
                <div className="pt-1">
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between shadow-md">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                        <Scale className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Est. Weight Baseline</div>
                        <div className="text-xs text-slate-400">Realistic baseline estimated from your frame & height</div>
                      </div>
                    </div>
                    <div className="text-lg sm:text-xl font-black text-emerald-400 font-mono tracking-tight pl-2">
                      {scanResult.estimatedWeight || (scanResult.estimatedWeightKg ? `${scanResult.estimatedWeightKg} kg` : '88 kg')}
                    </div>
                  </div>
                </div>

              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: USER PROFILE & BIOMETRICS */}
      {activeSubTab === 'profile' && (
        <div className="space-y-6 animate-fade-in">
          {/* Profile Overview Card */}
          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-850 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-teal-500 flex items-center justify-center text-slate-950 font-black text-lg shadow-md">
                  {profile?.name ? profile.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-display">
                    {profile?.name || 'Athlete Profile'}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    {profile?.gender ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1) : 'Member'} • {profile?.age || '--'} years old
                  </p>
                </div>
              </div>

              {!isEditing && (
                <button
                  onClick={() => {
                    setEditForm({
                      name: profile?.name || '',
                      age: profile?.age || 25,
                      gender: profile?.gender || 'male',
                      height: profile?.height || 175,
                      weight: profile?.weight || 70,
                      targetWeight: profile?.targetWeight || profile?.weight || 70,
                      activityLevel: profile?.activityLevel || 'moderate',
                      dietType: profile?.dietType || 'veg',
                      workoutLocation: profile?.workoutLocation || 'home',
                      experienceLevel: profile?.experienceLevel || 'beginner',
                    });
                    setIsEditing(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
              )}
            </div>

            {saveSuccess && (
              <div className="p-3 bg-emerald-950/60 border border-emerald-800 text-emerald-400 text-xs font-bold rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Profile biometrics updated successfully!</span>
              </div>
            )}

            {/* Read-only View vs Edit Form */}
            {!isEditing ? (
              <div className="space-y-4">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-0.5">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Current Weight</span>
                    <span className="text-lg font-black text-emerald-400 font-mono">{profile?.weight || '--'} kg</span>
                  </div>

                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-0.5">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Height</span>
                    <span className="text-lg font-black text-sky-400 font-mono">{profile?.height || '--'} cm</span>
                  </div>

                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-0.5">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Target Weight</span>
                    <span className="text-lg font-black text-amber-400 font-mono">{profile?.targetWeight || profile?.weight || '--'} kg</span>
                  </div>

                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-0.5">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Est. Body Fat</span>
                    <span className="text-lg font-black text-cyan-400 font-mono">{profile?.bodyFat || profile?.estimatedBodyFatPercent || 15}%</span>
                  </div>
                </div>

                {/* Progressive Disclosure: Deep Dive Data Toggle */}
                <button
                  type="button"
                  onClick={() => setShowDeepDive(!showDeepDive)}
                  className="w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-sky-400 font-bold text-xs uppercase tracking-wider flex items-center justify-between transition cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-sky-400" />
                    <span>View Deep Dive Data</span>
                  </div>
                  <ChevronRight className={`w-4 h-4 transition-transform ${showDeepDive ? 'rotate-90' : ''}`} />
                </button>

                {/* Expanded Deep Dive Biomechanics & Math */}
                {showDeepDive && (
                  <div className="space-y-4 pt-2 border-t border-slate-850 animate-fade-in">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 flex items-center gap-2.5">
                        <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
                          <Flame className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Estimated BMR</span>
                          <span className="text-xs font-bold text-white font-mono">{profile?.bmr || Math.round(10 * (profile?.weight || 70) + 6.25 * (profile?.height || 175) - 5 * (profile?.age || 25) + 5)} kcal</span>
                        </div>
                      </div>

                      <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 flex items-center gap-2.5">
                        <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                          <Activity className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Daily TDEE</span>
                          <span className="text-xs font-bold text-white font-mono">{profile?.tdee || Math.round((profile?.bmr || 1600) * 1.375)} kcal</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-900">
                        <span className="text-slate-400 font-medium">Activity Level:</span>
                        <span className="text-white font-semibold capitalize">{profile?.activityLevel?.replace('_', ' ') || 'Moderate'}</span>
                      </div>

                      <div className="flex justify-between py-1 border-b border-slate-900">
                        <span className="text-slate-400 font-medium">Diet Preference:</span>
                        <span className="text-white font-semibold capitalize">{profile?.dietType || profile?.dietPreference || 'Standard Veg/Non-Veg'}</span>
                      </div>

                      <div className="flex justify-between py-1 border-b border-slate-900">
                        <span className="text-slate-400 font-medium">Workout Location:</span>
                        <span className="text-white font-semibold capitalize">{profile?.workoutLocation || 'Home / Gym'}</span>
                      </div>

                      <div className="flex justify-between py-1">
                        <span className="text-slate-400 font-medium">Fitness Experience:</span>
                        <span className="text-white font-semibold capitalize">{profile?.experienceLevel || 'Beginner'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* EDIT FORM */
              <form onSubmit={handleSaveProfile} className="space-y-4 pt-1">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-400">Full Name</label>
                    <input
                      type="text"
                      value={editForm.name || ''}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-400">Age</label>
                    <input
                      type="number"
                      value={editForm.age || ''}
                      onChange={(e) => setEditForm({ ...editForm, age: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-400">Weight (kg)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={editForm.weight || ''}
                      onChange={(e) => setEditForm({ ...editForm, weight: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-400">Height (cm)</label>
                    <input
                      type="number"
                      value={editForm.height || ''}
                      onChange={(e) => setEditForm({ ...editForm, height: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-400">Target (kg)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={editForm.targetWeight || ''}
                      onChange={(e) => setEditForm({ ...editForm, targetWeight: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-400">Activity Level</label>
                    <select
                      value={editForm.activityLevel}
                      onChange={(e) => setEditForm({ ...editForm, activityLevel: e.target.value as any })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-sky-500"
                    >
                      <option value="sedentary">Sedentary (office job)</option>
                      <option value="light">Lightly Active</option>
                      <option value="moderate">Moderately Active</option>
                      <option value="active">Very Active</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-400">Workout Location</label>
                    <select
                      value={editForm.workoutLocation}
                      onChange={(e) => setEditForm({ ...editForm, workoutLocation: e.target.value as any })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-sky-500"
                    >
                      <option value="home">Home Workout</option>
                      <option value="gym">Gym Workout</option>
                      <option value="both">Both Home & Gym</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer transition"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition shadow-lg shadow-sky-500/20"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Changes</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Account & System Actions Card */}
          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 shadow-xl">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-850 pb-2">
              Account & Sync Management
            </h4>

            <div className="space-y-3">
              {user ? (
                <div className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <div>
                      <span className="text-xs font-bold text-white block">{user.displayName || user.email || 'Google Account Connected'}</span>
                      <span className="text-[10px] text-slate-400">Cloud database synced</span>
                    </div>
                  </div>

                  {onSignOut && (
                    <button
                      onClick={onSignOut}
                      className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-slate-800">
                  <div>
                    <span className="text-xs font-bold text-white block">Guest Mode (Local Storage)</span>
                    <span className="text-[10px] text-slate-400">Sign in with Google to sync cloud data</span>
                  </div>

                  {onHeaderGoogleLogin && (
                    <button
                      onClick={onHeaderGoogleLogin}
                      className="px-3 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                    >
                      <span>Connect Google</span>
                    </button>
                  )}
                </div>
              )}

              {onOpenResetModal && (
                <button
                  onClick={onOpenResetModal}
                  className="w-full py-3 rounded-xl bg-slate-900 hover:bg-red-950/40 border border-slate-800 hover:border-red-500/30 text-slate-400 hover:text-red-400 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4 text-red-400" />
                  <span>Reset All App Data & Re-Onboard</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BodyScanMobileView;
