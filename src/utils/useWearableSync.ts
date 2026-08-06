import { useState, useEffect, useCallback } from 'react';
import { wearableSyncService } from '../services/WearableSyncService';
import { WearableBiometrics, WatchConnectionStatus, WatchDevice, HealthPermissionStatus, UserHealthMetrics } from '../types';

export function useWearableSync() {
  const initialState = wearableSyncService.getLiveState();

  const [biometrics, setBiometrics] = useState<WearableBiometrics>(initialState.biometrics);
  const [connectionStatus, setConnectionStatus] = useState<WatchConnectionStatus>(initialState.status);
  const [device, setDevice] = useState<WatchDevice>(initialState.device);
  const [isSimulating, setIsSimulating] = useState<boolean>(initialState.isSimulating);
  const [healthPermissionStatus, setHealthPermissionStatus] = useState<HealthPermissionStatus>(initialState.healthPermissionStatus);
  const [userHealthMetrics, setUserHealthMetrics] = useState<UserHealthMetrics>(initialState.userHealthMetrics);

  useEffect(() => {
    const unsubscribeBio = wearableSyncService.subscribeBiometrics((newBio, newDevice, newStatus) => {
      setBiometrics(newBio);
      setDevice(newDevice);
      setConnectionStatus(newStatus);
      setIsSimulating(newStatus === 'simulated');
    });

    const unsubscribeHealth = wearableSyncService.subscribeHealthMetrics((metrics, permission) => {
      setUserHealthMetrics(metrics);
      setHealthPermissionStatus(permission);
    });

    return () => {
      unsubscribeBio();
      unsubscribeHealth();
    };
  }, []);

  const toggleSimulation = useCallback((enable?: boolean) => {
    const active = wearableSyncService.toggleSimulation(enable);
    setIsSimulating(active);
  }, []);

  const connectDevice = useCallback((dev?: WatchDevice) => {
    wearableSyncService.connectDevice(dev);
  }, []);

  const connectWebBluetooth = useCallback(async (acceptAllDevicesFallback = false) => {
    return await wearableSyncService.connectWebBluetooth(acceptAllDevicesFallback);
  }, []);

  const disconnectWebBluetooth = useCallback(async () => {
    await wearableSyncService.disconnectWebBluetooth();
  }, []);

  const requestPermissions = useCallback(async () => {
    return await wearableSyncService.requestUniversalHealthPermissions();
  }, []);

  const fetchHealthMetrics = useCallback(async () => {
    return await wearableSyncService.fetchLatestHealthMetrics();
  }, []);

  return {
    biometrics,
    connectionStatus,
    device,
    isSimulating,
    healthPermissionStatus,
    userHealthMetrics,
    toggleSimulation,
    connectDevice,
    connectWebBluetooth,
    disconnectWebBluetooth,
    requestPermissions,
    fetchHealthMetrics,
    service: wearableSyncService,
  };
}
