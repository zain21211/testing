import { useState, useCallback, useMemo, useEffect } from "react";
import { useDispatch } from "react-redux";
import { clearSelection } from "../store/slices/CustomerSearch";

export const usePayVouCust = () => {
  const [creditCust, setCreditCust] = useState(null);
  const [debitCust, setDebitCust] = useState(null);
  const [isCredit, setIsCredit] = useState(true);
  const [isDebit, setIsDebit] = useState(true);
  const dispatch = useDispatch();

  const getCreditCusts = useCallback((customer) => {
    console.log("Selected credit customer:", customer);
    setCreditCust(customer);
  }, []);

  const getDebitCusts = useCallback((customer) => {
    console.log("Selected debit customer:", customer);
    setDebitCust(customer);
  }, []);

  // Derived flags
  // const isCredit = useMemo(() => creditCust !== null, [creditCust]);
  // const isDebit = useMemo(() => debitCust !== null, [debitCust]);

  useEffect(() => {
    console.log("Credit customer changed:", creditCust);
    setIsCredit(creditCust !== null);
  }, [creditCust]);

  useEffect(() => {
    console.log("Debit customer changed:", debitCust);
    setDebitCust(debitCust !== null);
  }, [debitCust]);

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
    clearCustomerSelections,
  };
};
