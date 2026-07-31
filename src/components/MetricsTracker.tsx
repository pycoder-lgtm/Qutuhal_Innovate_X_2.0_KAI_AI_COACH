/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { UserProfile, ProgressLog, DailyPlan } from '../types';
import GpsTracker from './GpsTracker';
import { 
  Calendar, Droplet, Utensils, Dumbbell, Footprints, Route, 
  PlusCircle, Trash2, Sparkles, CheckCircle, Award, ListFilter, Navigation
} from 'lucide-react';

interface MetricsTrackerProps {
  profile: UserProfile;
  plan: DailyPlan | null;
  historyLogs: ProgressLog[];
  onAddProgressLog: (log: ProgressLog) => void;
  onDeleteProgressLog: (date: string) => void;
}

export default function MetricsTracker({
  profile,
  plan,
  historyLogs,
  onAddProgressLog,
  onDeleteProgressLog
}: MetricsTrackerProps) {
  // Form states
  const [logDate, setLogDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [mealsEaten, setMealsEaten] = useState('');
  const [workoutsDone, setWorkoutsDone] = useState('');
  const [waterLiters, setWaterLiters] = useState<number>(0);
  const [stepsCount, setStepsCount] = useState<number>(0);
  const [distanceKm, setDistanceKm] = useState<number>(0);
  const [showSuccessMsg, setShowSuccessMsg] = useState(false);

  // Auto pre-fill logic when logDate changes
  useEffect(() => {
    // Determine weekday of logDate
    try {
      const dateObj = new Date(logDate);
      if (!isNaN(dateObj.getTime())) {
        const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const weekday = weekdays[dateObj.getDay()];
        const rawPlan = localStorage.getItem(`kai_coach_plan_${weekday}`);
        if (rawPlan) {
          const parsedPlan = JSON.parse(rawPlan);
          
          // Join eaten meal names
          const eatenNames = (parsedPlan.meals || [])
            .filter((m: any) => m.eaten)
            .map((m: any) => m.name)
            .join(', ');
          
          // Check completed exercises
          const hasCompletedExercises = (parsedPlan.exercises || []).some((ex: any) => ex.completed);
          const workoutDesc = hasCompletedExercises ? (parsedPlan.workoutName || 'Active Workout') : '';
          
          // Water intake L
          const waterL = parsedPlan.waterIntakeMl ? (parsedPlan.waterIntakeMl / 1000) : 0;

          setMealsEaten(eatenNames);
          setWorkoutsDone(workoutDesc);
          setWaterLiters(waterL);
          return;
        }
      }
    } catch (e) {
      console.error("Error auto-prefilling data:", e);
    }
    
    // Fallback if no plan found for that day
    setMealsEaten('');
    setWorkoutsDone('');
    setWaterLiters(0);
  }, [logDate]);

  // GPS workout save handler
  const handleGpsSave = (data: {
    distanceKm: number;
    durationSec: number;
    workoutDesc: string;
    gpsTrack: any;
  }) => {
    const newDist = Math.round(((distanceKm || 0) + data.distanceKm) * 100) / 100;
    const newWorkout = workoutsDone ? `${workoutsDone}, ${data.workoutDesc}` : data.workoutDesc;

    setDistanceKm(newDist);
    setWorkoutsDone(newWorkout);

    onAddProgressLog({
      date: logDate,
      mealsEaten: mealsEaten.trim() || 'Recorded during activity',
      workoutsDone: newWorkout,
      waterLiters: Number(waterLiters) || 0,
      stepsCount: Number(stepsCount) || 0,
      distanceKm: newDist,
      gpsTrack: data.gpsTrack
    });

    setShowSuccessMsg(true);
    setTimeout(() => setShowSuccessMsg(false), 3000);
  };

  // Form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!logDate) return;

    onAddProgressLog({
      date: logDate,
      mealsEaten: mealsEaten.trim() || 'No meals recorded',
      workoutsDone: workoutsDone.trim() || 'No workouts recorded',
      waterLiters: Number(waterLiters) || 0,
      stepsCount: Number(stepsCount) || 0,
      distanceKm: Number(distanceKm) || 0
    });

    // Reset values (except date)
    setStepsCount(0);
    setDistanceKm(0);
    
    // Show success banner
    setShowSuccessMsg(true);
    setTimeout(() => setShowSuccessMsg(false), 3000);
  };

  // Stats calculations
  const totalLogs = historyLogs.length;
  const totalSteps = historyLogs.reduce((acc, l) => acc + (l.stepsCount || 0), 0);
  const totalDistance = historyLogs.reduce((acc, l) => acc + (l.distanceKm || 0), 0);
  const avgWater = totalLogs > 0 
    ? (historyLogs.reduce((acc, l) => acc + (l.waterLiters || 0), 0) / totalLogs).toFixed(1)
    : '0';

  // Sort logs by date descending
  const sortedLogs = [...historyLogs].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Visual Header Banner */}
      <div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-2xl shadow-xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-sky-500 to-teal-500 rounded-2xl text-slate-950 shadow-lg shadow-sky-500/10">
            <Award className="w-6 h-6 font-black" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight font-display">Aesthetic Progress Journal</h1>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mt-0.5">Track your nutritional, hydration, and physical exertion milestones daily</p>
          </div>
        </div>
      </div>

      {/* Dashboard Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 bg-sky-500/10 rounded-xl text-sky-400">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Logs</span>
            <span className="text-base font-black text-white font-mono">{totalLogs} Days</span>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 bg-teal-500/10 rounded-xl text-teal-400">
            <Footprints className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Steps</span>
            <span className="text-base font-black text-white font-mono">{totalSteps.toLocaleString()}</span>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
            <Route className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Distance</span>
            <span className="text-base font-black text-white font-mono">{totalDistance.toFixed(1)} km</span>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400">
            <Droplet className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Avg Hydration</span>
            <span className="text-base font-black text-white font-mono">{avgWater} L / Day</span>
          </div>
        </div>
      </div>

      {/* GPS Route Tracker removed for now per user request. Retained in codebase for future enable. */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Form to Add New Progress Log */}
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6 self-start">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <PlusCircle className="w-5 h-5 text-sky-400" />
            <h2 className="font-bold text-white text-sm uppercase tracking-tight">Log Today's Activity</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Log Date */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                Date Logged
              </label>
              <input
                type="date"
                required
                value={logDate}
                onChange={e => setLogDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-sky-500 focus:outline-none rounded-xl px-3 py-2 text-xs font-mono font-bold text-white transition"
              />
            </div>

            {/* Meals Eaten */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                <Utensils className="w-3.5 h-3.5 text-slate-500" />
                Meals Eaten (Description)
              </label>
              <input
                type="text"
                value={mealsEaten}
                onChange={e => setMealsEaten(e.target.value)}
                placeholder="Breakfast, Lunch, Dinner details..."
                className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-sky-500 focus:outline-none rounded-xl px-3 py-2 text-xs font-semibold text-white placeholder-slate-600 transition"
              />
              <p className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider">Auto-fills from daily check-offs</p>
            </div>

            {/* Workouts Completed */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                <Dumbbell className="w-3.5 h-3.5 text-slate-500" />
                Workouts Completed (Description)
              </label>
              <input
                type="text"
                value={workoutsDone}
                onChange={e => setWorkoutsDone(e.target.value)}
                placeholder="e.g. Upper Body Strength, HIIT session"
                className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-sky-500 focus:outline-none rounded-xl px-3 py-2 text-xs font-semibold text-white placeholder-slate-600 transition"
              />
            </div>

            {/* Water Drunk */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                <Droplet className="w-3.5 h-3.5 text-slate-500" />
                Water Drunk (Liters)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="15"
                value={waterLiters}
                onChange={e => setWaterLiters(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-sky-500 focus:outline-none rounded-xl px-3 py-2 text-xs font-mono font-bold text-white transition"
              />
            </div>

            {/* Steps & Distance Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                  <Footprints className="w-3.5 h-3.5 text-slate-500" />
                  Steps Count
                </label>
                <input
                  type="number"
                  min="0"
                  max="100000"
                  value={stepsCount || ''}
                  onChange={e => setStepsCount(Number(e.target.value))}
                  placeholder="8000"
                  className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-sky-500 focus:outline-none rounded-xl px-3 py-2 text-xs font-mono font-bold text-white transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                  <Route className="w-3.5 h-3.5 text-slate-500" />
                  Distance (km)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="200"
                  value={distanceKm || ''}
                  onChange={e => setDistanceKm(Number(e.target.value))}
                  placeholder="5.5"
                  className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-sky-500 focus:outline-none rounded-xl px-3 py-2 text-xs font-mono font-bold text-white transition"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-4 flex items-center justify-center gap-2 bg-gradient-to-r from-sky-400 to-teal-400 text-slate-950 hover:opacity-95 py-3 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer shadow-lg active:scale-98 transition"
            >
              <CheckCircle className="w-4 h-4" />
              Save Journal Entry
            </button>
          </form>

          {showSuccessMsg && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-900/40 rounded-xl text-emerald-400 text-[11px] font-bold text-center animate-fade-in flex items-center justify-center gap-1.5 uppercase tracking-wide">
              <CheckCircle className="w-4 h-4" />
              Journal entry saved successfully!
            </div>
          )}
        </div>

        {/* Historical Logs List */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <ListFilter className="w-5 h-5 text-sky-400" />
              <h2 className="font-bold text-white text-sm uppercase tracking-tight">Activity Log History</h2>
            </div>
            <span className="text-[10px] font-black bg-slate-950 text-slate-500 border border-slate-850 px-2.5 py-1 rounded-full uppercase tracking-wider font-mono">
              {historyLogs.length} Records
            </span>
          </div>

          {sortedLogs.length === 0 ? (
            <div className="py-20 text-center bg-slate-950/40 border border-slate-850 rounded-2xl space-y-3">
              <Calendar className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="font-bold text-sm text-slate-300 uppercase tracking-wide">No Entries Recorded</h3>
              <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                Select a date on the left, review your auto-filled check-off summary, add steps and distance, and log your progress.
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
              {sortedLogs.map((log) => (
                <div 
                  key={log.date} 
                  className="bg-slate-950/70 border border-slate-850 hover:border-slate-800 p-4 rounded-xl space-y-3 transition relative group"
                >
                  {/* Delete button (shows on hover) */}
                  <button
                    onClick={() => onDeleteProgressLog(log.date)}
                    title="Delete Entry"
                    className="absolute top-4 right-4 text-slate-600 hover:text-rose-400 p-1 rounded hover:bg-slate-900 transition cursor-pointer md:opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  {/* Header info */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-900/60 pb-2">
                    <span className="font-black text-xs text-white font-mono uppercase tracking-wider bg-slate-900 px-3 py-1 rounded-lg border border-slate-800">
                      {new Date(log.date).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <div className="flex items-center gap-3 text-xs">
                      {/* Steps stats */}
                      <span className="text-[11px] font-bold text-teal-400 font-mono bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/10">
                        🐾 {log.stepsCount ? log.stepsCount.toLocaleString() : '0'} steps
                      </span>
                      {/* Distance stats */}
                      <span className="text-[11px] font-bold text-indigo-400 font-mono bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/10">
                        📍 {log.distanceKm ? log.distanceKm.toFixed(1) : '0'} km
                      </span>
                    </div>
                  </div>

                  {/* Log contents detail */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block">🥗 Nutrition / Meals Eaten:</span>
                      <p className="text-xs text-slate-300 leading-relaxed font-semibold">
                        {log.mealsEaten || 'None logged'}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block">💪 Exercise / Workout:</span>
                      <p className="text-xs text-slate-300 leading-relaxed font-semibold">
                        {log.workoutsDone || 'None logged'}
                      </p>
                    </div>
                  </div>

                  {log.gpsTrack && (
                    <div className="bg-sky-950/40 border border-sky-900/50 p-2.5 rounded-xl text-xs font-mono text-sky-300 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-bold">
                        <Navigation className="w-3.5 h-3.5 text-sky-400" />
                        <span className="capitalize">{log.gpsTrack.activityType || 'outdoor'} GPS Route:</span>
                        <span>{log.gpsTrack.distanceKm.toFixed(2)} km</span>
                      </div>
                      <span className="text-[10px] text-sky-400/80 font-semibold">
                        Avg {log.gpsTrack.avgSpeedKmh ? log.gpsTrack.avgSpeedKmh.toFixed(1) : '0'} km/h
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center border-t border-slate-900/40 pt-2.5">
                    <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider">Daily Hydration:</span>
                    <span className="text-xs font-black text-sky-400 font-mono flex items-center gap-1 bg-sky-500/5 px-2.5 py-0.5 rounded-full border border-sky-500/10">
                      <Droplet className="w-3 h-3 text-sky-400" />
                      {log.waterLiters ? log.waterLiters.toFixed(1) : '0'} Liters
                    </span>
                  </div>

                </div>
              ))}
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
