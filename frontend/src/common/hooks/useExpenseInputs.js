// hooks/useExpenseInputs.js
import { useState, useEffect, useCallback } from "react";
import { useLocalStorageState } from "../hooks/LocalStorage";
import { useExpenseEntry } from "./useExpenseEntry";

export const useExpenseInputs = () => {
  const [petrolExpense, setPetrolExpense] = useLocalStorageState(
    "recoveryPetrolExpenseVal",
    ""
  );
  const [tollExpense, setTollExpense] = useLocalStorageState(
    "recoveryTollExpenseVal",
    ""
  );
  const [repairExpense, setRepairExpense] = useLocalStorageState(
    "recoveryRepairExpenseVal",
    ""
  );
  const [entertainmentExpense, setEntertainmentExpense] = useLocalStorageState(
    "recoveryEntertainmentExpenseVal",
    ""
  );
  const [biltyExpense, setBiltyExpense] = useLocalStorageState(
    "recoveryBiltyExpenseVal",
    ""
  );
  const [zaqatExpense, setZaqatExpense] = useState(null);
  const [localPurchaseExpense, setLocalPurchaseExpense] = useState(null);
  const [miscExpense, setMiscExpense] = useState(null);
  const [salaryExpense, setSalaryExpense] = useState(null);
  const [salesBonusExpense, setSalesBonusExpense] = useState(null);
  const [currentTotalExpenses, setCurrentTotalExpenses] = useState(0);
  const [submissionStatus, setSubmissionStatus] = useState({
    message: "",
    type: "",
  });
  const [detailedResults, setDetailedResults] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const expenseStateMap = {
    petrol: { value: petrolExpense, setter: setPetrolExpense },
    toll: { value: tollExpense, setter: setTollExpense },
    repair: { value: repairExpense, setter: setRepairExpense },
    entertainment: {
      value: entertainmentExpense,
      setter: setEntertainmentExpense,
    },
    bilty: { value: biltyExpense, setter: setBiltyExpense },
    zaqat: { value: zaqatExpense, setter: setZaqatExpense },
    localPurchase: {
      value: localPurchaseExpense,
      setter: setLocalPurchaseExpense,
    },
    exp: { value: miscExpense, setter: setMiscExpense },
    salary: { value: salaryExpense, setter: setSalaryExpense },
    salesBonus: { value: salesBonusExpense, setter: setSalesBonusExpense },
  };

  const { makeExpenseEntry } = useExpenseEntry();

  useEffect(() => {
    const cleanNumber = (val) =>
      Number(String(val).replace(/[^0-9.-]+/g, "")) || 0;
    const calculatedTotalExpenses = Object.values(expenseStateMap).reduce(
      (total, { value }) => total + cleanNumber(value),
      0
    );
    setCurrentTotalExpenses(calculatedTotalExpenses);
  }, [
    petrolExpense,
    tollExpense,
    repairExpense,
    entertainmentExpense,
    biltyExpense,
    zaqatExpense,
    localPurchaseExpense,
    miscExpense,
    salaryExpense,
    salesBonusExpense,
  ]);

  const handleSubmitExpenses = useCallback(
    async (user) => {
      setIsSubmitting(true);
      setSubmissionStatus({ message: "", type: "" });
      setDetailedResults([]);

      const amounts = {};
      // Dynamically populate amounts from the expenseStateMap
      for (const [key, { value }] of Object.entries(expenseStateMap)) {
        const amount = parseFloat(value);
        if (amount > 0) {
          amounts[key] = amount;
        }
      }

      if (Object.keys(amounts).length === 0) {
        setSubmissionStatus({
          message: "No expenses entered to submit.",
          type: "info",
        });
        setIsSubmitting(false);
        return true;
      }

      const entryData = {
        custId: 1, // This might need to be passed as a parameter
        userName: user.username,
        userType: user.userType,
        amounts,
      };

      console.log("Submitting expenses with entryData:", entryData);
      const response = await makeExpenseEntry(entryData);

      setIsSubmitting(false);
      setSubmissionStatus({
        message:
          response.message ||
          (response.success
            ? "Expenses submitted successfully!"
            : "Error submitting expenses."),
        type: response.success ? "success" : "error",
      });
      setDetailedResults(response.results || []);

      return response.success;
    },
    [makeExpenseEntry, expenseStateMap]
  );

  const resetExpenseInputs = useCallback(() => {
    setPetrolExpense("");
    setTollExpense("");
    setRepairExpense("");
    setEntertainmentExpense("");
    setBiltyExpense("");
    setZaqatExpense(null);
    setLocalPurchaseExpense(null);
    setMiscExpense(null);
    setSalaryExpense(null);
    setSalesBonusExpense(null);
    setSubmissionStatus({ message: "", type: "" });
    setDetailedResults([]);
  }, []);

  return {
    expenseStateMap,
    currentTotalExpenses,
    submissionStatus,
    detailedResults,
    isSubmitting,
    handleSubmitExpenses,
    resetExpenseInputs,
  };
};
