import React from 'react';
import { Dumbbell, ExternalLink, Video, AlertCircle } from 'lucide-react';

interface ExerciseAnimationVisualizerProps {
  exerciseName: string;
  category?: string;
  muscles?: string[];
  notes?: string;
  videoUrl?: string;
  generatedImageUrl?: string | null;
}

export const ExerciseAnimationVisualizer: React.FC<ExerciseAnimationVisualizerProps> = ({
  exerciseName,
  category = 'General',
  muscles = [],
  notes = '',
  videoUrl,
  generatedImageUrl
}) => {
  return (
    <div className="space-y-4">
      {/* Static Visual Card */}
      <div className="relative w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 p-5 flex flex-col items-center justify-center min-h-[200px]">
        {generatedImageUrl ? (
          <div className="relative w-full max-h-[300px] flex items-center justify-center overflow-hidden rounded-xl bg-slate-900 border border-slate-800">
            <img
              src={generatedImageUrl}
              alt={exerciseName}
              className="w-full h-auto object-contain max-h-[280px]"
              referrerPolicy="no-referrer"
            />
          </div>
        ) : (
          <div className="w-full flex flex-col items-center text-center p-6 space-y-3 bg-gradient-to-b from-slate-900/80 to-slate-950/80 rounded-xl border border-slate-800/60">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Dumbbell className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-white uppercase tracking-tight">{exerciseName}</h3>
              <p className="text-xs text-sky-400 font-bold uppercase mt-0.5">{category}</p>
            </div>
            {muscles.length > 0 && (
              <div className="flex flex-wrap justify-center gap-1.5 pt-2">
                {muscles.map((m, i) => (
                  <span key={i} className="px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-mono border border-slate-700">
                    {m}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Video Demonstration CTA */}
      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 flex gap-3.5 items-center">
        <Video className="w-5 h-5 text-emerald-400 shrink-0" />
        <div className="flex-1">
          <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider">Video Tutorial</h4>
          <p className="text-[11px] text-slate-500">Watch full execution form.</p>
        </div>
        <a
          href={videoUrl || `https://www.youtube.com/results?search_query=${encodeURIComponent(exerciseName + " exercise form tutorial")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 font-black px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          Watch Video
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
};
