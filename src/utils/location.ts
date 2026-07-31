export interface UserLocation {
  latitude: number;
  longitude: number;
  city?: string;
  region?: string;
  country?: string;
  accuracy?: number;
  source: 'gps' | 'ip' | 'fallback';
}

export async function detectUserLocation(): Promise<UserLocation> {
  // 1. Try Browser HTML5 Geolocation
  const gpsLocation = await new Promise<UserLocation | null>((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 3500,
      maximumAge: 60000
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          source: 'gps'
        });
      },
      (err) => {
        console.warn("GPS Geolocation prompt or permission skipped/failed:", err.message);
        resolve(null);
      },
      options
    );
  });

  if (gpsLocation) {
    // Attempt reverse lookup for city name if possible via ipapi or openstreetmap
    try {
      const geoRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${gpsLocation.latitude}&longitude=${gpsLocation.longitude}&localityLanguage=en`);
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        gpsLocation.city = geoData.city || geoData.locality || geoData.principalSubdivision;
        gpsLocation.country = geoData.countryName;
        gpsLocation.region = geoData.principalSubdivision;
      }
    } catch {
      // Ignore reverse lookup errors
    }
    return gpsLocation;
  }

  // 2. Fallback to IP-based Geolocation (works seamlessly in all regions UAE, US, India, Cuba, Congo, etc.)
  try {
    const ipRes = await fetch("https://ipapi.co/json/");
    if (ipRes.ok) {
      const ipData = await ipRes.json();
      if (ipData && typeof ipData.latitude === 'number' && typeof ipData.longitude === 'number') {
        return {
          latitude: ipData.latitude,
          longitude: ipData.longitude,
          city: ipData.city,
          region: ipData.region,
          country: ipData.country_name || ipData.country,
          source: 'ip'
        };
      }
    }
  } catch (err) {
    console.warn("ipapi.co fallback failed, attempting secondary IP service", err);
  }

  try {
    const ip2Res = await fetch("https://ip-api.com/json/?fields=status,country,regionName,city,lat,lon");
    if (ip2Res.ok) {
      const ip2Data = await ip2Res.json();
      if (ip2Data.status === 'success') {
        return {
          latitude: ip2Data.lat,
          longitude: ip2Data.lon,
          city: ip2Data.city,
          region: ip2Data.regionName,
          country: ip2Data.country,
          source: 'ip'
        };
      }
    }
  } catch (err) {
    console.warn("Secondary IP service failed", err);
  }

  // Default fallback (Dubai, UAE as initial baseline if offline)
  return {
    latitude: 25.2048,
    longitude: 55.2708,
    city: "Dubai",
    country: "United Arab Emirates",
    source: 'fallback'
  };
}
