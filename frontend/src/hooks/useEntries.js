import { useState, useEffect, useCallback } from "react";
import { useLocalStorageState } from "./LocalStorage";
import axios from "axios";

export const useEntries = () => {
  const [entries, setEntries] = useLocalStorageState(
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
  const url = import.meta.env.VITE_API_URL;

  useEffect(() => {
    let overallTotal = 0;
    let cashOnlyTotal = 0;
    let jazzcashTotal = 0;
    let easypaisaTotal = 0;
    let crownWalletTotal = 0;
    let meezanBankTotal = 0;

    entries.forEach((entry) => {
      overallTotal += entry.entryTotal || 0;
      cashOnlyTotal += entry.amounts?.cash || 0;
      jazzcashTotal += entry.amounts?.jazzcash || 0;
      easypaisaTotal += entry.amounts?.easypaisa || 0;
      crownWalletTotal += entry.amounts?.crownWallet || 0;
      meezanBankTotal += entry.amounts?.meezanBank || 0;
    });

    setTotalAmount(overallTotal);
    setTotalCash(cashOnlyTotal);
    setTotalJazzcash(jazzcashTotal);
    setTotalEasypaisa(easypaisaTotal);
    setTotalCrownWallet(crownWalletTotal);
    setTotalMeezanBank(meezanBankTotal);
  }, [entries]);

  const makeCashEntry = useCallback(
    async (entry, coordinates, address) => {
      try {
        const { amounts, id, userName, description, timestamp } = entry;
        const entriesToPost = Object.entries(amounts).filter(
          ([_, amount]) => amount > 0
        );

        if (entriesToPost.length === 0) return true;

        let allSubEntriesSuccessful = true;

        for (const [method, amount] of entriesToPost) {
          const payload = {
            paymentMethod:
              method === "crownWallet"
                ? "crownone"
                : method === "meezanBank"
                ? "mbl"
                : method,
            custId: id,
            receivedAmount: amount,
            userName,
            desc: description,
            time: timestamp,
            location: {
              latitude: coordinates.latitude,
              longitude: coordinates.longitude,
              address,
            },
          };

          try {
            const response = await axios.post(`${url}/cash-entry`, payload);
            if (response.status !== 200 && response.status !== 201) {
              allSubEntriesSuccessful = false;
            }
          } catch (error) {
            allSubEntriesSuccessful = false;
          }
        }

        return allSubEntriesSuccessful;
      } catch (error) {
        return false;
      }
    },
    [url]
  );

  const handleSyncOneEntry = useCallback(
    async (entryToSync, coordinates, address) => {
      const success = await makeCashEntry(entryToSync, coordinates, address);
      if (success) {
        setEntries((prevEntries) =>
          prevEntries.map((e) =>
            e.timestamp === entryToSync.timestamp && e.id === entryToSync.id
              ? { ...e, status: true }
              : e
          )
        );
      }
      return success;
    },
    [makeCashEntry, setEntries]
  );

  const addEntry = useCallback(
    async (newEntry, coordinates, address) => {
      setIsLoading(true);
      let entrySuccessfullyPostedOnline = false;

      try {
        entrySuccessfullyPostedOnline = await makeCashEntry(
          newEntry,
          coordinates,
          address
        );
        newEntry.status = entrySuccessfullyPostedOnline;
      } catch (err) {
        newEntry.status = false;
      }

      setEntries((prevEntries) => [...prevEntries, newEntry]);
      setIsLoading(false);

      return entrySuccessfullyPostedOnline;
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
    addEntry,
    handleSyncOneEntry,
    resetEntries,
    setIsLoading,
  };
};
