import { useState, useEffect, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import axios from "axios";
import Storage from "use-local-storage-state";
import {
  setSelectedCustomer,
  clearSelection,
} from "../store/slices/CustomerSearch";
import { formatCurrency } from "../utils/formatCurrency";

export const useCustomerSelection = (storageKey, routePath) => {
  const dispatch = useDispatch();
  const { selectedCustomer } = useSelector(
    (state) => state.customerSearch.customers["recovery"] || []
  );
  const [accountID, setAccountID] = Storage(storageKey, null);
  const [customerName, setCustomerName] = useState("");
  const [balance, setBalance] = useState("");
  const [overDue, setOverDue] = useState(null);
  const [remainingBalance, setRemainingBalance] = useState("");
  const [loadingFinancials, setLoadingFinancials] = useState(false);
  const [error, setError] = useState("");
  const url = import.meta.env.VITE_API_URL;

  const fetchCustomerFinancials = useCallback(async () => {
    if (!selectedCustomer || !selectedCustomer.acid) {
      setBalance("");
      return;
    }

    setLoadingFinancials(true);
    setError(null);

    try {
      const [balanceResponse, overdueResponse] = await Promise.all([
        axios.get(`${url}/balance`, {
          params: {
            acid: selectedCustomer.acid,
            date: new Date().toISOString().split("T")[0],
          },
        }),
        axios.get(`${url}/balance/overdue`, {
          params: {
            acid: selectedCustomer.acid,
            date: new Date().toISOString().split("T")[0],
          },
        }),
      ]);

      setBalance(formatCurrency(Math.round(balanceResponse.data.balance)));
      setOverDue(formatCurrency(Math.round(overdueResponse.data.overDue)));
    } catch (err) {
      setError(
        `Balance fetch error: ${err.response?.data?.message || err.message}`
      );
      setBalance("");
    } finally {
      setLoadingFinancials(false);
    }
  }, [selectedCustomer, url]);

  const handleFetchData = useCallback(
    (customer) => {
      dispatch(setSelectedCustomer({ key: "recovery", customer }));
      setAccountID(customer ? customer.acid : "");
      setCustomerName(customer ? customer.name : "");
    },
    [dispatch]
  );

  const handleReset = useCallback(() => {
    setAccountID(null);
    dispatch(clearSelection({ key: "recovery" }));
    setCustomerName("");
    setBalance("");
    setRemainingBalance("");
  }, [dispatch]);

  useEffect(() => {
    if (selectedCustomer && selectedCustomer.acid) {
      fetchCustomerFinancials();
    } else {
      setBalance("");
      setRemainingBalance("");
    }
  }, [selectedCustomer, fetchCustomerFinancials]);

  return {
    selectedCustomer,
    accountID,
    customerName,
    balance,
    overDue,
    remainingBalance,
    loadingFinancials,
    error,
    handleFetchData,
    handleReset,
    setRemainingBalance,
  };
};
