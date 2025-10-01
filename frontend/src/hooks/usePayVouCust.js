import { useState, useCallback, useEffect } from "react";
import { useDispatch } from "react-redux";
import { clearSelection } from "../store/slices/CustomerSearch";

export const usePayVouCust = () => {
  const [creditCust, setCreditCust] = useState(null);
  const [debitCust, setDebitCust] = useState(null);
  const [isCredit, setIsCredit] = useState(true);
  const [isDebit, setIsDebit] = useState(true);
  const dispatch = useDispatch();

  const getCreditCusts = useCallback((customer) => {
    setCreditCust(customer);
  }, []);

  const getDebitCusts = useCallback((customer) => {
    setDebitCust(customer);
  }, []);

  const handleCreditFlag = useCallback((flag) => {
    setIsCredit(flag);
  }, []);

  const handleDebitFlag = useCallback((flag) => {
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
