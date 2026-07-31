/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../types';
import { 
  User, Scale, Activity, Target, Utensils, ArrowRight, ArrowLeft, 
  Sparkles, Dumbbell, ShieldAlert, HeartHandshake, Eye, Camera, X, RefreshCw, AlertCircle,
  Database, LogIn, LogOut, CheckCircle2, ShieldCheck, Cloud
} from 'lucide-react';
import { auth, signInWithGoogle, logoutUser, getProfileFromFirestore, saveProfileToFirestore, registerWithEmail, loginWithEmail } from '../firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

interface OnboardingProps {
  onComplete: (profile: UserProfile) => void;
  initialProfile?: UserProfile | null;
}

function compressImage(file: File, maxWidth = 640, maxHeight = 640, quality = 0.65): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => {
        resolve(event.target?.result as string);
      };
    };
    reader.onerror = () => {
      resolve('');
    };
  });
}

const steps = [
  { id: 'auth', title: 'Account Registration & Login', icon: LogIn, description: 'Check if you are registered or sign up with Google / Firebase' },
  { id: 'basics', title: 'Bio Details & 4 Photos', icon: User, description: 'Personal metrics and mandatory 4-view physique portfolio' },
  { id: 'prediction', title: 'Aesthetic Frame Prediction', icon: Camera, description: 'AI evaluates body frame baseline & posture structure' },
  { id: 'goals', title: 'Aesthetic Goals & Diet', icon: Target, description: 'Target look, dietary preferences & fitness experience' },
];

export default function Onboarding({ onComplete, initialProfile }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Partial<UserProfile>>(initialProfile || {
    name: '',
    age: 25,
    gender: 'male',
    height: 175,
    weight: 75,
    targetWeight: 75,
    bodyFat: undefined,
    activityLevel: 'moderate',
    goals: ['fat_loss_muscle_gain'],
    goal: 'fat_loss_muscle_gain',
    dietPreference: 'none',
    allergies: '',
    workoutLocation: 'both',
    dietType: 'non_veg',
    typicalFoods: '',
    experienceLevel: 'intermediate',
    equipmentAvailable: 'Full Gym',
    injuriesOrConditions: '',
    focusAesthetic: ['muscular_buff_frame'],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Firebase Database & Auth state for Profile Building
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [cloudSyncMsg, setCloudSyncMsg] = useState<string | null>(null);
  const [cloudLoading, setCloudLoading] = useState(false);

  // Email / Password Form state for zero page-reload authentication
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authMode, setAuthMode] = useState<'register' | 'login'>('register');
  const [authError, setAuthError] = useState<string | null>(null);

  const handleEmailAuth = async (e: React.FormEvent | React.MouseEvent, mode: 'register' | 'login') => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setAuthError(null);
    setCloudSyncMsg(null);

    const email = emailInput.trim();
    const password = passwordInput.trim();

    if (!email || !password) {
      setAuthError('Please enter both Email and Password.');
      return;
    }
    if (password.length < 6) {
      setAuthError('Password must be at least 6 characters.');
      return;
    }

    setCloudLoading(true);
    try {
      if (mode === 'register') {
        // REGISTER MODE
        let u: FirebaseUser | null = null;
        try {
          u = await registerWithEmail(email, password);
        } catch (regErr: any) {
          console.error("Register attempt failed:", regErr);
          const msg = regErr?.message || regErr?.code || '';
          
          if (msg.includes('email-already-in-use') || regErr?.code === 'auth/email-already-in-use') {
            // Auto-login if account already exists with these credentials
            try {
              u = await loginWithEmail(email, password);
            } catch (autoLoginErr: any) {
              if (autoLoginErr?.code === 'auth/too-many-requests' || autoLoginErr?.message?.includes('too-many-requests')) {
                setAuthError('Too many authentication attempts. Please wait a minute before trying again.');
              } else {
                setAuthError('This email is already registered. Please switch to Log In or verify your password.');
              }
              return;
            }
          } else if (msg.includes('admin-restricted-operation') || regErr?.code === 'auth/admin-restricted-operation') {
            // Admin restricted operation fallback session
            const cleanId = btoa(email.toLowerCase().trim()).replace(/[^a-zA-Z0-9]/g, '').slice(0, 28);
            u = {
              uid: `user_${cleanId}`,
              email,
              isAnonymous: true
            } as any;
          } else if (msg.includes('too-many-requests') || regErr?.code === 'auth/too-many-requests') {
            setAuthError('Too many attempts in a short time. Please wait a minute and try again.');
            return;
          } else if (msg.includes('invalid-email') || regErr?.code === 'auth/invalid-email') {
            setAuthError('Please enter a valid email address (e.g. name@example.com).');
            return;
          } else if (msg.includes('weak-password') || regErr?.code === 'auth/weak-password') {
            setAuthError('Password must be at least 6 characters.');
            return;
          } else {
            setAuthError(msg.replace('Firebase: ', '') || 'Registration error. Please try again.');
            return;
          }
        }

        if (u) {
          setUser(u);
          setFormData(prev => ({ ...prev, email }));
          const remote = await getProfileFromFirestore(u.uid);
          if (remote && (remote.name || remote.photoFront || remote.physiquePhoto || remote.weight)) {
            setFormData(remote);
            onComplete(remote as UserProfile);
          } else if (formData.name && (formData.weight || formData.photoFront || formData.physiquePhoto)) {
            const fullProfile = { ...formData, email } as UserProfile;
            await saveProfileToFirestore(u.uid, fullProfile);
            onComplete(fullProfile);
          } else {
            // Proceed directly to profile building step 1
            setCurrentStep(1);
          }
        }
      } else {
        // LOG IN MODE
        let u: FirebaseUser | null = null;
        try {
          u = await loginWithEmail(email, password);
        } catch (loginErr: any) {
          console.error("Login attempt failed:", loginErr);
          if (loginErr?.code === 'auth/too-many-requests' || loginErr?.message?.includes('too-many-requests')) {
            setAuthError('Too many failed attempts. Access is temporarily locked for security. Please wait 1-2 minutes and try again.');
          } else {
            setAuthError('invalid credentials, please try again');
          }
          return;
        }

        if (u) {
          setUser(u);
          const remote = await getProfileFromFirestore(u.uid);
          if (remote && (remote.name || remote.photoFront || remote.physiquePhoto || remote.weight)) {
            // Credentials match & saved profile exists -> directly to daily plan!
            setFormData(remote);
            onComplete(remote as UserProfile);
          } else if (formData.name && (formData.weight || formData.photoFront || formData.physiquePhoto)) {
            const fullProfile = { ...formData, email } as UserProfile;
            await saveProfileToFirestore(u.uid, fullProfile);
            onComplete(fullProfile);
          } else {
            // Credentials match but profile not built yet -> go to profile building
            setFormData(prev => ({ ...prev, email }));
            setCurrentStep(1);
          }
        } else {
          setAuthError('invalid credentials, please try again');
        }
      }
    } catch (err: any) {
      console.error("Auth Exception:", err);
      if (mode === 'login') {
        setAuthError('invalid credentials, please try again');
      } else {
        setAuthError(err?.message ? err.message.replace('Firebase: ', '') : 'Registration error. Please try again.');
      }
    } finally {
      setCloudLoading(false);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setCloudLoading(true);
        try {
          const remote = await getProfileFromFirestore(currentUser.uid);
          if (remote && (remote.name || remote.photoFront || remote.physiquePhoto || remote.weight)) {
            setFormData(remote);
            setCloudSyncMsg(`Found saved profile & photos! Auto-loaded for ${currentUser.displayName || currentUser.email}.`);
            onComplete(remote as UserProfile);
          }
        } catch (err) {
          console.error("Firestore onboarding sync error:", err);
        } finally {
          setCloudLoading(false);
        }
      }
    });
    return () => unsub();
  }, []);

  const handleGoogleLogin = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setCloudLoading(true);
    setCloudSyncMsg(null);
    try {
      const u = await signInWithGoogle();
      if (u) {
        setUser(u);
        const remote = await getProfileFromFirestore(u.uid);
        if (remote && (remote.name || remote.photoFront || remote.physiquePhoto || remote.weight)) {
          setFormData(remote);
          onComplete(remote as UserProfile);
        } else if (formData.name && (formData.weight || formData.photoFront || formData.physiquePhoto)) {
          const fullProfile = { ...formData, email: u.email || formData.email } as UserProfile;
          await saveProfileToFirestore(u.uid, fullProfile);
          onComplete(fullProfile);
        } else {
          setCloudSyncMsg(`Signed in as ${u.email}. Please complete your profile details.`);
          setCurrentStep(1);
        }
      }
    } catch (err: any) {
      setCloudSyncMsg(`Login failed: ${err.message || 'Please try again'}`);
    } finally {
      setCloudLoading(false);
    }
  };

  const handleManualSaveToCloud = async () => {
    if (!user) return;
    setCloudLoading(true);
    try {
      await saveProfileToFirestore(user.uid, formData as UserProfile);
      setCloudSyncMsg(`Saved current profile details & photos to Firebase database for ${user.email}.`);
    } catch (err: any) {
      setCloudSyncMsg(`Save failed: ${err.message || 'Error writing to database'}`);
    } finally {
      setCloudLoading(false);
    }
  };

  const handleManualLoadFromCloud = async () => {
    if (!user) return;
    setCloudLoading(true);
    try {
      const remote = await getProfileFromFirestore(user.uid);
      if (remote) {
        setFormData(remote);
        setCloudSyncMsg(`Re-fetched profile & photos from Firebase database.`);
      } else {
        setCloudSyncMsg(`No profile document found in Firebase database for this account yet.`);
      }
    } catch (err: any) {
      setCloudSyncMsg(`Load failed: ${err.message || 'Error loading from database'}`);
    } finally {
      setCloudLoading(false);
    }
  };

  const validateStep = () => {
    const newErrors: Record<string, string> = {};
    
    // Step 0: Welcome - no validation
    
    // Step 1: Basics & Photo
    if (currentStep === 1) {
      if (!formData.name?.trim()) newErrors.name = 'Please enter your name';
      if (!formData.age || formData.age < 10 || formData.age > 100) newErrors.age = 'Please enter a valid age (10-100)';
      if (!formData.photoFront || !formData.photoLeft || !formData.photoRight || !formData.photoBack) {
        newErrors.photos = 'Please provide all 4 photos (Front, Left Profile, Right Profile, and Back Photo) to allow high-accuracy aesthetic analysis and body structure calibration.';
      }
    }
    
    // Step 2: Prediction
    if (currentStep === 2) {
      if (!formData.physiqueAnalysis) {
        newErrors.physiqueAnalysis = 'Please run the "Predict Aesthetic Frame" tool to analyze your photo first';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    if (validateStep()) {
      if (currentStep < steps.length - 1) {
        setCurrentStep(prev => prev + 1);
      } else {
        const activeUser = user || auth.currentUser;
        if (activeUser) {
          try {
            await saveProfileToFirestore(activeUser.uid, formData as UserProfile);
            console.log("Auto-saved final profile & photos to Firebase Database.");
          } catch (err) {
            console.error("Firestore completion save error:", err);
          }
        }
        onComplete(formData as UserProfile);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const updateField = (field: keyof UserProfile, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  };

  const handleFileSelected = (key: 'photoFront' | 'photoLeft' | 'photoRight' | 'photoBack', base64: string) => {
    setFormData(prev => ({ ...prev, [key]: base64 }));
    // Also set the legacy physiquePhoto to photoFront just in case it is accessed anywhere as fallback
    if (key === 'photoFront') {
      setFormData(prev => ({ ...prev, physiquePhoto: base64, [key]: base64 }));
    }
    setFormData(prev => ({ ...prev, physiqueAnalysis: undefined })); // Reset analysis on new file
    if (errors.photos) {
      setErrors(prev => {
        const copy = { ...prev };
        delete copy.photos;
        return copy;
      });
    }
  };

  const progressPercent = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="max-w-2xl mx-auto my-8 bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 overflow-hidden">
      {/* Header section with progress indicator */}
      <div className="bg-slate-950 text-white px-8 py-6 relative">
        <div className="absolute top-0 left-0 h-1.5 bg-sky-500 transition-all duration-300" style={{ width: `${progressPercent}%` }} />
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-900 rounded-lg text-sky-400">
            {React.createElement(steps[currentStep].icon, { className: 'w-6 h-6' })}
          </div>
          <div>
            <span className="text-xs text-sky-400 font-bold tracking-[0.15em] uppercase font-display">Step {currentStep + 1} of {steps.length}</span>
            <h1 className="text-xl font-black tracking-tight uppercase">{steps[currentStep].title}</h1>
          </div>
        </div>
        <p className="text-slate-400 text-sm mt-1">{steps[currentStep].description}</p>
      </div>

      {/* Progress Dots */}
      <div className="flex justify-center gap-2 py-4 bg-slate-900/50 border-b border-slate-800">
        {steps.map((step, idx) => (
          <button
            key={step.id}
            onClick={() => {
              if (idx < currentStep || validateStep()) {
                setCurrentStep(idx);
              }
            }}
            disabled={idx > currentStep}
            className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
              idx === currentStep
                ? 'bg-sky-500 scale-125'
                : idx < currentStep
                ? 'bg-slate-600 cursor-pointer'
                : 'bg-slate-800 cursor-not-allowed'
            }`}
            title={step.title}
          />
        ))}
      </div>

      {/* Firebase Cloud Database Auth & Sync Card for Profile Building */}
      <div className="bg-slate-950 border-b border-slate-800 p-4 px-8 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20 shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black uppercase tracking-wider text-white font-display">Firebase Database Cloud Sync</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  user ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                }`}>
                  {user ? 'Connected Account' : 'Guest / Login Recommended'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {user 
                  ? `Signed in as ${user.displayName || user.email}`
                  : 'Log in to auto-restore existing photos & details or backup new profile data to Firebase.'}
              </p>
            </div>
          </div>

          <div className="shrink-0">
            {user ? (
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleManualLoadFromCloud}
                  disabled={cloudLoading}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-850 text-sky-400 border border-sky-500/30 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${cloudLoading ? 'animate-spin' : ''}`} />
                  <span>Fetch Database Profile</span>
                </button>
                <button
                  type="button"
                  onClick={handleManualSaveToCloud}
                  disabled={cloudLoading}
                  className="px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-lg text-xs font-bold transition"
                >
                  Save Draft
                </button>
                <button
                  type="button"
                  onClick={() => logoutUser()}
                  className="px-2 py-1.5 text-slate-400 hover:text-red-400 text-xs font-bold transition flex items-center gap-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={cloudLoading}
                className="px-4 py-2 bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-400 hover:to-teal-400 text-slate-950 font-bold rounded-xl text-xs shadow-md transition flex items-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>{cloudLoading ? 'Authenticating...' : 'Log In / Sign Up with Google'}</span>
              </button>
            )}
          </div>
        </div>

        {cloudSyncMsg && (
          <div className="bg-sky-500/10 border border-sky-500/20 text-sky-300 rounded-xl p-2.5 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />
              <span>{cloudSyncMsg}</span>
            </div>
            <button 
              type="button" 
              onClick={() => setCloudSyncMsg(null)}
              className="text-slate-400 hover:text-white text-xs font-bold px-1"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Step Contents */}
      <div className="p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -15 }}
            transition={{ duration: 0.2 }}
            className="min-h-[300px] flex flex-col justify-between"
          >
            {/* STEP 0: REGISTRATION & LOGIN CHECK */}
            {currentStep === 0 && (
              <div className="space-y-6 text-slate-300">
                <div className="flex flex-col items-center text-center space-y-2 pb-2">
                  <div className="p-3 bg-sky-500/10 text-sky-400 rounded-2xl border border-sky-500/20 mb-1">
                    <Database className="w-8 h-8" />
                  </div>
                  <h2 className="text-xl font-black text-white uppercase tracking-tight font-display">Account Registration & Login Check</h2>
                  <p className="text-sm text-slate-400 max-w-lg">
                    Have you already registered an account or saved your physique photos with Coach Kai? Register or log in below without reloading the page:
                  </p>
                </div>

                {/* Primary Auth Form Box */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl max-w-xl mx-auto">
                  {/* Mode Tabs */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); setAuthMode('register'); setAuthError(null); }}
                      className={`py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        authMode === 'register'
                          ? 'bg-teal-500 text-slate-950 shadow-md font-extrabold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>1. Register New Account</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); setAuthMode('login'); setAuthError(null); }}
                      className={`py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        authMode === 'login'
                          ? 'bg-sky-500 text-slate-950 shadow-md font-extrabold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>2. Already Registered (Log In)</span>
                    </button>
                  </div>

                  {/* Form Inputs (No page reload) */}
                  <form onSubmit={(e) => handleEmailAuth(e, authMode)} className="space-y-4">
                    {authError && (
                      <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 font-bold flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                        <span>{authError}</span>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                        {authMode === 'register' ? 'Register Gmail / Email Address' : 'Registered Email Address'}
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="e.g. athlete@gmail.com"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                        Password (Min 6 Characters)
                      </label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        placeholder="••••••••"
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500 transition"
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                      <button
                        type="submit"
                        disabled={cloudLoading}
                        className={`w-full py-3 font-extrabold rounded-xl text-xs transition shadow-lg flex items-center justify-center gap-2 cursor-pointer ${
                          authMode === 'register'
                            ? 'bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950'
                            : 'bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-400 hover:to-blue-400 text-slate-950'
                        }`}
                      >
                        {cloudLoading ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Authenticating (Zero Reload)...</span>
                          </>
                        ) : authMode === 'register' ? (
                          <>
                            <Sparkles className="w-4 h-4" />
                            <span>Register & Start Profile Building</span>
                          </>
                        ) : (
                          <>
                            <LogIn className="w-4 h-4" />
                            <span>Log In & Go to Daily Plan</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Status & Next Steps Card */}
                {user && (
                  <div className="bg-slate-950 border border-emerald-500/30 rounded-2xl p-4 space-y-3 shadow-lg max-w-xl mx-auto">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Connected as {user.displayName || user.email}</span>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => logoutUser()} 
                        className="text-xs text-slate-400 hover:text-red-400 font-semibold"
                      >
                        Sign Out
                      </button>
                    </div>

                    {formData.name && (formData.photoFront || formData.physiquePhoto) ? (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold text-emerald-300">
                            Restored existing profile for {formData.name}! ({formData.age} yrs, {formData.height} cm, {formData.weight} kg)
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Physique photos found in Firebase Database.
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => onComplete(formData as UserProfile)}
                            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs transition shadow-md"
                          >
                            Enter App Directly
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <p className="text-xs text-sky-300">
                          Account registered! Proceeding to personal bio metrics & 4 physique photos...
                        </p>
                        <button
                          type="button"
                          onClick={() => setCurrentStep(1)}
                          className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl text-xs transition shrink-0 font-display shadow-md"
                        >
                          Next: Bio Details & 4 Photos →
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* STEP 1: BASICS & PHOTO */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-300 mb-2 uppercase tracking-wide">What should I call you?</label>
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={e => updateField('name', e.target.value)}
                      placeholder="Enter your name"
                      className={`w-full px-4 py-3 rounded-xl border bg-slate-950 text-white ${
                        errors.name ? 'border-red-500 focus:ring-red-500/20' : 'border-slate-800 focus:ring-sky-500/20'
                      } focus:outline-none focus:ring-3 font-semibold transition`}
                    />
                    {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-300 mb-2 uppercase tracking-wide">Age</label>
                    <input
                      type="number"
                      value={formData.age || ''}
                      onChange={e => updateField('age', parseInt(e.target.value) || 0)}
                      placeholder="e.g. 25"
                      className={`w-full px-4 py-3 rounded-xl border bg-slate-950 text-white ${
                        errors.age ? 'border-red-500 focus:ring-red-500/20' : 'border-slate-800 focus:ring-sky-500/20'
                      } focus:outline-none focus:ring-3 font-semibold transition`}
                    />
                    {errors.age && <p className="text-red-400 text-xs mt-1">{errors.age}</p>}
                  </div>
                </div>                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <label className="block text-sm font-bold text-slate-300 uppercase tracking-wide">
                        Upload Physique Portfolio (All 4 Views Mandatory)
                      </label>
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2.5 py-1 rounded-full">
                        <Database className="w-3.5 h-3.5" />
                        <span>{user ? `Cloud Database: Synced (${user.email})` : 'Cloud Database Ready'}</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      For Coach Kai to construct a comprehensive aesthetic posture profile and accurately predict your frame structure, please upload or capture views of your body. <strong>All Front, Left, Right, and Back views are now strictly mandatory</strong> to enable high-fidelity 360-degree calibration.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { key: 'photoFront' as const, label: 'Front Photo', required: true, desc: 'Face forward, hands by sides' },
                      { key: 'photoLeft' as const, label: 'Left Profile', required: true, desc: 'Left side profile' },
                      { key: 'photoRight' as const, label: 'Right Profile', required: true, desc: 'Right side profile' },
                      { key: 'photoBack' as const, label: 'Back Photo', required: true, desc: 'Posterior chain & spine' }
                    ].map((item) => {
                      const photoUrl = formData[item.key];
                      return (
                        <div 
                          key={item.key}
                          className={`border rounded-2xl bg-slate-950 p-3.5 flex flex-col justify-between min-h-[185px] relative transition hover:border-slate-700 ${
                            item.required ? 'border-sky-500/40 shadow-[0_0_15px_rgba(14,165,233,0.05)]' : 'border-slate-800'
                          }`}
                        >
                          {/* Badge */}
                          <div className="absolute top-2 left-2 z-10">
                            <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              item.required 
                                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' 
                                : 'bg-slate-900 text-slate-500 border border-slate-800'
                            }`}>
                              {item.required ? 'Mandatory' : 'Optional'}
                            </span>
                          </div>

                          {photoUrl ? (
                            <div className="relative w-full h-[110px] bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center border border-slate-800 mt-4">
                              <img 
                                src={photoUrl} 
                                alt={item.label} 
                                className="h-full w-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  updateField(item.key, undefined);
                                  // Clear corresponding physique photo if it was photoFront
                                  if (item.key === 'photoFront') {
                                    updateField('physiquePhoto', undefined);
                                  }
                                }}
                                className="absolute top-1.5 right-1.5 bg-red-500/85 hover:bg-red-600 text-white p-1 rounded-full shadow-lg transition cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <label
                              htmlFor={`camera-input-${item.key}`}
                              className="flex-1 flex flex-col items-center justify-center text-center space-y-1.5 py-4 mt-2 cursor-pointer hover:bg-slate-900/60 rounded-xl transition group border border-dashed border-slate-800 hover:border-sky-500/30"
                              title="Tap to take picture directly with camera"
                            >
                              <div className="p-2 bg-slate-900 group-hover:bg-sky-500/10 rounded-full text-sky-400 group-hover:text-sky-300 transition-colors">
                                <Camera className="w-4 h-4" />
                              </div>
                              <span className="text-xs font-black text-slate-300 group-hover:text-white uppercase tracking-tight transition-colors">{item.label}</span>
                              <span className="text-[9px] text-slate-500 leading-tight font-medium max-w-[120px]">{item.desc}</span>
                              <span className="text-[8px] bg-sky-500/10 text-sky-400 border border-sky-500/20 font-extrabold uppercase px-1.5 py-0.5 rounded mt-1.5 tracking-wider animate-pulse">
                                Tap to Camera
                              </span>
                            </label>
                          )}

                          {!photoUrl && (
                            <div className="grid grid-cols-2 gap-1.5 mt-2">
                              {/* Camera Input */}
                              <label 
                                htmlFor={`camera-input-${item.key}`}
                                className="bg-slate-900 hover:bg-slate-850 active:scale-95 text-slate-300 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider text-center cursor-pointer flex items-center justify-center gap-1 transition"
                              >
                                📷 Camera
                              </label>
                              <input 
                                type="file"
                                id={`camera-input-${item.key}`}
                                accept="image/*"
                                capture="environment"
                                className="hidden"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    try {
                                      const compressed = await compressImage(file);
                                      handleFileSelected(item.key, compressed);
                                    } catch (err) {
                                      console.error("Image compression error:", err);
                                    }
                                  }
                                }}
                              />

                              {/* Library Input */}
                              <label 
                                htmlFor={`library-input-${item.key}`}
                                className="bg-slate-900 hover:bg-slate-850 active:scale-95 text-slate-300 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider text-center cursor-pointer flex items-center justify-center gap-1 transition"
                              >
                                📁 Library
                              </label>
                              <input 
                                type="file"
                                id={`library-input-${item.key}`}
                                accept="image/*"
                                className="hidden"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    try {
                                      const compressed = await compressImage(file);
                                      handleFileSelected(item.key, compressed);
                                    } catch (err) {
                                      console.error("Image compression error:", err);
                                    }
                                  }
                                }}
                              />
                            </div>
                          )}

                          {photoUrl && (
                            <div className="text-[10px] text-center font-bold text-teal-400 uppercase tracking-wider mt-1.5 flex items-center justify-center gap-1">
                              ✓ Captured
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {errors.photos && (
                    <p className="text-red-400 text-xs font-semibold mt-2.5 flex items-center gap-1.5 bg-red-500/5 p-2 rounded-lg border border-red-500/10 w-fit">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {errors.photos}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* STEP 2: PHYSIQUE PREDICTION */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h3 className="block text-sm font-bold text-slate-300 mb-2 uppercase tracking-wide">
                    Evaluate Your Current Aesthetic Frame
                  </h3>
                  <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                    Coach Kai's AI engine will process your photo below to predict your structural frame type, current silhouette attributes, and postural orientation.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      {/* Compact 4-Photo Portfolio Preview */}
                      <div className="grid grid-cols-2 gap-2 bg-slate-950 p-2.5 rounded-2xl border border-slate-800">
                        {[
                          { key: 'photoFront' as const, label: 'Front Angle' },
                          { key: 'photoLeft' as const, label: 'Left Side' },
                          { key: 'photoRight' as const, label: 'Right Side' },
                          { key: 'photoBack' as const, label: 'Back Angle' }
                        ].map((item) => (
                          <div key={item.key} className="bg-slate-900/60 rounded-xl p-1.5 border border-slate-850 flex flex-col items-center">
                            <span className="text-[9px] uppercase font-black text-slate-500 mb-1 block tracking-wider">{item.label}</span>
                            <div className="w-full h-[64px] overflow-hidden rounded-lg flex items-center justify-center bg-slate-950 border border-slate-900">
                              {formData[item.key] ? (
                                <img 
                                  src={formData[item.key]} 
                                  alt={item.label} 
                                  className="h-full w-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <span className="text-[9px] text-slate-700 font-bold uppercase">Missing</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {(!formData.physiqueAnalysis) && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (loadingAnalysis) return;
                            setLoadingAnalysis(true);
                            setAnalysisError(null);
                            try {
                              const res = await fetch("/api/analyze-physique", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ 
                                  photoFront: formData.photoFront,
                                  photoLeft: formData.photoLeft,
                                  photoRight: formData.photoRight,
                                  photoBack: formData.photoBack,
                                  name: formData.name,
                                  age: formData.age,
                                  gender: formData.gender,
                                  activityLevel: formData.activityLevel,
                                  goals: formData.goals,
                                  injuriesOrConditions: formData.injuriesOrConditions
                                })
                              });
                              if (!res.ok) throw new Error("Failed to analyze image portfolio");
                              const data = await res.json();
                              if (data.valid_full_body !== undefined) updateField('valid_full_body', data.valid_full_body);
                              if (data.rejection_reason) updateField('rejection_reason', data.rejection_reason);
                              if (data.postureAssessment) updateField('postureAssessment', data.postureAssessment);
                              if (data.analysis) updateField('physiqueAnalysis', data.analysis);
                              if (data.frameType) updateField('frameType', data.frameType);
                              if (data.frontAngleReport) updateField('frontAngleReport', data.frontAngleReport);
                              if (data.sideAngleReport) updateField('sideAngleReport', data.sideAngleReport);
                              if (data.backAngleReport) updateField('backAngleReport', data.backAngleReport);
                              if (data.predictedWeight) {
                                updateField('weight', data.predictedWeight);
                              }
                              if (data.predictedHeight) {
                                updateField('height', data.predictedHeight);
                              }
                              if (data.estimatedBodyFatPercent) updateField('estimatedBodyFatPercent', data.estimatedBodyFatPercent);
                              if (data.bmr) updateField('bmr', data.bmr);
                              if (data.tdee) updateField('tdee', data.tdee);
                              if (data.recommendedMacros) updateField('recommendedMacros', data.recommendedMacros);
                              if (data.biomechanicalAlerts) updateField('biomechanicalAlerts', data.biomechanicalAlerts);
                              if (data.aestheticPotential) updateField('aestheticPotential', data.aestheticPotential);
                              if (data.coachDirectives) updateField('coachDirectives', data.coachDirectives);
                            } catch (err: any) {
                              setAnalysisError(err.message || "An error occurred during analysis.");
                            } finally {
                              setLoadingAnalysis(false);
                            }
                          }}
                          disabled={loadingAnalysis}
                          className="w-full bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-600 hover:to-teal-600 text-slate-950 py-3 rounded-xl font-bold uppercase tracking-wide text-xs transition shadow-lg shadow-sky-500/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          {loadingAnalysis ? (
                            <>
                              <RefreshCw className="w-4.5 h-4.5 animate-spin" />
                              Constructing Posture Profile...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4.5 h-4.5" />
                              Calibrate Posture & Frame
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    <div className="bg-slate-950 rounded-2xl border border-slate-850 p-5 flex flex-col justify-between min-h-[180px]">
                      <div>
                        <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-sky-400 mb-2 font-display">
                          <Sparkles className="w-3.5 h-3.5" />
                          Predicted Aesthetic Frame Report
                        </div>
                        
                        {loadingAnalysis ? (
                          <div className="space-y-3 pt-3">
                            <div className="h-4 bg-slate-900 rounded animate-pulse w-3/4"></div>
                            <div className="h-4 bg-slate-900 rounded animate-pulse w-5/6"></div>
                            <div className="h-4 bg-slate-900 rounded animate-pulse w-2/3"></div>
                          </div>
                        ) : formData.physiqueAnalysis ? (
                          <div className="space-y-3.5">
                            {formData.frameType && (
                              <div className="inline-flex items-center gap-1.5 bg-sky-500/10 border border-sky-500/30 text-sky-400 px-3 py-1 rounded-xl text-xs font-bold font-display">
                                <Activity className="w-3.5 h-3.5 text-sky-400" />
                                Archetype: {formData.frameType}
                              </div>
                            )}

                            <div className="grid grid-cols-2 gap-3 bg-slate-900/30 p-2.5 rounded-xl border border-slate-850/50">
                              <div className="text-center">
                                <label className="text-[10px] uppercase font-extrabold text-slate-400 block mb-1">Verify Weight (kg)</label>
                                <input
                                  type="number"
                                  min="10"
                                  max="300"
                                  value={formData.weight || ''}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    updateField('weight', val);
                                    updateField('targetWeight', val); // Sync target weight initially
                                  }}
                                  className="w-full bg-slate-950 text-sky-400 font-black text-center text-sm py-1.5 rounded-lg border border-slate-800 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20 transition"
                                />
                              </div>
                              <div className="text-center">
                                <label className="text-[10px] uppercase font-extrabold text-slate-400 block mb-1">Verify Height (cm)</label>
                                <input
                                  type="number"
                                  min="50"
                                  max="250"
                                  value={formData.height || ''}
                                  onChange={(e) => updateField('height', parseInt(e.target.value) || 0)}
                                  className="w-full bg-slate-950 text-sky-400 font-black text-center text-sm py-1.5 rounded-lg border border-slate-800 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20 transition"
                                />
                              </div>
                            </div>
                            <p className="text-[9px] text-slate-400 text-center italic">
                              💡 Adjust predicted weight/height above if needed to perfectly calibrate your customized plan.
                            </p>

                            {/* Full-Body Validation Notice */}
                            {formData.valid_full_body === false && (
                              <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-rose-300 text-xs space-y-1">
                                <div className="font-bold flex items-center gap-1.5 text-rose-400">
                                  <AlertCircle className="w-4 h-4 shrink-0" />
                                  Full-Body Image Required
                                </div>
                                <p className="text-[11px] leading-relaxed text-slate-300">
                                  {formData.rejection_reason || "The subject is not fully visible from head to toe (ears/head top to feet/soles). Please upload a complete full-body photo for accurate posture analysis."}
                                </p>
                              </div>
                            )}

                            {/* Detailed Posture Assessment Box */}
                            {formData.postureAssessment && formData.valid_full_body !== false && (
                              <div className="bg-slate-900/80 rounded-xl p-3.5 border border-sky-500/20 space-y-2.5">
                                <div className="text-[10px] uppercase font-bold tracking-widest text-sky-400 flex items-center gap-1.5">
                                  <Activity className="w-3.5 h-3.5" />
                                  Biomechanical Posture Assessment
                                </div>

                                {formData.postureAssessment.identifiedDeviations && formData.postureAssessment.identifiedDeviations.length > 0 && (
                                  <div>
                                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Identified Deviations</span>
                                    <div className="flex flex-wrap gap-1.5">
                                      {formData.postureAssessment.identifiedDeviations.map((dev: string, idx: number) => (
                                        <span key={idx} className="bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                                          {dev}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {formData.postureAssessment.exerciseModifications && formData.postureAssessment.exerciseModifications.length > 0 && (
                                  <div>
                                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Exercise Modifications</span>
                                    <ul className="space-y-1 text-[11px] text-slate-300">
                                      {formData.postureAssessment.exerciseModifications.map((mod: string, idx: number) => (
                                        <li key={idx} className="flex items-start gap-1.5">
                                          <span className="text-teal-400 shrink-0 mt-0.5">•</span>
                                          <span>{mod}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-line bg-slate-900/50 p-3.5 rounded-xl border border-slate-900/40 shadow-inner">
                              <span className="font-bold text-sky-400 block mb-1 uppercase tracking-wider text-[10px]">Executive 360° Summary</span>
                              {formData.physiqueAnalysis}
                            </div>

                            {/* 360° View Breakdown Cards */}
                            {(formData.frontAngleReport || formData.sideAngleReport || formData.backAngleReport) && (
                              <div className="space-y-2 pt-1">
                                <div className="text-[10px] uppercase font-bold tracking-widest text-slate-400">4-Photo Multi-Angle Analysis</div>
                                
                                {formData.frontAngleReport && (
                                  <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 text-xs">
                                    <div className="font-bold text-emerald-400 text-[11px] mb-0.5 flex items-center gap-1.5">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Front View Analysis
                                    </div>
                                    <p className="text-slate-300 text-[11px] leading-relaxed">{formData.frontAngleReport}</p>
                                  </div>
                                )}

                                {formData.sideAngleReport && (
                                  <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 text-xs">
                                    <div className="font-bold text-sky-400 text-[11px] mb-0.5 flex items-center gap-1.5">
                                      <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span> Profiles & Posture Analysis
                                    </div>
                                    <p className="text-slate-300 text-[11px] leading-relaxed">{formData.sideAngleReport}</p>
                                  </div>
                                )}

                                {formData.backAngleReport && (
                                  <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 text-xs">
                                    <div className="font-bold text-amber-400 text-[11px] mb-0.5 flex items-center gap-1.5">
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span> Back View & Lat Alignment
                                    </div>
                                    <p className="text-slate-300 text-[11px] leading-relaxed">{formData.backAngleReport}</p>
                                  </div>
                                )}
                              </div>
                            )}

                            {(formData.bmr || formData.tdee || formData.recommendedMacros) && (
                              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                                <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800/80">
                                  <div className="text-[9px] uppercase font-bold text-slate-400">BMR</div>
                                  <div className="text-xs font-black text-teal-400">{formData.bmr || 1700} <span className="text-[9px] font-normal text-slate-400">kcal</span></div>
                                </div>
                                <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800/80">
                                  <div className="text-[9px] uppercase font-bold text-slate-400">TDEE</div>
                                  <div className="text-xs font-black text-sky-400">{formData.tdee || 2300} <span className="text-[9px] font-normal text-slate-400">kcal</span></div>
                                </div>
                                <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800/80">
                                  <div className="text-[9px] uppercase font-bold text-slate-400">Est. Fat</div>
                                  <div className="text-xs font-black text-amber-400">~{formData.estimatedBodyFatPercent || 18}%</div>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-6 text-slate-600 space-y-2">
                            <p className="text-xs font-semibold">Prediction report ready.</p>
                            <p className="text-[10px] leading-relaxed">
                              Click the analyze button to process your photo and construct your customized biomechanic model.
                            </p>
                          </div>
                        )}

                        {analysisError && (
                          <div className="mt-2.5 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{analysisError}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {errors.physiqueAnalysis && (
                    <p className="text-red-400 text-xs font-semibold mt-3 flex items-center gap-1.5 bg-red-500/5 p-2 rounded-lg border border-red-500/10 w-fit">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {errors.physiqueAnalysis}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* STEP 3: GOALS & AESTHETIC STRATEGY */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2 uppercase tracking-wide">Fitness Targets (Select One or More)</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'fat_loss_muscle_gain', label: 'Fat loss and muscle gain', desc: 'Simultaneous body recomposition' },
                      { id: 'stamina_metabolism_endurance', label: 'Stamina, metabolism, endurance', desc: 'Maximize conditioning & energy' },
                    ].map(target => {
                      const currentGoals = Array.isArray(formData.goals)
                        ? formData.goals
                        : formData.goal
                        ? [formData.goal]
                        : ['fat_loss_muscle_gain'];
                      const isSelected = currentGoals.includes(target.id as any);

                      const handleToggle = () => {
                        let updated: any[];
                        if (isSelected) {
                          if (currentGoals.length > 1) {
                            updated = currentGoals.filter(x => x !== target.id);
                          } else {
                            updated = currentGoals;
                          }
                        } else {
                          updated = [...currentGoals, target.id];
                        }
                        updateField('goals', updated);
                        updateField('goal', updated[0]); // Legacy single goal fallback
                      };

                      return (
                        <button
                          key={target.id}
                          type="button"
                          onClick={handleToggle}
                          className={`text-left p-3.5 rounded-xl border transition flex flex-col justify-between ${
                            isSelected
                              ? 'border-sky-500 bg-sky-500/10 text-white'
                              : 'border-slate-800 hover:border-slate-700 hover:bg-slate-800/30 bg-slate-950/40 text-slate-300'
                          }`}
                        >
                          <div className="flex justify-between items-center w-full">
                            <span className="font-bold uppercase tracking-wide text-[10px] block">{target.label}</span>
                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'border-sky-500 bg-sky-500 text-slate-950' : 'border-slate-700'}`}>
                              {isSelected && (
                                <svg className="w-2.5 h-2.5 fill-current text-slate-950" viewBox="0 0 20 20">
                                  <path d="M0 11l2-2 5 5L18 3l2 2L7 18z"/>
                                </svg>
                              )}
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-500 font-semibold leading-tight mt-1">{target.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2 uppercase tracking-wide">Workout Environment</label>
                  <p className="text-xs text-slate-400 mb-2">Select your workout environment so Coach Kai can calibrate exercises using appropriate equipment.</p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'gym', label: 'Gym', desc: 'Commercial equipment' },
                      { id: 'home', label: 'Home Workout', desc: 'No equipment or basics' },
                      { id: 'both', label: 'Hybrid Both', desc: 'Home & gym hybrid' }
                    ].map(loc => {
                      const isSelected = formData.workoutLocation === loc.id;
                      return (
                        <button
                          key={loc.id}
                          type="button"
                          onClick={() => updateField('workoutLocation', loc.id)}
                          className={`text-left p-3 rounded-xl border transition flex flex-col justify-between ${
                            isSelected
                              ? 'border-sky-500 bg-sky-500/10 text-white'
                              : 'border-slate-800 hover:border-slate-700 hover:bg-slate-800/30 bg-slate-950/40 text-slate-300'
                          }`}
                        >
                          <div className="flex justify-between items-center w-full">
                            <span className="font-bold uppercase tracking-wide text-[10px] block">{loc.label}</span>
                            <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${isSelected ? 'border-sky-500 bg-sky-500' : 'border-slate-700'}`}>
                              {isSelected && (
                                <div className="w-1.5 h-1.5 bg-slate-950 rounded-full" />
                              )}
                            </div>
                          </div>
                          <span className="text-[9px] text-slate-500 font-semibold leading-tight mt-1">{loc.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2 uppercase tracking-wide">Dietary Orientation</label>
                  <p className="text-xs text-slate-400 mb-2">Select your primary dietary style so Coach Kai can structure your meals correctly.</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                    {[
                      { id: 'non_veg', label: 'Non-Veg', desc: 'Meats, fish, poultry' },
                      { id: 'veg', label: 'Veg', desc: 'No meat, eggs/dairy ok' },
                      { id: 'vegan', label: 'Vegan', desc: '100% plant-based' },
                      { id: 'pescatarian', label: 'Pescatarian', desc: 'Vegetarian + seafood' }
                    ].map(diet => {
                      const isSelected = formData.dietType === diet.id;
                      return (
                        <button
                          key={diet.id}
                          type="button"
                          onClick={() => {
                            updateField('dietType', diet.id);
                            // Also adjust dietPreference automatically for seamless logic
                            if (diet.id === 'vegan') {
                              updateField('dietPreference', 'vegan');
                            } else if (diet.id === 'veg') {
                              updateField('dietPreference', 'vegetarian');
                            } else {
                              updateField('dietPreference', 'none');
                            }
                          }}
                          className={`text-left p-3 rounded-xl border transition flex flex-col justify-between ${
                            isSelected
                              ? 'border-sky-500 bg-sky-500/10 text-white'
                              : 'border-slate-800 hover:border-slate-700 hover:bg-slate-800/30 bg-slate-950/40 text-slate-300'
                          }`}
                        >
                          <div className="flex justify-between items-center w-full">
                            <span className="font-bold uppercase tracking-wide text-[10px] block">{diet.label}</span>
                            <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${isSelected ? 'border-sky-500 bg-sky-500' : 'border-slate-700'}`}>
                              {isSelected && (
                                <div className="w-1.5 h-1.5 bg-slate-950 rounded-full" />
                              )}
                            </div>
                          </div>
                          <span className="text-[9px] text-slate-500 font-semibold leading-tight mt-1">{diet.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2 uppercase tracking-wide">Food Allergies & Restrictions</label>
                  <p className="text-xs text-slate-400 mb-2">List any specific foods you are allergic to or must avoid (e.g., peanuts, dairy, gluten). Leave blank if none.</p>
                  <input
                    type="text"
                    value={formData.allergies || ''}
                    onChange={e => updateField('allergies', e.target.value)}
                    placeholder="e.g. Peanuts, Gluten, Shellfish, or None"
                    className="w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-950 text-white focus:outline-none focus:ring-3 focus:ring-sky-500/20 font-semibold transition text-sm"
                  />
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Action Buttons (Only shown for profile building steps) */}
        {currentStep > 0 && (
          <div className="flex justify-between items-center mt-8 pt-6 border-t border-slate-800">
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold uppercase tracking-wide text-xs transition text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-slate-950 px-6 py-2.5 rounded-xl font-bold uppercase tracking-wide text-xs shadow-md transition cursor-pointer"
            >
              {currentStep === steps.length - 1 ? (
                <>
                  Initialize Coach Kai
                  <Sparkles className="w-4 h-4" />
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
