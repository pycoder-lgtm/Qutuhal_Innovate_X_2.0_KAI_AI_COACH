/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../types';
import { 
  User, Scale, Activity, Target, Utensils, ArrowRight, ArrowLeft, 
  Sparkles, Dumbbell, ShieldAlert, HeartHandshake, Eye, Camera, X, RefreshCw, AlertCircle,
  Database, LogIn, LogOut, CheckCircle2, ShieldCheck, Cloud, Video, Play, Square, Upload, Film, Flame
} from 'lucide-react';
import { auth, signInWithGoogle, logoutUser, getProfileFromFirestore, saveProfileToFirestore, registerWithEmail, loginWithEmail, ensureAuthenticatedUser } from '../firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { simplifyAnalysisText, simplifyDeviationTag, getSomatotypeDefinition } from '../utils/simplifyAnalysis';

interface OnboardingProps {
  onComplete: (profile: UserProfile) => void;
  initialProfile?: UserProfile | null;
}

export async function extractKeyframesFromVideo(
  videoSource: File | Blob | string
): Promise<{ photoFront: string; photoLeft: string; photoBack: string; photoRight: string }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;

    let objectUrl = '';
    if (typeof videoSource === 'string') {
      video.src = videoSource;
    } else {
      objectUrl = URL.createObjectURL(videoSource);
      video.src = objectUrl;
    }

    video.onloadedmetadata = async () => {
      try {
        const duration = video.duration && !isNaN(video.duration) && video.duration > 0 ? video.duration : 4;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        const targetWidth = 720;
        const targetHeight = 1280;
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        // Keyframe timestamps: Front 0°, Left 90°, Back 180°, Right 270°
        const timestamps = [
          Math.min(0.2, duration * 0.05),
          duration * 0.28,
          duration * 0.53,
          duration * 0.78,
        ];

        const keyframeImages: string[] = [];

        for (const ts of timestamps) {
          await new Promise<void>((seekResolve) => {
            const onSeeked = () => {
              video.removeEventListener('seeked', onSeeked);
              if (ctx) {
                ctx.fillStyle = '#020617';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                const vWidth = video.videoWidth || targetWidth;
                const vHeight = video.videoHeight || targetHeight;
                const scale = Math.min(targetWidth / vWidth, targetHeight / vHeight);
                const drawWidth = vWidth * scale;
                const drawHeight = vHeight * scale;
                const offsetX = (targetWidth - drawWidth) / 2;
                const offsetY = (targetHeight - drawHeight) / 2;

                ctx.drawImage(video, offsetX, offsetY, drawWidth, drawHeight);
                keyframeImages.push(canvas.toDataURL('image/jpeg', 0.85));
              } else {
                keyframeImages.push('');
              }
              seekResolve();
            };
            video.addEventListener('seeked', onSeeked);
            video.currentTime = Math.min(ts, duration - 0.1);
          });
        }

        if (objectUrl) URL.revokeObjectURL(objectUrl);

        resolve({
          photoFront: keyframeImages[0] || '',
          photoLeft: keyframeImages[1] || '',
          photoBack: keyframeImages[2] || '',
          photoRight: keyframeImages[3] || '',
        });
      } catch (err) {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        reject(err);
      }
    };

    video.onerror = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load video file for 360° rotation keyframe extraction.'));
    };
  });
}

function compressImage(file: File, maxWidth = 800, maxHeight = 1200, quality = 0.70): Promise<string> {
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
  { id: 'basics', title: 'Bio Details & Physique Portfolio', icon: User, description: 'Personal metrics and mandatory 4-view physique portfolio' },
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

  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>('cm');
  const [feetInput, setFeetInput] = useState<number>(() => {
    const initialCm = initialProfile?.height || 175;
    return Math.floor((Number(initialCm) || 175) / 2.54 / 12);
  });
  const [inchesInput, setInchesInput] = useState<number>(() => {
    const initialCm = initialProfile?.height || 175;
    return Math.round(((Number(initialCm) || 175) / 2.54) % 12);
  });

  useEffect(() => {
    if (initialProfile) {
      setFormData(initialProfile);
    } else {
      setFormData({
        name: '',
        age: 25,
        gender: 'male',
        height: 175,
        weight: 75,
        targetWeight: 75,
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
      setCurrentStep(0);
    }
  }, [initialProfile]);

  // Firebase Database & Auth state for Profile Building
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [cloudSyncMsg, setCloudSyncMsg] = useState<string | null>(null);
  const [cloudLoading, setCloudLoading] = useState(false);

  // Email / Password Form state for zero page-reload authentication
  const [nameInput, setNameInput] = useState('');
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
    const name = nameInput.trim();

    if (mode === 'register') {
      if (!name) {
        setAuthError('Please enter your Name.');
        return;
      }
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
        const u = await registerWithEmail(email, password, name);
        if (u) {
          setUser(u);
          setFormData(prev => ({
            ...prev,
            name: name || u.displayName || prev.name || '',
            email: email
          }));
          // Brand new registered user -> Proceed directly to Onboarding (Step 1: Bio Details & 4 Photos)
          setCurrentStep(1);
        }
      } catch (regErr: any) {
        const msg = regErr?.message ? regErr.message.replace('Firebase: ', '') : 'Registration failed. Please try again.';
        setAuthError(msg);
      } finally {
        setCloudLoading(false);
      }
    } else {
      // LOG IN MODE
      if (!email || !password) {
        setAuthError('Please enter both Email and Password.');
        return;
      }

      setCloudLoading(true);
      try {
        const u = await loginWithEmail(email, password);
        if (u) {
          setUser(u);
          // Check if existing profile document exists in Firestore
          const remote = await getProfileFromFirestore(u.uid);
          if (remote && (remote.name || remote.photoFront || remote.physiquePhoto || remote.weight)) {
            // Credentials valid & saved profile exists -> Route directly to Home Dashboard!
            setFormData(remote);
            onComplete(remote as UserProfile);
          } else {
            // Credentials valid but no profile saved yet -> Route to Onboarding
            setFormData(prev => ({
              ...prev,
              name: u.displayName || prev.name || '',
              email: email
            }));
            setCurrentStep(1);
          }
        }
      } catch (loginErr: any) {
        const msg = loginErr?.message ? loginErr.message.replace('Firebase: ', '') : 'Invalid credentials. Please try again.';
        setAuthError(msg);
      } finally {
        setCloudLoading(false);
      }
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser && initialProfile === undefined) {
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
  }, [initialProfile]);

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

  // Live Camera Video Recording & Video Scan states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingCountdown, setRecordingCountdown] = useState(5);
  const [processingVideo, setProcessingVideo] = useState(false);
  const [showManualPhotos, setShowManualPhotos] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1080 }, height: { ideal: 1920 } },
        audio: false
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraActive(true);
    } catch (err) {
      console.error("Camera access error:", err);
      alert("Could not access camera device. Please use the 'Select Video File' button to choose your 360° rotation video.");
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraActive(false);
    setIsRecording(false);
  };

  const startRecordingVideo = () => {
    if (!mediaStreamRef.current) return;
    videoChunksRef.current = [];

    try {
      const recorder = new MediaRecorder(mediaStreamRef.current, { mimeType: 'video/webm' });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) videoChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        setProcessingVideo(true);
        const blob = new Blob(videoChunksRef.current, { type: 'video/webm' });
        stopCamera();

        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
          const videoDataUrl = reader.result as string;
          updateField('rotationVideo', videoDataUrl);

          try {
            const keyframes = await extractKeyframesFromVideo(blob);
            updateField('photoFront', keyframes.photoFront);
            updateField('photoLeft', keyframes.photoLeft);
            updateField('photoBack', keyframes.photoBack);
            updateField('photoRight', keyframes.photoRight);
            updateField('physiquePhoto', keyframes.photoFront);
            updateField('valid_full_body', undefined);
            updateField('rejection_reason', undefined);
            updateField('physiqueAnalysis', undefined);
          } catch (err) {
            console.error("Failed to extract keyframes from recorded video:", err);
          } finally {
            setProcessingVideo(false);
          }
        };
      };

      recorder.start(200);
      setIsRecording(true);
      setRecordingCountdown(5);

      let timeLeft = 5;
      const timer = setInterval(() => {
        timeLeft -= 1;
        setRecordingCountdown(timeLeft);
        if (timeLeft <= 0) {
          clearInterval(timer);
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
          }
        }
      }, 1000);
    } catch (err) {
      console.error("MediaRecorder start error:", err);
      alert("Recording failed. Please try selecting a video file directly via the File Button.");
    }
  };

  const handleVideoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcessingVideo(true);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const videoDataUrl = reader.result as string;
        updateField('rotationVideo', videoDataUrl);

        try {
          const keyframes = await extractKeyframesFromVideo(file);
          updateField('photoFront', keyframes.photoFront);
          updateField('photoLeft', keyframes.photoLeft);
          updateField('photoBack', keyframes.photoBack);
          updateField('photoRight', keyframes.photoRight);
          updateField('physiquePhoto', keyframes.photoFront);
          updateField('valid_full_body', undefined);
          updateField('rejection_reason', undefined);
          updateField('physiqueAnalysis', undefined);
        } catch (err) {
          console.error("Video keyframe extraction error:", err);
          alert("Could not process video keyframes. Please make sure it is a valid 360° standing rotation video file.");
        } finally {
          setProcessingVideo(false);
        }
      };
    } catch (err) {
      console.error("Video file reading error:", err);
      setProcessingVideo(false);
    }
  };

  const validateStep = () => {
    const newErrors: Record<string, string> = {};
    
    // Step 0: Welcome - no validation
    
    // Step 1: Basics & Photo
    if (currentStep === 1) {
      if (!formData.name?.trim()) newErrors.name = 'Please enter your name';
      if (!formData.age || formData.age < 10 || formData.age > 100) newErrors.age = 'Please enter a valid age (10-100)';
      if (!formData.height || formData.height < 50 || formData.height > 250) newErrors.height = 'Please enter a valid height (50-250 cm)';
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
        try {
          const activeUser = await ensureAuthenticatedUser();
          if (activeUser) {
            await saveProfileToFirestore(activeUser.uid, formData as UserProfile);
            console.log("Auto-saved final profile & photos to Firebase Database.");
          }
        } catch (err) {
          console.error("Firestore completion save error:", err);
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

                    {authMode === 'register' && (
                      <div>
                        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                          Your Full Name
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Shaurya Sharma"
                          value={nameInput}
                          onChange={(e) => {
                            setNameInput(e.target.value);
                            setFormData(prev => ({ ...prev, name: e.target.value }));
                          }}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500 transition"
                        />
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-bold text-slate-300 uppercase tracking-wide">Height</label>
                      <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                        <button
                          type="button"
                          onClick={() => setHeightUnit('cm')}
                          className={`px-2 py-0.5 text-[10px] font-extrabold rounded ${
                            heightUnit === 'cm'
                              ? 'bg-sky-500 text-slate-950 shadow'
                              : 'text-slate-400 hover:text-white'
                          } transition cursor-pointer`}
                        >
                          cm
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setHeightUnit('ft');
                            const totalInches = Math.round((formData.height || 175) / 2.54);
                            setFeetInput(Math.floor(totalInches / 12));
                            setInchesInput(totalInches % 12);
                          }}
                          className={`px-2 py-0.5 text-[10px] font-extrabold rounded ${
                            heightUnit === 'ft'
                              ? 'bg-sky-500 text-slate-950 shadow'
                              : 'text-slate-400 hover:text-white'
                          } transition cursor-pointer`}
                        >
                          ft / in
                        </button>
                      </div>
                    </div>

                    {heightUnit === 'cm' ? (
                      <div className="relative">
                        <input
                          type="number"
                          value={formData.height || ''}
                          onChange={e => {
                            const val = parseInt(e.target.value) || 0;
                            updateField('height', val);
                            const totalIn = Math.round(val / 2.54);
                            setFeetInput(Math.floor(totalIn / 12));
                            setInchesInput(totalIn % 12);
                          }}
                          placeholder="e.g. 175"
                          className={`w-full px-4 py-3 rounded-xl border bg-slate-950 text-white ${
                            errors.height ? 'border-red-500 focus:ring-red-500/20' : 'border-slate-800 focus:ring-sky-500/20'
                          } focus:outline-none focus:ring-3 font-semibold transition`}
                        />
                        <span className="absolute right-4 top-3.5 text-xs text-slate-500 font-bold">cm</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <input
                            type="number"
                            value={feetInput}
                            onChange={e => {
                              const ft = parseInt(e.target.value) || 0;
                              setFeetInput(ft);
                              const calcCm = Math.round((ft * 12 + inchesInput) * 2.54);
                              updateField('height', calcCm);
                            }}
                            placeholder="ft"
                            className={`w-full px-3 py-3 rounded-xl border bg-slate-950 text-white ${
                              errors.height ? 'border-red-500 focus:ring-red-500/20' : 'border-slate-800 focus:ring-sky-500/20'
                            } focus:outline-none focus:ring-3 font-semibold transition text-center`}
                          />
                          <span className="absolute right-2 top-3.5 text-xs text-slate-500 font-bold">ft</span>
                        </div>
                        <div className="relative flex-1">
                          <input
                            type="number"
                            value={inchesInput}
                            onChange={e => {
                              const inc = parseInt(e.target.value) || 0;
                              setInchesInput(inc);
                              const calcCm = Math.round((feetInput * 12 + inc) * 2.54);
                              updateField('height', calcCm);
                            }}
                            placeholder="in"
                            className={`w-full px-3 py-3 rounded-xl border bg-slate-950 text-white ${
                              errors.height ? 'border-red-500 focus:ring-red-500/20' : 'border-slate-800 focus:ring-sky-500/20'
                            } focus:outline-none focus:ring-3 font-semibold transition text-center`}
                          />
                          <span className="absolute right-2 top-3.5 text-xs text-slate-500 font-bold">in</span>
                        </div>
                      </div>
                    )}
                    {formData.height ? (
                      <p className="text-[11px] text-slate-400 mt-1 font-mono">
                        {heightUnit === 'ft'
                          ? `≈ ${formData.height} cm`
                          : `≈ ${Math.floor(Math.round(formData.height / 2.54) / 12)}'${Math.round(formData.height / 2.54) % 12}"`}
                      </p>
                    ) : null}
                    {errors.height && <p className="text-red-400 text-xs mt-1">{errors.height}</p>}
                  </div>
                </div>                {/* 4-Angle Photo Portfolio Upload Step-by-Step */}
                <div className="space-y-4">
                  {/* Friendly Kai Avatar & Conversational Header */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-950/80 to-slate-950 border border-sky-500/30 flex items-start gap-3 shadow-lg">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-teal-400 flex items-center justify-center text-slate-950 font-black text-lg shrink-0 shadow-md">
                      K
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-white">
                        Hi, I'm Kai! Let's get your baseline. Let's start with a quick front photo.
                      </p>
                      <p className="text-xs text-slate-300">
                        Take full-body photos (head-to-toe) so our AI Body Scan can create your personalized body type results.
                      </p>
                    </div>
                  </div>

                  {/* REJECTION WARNING BANNER */}
                  {formData.valid_full_body === false && (
                    <div className="p-3.5 bg-red-950/80 border-2 border-red-500/80 rounded-2xl text-red-200 text-xs font-bold flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xl animate-bounce">
                      <div className="flex items-center gap-2.5">
                        <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                        <div>
                          <p className="text-red-300 font-extrabold uppercase tracking-wide text-xs">Photo is not suitable!</p>
                          <p className="text-red-200/90 text-[11px] mt-0.5 font-medium">
                            {formData.rejection_reason || 'Please give the full body of the person from head to toe. Photos cropping head, hips, or feet cannot be analyzed.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { key: 'photoFront' as const, label: '1. Front Photo', required: true, desc: 'Full standing body, head to feet, facing camera' },
                      { key: 'photoLeft' as const, label: '2. Left Side', required: true, desc: 'Full standing left side profile, head to feet' },
                      { key: 'photoRight' as const, label: '3. Right Side', required: true, desc: 'Full standing right side profile, head to feet' },
                      { key: 'photoBack' as const, label: '4. Back Photo', required: true, desc: 'Full standing back view, head to feet' }
                    ].map((item) => {
                      const photoUrl = formData[item.key];
                      return (
                        <div 
                          key={item.key}
                          className={`border rounded-2xl bg-slate-950 p-3.5 flex flex-col justify-between min-h-[280px] relative transition hover:border-slate-700 ${
                            item.required ? 'border-sky-500/40 shadow-[0_0_15px_rgba(14,165,233,0.05)]' : 'border-slate-800'
                          }`}
                        >
                          {/* Badge */}
                          <div className="flex items-center justify-between mb-2 z-10">
                            <span className="text-xs font-bold text-white uppercase tracking-wide">{item.label}</span>
                            <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              photoUrl
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                            }`}>
                              {photoUrl ? '✓ Captured' : 'Required'}
                            </span>
                          </div>

                          {photoUrl ? (
                            <div className="relative w-full h-[220px] sm:h-[260px] bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center border border-slate-800 mt-4 p-1">
                              <img 
                                src={photoUrl} 
                                alt={item.label} 
                                className="h-full w-full object-contain p-1 bg-slate-950 rounded-lg"
                                referrerPolicy="no-referrer"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  updateField(item.key, undefined);
                                  if (item.key === 'photoFront') {
                                    updateField('physiquePhoto', undefined);
                                  }
                                  updateField('valid_full_body', undefined);
                                  updateField('rejection_reason', undefined);
                                }}
                                className="absolute top-2 right-2 bg-red-500/85 hover:bg-red-600 text-white p-1.5 rounded-full shadow-lg transition cursor-pointer z-20"
                                title="Remove photo"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <label
                              htmlFor={`camera-input-${item.key}`}
                              className="flex-1 flex flex-col items-center justify-center text-center space-y-2 py-6 mt-4 cursor-pointer hover:bg-slate-900/60 rounded-xl transition group border border-dashed border-slate-800 hover:border-sky-500/30"
                              title="Tap to take picture directly with camera"
                            >
                              <div className="p-3 bg-slate-900 group-hover:bg-sky-500/10 rounded-full text-sky-400 group-hover:text-sky-300 transition-colors">
                                <Camera className="w-6 h-6" />
                              </div>
                              <span className="text-xs font-black text-slate-300 group-hover:text-white uppercase tracking-tight transition-colors">{item.label}</span>
                              <span className="text-[10px] text-slate-400 leading-tight font-medium max-w-[150px]">{item.desc}</span>
                              <span className="text-[8px] bg-sky-500/10 text-sky-400 border border-sky-500/20 font-extrabold uppercase px-2 py-1 rounded mt-1.5 tracking-wider animate-pulse">
                                Tap for Full-Body Shot
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
                    Coach Kai's AI engine will process your 4 photos to estimate your body fat percentage, muscle mass index, exact baseline weight, and biomechanical posture alignment.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      {/* Compact 4-Photo Portfolio Preview (Horizontal Carousel on Mobile, Grid on Desktop) */}
                      <div className="flex overflow-x-auto gap-2.5 sm:grid sm:grid-cols-2 bg-slate-950 p-2.5 rounded-2xl border border-slate-800 scrollbar-none snap-x snap-mandatory">
                        {[
                          { key: 'photoFront' as const, label: 'Front Angle' },
                          { key: 'photoLeft' as const, label: 'Left Side' },
                          { key: 'photoRight' as const, label: 'Right Side' },
                          { key: 'photoBack' as const, label: 'Back Angle' }
                        ].map((item) => (
                          <div key={item.key} className="bg-slate-900/60 rounded-xl p-1.5 border border-slate-850 flex flex-col items-center min-w-[125px] sm:min-w-0 snap-center shrink-0 sm:shrink">
                            <span className="text-[9px] uppercase font-black text-slate-500 mb-1 block tracking-wider">{item.label}</span>
                            <div className="w-full h-[140px] sm:h-[180px] overflow-hidden rounded-lg flex items-center justify-center bg-slate-950 border border-slate-900 p-1">
                              {formData[item.key] ? (
                                <img 
                                  src={formData[item.key]} 
                                  alt={item.label} 
                                  className="h-full w-full object-contain p-1 bg-slate-950 rounded-lg"
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
                                  user_name: formData.name,
                                  age: formData.age,
                                  user_age: formData.age,
                                  measured_height_cm: formData.height || 175,
                                  mediapipe_metrics: { shoulderToHipRatio: 1.2, profileDepthRatio: 0.85 },
                                  gender: formData.gender,
                                  activityLevel: formData.activityLevel,
                                  goals: formData.goals,
                                  injuriesOrConditions: formData.injuriesOrConditions
                                })
                              });
                              const data = await res.json();
                              if (!res.ok || data.error) {
                                throw new Error(data.error || `Failed to analyze image portfolio (HTTP ${res.status})`);
                              }
                              if (data.valid_full_body !== undefined) updateField('valid_full_body', data.valid_full_body);
                              if (data.rejection_reason) updateField('rejection_reason', data.rejection_reason);
                              if (data.postureAssessment) updateField('postureAssessment', data.postureAssessment);
                              if (data.analysis) updateField('physiqueAnalysis', data.analysis);
                              if (data.frameType) updateField('frameType', data.frameType);
                              if (data.frontAngleReport) updateField('frontAngleReport', data.frontAngleReport);
                              if (data.sideAngleReport) updateField('sideAngleReport', data.sideAngleReport);
                              if (data.backAngleReport) updateField('backAngleReport', data.backAngleReport);
                              if (data.calculated_weight_kg) {
                                updateField('calculated_weight_kg', data.calculated_weight_kg);
                                updateField('weight', data.calculated_weight_kg);
                              } else if (data.predictedWeight) {
                                updateField('calculated_weight_kg', data.predictedWeight);
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
                              console.error("Physique analysis error:", err);
                              const msg = err.message || "An error occurred during analysis.";
                              setAnalysisError(msg.startsWith("API Error:") ? msg : `API Error: ${msg}`);
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
                              Analyzing My Body...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4.5 h-4.5" />
                              Analyze My Body
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    <div className="bg-slate-950 rounded-2xl border border-slate-850 p-5 flex flex-col justify-between min-h-[180px]">
                      <div>
                        <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-sky-400 mb-2 font-display">
                          <Sparkles className="w-3.5 h-3.5" />
                          Your Body Type Results
                        </div>
                        
                        {loadingAnalysis ? (
                          <div className="space-y-3 pt-3">
                            <div className="h-4 bg-slate-900 rounded animate-pulse w-3/4"></div>
                            <div className="h-4 bg-slate-900 rounded animate-pulse w-5/6"></div>
                            <div className="h-4 bg-slate-900 rounded animate-pulse w-2/3"></div>
                          </div>
                        ) : formData.physiqueAnalysis ? (
                          <div className="space-y-3.5">
                            {formData.estimatedBodyFatPercent ? (
                              <div className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 px-3 py-1 rounded-xl text-xs font-bold font-display">
                                <Flame className="w-3.5 h-3.5 text-amber-400" />
                                Body Fat % Range: {formData.estimatedBodyFatPercent}%
                              </div>
                            ) : formData.frameType ? (
                              <div className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 px-3 py-1 rounded-xl text-xs font-bold font-display">
                                <Flame className="w-3.5 h-3.5 text-amber-400" />
                                Body Fat % Range: 20% - 25%
                              </div>
                            ) : null}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="bg-slate-900/80 p-3.5 rounded-xl border border-sky-500/30 text-center space-y-1">
                                <span className="text-[10px] uppercase font-extrabold text-sky-400 tracking-wider block">Somatotype</span>
                                <span className="text-xl font-black text-white font-display uppercase tracking-tight block">
                                  {formData.frameType || formData.bodyType || "Endomorph"}
                                </span>
                                <p className="text-[11px] text-slate-300 leading-snug pt-1 text-center border-t border-slate-800/80 mt-1 font-sans">
                                  {simplifyAnalysisText(formData.personalizedDefinition || getSomatotypeDefinition(formData.frameType || formData.bodyType || "Endomorph"))}
                                </p>
                              </div>
                              <div className="bg-slate-900/80 p-3.5 rounded-xl border border-emerald-500/30 text-center space-y-0.5">
                                <span className="text-[10px] uppercase font-extrabold text-emerald-400 tracking-wider block">Est. Weight Baseline</span>
                                <span className="text-xl font-black text-emerald-400 font-mono tracking-tight block">
                                  {formData.calculated_weight_kg ? `${formData.calculated_weight_kg} kg` : formData.weight ? `${formData.weight} kg` : "108 kg"}
                                </span>
                              </div>
                            </div>

                            {/* Full-Body Validation Notice */}
                            {formData.valid_full_body === false && (
                              <div className="bg-rose-500/10 border border-rose-500/40 rounded-2xl p-4 text-rose-300 text-xs space-y-2.5">
                                <div className="font-extrabold flex items-center gap-2 text-rose-400 uppercase tracking-wide text-xs">
                                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                                  Photo Not Suitable — Full Body Required
                                </div>
                                <p className="text-[11px] leading-relaxed text-slate-200">
                                  {formData.rejection_reason || "The photo provided does not show the full body from head to feet. Please upload a full-body standing photo showing head to toe so Coach Kai can accurately calibrate your posture and frame."}
                                </p>
                                <button
                                  type="button"
                                  onClick={() => setCurrentStep(1)}
                                  className="mt-1 bg-rose-500 hover:bg-rose-600 active:scale-95 text-slate-950 font-black text-[10px] uppercase tracking-wider px-4 py-2 rounded-xl transition cursor-pointer shadow-md shadow-rose-500/20 flex items-center gap-1.5"
                                >
                                  <Camera className="w-3.5 h-3.5" />
                                  Re-upload Full Body Photos
                                </button>
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
                                          {simplifyDeviationTag(dev)}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* 4-Angle Multi-Angle Analysis */}
                            {(formData.frontAngleReport || formData.sideAngleReport || formData.backAngleReport) && (
                              <div className="space-y-2 pt-1">
                                <div className="text-[10px] uppercase font-bold tracking-widest text-slate-400">4-Photo Multi-Angle Analysis</div>
                                
                                {formData.frontAngleReport && (
                                  <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 text-xs">
                                    <div className="font-bold text-emerald-400 text-[11px] mb-0.5 flex items-center gap-1.5">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Front View Analysis
                                    </div>
                                    <p className="text-slate-300 text-[11px] leading-relaxed">{simplifyAnalysisText(formData.frontAngleReport)}</p>
                                  </div>
                                )}

                                {formData.sideAngleReport && (
                                  <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 text-xs">
                                    <div className="font-bold text-sky-400 text-[11px] mb-0.5 flex items-center gap-1.5">
                                      <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span> Profiles & Posture Analysis
                                    </div>
                                    <p className="text-slate-300 text-[11px] leading-relaxed">{simplifyAnalysisText(formData.sideAngleReport)}</p>
                                  </div>
                                )}

                                {formData.backAngleReport && (
                                  <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 text-xs">
                                    <div className="font-bold text-amber-400 text-[11px] mb-0.5 flex items-center gap-1.5">
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span> Back View & Lat Alignment
                                    </div>
                                    <p className="text-slate-300 text-[11px] leading-relaxed">{simplifyAnalysisText(formData.backAngleReport)}</p>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Overall Body Analysis Paragraph */}
                            {formData.physiqueAnalysis && (
                              <div className="bg-slate-900/60 p-3 rounded-xl border border-sky-500/20 text-xs space-y-1">
                                <div className="font-bold text-sky-400 text-[11px] flex items-center gap-1.5 font-display uppercase tracking-wider">
                                  <Sparkles className="w-3.5 h-3.5 text-sky-400" /> Overall Body Analysis
                                </div>
                                <p className="text-slate-200 text-[11px] leading-relaxed font-sans pt-0.5">
                                  {simplifyAnalysisText(formData.physiqueAnalysis)}
                                </p>
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
