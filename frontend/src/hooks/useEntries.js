import { useState, useEffect, useCallback } from "react";
import { useIndexedDBState } from "./indexDBHook";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

export const useEntries = (initialData = []) => {
  const [entries, setEntries] = useIndexedDBState(
    "recoveryPaperEntries",
    []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [totalAmount, setTotalAmount] = useState(0);
  const [totalCash, setTotalCash] = useState(0);
  const [totalJazzcash, setTotalJazzcash] = useState(0);
  const [totalEasypaisa, setTotalEasypaisa] = useState(0);
  const [totalCrownWallet, setTotalCrownWallet] = useState(0);
  const [totalMeezanBank, setTotalMeezanBank] = useState(0);
  const [totalTc, setTotalTc] = useState(0);
  const [totalHarr, setTotalHarr] = useState(0);
  const url = import.meta.env.VITE_API_URL;

  const handleRemoveEntry = (id) => {
    setEntries((prevEntries) =>
      prevEntries.filter((entry) => entry.creditID !== id)
    );
  };

  useEffect(() => {
    let overallTotal = 0;
    let cashOnlyTotal = 0;
    let jazzcashTotal = 0;
    let easypaisaTotal = 0;
    let crownWalletTotal = 0;
    let meezanBankTotal = 0;
    let tcTotal = 0;
    let harrTotal = 0;

    entries.forEach((entry) => {
      overallTotal += entry.entryTotal || 0;
      cashOnlyTotal += entry.amounts?.cash || 0;
      jazzcashTotal += entry.amounts?.jazzcash || 0;
      easypaisaTotal += entry.amounts?.easypaisa || 0;
      crownWalletTotal += entry.amounts?.crownWallet || 0;
      meezanBankTotal += entry.amounts?.meezanBank || 0;
      tcTotal += entry.amounts?.tc || 0;
      harrTotal += entry.amounts?.harr || 0;
    });

    setTotalAmount(overallTotal);
    setTotalCash(cashOnlyTotal);
    setTotalJazzcash(jazzcashTotal);
    setTotalEasypaisa(easypaisaTotal);
    setTotalCrownWallet(crownWalletTotal);
    setTotalMeezanBank(meezanBankTotal);
    setTotalTc(tcTotal);
    setTotalHarr(harrTotal);
  }, [entries]);

  const makeCashEntry = useCallback(
    async (entry, coordinates, address) => {
      try {
        const {
          amounts,
          id,
          userName,
          description,
          timestamp,
          paymentImages,
          creditID,
          debitID,
          subEntryStatus = {},
        } = entry;

        const entriesToPost = Object.entries(amounts).filter(
          ([method, amount]) => amount > 0 && subEntryStatus[method] !== true
        );

        if (entriesToPost.length === 0) {
           return { allSuccess: true, newSubEntryStatus: subEntryStatus, errors: [] };
        }

        const postPromises = entriesToPost.map(async ([method, amount]) => {
          const payload = {
            creditID: `${creditID}_${method}`,
            debitID: `${debitID}_${method}`,
            paymentMethod: method.toLowerCase() === "crownwallet"
              ? "crownone"
              : method.toLowerCase() === "crownfit"
              ? "crownfit"
              : method.toLowerCase().includes("meezan")
              ? "mbl"
              : method,
            custId: id,
            receivedAmount: amount,
            userName,
            desc: description,
            time: timestamp,
            paymentImage: paymentImages?.[method] || null,
            location: {
              latitude: coordinates.latitude,
              longitude: coordinates.longitude,
              address,
            },
            imageStatus: entry.imageStatus,
          };

          try {
            const response = await axios.post(`${url}/cash-entry`, payload, { timeout: 45000 });
            if (response.status !== 200 && response.status !== 201) {
                return { method, success: false, error: response.data?.error || `Server Error (${response.status})` };
            }
            return { method, success: true, doc: response.data.doc };
          } catch (error) {
            if (error.response && error.response.status === 400 && error.response.data && error.response.data.error === "Duplicate transaction IDs") {
              return { method, success: true };
            }
            if (error.code === 'ECONNABORTED' || (error.message || '').toLowerCase().includes('network')) {
               return { method, success: false, error: 'Network Connection Failed' };
            }
            return { method, success: false, error: error.message || 'Database Layout/Unknown Error' };
          }
        });

        const results = await Promise.all(postPromises);
        
        let updatedSubEntryStatus = { ...subEntryStatus };
        let currentErrors = [];
        let generatedDocs = [];
        results.forEach(res => {
            updatedSubEntryStatus[res.method] = res.success;
            if (res.success && res.doc) {
                generatedDocs.push(res.doc);
            }
            if (!res.success && res.error) {
                currentErrors.push(`${res.method.toUpperCase()}: ${res.error}`);
            }
        });

        const allRequiredMethods = Object.entries(amounts).filter(([_, amount]) => amount > 0).map(([m]) => m);
        const allSuccess = allRequiredMethods.every(m => updatedSubEntryStatus[m] === true);

        return { allSuccess, newSubEntryStatus: updatedSubEntryStatus, errors: currentErrors, generatedDocs };
      } catch (error) {
        return { allSuccess: false, newSubEntryStatus: entry.subEntryStatus || {}, errors: [error.message] };
      }
    },
    [url]
  );

  const handleSyncOneEntry = useCallback(
    async (entryToSync, coordinates, address) => {
      const { allSuccess, newSubEntryStatus, errors } = await makeCashEntry(entryToSync, coordinates, address);
      
      setEntries((prevEntries) =>
        prevEntries.map((e) =>
          e.timestamp === entryToSync.timestamp && e.id === entryToSync.id
            ? { ...e, status: allSuccess, subEntryStatus: newSubEntryStatus, retryCount: allSuccess ? e.retryCount : (e.retryCount || 0) + 1 }
            : e
        )
      );
      
      return { success: allSuccess, errors };
    },
    [makeCashEntry, setEntries]
  );

  const addEntry = useCallback(
    async (newEntry, coordinates, address) => {
      // 1. Prepare entry with IDs
      const creditID = uuidv4();
      const debitID = uuidv4();
      newEntry.creditID = creditID;
      newEntry.debitID = debitID;
      newEntry.subEntryStatus = {};
      newEntry.retryCount = 0;
      newEntry.status = false;

      // 2. Save locally IMMEDIATELY (This is what makes it feel fast)
      setEntries((prevEntries) => [...prevEntries, newEntry]);

      // 3. Attempt background sync IF online
      if (navigator.onLine) {
        // We do NOT await this in a way that blocks the UI
        makeCashEntry(newEntry, coordinates, address).then(({ allSuccess, newSubEntryStatus }) => {
          if (allSuccess) {
            setEntries((prev) => 
              prev.map(e => e.creditID === creditID ? { ...e, status: true, subEntryStatus: newSubEntryStatus } : e)
            );
          }
        }).catch(err => {
          console.warn("Background sync for new entry failed:", err);
        });
      }

      // 4. Return success immediately because it is successfully saved to local queue
      return { success: true, errors: [], generatedDocs: [] };
    },
    [makeCashEntry, setEntries]
  );

  const resetEntries = useCallback(() => {
    setEntries([]);
  }, [setEntries]);

  return {
    entries,
    isLoading,
    totalAmount,
    totalCash,
    totalJazzcash,
    totalEasypaisa,
    totalCrownWallet,
    totalMeezanBank,
    totalTc,
    totalHarr,
    addEntry,
    handleSyncOneEntry,
    resetEntries,
    setIsLoading,
    handleRemoveEntry,
  };
};
