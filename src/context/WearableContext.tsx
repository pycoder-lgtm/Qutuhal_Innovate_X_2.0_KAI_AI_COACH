import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { wearableSyncService, WearablePacket, WorkoutPhase } from '../services/WearableSyncService';
import { useWearableSync } from '../utils/useWearableSync';
import { WearableBiometrics, WatchConnectionStatus, WatchDevice } from '../types';

export type EffortZone = 'RECOVERY' | 'FAT_BURN' | 'AEROBIC' | 'ANAEROBIC' | 'HIGH_INTENSITY';

export interface WearableContextType {
  isWatchConnected: boolean;
  watchDeviceName: string;
  currentHeartRate: number | null;
  activeExercise: string;
  workoutPhase: WorkoutPhase;
  targetBpmZone: number;
  targetMusicBpm: number;
  effortZone: EffortZone;
  effortZoneName: string;
  effortZoneColor: string;
  isSimulating: boolean;
  caloriesBurned: number;
  stepCount: number;
  batteryLevel: number;
  lastSyncTimestamp: number | null;
  biometrics: WearableBiometrics;
  connectionStatus: WatchConnectionStatus;
  watchDevice: WatchDevice;
  toggleSimulation: (enable?: boolean) => void;
  setWatchConnected: (connected: boolean, deviceName?: string) => void;
  setHeartRate: (hr: number) => void;
  setActiveExercise: (exercise: string) => void;
  setWorkoutPhase: (phase: WorkoutPhase) => void;
  processWearablePacket: (packet: Partial<WearablePacket>) => void;
}

const defaultContext: WearableContextType = {
  isWatchConnected: true,
  watchDeviceName: 'Apple Watch Series 9',
  currentHeartRate: 138,
  activeExercise: 'Heavy Squats',
  workoutPhase: 'ACTIVE_SET',
  targetBpmZone: 145,
  targetMusicBpm: 128,
  effortZone: 'AEROBIC',
  effortZoneName: '⚡ Aerobic Zone',
  effortZoneColor: 'from-amber-500 to-yellow-400 text-amber-400 border-amber-500/30 bg-amber-500/10',
  isSimulating: true,
  caloriesBurned: 185,
  stepCount: 4250,
  batteryLevel: 91,
  lastSyncTimestamp: Date.now(),
  biometrics: {
    heartRate: 138,
    activeCalories: 185,
    stepCount: 4250,
    exerciseZone: 'MODERATE',
    targetMusicBpm: 128,
    lastSyncedAt: new Date().toLocaleTimeString(),
  },
  connectionStatus: 'simulated',
  watchDevice: { name: 'Apple Watch Series 9', platform: 'ios' },
  toggleSimulation: () => {},
  setWatchConnected: () => {},
  setHeartRate: () => {},
  setActiveExercise: () => {},
  setWorkoutPhase: () => {},
  processWearablePacket: () => {},
};

const WearableContext = createContext<WearableContextType>(defaultContext);

const EXERCISE_LIST = [
  'Heavy Barbell Squats',
  'Incline Dumbbell Press',
  'Cardio HIIT Sprints',
  'Deadlifts & Pull-ups',
  'Kettlebell Clean & Jerk',
  'Rowing Ergometer Sprint',
  'Core Planks & Mountain Climbers',
];

export const WearableProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { biometrics, connectionStatus, device, toggleSimulation, connectDevice } = useWearableSync();

  const [activeExercise, setActiveExerciseState] = useState<string>('Heavy Barbell Squats');
  const [workoutPhase, setWorkoutPhaseState] = useState<WorkoutPhase>('ACTIVE_SET');
  const [batteryLevel] = useState<number>(92);
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState<number | null>(Date.now());

  const currentHeartRate = biometrics.heartRate;
  const isWatchConnected = connectionStatus === 'connected' || connectionStatus === 'simulated';
  const watchDeviceName = device.name;
  const targetMusicBpm = biometrics.targetMusicBpm;
  const isSimulating = connectionStatus === 'simulated';

  // Calculate Effort Zone & Target BPM Zone
  const calculateEffortZone = useCallback((hr: number | null, phase: WorkoutPhase) => {
    const age = 28;
    const maxHr = 220 - age; // 192 BPM
    const rate = hr ?? 120;
    const percentage = (rate / maxHr) * 100;

    let zone: EffortZone = 'AEROBIC';
    let name = '⚡ Aerobic Zone';
    let color = 'from-yellow-500 to-amber-400 text-yellow-400 border-yellow-500/30 bg-yellow-500/10';

    if (percentage < 60) {
      zone = 'RECOVERY';
      name = '🍃 Recovery Zone';
      color = 'from-emerald-500 to-teal-400 text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    } else if (percentage < 70) {
      zone = 'FAT_BURN';
      name = '🔥 Fat Burn Zone';
      color = 'from-amber-500 to-orange-400 text-amber-400 border-amber-500/30 bg-amber-500/10';
    } else if (percentage < 80) {
      zone = 'AEROBIC';
      name = '⚡ Aerobic Zone';
      color = 'from-yellow-400 to-amber-500 text-yellow-400 border-yellow-500/30 bg-yellow-500/10';
    } else if (percentage < 90) {
      zone = 'ANAEROBIC';
      name = '💪 Anaerobic Threshold';
      color = 'from-orange-500 to-red-500 text-orange-400 border-orange-500/30 bg-orange-500/10';
    } else {
      zone = 'HIGH_INTENSITY';
      name = '🚀 Peak High Intensity';
      color = 'from-red-600 to-rose-500 text-rose-400 border-rose-500/30 bg-rose-500/10';
    }

    let target = 145;
    if (phase === 'WARMUP') target = 115;
    if (phase === 'ACTIVE_SET') target = 158;
    if (phase === 'REST') target = 122;
    if (phase === 'COOLDOWN') target = 105;

    return { zone, name, color, target };
  }, []);

  const { zone: effortZone, name: effortZoneName, color: effortZoneColor, target: targetBpmZone } =
    calculateEffortZone(currentHeartRate, workoutPhase);

  // Process manual packet
  const processWearablePacket = useCallback((packet: Partial<WearablePacket>) => {
    const fullPacket: WearablePacket = {
      deviceName: packet.deviceName || watchDeviceName,
      heartRate: packet.heartRate ?? (currentHeartRate || 135),
      timestamp: Date.now(),
      activeExercise: packet.activeExercise || activeExercise,
      workoutPhase: packet.workoutPhase || workoutPhase,
      caloriesBurned: packet.caloriesBurned ?? biometrics.activeCalories,
      batteryLevel: packet.batteryLevel ?? batteryLevel,
    };
    wearableSyncService.emitPacket(fullPacket);
    setLastSyncTimestamp(Date.now());
  }, [watchDeviceName, currentHeartRate, activeExercise, workoutPhase, biometrics.activeCalories, batteryLevel]);

  const setWatchConnected = useCallback((connected: boolean, deviceName?: string) => {
    if (connected) {
      connectDevice({ name: deviceName || 'Smartwatch', platform: 'ios' });
    }
  }, [connectDevice]);

  const setHeartRate = useCallback((hr: number) => {
    wearableSyncService.updateBiometrics({ heartRate: hr });
    setLastSyncTimestamp(Date.now());
  }, []);

  const setActiveExercise = useCallback((exercise: string) => {
    setActiveExerciseState(exercise);
  }, []);

  const setWorkoutPhase = useCallback((phase: WorkoutPhase) => {
    setWorkoutPhaseState(phase);
  }, []);

  return (
    <WearableContext.Provider
      value={{
        isWatchConnected,
        watchDeviceName,
        currentHeartRate,
        activeExercise,
        workoutPhase,
        targetBpmZone,
        targetMusicBpm,
        effortZone,
        effortZoneName,
        effortZoneColor,
        isSimulating,
        caloriesBurned: biometrics.activeCalories,
        stepCount: biometrics.stepCount,
        batteryLevel,
        lastSyncTimestamp,
        biometrics,
        connectionStatus,
        watchDevice: device,
        toggleSimulation,
        setWatchConnected,
        setHeartRate,
        setActiveExercise,
        setWorkoutPhase,
        processWearablePacket,
      }}
    >
      {children}
    </WearableContext.Provider>
  );
};

export const useWearable = () => useContext(WearableContext);
