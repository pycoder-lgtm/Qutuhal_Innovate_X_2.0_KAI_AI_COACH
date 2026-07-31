/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { GpsPoint } from '../types';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Navigation, Play, Pause, Square, Smartphone, MapPin, 
  Activity, Gauge, Zap, Flame, Compass, AlertCircle, CheckCircle2, RotateCcw,
  Search, ExternalLink, Sparkles, Laptop, Globe, Layers, ArrowUpRight,
  Share2, ChevronLeft, MoreVertical, BarChart3, ListFilter, TrendingUp, Footprints
} from 'lucide-react';

interface GpsTrackerProps {
  userWeightKg?: number;
  onSaveGpsWorkout: (data: {
    distanceKm: number;
    durationSec: number;
    workoutDesc: string;
    gpsTrack: {
      durationSec: number;
      distanceKm: number;
      avgSpeedKmh: number;
      maxSpeedKmh: number;
      points: GpsPoint[];
      activityType: 'run' | 'walk' | 'cycle' | 'hike';
    };
  }) => void;
}

interface NearbyRoute {
  name: string;
  address: string;
  distanceKm: number;
  surface: string;
  type: string;
  description: string;
  googleMapsUrl?: string;
  lat?: number;
  lng?: number;
}

// Haversine distance formula in kilometers
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function GpsTracker({ userWeightKg = 70, onSaveGpsWorkout }: GpsTrackerProps) {
  // Navigation Sub-Tabs: 'ROUTES' | 'DETAILS' | 'DIAGRAM'
  const [activeTab, setActiveTab] = useState<'ROUTES' | 'DETAILS' | 'DIAGRAM'>('ROUTES');

  // Tracking Mode: 'gps' (hardware device geolocation) or 'virtual' (indoor treadmill/home motion)
  const [trackingMode, setTrackingMode] = useState<'gps' | 'virtual'>('gps');

  // Tracking state
  const [activityType, setActivityType] = useState<'run' | 'walk' | 'cycle' | 'hike'>('run');
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  
  const [points, setPoints] = useState<GpsPoint[]>([]);
  const [distanceKm, setDistanceKm] = useState<number>(1.22); // Default initial view demo distance
  const [durationSec, setDurationSec] = useState<number>(360); // Default 6:00
  const [currentSpeedKmh, setCurrentSpeedKmh] = useState<number>(12.2);
  const [maxSpeedKmh, setMaxSpeedKmh] = useState<number>(14.5);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Map tile style ('voyager' | 'osm' | 'dark')
  const [mapTileStyle, setMapTileStyle] = useState<'voyager' | 'osm' | 'dark'>('voyager');

  // Selected Google Maps route target
  const [selectedRoute, setSelectedRoute] = useState<NearbyRoute | null>(null);

  // Google Maps Grounding Search State
  const [searchLocation, setSearchLocation] = useState<string>('');
  const [isSearchingRoutes, setIsSearchingRoutes] = useState<boolean>(false);
  const [nearbyRoutes, setNearbyRoutes] = useState<NearbyRoute[]>([]);
  const [routesSearchLocationLabel, setRoutesSearchLocationLabel] = useState<string>('');

  // Leaflet map references
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const startMarkerRef = useRef<L.Marker | null>(null);
  const endMarkerRef = useRef<L.Marker | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const timerRef = useRef<any>(null);
  const simIntervalRef = useRef<any>(null);

  // Generate initial sample loop coordinates (e.g. Al Raha Beach / Island Loop as in the photo)
  useEffect(() => {
    const baseLat = 24.4320;
    const baseLng = 54.5820;
    const initialPoints: GpsPoint[] = [
      { lat: baseLat, lng: baseLng, timestamp: Date.now() - 360000 },
      { lat: baseLat + 0.002, lng: baseLng + 0.003, timestamp: Date.now() - 300000 },
      { lat: baseLat + 0.005, lng: baseLng + 0.006, timestamp: Date.now() - 240000 },
      { lat: baseLat + 0.007, lng: baseLng + 0.004, timestamp: Date.now() - 180000 },
      { lat: baseLat + 0.006, lng: baseLng - 0.001, timestamp: Date.now() - 120000 },
      { lat: baseLat + 0.003, lng: baseLng - 0.002, timestamp: Date.now() - 60000 },
      { lat: baseLat + 0.001, lng: baseLng + 0.001, timestamp: Date.now() },
    ];
    setPoints(initialPoints);
    fetchNearbyRoutes('Al Raha Creek, Abu Dhabi');
  }, []);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Default center: Al Raha Beach Island loop or current points center
      const initialCenter: [number, number] = points.length > 0 
        ? [points[0].lat, points[0].lng] 
        : [24.4320, 54.5820];

      const map = L.map(mapContainerRef.current, {
        center: initialCenter,
        zoom: 15,
        zoomControl: false,
        attributionControl: false
      });

      // Add Zoom Control to bottom right
      L.control.zoom({ position: 'topright' }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Remove old tile layer
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    // Tile URLs
    let tileUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'; // Default Voyager bright street map
    if (mapTileStyle === 'osm') {
      tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    } else if (mapTileStyle === 'dark') {
      tileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    }

    const newTileLayer = L.tileLayer(tileUrl, { maxZoom: 19 }).addTo(map);
    tileLayerRef.current = newTileLayer;

    // Trigger map invalidateSize to prevent rendering glitches
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

  }, [activeTab, mapTileStyle]);

  // Update Route Polyline & Markers whenever points change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (points.length === 0) return;

    const latLngs: [number, number][] = points.map((p) => [p.lat, p.lng]);

    // Update Polyline
    if (polylineRef.current) {
      polylineRef.current.setLatLngs(latLngs);
    } else {
      polylineRef.current = L.polyline(latLngs, {
        color: '#f97316', // Vibrant orange line as shown in the photo
        weight: 5,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);
    }

    // Start Marker (Green circle with 'S')
    const startPoint = points[0];
    const startIcon = L.divIcon({
      className: 'custom-start-marker',
      html: `<div style="background-color: #10b981; border: 2px solid #ffffff; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 11px; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">S</div>`,
      iconSize: [26, 26],
      iconAnchor: [13, 13]
    });

    if (startMarkerRef.current) {
      startMarkerRef.current.setLatLng([startPoint.lat, startPoint.lng]);
    } else {
      startMarkerRef.current = L.marker([startPoint.lat, startPoint.lng], { icon: startIcon }).addTo(map);
    }

    // End / Current Marker (Red circle with 'E' or pulse)
    const lastPoint = points[points.length - 1];
    const endIcon = L.divIcon({
      className: 'custom-end-marker',
      html: `<div style="background-color: #ef4444; border: 2px solid #ffffff; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 11px; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">E</div>`,
      iconSize: [26, 26],
      iconAnchor: [13, 13]
    });

    if (endMarkerRef.current) {
      endMarkerRef.current.setLatLng([lastPoint.lat, lastPoint.lng]);
    } else {
      endMarkerRef.current = L.marker([lastPoint.lat, lastPoint.lng], { icon: endIcon }).addTo(map);
    }

    // Fit map bounds to show full route
    if (latLngs.length > 1) {
      const bounds = L.latLngBounds(latLngs);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 });
    } else {
      map.setView([startPoint.lat, startPoint.lng], 16);
    }

  }, [points]);

  // Timer tick effect when tracking
  useEffect(() => {
    if (isTracking && !isPaused) {
      timerRef.current = setInterval(() => {
        setDurationSec((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTracking, isPaused]);

  // Fetch nearby outdoor routes using Google Maps Grounding endpoint
  const fetchNearbyRoutes = async (locQuery?: string) => {
    setIsSearchingRoutes(true);
    try {
      let reqBody: any = { activityType };

      if (locQuery && locQuery.trim()) {
        reqBody.location = locQuery.trim();
      } else if ('geolocation' in navigator) {
        try {
          const pos: any = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 4000 });
          });
          reqBody.lat = pos.coords.latitude;
          reqBody.lng = pos.coords.longitude;
        } catch {
          reqBody.location = 'nearby outdoor parks';
        }
      } else {
        reqBody.location = 'Al Raha Creek Abu Dhabi';
      }

      const res = await fetch('/api/nearby-routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqBody)
      });

      if (!res.ok) throw new Error('Failed to fetch nearby routes');
      const data = await res.json();
      setNearbyRoutes(data.routes || []);
      setRoutesSearchLocationLabel(data.searchLocation || locQuery || 'Selected Location');
    } catch (err: any) {
      console.warn('Nearby routes search error:', err);
      // Fallback
      setNearbyRoutes([
        {
          name: 'Al Raha Island Loop Path',
          address: 'Al Raha Beach, Abu Dhabi, UAE',
          distanceKm: 2.8,
          surface: 'Paved waterfront trail',
          type: 'Island Waterfront',
          description: 'Scenic outdoor loop around the island with canal views and flat paved runners track.',
          googleMapsUrl: 'https://maps.google.com/?q=Al+Raha+Beach+Abu+Dhabi',
          lat: 24.4320,
          lng: 54.5820
        },
        {
          name: 'Central Park Reservoir Loop',
          address: 'Central Park, New York, NY',
          distanceKm: 2.5,
          surface: 'Crushed stone / Dirt',
          type: 'Park',
          description: 'Iconic flat running loop around the reservoir with skyline views.',
          googleMapsUrl: 'https://maps.google.com/?q=Central+Park+Reservoir+Loop',
          lat: 40.7829,
          lng: -73.9654
        }
      ]);
      setRoutesSearchLocationLabel('Recommended Outdoor Trails');
    } finally {
      setIsSearchingRoutes(false);
    }
  };

  // Start real GPS position watcher
  const startGpsTracking = () => {
    setErrorMsg(null);
    setSaveSuccess(false);

    if (!('geolocation' in navigator)) {
      setErrorMsg('Geolocation API is not supported by your browser.');
      return;
    }

    setIsTracking(true);
    setIsPaused(false);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, speed, accuracy } = position.coords;
        const timestamp = position.timestamp;

        setGpsAccuracy(accuracy ? Math.round(accuracy) : null);

        const speedKmh = speed !== null && speed >= 0 ? speed * 3.6 : 10.5;
        setCurrentSpeedKmh(Math.round(speedKmh * 10) / 10);
        setMaxSpeedKmh((prev) => Math.max(prev, Math.round(speedKmh * 10) / 10));

        const newPoint: GpsPoint = {
          lat: latitude,
          lng: longitude,
          timestamp,
          speedMs: speed,
          accuracy
        };

        setPoints((prevPoints) => {
          if (prevPoints.length > 0) {
            const lastPoint = prevPoints[prevPoints.length - 1];
            const incrementalDist = haversineDistance(
              lastPoint.lat,
              lastPoint.lng,
              newPoint.lat,
              newPoint.lng
            );

            if (incrementalDist >= 0.002 && (!accuracy || accuracy < 35)) {
              setDistanceKm((prevDist) => Math.round((prevDist + incrementalDist) * 100) / 100);
              return [...prevPoints, newPoint];
            }
            return prevPoints;
          }
          return [newPoint];
        });
      },
      (err) => {
        console.warn('GPS Watch Error:', err);
        if (err.code === err.PERMISSION_DENIED) {
          setErrorMsg('Location permission denied in browser. Switch to Virtual Motion mode or enable location permissions.');
        } else {
          setErrorMsg(`GPS Warning: ${err.message}. Showing active tracking.`);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 1000
      }
    );
  };

  // Start Simulated / Indoor Virtual Route Tracking
  const startVirtualTracking = () => {
    setErrorMsg(null);
    setSaveSuccess(false);
    setIsTracking(true);
    setIsPaused(false);

    let curLat = points.length > 0 ? points[points.length - 1].lat : 24.4320;
    let curLng = points.length > 0 ? points[points.length - 1].lng : 54.5820;

    const targetSpeed = activityType === 'cycle' ? 22.5 : activityType === 'run' ? 11.2 : activityType === 'hike' ? 6.2 : 5.0;
    setCurrentSpeedKmh(targetSpeed);
    setMaxSpeedKmh(targetSpeed + 3.2);
    setGpsAccuracy(4);

    simIntervalRef.current = setInterval(() => {
      const deltaLat = (Math.random() - 0.2) * 0.0002;
      const deltaLng = (Math.random() + 0.35) * 0.00025;
      curLat += deltaLat;
      curLng += deltaLng;

      const newPoint: GpsPoint = {
        lat: curLat,
        lng: curLng,
        timestamp: Date.now(),
        speedMs: targetSpeed / 3.6,
        accuracy: 4
      };

      setPoints((prev) => {
        if (prev.length > 0) {
          const last = prev[prev.length - 1];
          const dist = haversineDistance(last.lat, last.lng, curLat, curLng);
          setDistanceKm((d) => Math.round((d + dist) * 100) / 100);
          return [...prev, newPoint];
        }
        return [newPoint];
      });
    }, 2000);
  };

  const handleStart = () => {
    if (trackingMode === 'gps') {
      startGpsTracking();
    } else {
      startVirtualTracking();
    }
  };

  const handlePause = () => {
    setIsPaused(true);
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
  };

  const handleResume = () => {
    setIsPaused(false);
    if (trackingMode === 'gps') {
      startGpsTracking();
    } else {
      startVirtualTracking();
    }
  };

  const handleReset = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
    setIsTracking(false);
    setIsPaused(false);
    setDistanceKm(0);
    setDurationSec(0);
    setCurrentSpeedKmh(0);
    setMaxSpeedKmh(0);
    setGpsAccuracy(null);
    setErrorMsg(null);
  };

  const handleStopAndSave = () => {
    handlePause();

    const routeTag = selectedRoute ? ` [${selectedRoute.name}]` : '';
    const modeTag = trackingMode === 'gps' ? 'GPS Outdoor' : 'Virtual Indoor';
    const activityLabel = 
      activityType === 'run' ? `${modeTag} Run${routeTag}` :
      activityType === 'walk' ? `${modeTag} Walk${routeTag}` :
      activityType === 'cycle' ? `${modeTag} Cycle${routeTag}` : `${modeTag} Hike${routeTag}`;

    const mins = Math.floor(durationSec / 60);
    const secs = durationSec % 60;
    const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    const workoutDesc = `${activityLabel} (${distanceKm.toFixed(2)} km in ${timeStr})`;

    const avgSpeed = durationSec > 0 ? Math.round((distanceKm / (durationSec / 3600)) * 10) / 10 : 0;

    onSaveGpsWorkout({
      distanceKm: Math.max(distanceKm, 0.01),
      durationSec,
      workoutDesc,
      gpsTrack: {
        durationSec,
        distanceKm,
        avgSpeedKmh: avgSpeed,
        maxSpeedKmh,
        points,
        activityType
      }
    });

    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 4000);
  };

  // Format Timer
  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Estimated MET & Steps
  const met = activityType === 'run' ? 9.8 : activityType === 'walk' ? 3.8 : activityType === 'cycle' ? 8.0 : 6.0;
  const estCalories = Math.round((met * userWeightKg * (durationSec / 3600)));
  const estSteps = Math.round(distanceKm * 1320); // ~1320 steps per km

  // Pace string calculation (e.g. 4'55")
  const paceSecondsPerKm = distanceKm > 0 ? (durationSec / distanceKm) : 0;
  const paceMins = Math.floor(paceSecondsPerKm / 60);
  const paceSecs = Math.floor(paceSecondsPerKm % 60);
  const paceStr = paceSecondsPerKm > 0 ? `${paceMins}'${paceSecs.toString().padStart(2, '0')}"` : `--'--"`;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl font-sans">
      
      {/* Phone App Title Bar Header */}
      <div className="bg-slate-950 px-4 py-3.5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button className="text-slate-400 hover:text-white transition">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-sm font-black text-white uppercase tracking-wider font-display">
              Outdoor Run
            </h2>
            <p className="text-[10px] text-slate-400 font-semibold">
              Live Satellite GPS & Route Analytics
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Hardware Device Toggle */}
          <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800">
            <button
              onClick={() => setTrackingMode('gps')}
              className={`px-2 py-1 rounded text-[10px] font-bold transition ${
                trackingMode === 'gps' ? 'bg-sky-500 text-slate-950 font-black' : 'text-slate-400'
              }`}
              title="Use hardware GPS"
            >
              GPS
            </button>
            <button
              onClick={() => setTrackingMode('virtual')}
              className={`px-2 py-1 rounded text-[10px] font-bold transition ${
                trackingMode === 'virtual' ? 'bg-sky-500 text-slate-950 font-black' : 'text-slate-400'
              }`}
              title="Indoor virtual motion mode"
            >
              Virtual
            </button>
          </div>

          <button className="p-1.5 text-slate-400 hover:text-white transition">
            <Share2 className="w-4 h-4" />
          </button>
          <button className="p-1.5 text-slate-400 hover:text-white transition">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tabs matching the image: ROUTES | DETAILS | DIAGRAM */}
      <div className="bg-slate-950 border-b border-slate-800 flex items-center justify-around">
        {(['ROUTES', 'DETAILS', 'DIAGRAM'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-xs font-black uppercase tracking-widest text-center transition relative cursor-pointer ${
              activeTab === tab ? 'text-orange-500' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab}
            {activeTab === tab && (
              <span className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-amber-500 rounded-t-md" />
            )}
          </button>
        ))}
      </div>

      {/* TAB 1: ROUTES MAP VIEW */}
      {activeTab === 'ROUTES' && (
        <div className="relative">
          
          {/* Leaflet Map Display */}
          <div className="relative w-full h-[320px] sm:h-[380px] bg-slate-950">
            <div ref={mapContainerRef} className="w-full h-full z-0" />

            {/* Floating Top Controls Overlay */}
            <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
              
              {/* Tile Style Picker */}
              <div className="pointer-events-auto bg-slate-950/80 backdrop-blur-md border border-slate-800 p-1 rounded-xl flex items-center gap-1 shadow-lg">
                <button
                  onClick={() => setMapTileStyle('voyager')}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                    mapTileStyle === 'voyager' ? 'bg-orange-500 text-slate-950 font-black' : 'text-slate-300'
                  }`}
                >
                  Voyager
                </button>
                <button
                  onClick={() => setMapTileStyle('osm')}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                    mapTileStyle === 'osm' ? 'bg-orange-500 text-slate-950 font-black' : 'text-slate-300'
                  }`}
                >
                  Streets
                </button>
                <button
                  onClick={() => setMapTileStyle('dark')}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                    mapTileStyle === 'dark' ? 'bg-orange-500 text-slate-950 font-black' : 'text-slate-300'
                  }`}
                >
                  Dark
                </button>
              </div>

              {/* Satellite / GPS Status indicator */}
              <div className="pointer-events-auto bg-slate-950/80 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-xl flex items-center gap-2 text-xs font-mono font-bold text-white shadow-lg">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>{trackingMode === 'gps' ? 'GPS SATELLITE' : 'VIRTUAL TRACK'}</span>
              </div>
            </div>

            {/* Floating Re-center Button */}
            <button
              onClick={() => {
                if (mapInstanceRef.current && points.length > 0) {
                  const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
                  mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40] });
                }
              }}
              className="absolute bottom-4 right-4 z-10 p-2.5 bg-slate-950/90 backdrop-blur-md border border-slate-800 text-orange-400 rounded-xl shadow-xl hover:bg-slate-900 transition cursor-pointer"
              title="Recenter Map on Route"
            >
              <Compass className="w-5 h-5" />
            </button>
          </div>

          {/* Bottom Docked Stats Card Panel matching the photo! */}
          <div className="bg-slate-950 border-t border-slate-800 p-5 space-y-4">
            
            {/* Prominent Large Distance Display */}
            <div className="text-center space-y-0.5">
              <div className="text-4xl sm:text-5xl font-black text-white font-mono tracking-tight">
                {distanceKm.toFixed(2)}
              </div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">
                km
              </div>
            </div>

            {/* Grid Stat Tiles matching photo: Time, kcal, Steps */}
            <div className="grid grid-cols-3 gap-2 bg-slate-900/80 p-3 rounded-2xl border border-slate-800 text-center">
              
              <div className="space-y-0.5">
                <div className="text-lg font-black text-white font-mono">
                  {formatTime(durationSec)}
                </div>
                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                  Time
                </div>
              </div>

              <div className="space-y-0.5 border-x border-slate-800">
                <div className="text-lg font-black text-white font-mono">
                  {estCalories}
                </div>
                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                  kcal
                </div>
              </div>

              <div className="space-y-0.5">
                <div className="text-lg font-black text-white font-mono">
                  {estSteps}
                </div>
                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                  Steps
                </div>
              </div>

            </div>

            {/* Pace & Speed secondary metrics */}
            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="bg-slate-900/50 p-2 rounded-xl border border-slate-800/80 flex items-center justify-between px-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Avg Pace:</span>
                <span className="font-mono font-bold text-orange-400">{paceStr} /km</span>
              </div>
              <div className="bg-slate-900/50 p-2 rounded-xl border border-slate-800/80 flex items-center justify-between px-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Speed:</span>
                <span className="font-mono font-bold text-sky-400">{currentSpeedKmh.toFixed(1)} km/h</span>
              </div>
            </div>

            {/* Action Buttons: Start / Pause / Resume / Save */}
            <div className="flex items-center gap-3 pt-1">
              {!isTracking ? (
                <button
                  onClick={handleStart}
                  className="flex-1 py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 font-black rounded-xl text-xs uppercase tracking-widest shadow-lg hover:opacity-95 transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-slate-950" />
                  Start Outdoor Run
                </button>
              ) : (
                <>
                  {isPaused ? (
                    <button
                      onClick={handleResume}
                      className="flex-1 py-3.5 bg-emerald-500 text-slate-950 font-black rounded-xl text-xs uppercase tracking-widest shadow-lg hover:bg-emerald-400 transition cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Play className="w-4 h-4 fill-slate-950" />
                      Resume
                    </button>
                  ) : (
                    <button
                      onClick={handlePause}
                      className="flex-1 py-3.5 bg-amber-500 text-slate-950 font-black rounded-xl text-xs uppercase tracking-widest shadow-lg hover:bg-amber-400 transition cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Pause className="w-4 h-4 fill-slate-950" />
                      Pause
                    </button>
                  )}

                  <button
                    onClick={handleStopAndSave}
                    className="flex-1 py-3.5 bg-sky-500 text-slate-950 font-black rounded-xl text-xs uppercase tracking-widest shadow-lg hover:bg-sky-400 transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Square className="w-4 h-4 fill-slate-950" />
                    Save Run
                  </button>

                  <button
                    onClick={handleReset}
                    className="p-3.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-rose-400 rounded-xl transition cursor-pointer"
                    title="Reset Track"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>

            {/* Error or Success notification */}
            {errorMsg && (
              <div className="p-3 bg-rose-950/40 border border-rose-900/50 rounded-xl text-rose-300 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {saveSuccess && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-900/50 rounded-xl text-emerald-300 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>Run logged successfully in your Daily Progress Journal!</span>
              </div>
            )}

          </div>

        </div>
      )}

      {/* TAB 2: DETAILS VIEW */}
      {activeTab === 'DETAILS' && (
        <div className="p-6 space-y-6 bg-slate-950">
          
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-display flex items-center gap-2">
              <ListFilter className="w-4 h-4 text-orange-400" />
              Workout Splits & Performance Details
            </h3>
            <span className="text-[10px] font-mono text-slate-400">{distanceKm.toFixed(2)} km Total</span>
          </div>

          {/* Kilometer Splits Table */}
          <div className="space-y-2">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Kilometer Splits</div>
            
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800 text-xs font-mono">
              <div className="p-3 flex justify-between items-center bg-slate-950 text-slate-400 font-bold uppercase text-[10px]">
                <span>KM</span>
                <span>Pace</span>
                <span>Avg Speed</span>
                <span>Elevation</span>
              </div>

              <div className="p-3 flex justify-between items-center text-white">
                <span className="font-bold text-orange-400">1 KM</span>
                <span>4'52" /km</span>
                <span>12.3 km/h</span>
                <span>+4m</span>
              </div>

              {distanceKm >= 2 && (
                <div className="p-3 flex justify-between items-center text-white">
                  <span className="font-bold text-orange-400">2 KM</span>
                  <span>4'58" /km</span>
                  <span>12.1 km/h</span>
                  <span>+6m</span>
                </div>
              )}

              {distanceKm >= 3 && (
                <div className="p-3 flex justify-between items-center text-white">
                  <span className="font-bold text-orange-400">3 KM</span>
                  <span>5'04" /km</span>
                  <span>11.8 km/h</span>
                  <span>+2m</span>
                </div>
              )}
            </div>
          </div>

          {/* Biometric Breakdown Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Cadence</span>
              <span className="text-lg font-black text-white font-mono">152 <span className="text-xs text-slate-400">spm</span></span>
            </div>
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Max Speed</span>
              <span className="text-lg font-black text-sky-400 font-mono">{maxSpeedKmh.toFixed(1)} <span className="text-xs text-slate-400">km/h</span></span>
            </div>
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Elevation Gain</span>
              <span className="text-lg font-black text-emerald-400 font-mono">+12 <span className="text-xs text-slate-400">m</span></span>
            </div>
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Est. Heart Rate Zone</span>
              <span className="text-lg font-black text-rose-400 font-mono">148 <span className="text-xs text-slate-400">bpm (Aerobic)</span></span>
            </div>
          </div>

        </div>
      )}

      {/* TAB 3: DIAGRAM VIEW */}
      {activeTab === 'DIAGRAM' && (
        <div className="p-6 space-y-6 bg-slate-950">
          
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-display flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-orange-400" />
              Pace & Elevation Profile Diagrams
            </h3>
          </div>

          {/* Pace Variation Chart */}
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase">Pace Distribution (/km)</span>
              <span className="text-[10px] font-mono text-orange-400">Avg {paceStr}</span>
            </div>

            <div className="h-28 flex items-end gap-2 pt-4 pb-1 px-2 border-b border-slate-800">
              {[70, 85, 95, 80, 90, 100, 75, 88].map((val, idx) => (
                <div key={idx} className="flex-1 bg-slate-950 rounded-t flex flex-col justify-end h-full group relative">
                  <div 
                    style={{ height: `${val}%` }} 
                    className="bg-gradient-to-t from-orange-600 to-amber-400 rounded-t transition-all group-hover:brightness-125"
                  />
                  <div className="opacity-0 group-hover:opacity-100 absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-950 border border-slate-800 text-[9px] text-white px-1 py-0.5 rounded font-mono">
                    {val}%
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[9px] font-mono text-slate-500">
              <span>Start</span>
              <span>Midpoint</span>
              <span>Finish</span>
            </div>
          </div>

          {/* Speed Curve Chart */}
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase">Speed Curve (km/h)</span>
              <span className="text-[10px] font-mono text-sky-400">Peak {maxSpeedKmh.toFixed(1)} km/h</span>
            </div>

            <div className="h-24 flex items-end gap-1.5 pt-4 pb-1 px-2 border-b border-slate-800">
              {[40, 60, 75, 90, 85, 95, 70, 80, 65, 85, 90, 75].map((val, idx) => (
                <div key={idx} className="flex-1 bg-sky-500/10 rounded-t flex flex-col justify-end h-full">
                  <div 
                    style={{ height: `${val}%` }} 
                    className="bg-sky-500 rounded-t"
                  />
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* Grounded Google Maps Trail & Route Finder Footer */}
      <div className="border-t border-slate-800 p-5 bg-slate-950 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-orange-500/10 text-orange-400 rounded-lg border border-orange-500/20">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-display flex items-center gap-1.5">
                Google Maps Outdoor Route Grounding
                <span className="text-[9px] bg-orange-500/20 text-orange-300 border border-orange-500/30 px-1.5 py-0.2 rounded font-mono font-bold">
                  Google Maps
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                Verified outdoor running loops & parks near your location
              </p>
            </div>
          </div>

          <button
            onClick={() => fetchNearbyRoutes()}
            disabled={isSearchingRoutes}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-orange-400 hover:text-orange-300 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 disabled:opacity-50"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Search Near Me</span>
          </button>
        </div>

        {/* Location Search Bar */}
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            fetchNearbyRoutes(searchLocation);
          }}
          className="flex items-center gap-2 bg-slate-900 p-2 rounded-xl border border-slate-800"
        >
          <Search className="w-4 h-4 text-slate-500 ml-2 shrink-0" />
          <input
            type="text"
            value={searchLocation}
            onChange={(e) => setSearchLocation(e.target.value)}
            placeholder="Search city, neighborhood or park (e.g. Al Raha Beach, Abu Dhabi)..."
            className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={isSearchingRoutes}
            className="bg-orange-500 hover:bg-orange-400 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition cursor-pointer disabled:opacity-50"
          >
            {isSearchingRoutes ? 'Searching...' : 'Search'}
          </button>
        </form>

        {/* Nearby Route Cards List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {nearbyRoutes.map((route, idx) => (
            <div 
              key={idx}
              className={`bg-slate-900 border p-3.5 rounded-xl space-y-2 transition ${
                selectedRoute?.name === route.name
                  ? 'border-orange-500 bg-orange-950/20'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    {route.name}
                    <span className="text-[9px] bg-slate-950 border border-slate-800 px-1.5 py-0.2 rounded text-slate-400 uppercase font-mono">
                      {route.type}
                    </span>
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">{route.address}</p>
                </div>
                <span className="text-xs font-black font-mono text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-lg border border-orange-500/20 shrink-0">
                  {route.distanceKm} km
                </span>
              </div>

              <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
                {route.description}
              </p>

              <div className="flex items-center justify-between border-t border-slate-800/80 pt-2">
                <span className="text-[10px] text-slate-400 font-mono">
                  Surface: <strong className="text-slate-300">{route.surface}</strong>
                </span>

                <div className="flex items-center gap-2">
                  {route.googleMapsUrl && (
                    <a
                      href={route.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-bold text-slate-400 hover:text-orange-400 flex items-center gap-1 transition"
                    >
                      Maps <ArrowUpRight className="w-3 h-3" />
                    </a>
                  )}

                  <button
                    onClick={() => {
                      setSelectedRoute(route);
                      if (route.lat && route.lng && mapInstanceRef.current) {
                        mapInstanceRef.current.setView([route.lat, route.lng], 15);
                      }
                    }}
                    className="bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition cursor-pointer"
                  >
                    Select Route
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>

    </div>
  );
}
