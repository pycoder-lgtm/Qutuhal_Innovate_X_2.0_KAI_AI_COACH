import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, CheckCircle2, AlertTriangle, RefreshCw, Sparkles, Activity, 
  ShieldCheck, User, Settings, Scale, Flame, LogOut, RotateCcw, 
  Edit3, Save, Target, Utensils, Dumbbell, Heart, ChevronRight
} from 'lucide-react';
import { BodyScanAnalysis, UserProfile } from '../types';
import { analyzeBodyScanSafely } from '../services/geminiService';

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
  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'scan'>('profile');

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

  // Body Scan Slots
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
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Main scan execution
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

  // Handle Profile Form Submit
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

      {/* USER PROFILE & BIOMETRICS */}
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
                    {/* Energy & Metabolic Metrics */}
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

                    {/* Additional Settings Details */}
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
    </div>
  );
};

export default BodyScanMobileView;
