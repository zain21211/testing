import { useState, useCallback } from "react";
import { useDispatch } from "react-redux";
import { clearSelection } from "../store/slices/CustomerSearch";

export const usePayVouCust = () => {
  const [creditCust, setCreditCust] = useState(null);
  const [debitCust, setDebitCust] = useState(null);
  const [isCredit, setIsCredit] = useState(false);
  const [isDebit, setIsDebit] = useState(false);
  const dispatch = useDispatch();

  const getCreditCusts = useCallback((customer) => {
    console.log("Selected credit customer:", customer);
    setCreditCust(customer);
  }, []);

  const getDebitCusts = useCallback((customer) => {
    console.log("Selected debit customer:", customer);
    setDebitCust(customer);
  }, []);

  const handleCreditFlag = useCallback((flag) => {
    console.log("Selected credit customer:", flag);
    setIsCredit(flag);
  }, []);

  const handleDebitFlag = useCallback((flag) => {
    console.log("Selected debit customer:", flag);
    setIsDebit(flag);
  }, []);

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
