import React, { createContext, useContext, useEffect, useState } from 'react';
import { offlineService } from './services/offlineService';
import { useRealOnlineStatus } from './hooks/IsOnlineHook';

const SyncContext = createContext();

export const SyncProvider = ({ children }) => {
  const isOnline = useRealOnlineStatus();
  const [isSyncing, setIsSyncing] = useState(false);
  const token = localStorage.getItem("authToken");

  const fullSync = async () => {
    if (!isOnline || !token) return;
    setIsSyncing(true);
    console.log("🔄 Background Sync Started...");
    try {
      await Promise.all([
        offlineService.syncCustomers(token),
        offlineService.syncProducts(token),
        offlineService.syncSchemes(token)
      ]);
      console.log("✅ Background Sync Complete");
    } catch (e) {
      console.error("❌ Background Sync Failed:", e);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (isOnline && token) {
      fullSync();
      // Sync every 5 minutes while app is open and online
      const interval = setInterval(fullSync, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [isOnline, token]);

  return (
    <SyncContext.Provider value={{ isSyncing, fullSync }}>
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => useContext(SyncContext);
