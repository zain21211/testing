// hooks/useVoucherSubmission.js
import { useState } from "react";
import axios from "axios";

const url = import.meta.env.VITE_API_URL;
const user = JSON.parse(localStorage.getItem("user"));

export const usePayVouSub = () => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async ({
    description,
    amount,
    debitCust,
    creditCust,
    onSubmissionSuccess,
  }) => {
    setSubmitting(true);
    setError(null);
    setSuccess(false);

    console.log(debitCust, creditCust);
    const accounts = [
      debitCust?.acid && { type: "debit", acid: debitCust.acid },
      creditCust?.acid && { type: "credit", acid: creditCust.acid },
    ].filter(Boolean);

    if (!accounts.length) {
      setError("At least one account (debit or credit) must be selected.");
      setSubmitting(false);
      return;
    }

    try {
      const response = await axios.post(`${url}/customers/post`, {
        accounts,
        entryBy: user?.username || "Guest", // Fallback if user is null
        date: new Date(),
        user: user?.username || "Guest",
        entryDateTime: new Date(),
        description: description,
        amount: amount,
      });

      if (response.status !== 200) {
        throw new Error(`Failed to submit voucher`);
      }

      setSuccess(true);
      onSubmissionSuccess(); // Callback to clear form/selections in parent
    } catch (err) {
      setError(
        "An error occurred while submitting the form. Please try again."
      );
      console.error("API call failed:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return { submitting, error, success, handleSubmit };
};
