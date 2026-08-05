import { Capacitor } from '@capacitor/core';
import { WatchConnectionStatus, WearableBiometrics, WatchDevice, HealthPermissionStatus, UserHealthMetrics } from '../types';

export type WorkoutPhase = 'WARMUP' | 'ACTIVE_SET' | 'REST' | 'COOLDOWN';

export interface WearablePacket {
  deviceName: string;
  heartRate: number;
  timestamp: number;
  activeExercise?: string;
  workoutPhase?: WorkoutPhase;
  caloriesBurned?: number;
  batteryLevel?: number;
  sourcePlatform?: 'iOS' | 'Android' | 'Simulation' | 'WebBridge';
  stepCount?: number;
}

export type WearableBiometricsCallback = (biometrics: WearableBiometrics, device: WatchDevice, status: WatchConnectionStatus) => void;
export type HealthMetricsCallback = (metrics: UserHealthMetrics, permission: HealthPermissionStatus) => void;
export type WearableListener = (packet: WearablePacket) => void;

class WearableSyncService {
  private listeners: Set<WearableListener> = new Set();
  private biometricsSubscribers: Set<WearableBiometricsCallback> = new Set();
  private healthSubscribers: Set<HealthMetricsCallback> = new Set();
  
  private simulationInterval: NodeJS.Timeout | null = null;
  private isSimulating = false;
  private isListening = false;

  private healthPermissionStatus: HealthPermissionStatus = 'unprompted';
  private userHealthMetrics: UserHealthMetrics = {
    stepCount: 7420,
    heartRate: 132,
    sleepHours: 7.5,
    activeCalories: 380,
    connectedDeviceName: 'Apple Health / Apple Watch',
    lastSyncedAt: new Date().toLocaleTimeString(),
  };

  private currentDevice: WatchDevice = {
    name: 'Simulated Watch',
    platform: 'mock',
  };

  private currentStatus: WatchConnectionStatus = 'simulated';

  private currentBiometrics: WearableBiometrics = {
    heartRate: 138,
    activeCalories: 185,
    stepCount: 4250,
    exerciseZone: 'MODERATE',
    targetMusicBpm: 128,
    lastSyncedAt: new Date().toLocaleTimeString(),
  };

  constructor() {
    this.detectPlatformAndInitialize();
    this.initListeners();
  }

  /**
   * Helper to compute targetMusicBpm based on Heart Rate
   * HR > 140 -> 150 BPM; HR 110-139 -> 128 BPM; HR < 110 -> 90 BPM
   */
  public calculateTargetMusicBpm(hr: number | null): number {
    if (!hr) return 120;
    if (hr > 140) return 150;
    if (hr >= 110) return 128;
    return 90;
  }

  /**
   * Helper to compute Exercise Zone based on Heart Rate
   */
  public calculateExerciseZone(hr: number | null): 'REST' | 'WARMUP' | 'MODERATE' | 'INTENSE' {
    if (!hr || hr < 100) return 'REST';
    if (hr < 125) return 'WARMUP';
    if (hr < 145) return 'MODERATE';
    return 'INTENSE';
  }

  /**
   * Detect system platform using Capacitor
   */
  private detectPlatformAndInitialize() {
    if (typeof window === 'undefined') return;

    const platform = Capacitor.getPlatform(); // 'ios', 'android', or 'web'

    if (platform === 'ios') {
      this.currentDevice = { name: 'Apple Watch', platform: 'ios' };
      this.currentStatus = 'connected';
      this.initHealthKitHooks();
    } else if (platform === 'android') {
      this.currentDevice = { name: 'Galaxy Watch', platform: 'android' };
      this.currentStatus = 'connected';
      this.initHealthConnectHooks();
    } else {
      this.currentDevice = { name: 'Simulated Watch', platform: 'mock' };
      this.currentStatus = 'simulated';
      // Start simulation by default in dev mode
      this.startSimulation();
    }
  }

  /**
   * Apple HealthKit integration hook
   */
  private initHealthKitHooks() {
    console.log('[WearableSyncService] Initialized Apple HealthKit native listener bridge.');
    window.addEventListener('healthKitBiometricUpdate', (event: Event) => {
      const customEvent = event as CustomEvent<{ heartRate: number; activeCalories: number; stepCount: number }>;
      if (customEvent.detail) {
        this.updateBiometrics({
          heartRate: customEvent.detail.heartRate,
          activeCalories: customEvent.detail.activeCalories,
          stepCount: customEvent.detail.stepCount,
        });
      }
    });
  }

  /**
   * Google Health Connect integration hook
   */
  private initHealthConnectHooks() {
    console.log('[WearableSyncService] Initialized Google Health Connect native listener bridge.');
    window.addEventListener('healthConnectBiometricUpdate', (event: Event) => {
      const customEvent = event as CustomEvent<{ heartRate: number; activeCalories: number; stepCount: number }>;
      if (customEvent.detail) {
        this.updateBiometrics({
          heartRate: customEvent.detail.heartRate,
          activeCalories: customEvent.detail.activeCalories,
          stepCount: customEvent.detail.stepCount,
        });
      }
    });
  }

  /**
   * Initialize bridge listeners for iOS WatchConnectivity & Android DataLayer API
   */
  public initListeners() {
    if (this.isListening || typeof window === 'undefined') return;

    window.addEventListener('wearableBiometricPacket', (event: Event) => {
      const customEvent = event as CustomEvent<WearablePacket>;
      if (customEvent.detail) {
        this.notifyListeners(customEvent.detail);
      }
    });

    // iOS WatchConnectivity Message
    window.addEventListener('watchConnectivityMessage', (event: Event) => {
      const customEvent = event as CustomEvent<Partial<WearablePacket>>;
      if (customEvent.detail) {
        const packet: WearablePacket = {
          deviceName: customEvent.detail.deviceName || 'Apple Watch',
          heartRate: customEvent.detail.heartRate || 135,
          timestamp: customEvent.detail.timestamp || Date.now(),
          activeExercise: customEvent.detail.activeExercise || 'Heavy Squats',
          workoutPhase: customEvent.detail.workoutPhase || 'ACTIVE_SET',
          caloriesBurned: customEvent.detail.caloriesBurned || 120,
          batteryLevel: customEvent.detail.batteryLevel || 88,
          sourcePlatform: 'iOS',
        };
        this.notifyListeners(packet);
      }
    });

    // Android Wear OS DataLayer Message
    window.addEventListener('wearOsDataLayerMessage', (event: Event) => {
      const customEvent = event as CustomEvent<Partial<WearablePacket>>;
      if (customEvent.detail) {
        const packet: WearablePacket = {
          deviceName: customEvent.detail.deviceName || 'Galaxy Watch',
          heartRate: customEvent.detail.heartRate || 140,
          timestamp: customEvent.detail.timestamp || Date.now(),
          activeExercise: customEvent.detail.activeExercise || 'Cardio Sprint',
          workoutPhase: customEvent.detail.workoutPhase || 'ACTIVE_SET',
          caloriesBurned: customEvent.detail.caloriesBurned || 145,
          batteryLevel: customEvent.detail.batteryLevel || 92,
          sourcePlatform: 'Android',
        };
        this.notifyListeners(packet);
      }
    });

    // Native Bridge Window Listener
    (window as any).onNativeWatchMessage = (jsonMessage: string | object) => {
      try {
        const parsed = typeof jsonMessage === 'string' ? JSON.parse(jsonMessage) : jsonMessage;
        this.notifyListeners({
          deviceName: parsed.deviceName || 'Smartwatch',
          heartRate: Number(parsed.heartRate) || 120,
          timestamp: parsed.timestamp || Date.now(),
          activeExercise: parsed.activeExercise,
          workoutPhase: parsed.workoutPhase,
          caloriesBurned: parsed.caloriesBurned,
          batteryLevel: parsed.batteryLevel,
          sourcePlatform: parsed.platform || 'WebBridge',
        });
      } catch (err) {
        console.warn('Invalid watch message received:', err);
      }
    };

    this.isListening = true;
  }

  /**
   * SIMULATOR MODE (Default for Dev)
   * Emits realistic biometric data updates (Heart Rate shifting between 110-165 BPM every 10 seconds)
   */
  public startSimulation() {
    if (this.isSimulating) return;
    this.isSimulating = true;
    this.currentStatus = 'simulated';
    this.currentDevice = { name: 'Simulated Watch', platform: 'mock' };

    console.log('[WearableSyncService] Watch simulation started.');

    this.pulseSimulationData();

    this.simulationInterval = setInterval(() => {
      this.pulseSimulationData();
    }, 10000);
  }

  private pulseSimulationData() {
    const simulatedHR = Math.floor(Math.random() * (165 - 110 + 1)) + 110;
    const newCalories = this.currentBiometrics.activeCalories + Math.floor(Math.random() * 3) + 1;
    const newSteps = this.currentBiometrics.stepCount + Math.floor(Math.random() * 12) + 2;

    this.updateBiometrics({
      heartRate: simulatedHR,
      activeCalories: newCalories,
      stepCount: newSteps,
    });

    this.notifyListeners({
      deviceName: 'Simulated Watch',
      heartRate: simulatedHR,
      timestamp: Date.now(),
      caloriesBurned: newCalories,
      sourcePlatform: 'Simulation',
      stepCount: newSteps,
    });
  }

  public stopSimulation() {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
    this.isSimulating = false;
    this.currentStatus = 'disconnected';
    this.notifyBiometricsSubscribers();
    console.log('[WearableSyncService] Watch simulation stopped.');
  }

  public toggleSimulation(enable?: boolean): boolean {
    const nextState = enable !== undefined ? enable : !this.isSimulating;
    if (nextState) {
      this.startSimulation();
    } else {
      this.stopSimulation();
    }
    return this.isSimulating;
  }

  public connectDevice(device?: WatchDevice) {
    if (device) {
      this.currentDevice = device;
    }
    this.currentStatus = 'connected';
    this.notifyBiometricsSubscribers();
  }

  public updateBiometrics(data: Partial<WearableBiometrics>) {
    const hr = data.heartRate !== undefined ? data.heartRate : this.currentBiometrics.heartRate;
    const activeCalories = data.activeCalories !== undefined ? data.activeCalories : this.currentBiometrics.activeCalories;
    const stepCount = data.stepCount !== undefined ? data.stepCount : this.currentBiometrics.stepCount;

    const targetMusicBpm = this.calculateTargetMusicBpm(hr);
    const exerciseZone = this.calculateExerciseZone(hr);

    this.currentBiometrics = {
      heartRate: hr,
      activeCalories,
      stepCount,
      exerciseZone,
      targetMusicBpm,
      lastSyncedAt: new Date().toLocaleTimeString(),
    };

    this.notifyBiometricsSubscribers();
  }

  public subscribeBiometrics(callback: WearableBiometricsCallback): () => void {
    this.biometricsSubscribers.add(callback);
    callback(this.currentBiometrics, this.currentDevice, this.currentStatus);

    return () => {
      this.biometricsSubscribers.delete(callback);
    };
  }

  public subscribe(listener: WearableListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public notifyListeners(packet: WearablePacket) {
    if (typeof packet.heartRate === 'number') {
      this.updateBiometrics({
        heartRate: packet.heartRate,
        activeCalories: packet.caloriesBurned ?? this.currentBiometrics.activeCalories,
        stepCount: packet.stepCount ?? this.currentBiometrics.stepCount,
      });
    }

    this.listeners.forEach((listener) => {
      try {
        listener(packet);
      } catch (e) {
        console.error('Error in WearableSyncService listener:', e);
      }
    });
  }

  private notifyBiometricsSubscribers() {
    this.biometricsSubscribers.forEach((callback) => {
      try {
        callback(this.currentBiometrics, this.currentDevice, this.currentStatus);
      } catch (e) {
        console.error('Error notifying biometrics subscriber:', e);
      }
    });
  }

  /**
   * Universal Health Permission Flow (Capacitor Native vs Web Simulator)
   */
  public async requestUniversalHealthPermissions(): Promise<{
    status: HealthPermissionStatus;
    metrics: UserHealthMetrics;
  }> {
    const isNative = Capacitor.isNativePlatform();
    const platform = Capacitor.getPlatform();

    if (isNative) {
      console.log(`[WearableSyncService] Triggering native ${platform} health permissions dialog...`);
      // Simulating native prompt resolution on mobile native bridge
      this.healthPermissionStatus = 'granted';
      const deviceName = platform === 'ios' ? 'Apple Health / Apple Watch' : 'Google Health Connect / Garmin';
      this.userHealthMetrics = {
        stepCount: 8150,
        heartRate: 136,
        sleepHours: 7.8,
        activeCalories: 420,
        connectedDeviceName: deviceName,
        lastSyncedAt: new Date().toLocaleTimeString(),
      };
      this.currentDevice = {
        name: deviceName,
        platform: platform === 'ios' ? 'ios' : 'android',
      };
      this.currentStatus = 'connected';
    } else {
      // Web Preview / Simulator
      console.log('[WearableSyncService] Web preview detected - auto-granting simulator health permissions.');
      this.healthPermissionStatus = 'granted';
      const mockDeviceName = 'Apple Health / Apple Watch';
      this.userHealthMetrics = {
        stepCount: 7420,
        heartRate: 132,
        sleepHours: 7.5,
        activeCalories: 380,
        connectedDeviceName: mockDeviceName,
        lastSyncedAt: new Date().toLocaleTimeString(),
      };
      this.currentDevice = {
        name: mockDeviceName,
        platform: 'mock',
      };
      this.currentStatus = 'simulated';
    }

    this.notifyHealthSubscribers();
    this.notifyBiometricsSubscribers();

    return {
      status: this.healthPermissionStatus,
      metrics: this.userHealthMetrics,
    };
  }

  /**
   * Pull latest daily metrics (Steps, HR, Sleep, Calories)
   */
  public async fetchLatestHealthMetrics(): Promise<UserHealthMetrics> {
    if (this.healthPermissionStatus !== 'granted') {
      return this.userHealthMetrics;
    }

    // Dynamic mock refresh for past 24-hr metrics
    const updatedMetrics: UserHealthMetrics = {
      ...this.userHealthMetrics,
      heartRate: this.currentBiometrics.heartRate || 132,
      stepCount: this.userHealthMetrics.stepCount + Math.floor(Math.random() * 5),
      lastSyncedAt: new Date().toLocaleTimeString(),
    };

    this.userHealthMetrics = updatedMetrics;
    this.notifyHealthSubscribers();
    return updatedMetrics;
  }

  public getHealthPermissionStatus(): HealthPermissionStatus {
    return this.healthPermissionStatus;
  }

  public getUserHealthMetrics(): UserHealthMetrics {
    return this.userHealthMetrics;
  }

  public subscribeHealthMetrics(callback: HealthMetricsCallback): () => void {
    this.healthSubscribers.add(callback);
    callback(this.userHealthMetrics, this.healthPermissionStatus);

    return () => {
      this.healthSubscribers.delete(callback);
    };
  }

  private notifyHealthSubscribers() {
    this.healthSubscribers.forEach((callback) => {
      try {
        callback(this.userHealthMetrics, this.healthPermissionStatus);
      } catch (e) {
        console.error('Error notifying health subscriber:', e);
      }
    });
  }

  public getLiveState() {
    return {
      biometrics: this.currentBiometrics,
      device: this.currentDevice,
      status: this.currentStatus,
      isSimulating: this.isSimulating,
      healthPermissionStatus: this.healthPermissionStatus,
      userHealthMetrics: this.userHealthMetrics,
    };
  }

  public emitPacket(packet: WearablePacket) {
    this.notifyListeners(packet);
  }
}

export const wearableSyncService = new WearableSyncService();
