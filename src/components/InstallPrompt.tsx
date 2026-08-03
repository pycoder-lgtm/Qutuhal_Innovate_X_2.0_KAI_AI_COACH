import React, { useState, useEffect } from 'react';
import { Download, Share, PlusSquare, X, Smartphone, CheckCircle } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // Check if app is already running in standalone mode (PWA installed or native Capacitor)
    const checkStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      window.location.search.includes('mode=pwa');

    setIsStandalone(checkStandalone);

    if (checkStandalone) return;

    // Check if dismissed recently
    const dismissedTime = localStorage.getItem('coach_kai_install_dismissed');
    if (dismissedTime && Date.now() - Number(dismissedTime) < 3 * 86400 * 1000) {
      return; // Dismissed within 3 days
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    if (isIosDevice) {
      // Show iOS install prompt if not standalone
      setShowPrompt(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSInstructions(true);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowIOSInstructions(false);
    localStorage.setItem('coach_kai_install_dismissed', String(Date.now()));
  };

  if (!showPrompt || isStandalone) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto animate-in slide-in-from-bottom-5 duration-300">
      <div className="bg-slate-900/95 backdrop-blur-md border border-sky-500/30 rounded-2xl p-4 shadow-2xl shadow-sky-950/50">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-500 to-blue-700 p-0.5 flex items-center justify-center shrink-0 shadow-md">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-sky-400" />
              </div>
            </div>
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                Install Coach Kai AI
                <span className="text-[9px] bg-sky-500/20 text-sky-300 px-1.5 py-0.5 rounded font-mono uppercase">PWA / Native</span>
              </h4>
              <p className="text-xs text-slate-300 mt-0.5">
                Install on your Home Screen for full screen mode, offline scans & fast performance.
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {showIOSInstructions ? (
          <div className="mt-3 pt-3 border-t border-slate-800 space-y-2 text-xs text-slate-300 bg-slate-950/80 p-3 rounded-xl border border-slate-800">
            <p className="font-semibold text-sky-400 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" /> To install on iOS Safari:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-slate-300">
              <li>Tap the <span className="inline-flex items-center font-bold text-white bg-slate-800 px-1.5 py-0.5 rounded"><Share className="w-3 h-3 mx-0.5 inline" /> Share</span> button at the bottom of Safari.</li>
              <li>Scroll down and select <span className="inline-flex items-center font-bold text-white bg-slate-800 px-1.5 py-0.5 rounded"><PlusSquare className="w-3 h-3 mx-0.5 inline" /> Add to Home Screen</span>.</li>
              <li>Tap <span className="font-bold text-sky-400">Add</span> in the top right corner.</li>
            </ol>
          </div>
        ) : (
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 font-medium transition-colors"
            >
              Not now
            </button>
            <button
              onClick={handleInstallClick}
              className="px-4 py-1.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-sky-400 to-blue-400 hover:from-sky-300 hover:to-blue-300 rounded-xl flex items-center gap-1.5 shadow-lg shadow-sky-500/20 transition-all active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              {isIOS ? 'Instructions for iOS' : 'Install App'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
