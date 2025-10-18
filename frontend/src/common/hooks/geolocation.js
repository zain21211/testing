// hooks/useGeolocation.js
import { useEffect, useState } from "react";
import axios from "axios";

export default function useGeolocation() {
  const [coordinates, setCoordinates] = useState({ latitude: null, longitude: null });
  const [address, setAddress] = useState(null);
  const [error, setError] = useState(null);

  // Reverse geocode helper
  async function reverseGeocode(lat, lon) {
    try {
      const res = await axios.get("https://nominatim.openstreetmap.org/reverse", {
        params: {
          lat,
          lon,
          format: "json",
          email: "zainalip605@gmail.com", // OSM requires an identifier
        },
        headers: {
          "Accept-Language": "en",
        },
      });
      return res.data.display_name || null;
    } catch (err) {
      console.error("Reverse geocode error:", err.message);
      return null;
    }
  }

  useEffect(() => {
    // Avoid running in SSR
    if (typeof window === "undefined" || !navigator.geolocation) {
      setError("Geolocation not supported in this environment");
      return;
    }

    async function fetchLocation() {
      console.log("Fetching location…");

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setCoordinates({ latitude, longitude });

          const readable = await reverseGeocode(latitude, longitude);
          setAddress(readable);
        },
        async (geoErr) => {
          console.warn("Geolocation failed:", geoErr.message);

          // Fallback to IP-based location
          // try {
          //   const ipRes = await axios.get(
          //     "https://ipinfo.io/json?token=c414f57e-e84e-4952-9535-8439f51988a4"
          //   );
          //   const [lat, lon] = ipRes.data.loc.split(",");
          //   setCoordinates({ latitude: parseFloat(lat), longitude: parseFloat(lon) });

          //   const readable = await reverseGeocode(lat, lon);
          //   setAddress(readable);
          // } catch (ipErr) {
          //   setError("Failed to get location: " + ipErr.message);
          // }
        },
        {
          enableHighAccuracy: true, // better GPS precision
          timeout: 10000, // fail faster to fallback
          maximumAge: 0, // don’t reuse old cached position
        }
      );
    }

    fetchLocation();
  }, []);

  return { coordinates, address, error };
}
