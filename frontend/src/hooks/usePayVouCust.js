// hooks/useCustomerSelection.js
import { useState, useCallback } from "react";
import { useDispatch } from "react-redux";
import { clearSelection } from "../store/slices/CustomerSearch"; // Adjust path as needed

export const usePayVouCust = () => {
  const [creditCust, setCreditCust] = useState(null);
  const [debitCust, setDebitCust] = useState(null);
  const [isCredit, setIsCredit] = useState(true); // Assuming initial state
  const [isDebit, setIsDebit] = useState(true); // Assuming initial state
  const dispatch = useDispatch();

  const getCreditCusts = useCallback((customer) => {
    console.log("Selected credit customer:", customer);
    setCreditCust(customer);
  }, []);

  const getDebitCusts = useCallback((customer) => {
    console.log("Selected debit customer:", customer);
    setDebitCust(customer);
  }, []);

  const handleCreditFlag = (flag) => {
    setIsCredit(flag);
  };

  const handleDebitFlag = (flag) => {
    setIsDebit(flag);
  };

  const clearCustomerSelections = () => {
    setCreditCust(null);
    setDebitCust(null);
    dispatch(clearSelection({ key: `paymentCredit` }));
    dispatch(clearSelection({ key: `paymentDebit` }));
  };

  return {
    creditCust,
    debitCust,
    isCredit,
    isDebit,
    getCreditCusts,
    getDebitCusts,
    handleCreditFlag,
    handleDebitFlag,
    clearCustomerSelections,
  };
};
