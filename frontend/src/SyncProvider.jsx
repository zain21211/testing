import React, { createContext, useContext, useEffect, useState } from 'react';
import { offlineService } from './services/offlineService';
import { backgroundSyncService } from './services/backgroundSyncService';
import { useRealOnlineStatus } from './hooks/IsOnlineHook';

const SyncContext = createContext();

export const SyncProvider = ({ children }) => {
  const isOnline = useRealOnlineStatus();
  const [isSyncing, setIsSyncing] = useState(false);
  const fullSync = async () => {
    const currentToken = localStorage.getItem("authToken");
    if (!isOnline || !currentToken) return;
    setIsSyncing(true);
    console.log("🔄 Background Sync Started...");
    try {
      await Promise.all([
        offlineService.syncCustomers(currentToken),
        offlineService.syncProducts(currentToken),
        offlineService.syncSchemes(currentToken),
        offlineService.syncPackingData(),       // ← Packing list cache
        backgroundSyncService.syncInvoices(),
        backgroundSyncService.syncRecoveries(),
      ]);
      console.log("✅ Background Sync Complete");
    } catch (e) {
      console.error("❌ Background Sync Failed:", e);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (isOnline) {
      // Small delay to ensure localStorage is updated if we just logged in
      const timer = setTimeout(() => {
        fullSync();
      }, 1000);
      
      // Sync every 5 minutes while app is open and online
      const interval = setInterval(fullSync, 5 * 60 * 1000);
      return () => {
        clearTimeout(timer);
        clearInterval(interval);
      };
    }
  }, [isOnline]);

  return (
    <SyncContext.Provider value={{ isSyncing, fullSync }}>
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => useContext(SyncContext);
