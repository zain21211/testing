import { useState, useCallback } from "react";
import { useLocalStorageState } from "./LocalStorage";
import { formatCurrency } from "../utils/formatCurrency";

export const usePaymentInputs = () => {
  const [cashAmount, setCashAmount] = useLocalStorageState(
    "recoveryPaperCashAmount",
    ""
  );
  const [jazzcashAmount, setJazzcashAmount] = useLocalStorageState(
    "recoveryPaperJazzcashAmount",
    ""
  );
  const [onlineAmount, setOnlineAmount] = useLocalStorageState(
    "recoveryPaperOnlineAmount",
    ""
  );
  const [easypaisaAmount, setEasypaisaAmount] = useLocalStorageState(
    "recoveryPaperEasypaisaAmount",
    ""
  );
  const [crownWalletAmount, setCrownWalletAmount] = useLocalStorageState(
    "recoveryPaperCrownWalletAmount",
    ""
  );
  const [meezanBankAmount, setMeezanBankAmount] = useLocalStorageState(
    "recoveryPaperMeezanBankAmount",
    ""
  );
  const [remainingBalance, setRemainingBalance] = useState("");

  const calculateRemainingBalance = useCallback((balance, amounts) => {
    const cleanNumber = (val) =>
      Number(String(val).replace(/[^0-9.-]+/g, "")) || 0;
    const numericBalance = cleanNumber(balance) || 0;
    const currentEntryPaymentTotal = Object.values(amounts).reduce(
      (sum, amount) => sum + cleanNumber(amount),
      0
    );
    const newRemainingBalance = numericBalance - currentEntryPaymentTotal;
    return formatCurrency(Math.round(newRemainingBalance));
  }, []);

  const createAmountChangeHandler = useCallback(
    (setter) => (event) => {
      const inputValue = event.target.value;
      const numericString = inputValue.replace(/\D/g, "");
      setter(numericString);
    },
    []
  );

  const resetPaymentInputs = useCallback(() => {
    setCashAmount("");
    setJazzcashAmount("");
    setEasypaisaAmount("");
    setCrownWalletAmount("");
    setOnlineAmount("");
    setMeezanBankAmount("");
  }, []);

  return {
    cashAmount,
    jazzcashAmount,
    onlineAmount,
    easypaisaAmount,
    crownWalletAmount,
    meezanBankAmount,
    remainingBalance,
    handleCashAmountChange: createAmountChangeHandler(setCashAmount),
    handleJazzcashAmountChange: createAmountChangeHandler(setJazzcashAmount),
    handleOnlineAmountChange: createAmountChangeHandler(setOnlineAmount),
    handleEasypaisaAmountChange: createAmountChangeHandler(setEasypaisaAmount),
    handleCrownWalletAmountChange:
      createAmountChangeHandler(setCrownWalletAmount),
    handleMeezanBankAmountChange:
      createAmountChangeHandler(setMeezanBankAmount),
    calculateRemainingBalance,
    resetPaymentInputs,
    setRemainingBalance,
  };
};
