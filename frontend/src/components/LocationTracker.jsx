/**
 * LocationTracker.jsx
 *
 * Invisible background component mounted for SPO / SM users.
 * - Pings location every 5 min between 10:00–20:00 (PKT), not on Fridays.
 * - Listens for SW_LOCATION_PING_REQUEST messages from the service worker
 *   and replies with current GPS coords (covers background / app-closed case).
 * - Registers Periodic Background Sync so the SW can wake the session.
 */

import { useEffect, useRef, useCallback } from "react";

const PING_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const WORK_START_HOUR  = 10;             // 10:00
const WORK_END_HOUR    = 20;             // 20:00 (8 PM)
const API_URL          = import.meta.env.VITE_API_URL || "/api";
const PING_CACHE_KEY   = "offline_tracking_pings";

// ─── Offline Support ─────────────────────────────────────────────────────────

function getCachedPings() {
  try { return JSON.parse(localStorage.getItem(PING_CACHE_KEY)) || []; }
  catch { return []; }
}

function addCachedPing(ping) {
  const pings = getCachedPings();
  pings.push(ping);
  localStorage.setItem(PING_CACHE_KEY, JSON.stringify(pings));
}

function clearCachedPings() {
  localStorage.removeItem(PING_CACHE_KEY);
}

async function syncOfflinePings() {
  const pings = getCachedPings();
  if (pings.length === 0) return;
  
  try {
    for (const ping of pings) {
      await fetch(`${API_URL}/tracking/ping`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ping),
      });
    }
    clearCachedPings();
  } catch (err) {
    // Silently fail
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns true if right now is within working hours and not Friday */
function isWorkingTime() {
  const now = new Date();
  const day  = now.getDay();    // 0=Sun … 5=Fri … 6=Sat
  const hour = now.getHours();
  if (day === 5) return false;  // Friday — skip
  return hour >= WORK_START_HOUR && hour < WORK_END_HOUR;
}

/** Get current position wrapped in a Promise */
function getCurrentPosition(options = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 60000,
      ...options,
    });
  });
}

/** POST location ping to backend */
async function postPing({ username, userType, latitude, longitude, accuracy, timestamp = Date.now() }) {
  const payload = { username, userType, latitude, longitude, accuracy, timestamp };
  try {
    const resp = await fetch(`${API_URL}/tracking/ping`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true, // fires even if the page is being unloaded
    });
    if (!resp.ok) throw new Error("Network response was not ok");
    
    // Attempt to sync any cached offline pings
    syncOfflinePings();
    
    return await resp.json();
  } catch (err) {
    addCachedPing(payload);
    throw err;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LocationTracker({ user }) {
  const timerRef    = useRef(null);
  const isRunning   = useRef(false);

  const username = user?.username;
  const userType = user?.userType;

  // ── Core ping function ───────────────────────────────────────────────────
  const doPing = useCallback(async () => {
    if (!isWorkingTime()) return;
    if (isRunning.current) return;
    isRunning.current = true;
    try {
      const pos = await getCurrentPosition();
      const { latitude, longitude, accuracy } = pos.coords;
      await postPing({ username, userType, latitude, longitude, accuracy });
      localStorage.setItem("lastTrackingPing", Date.now().toString());
    } catch (err) {
      // Silently fail
    } finally {
      isRunning.current = false;
    }
  }, [username, userType]);

  // ── 5-min interval ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!username) return;

    // Initial ping on mount (if working hours)
    doPing();

    // Schedule recurring pings
    timerRef.current = setInterval(doPing, PING_INTERVAL_MS);

    // Also trigger immediately on app foregrounding if enough time passed
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        syncOfflinePings(); // Try syncing when app comes back online
        const lastPing = parseInt(localStorage.getItem("lastTrackingPing") || "0", 10);
        if (Date.now() - lastPing >= PING_INTERVAL_MS) {
          doPing();
        }
      }
    };
    
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("online", syncOfflinePings);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("online", syncOfflinePings);
    };
  }, [username, doPing]);

  // ── Service Worker message relay ─────────────────────────────────────────
  useEffect(() => {
    if (!username || !("serviceWorker" in navigator)) return;

    const handleSwMessage = async (event) => {
      if (event.data?.type !== "SW_LOCATION_PING_REQUEST") return;
      if (!isWorkingTime()) return;

      try {
        const pos = await getCurrentPosition();
        const { latitude, longitude, accuracy } = pos.coords;

        // Reply to SW so it can post the data even if the tab goes to background
        if (navigator.serviceWorker?.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: "LOCATION_PING_RESPONSE",
            username,
            userType,
            latitude,
            longitude,
            accuracy,
            apiUrl: API_URL,
          });
        } else {
          // Fallback: post directly from the page
          await postPing({ username, userType, latitude, longitude, accuracy });
        }
      } catch (err) {
        // Silently fail
      }
    };

    navigator.serviceWorker.addEventListener("message", handleSwMessage);
    return () => navigator.serviceWorker.removeEventListener("message", handleSwMessage);
  }, [username, userType]);

  // ── Register Periodic Background Sync ────────────────────────────────────
  useEffect(() => {
    if (!username) return;
    if (!("serviceWorker" in navigator)) return;

    const registerSync = async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        if ("periodicSync" in reg) {
          const status = await navigator.permissions.query({ name: "periodic-background-sync" });
          if (status.state === "granted") {
            await reg.periodicSync.register("location-ping", {
              minInterval: PING_INTERVAL_MS,
            });
          }
        }
      } catch (err) {
        // Silently fail
      }
    };

    registerSync();
  }, [username]);

  // This component renders nothing — it's purely a side-effect runner
  return null;
}
