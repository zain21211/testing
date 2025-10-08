// hooks/useVoucherSubmission.js
import { useState, useCallback } from "react";
import axios from "axios";
import { v4 as uuid } from "uuid";
import { useVoucherSync } from "./useVoucherSync";
import useLocalStorageState from "use-local-storage-state";
import { date } from "zod/v4";

const url = import.meta.env.VITE_API_URL;
const user = JSON.parse(localStorage.getItem("user"));

export const usePayVouSub = ({ onSubmissionSuccess }) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // localStorage-backed state for offline vouchers
  const [entries, setEntries] = useLocalStorageState("pendingVoucherEntry", {
    defaultValue: [],
  });

  /** POST to API */
  const api = useCallback(
    async (newEntry) => {
      try {
        await axios.post(`${url}/customers/post`, newEntry);

        // Remove successfully submitted entry
        // console.log("Voucher submitted successfully, remaining:", remaining);
        setSuccess(true);
      } catch (error) {
        console.error("Error submitting voucher:", error);
        throw error;
      } finally {
        setSubmitting(false);
        onSubmissionSuccess?.();
      }
    },
    [entries, setEntries, onSubmissionSuccess]
  );

  /** Deduplicate entries before syncing */
  const uniqueEntries = Array.from(
    new Map(entries.map((item) => [item.id, item])).values()
  );

  // Auto sync offline vouchers when back online
  useVoucherSync(entries, setEntries, api);

  /** Handle new voucher submission */
  const handleSubmit = useCallback(
    async ({ description, amount, debitCust, creditCust }) => {
      setSubmitting(true);
      setError(null);
      setSuccess(false);

      const accounts = [
        debitCust?.acid && { type: "debit", acid: debitCust.acid },
        creditCust?.acid && { type: "credit", acid: creditCust.acid },
      ].filter(Boolean);

      if (!accounts.length) {
        setError("At least one account (debit or credit) must be selected.");
        setSubmitting(false);
        return;
      }

      const newEntry = {
        id: uuid(),
        accounts,
        date: new Date().toISOString().split("T")[0],
        entryBy: user?.username || "Guest",
        user: user?.username || "Guest",
        description,
        amount,
        entryDateTime: new Date().toISOString(),
      };

      try {
        console.log("Submitting entry:", newEntry);
        await api(newEntry);
      } catch (error) {
        console.warn("Submission failed, saving entry locally:", newEntry);
        setEntries((prev) => {
          // avoid duplicates by ID
          const exists = prev.some((e) => e.id === newEntry.id);
          return exists ? prev : [...prev, newEntry];
        });
      } finally {
        setSubmitting(false);
      }
    },
    [entries, api, setEntries]
  );

  return { submitting, error, success, handleSubmit, entries };
};
