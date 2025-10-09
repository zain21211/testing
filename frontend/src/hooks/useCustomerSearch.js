// src/hooks/useCustomerSearch.js
import { useEffect, useMemo, useCallback, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useLocation } from "react-router-dom";
import { useFetch } from "./useFetch";
import { fetchCustomers } from "../utils/api";
import { fetchDebitCustomers } from "../utils/api";
import { fetchCreditCustomers } from "../utils/api";
import debounce from "lodash.debounce";
import isEqual from "lodash/isEqual";
import { useLocalStorageState } from "./LocalStorage";
import {
  setSelectedCustomer,
  setCustomerInputWithKey,
  setIDWithKey,
  setCustomerSuggestions,
  setPopperOpen,
  clearSelection,
} from "../store/slices/CustomerSearch";
import {
  fetchMasterCustomerList,
  persistMasterCustomerList,
} from "../store/slices/CustomerData";

const wildcardToRegex = (pattern) => {
  return pattern?.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*");
};

// Custom hook to keep callback stable in effects
const useStableCallback = (callback) => {
  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
  });
  return useCallback((...args) => callbackRef.current?.(...args), []);
};

export const useCustomerSearch = ({
  usage, // "orderForm" | "ledger" | "recoverpaper"
  formType,
  route,
  onSelect,
  onFetch,
  dates,
  isCust,
}) => {
  // To read user object from localStorage
  const user = JSON.parse(localStorage.getItem("user"));
  const userType = user?.userType?.toLowerCase();
  const isAdmin = userType === "admin";

  const path =
    formType === "credit"
      ? "creditCustList"
      : formType === "debit"
      ? "debitCustList"
      : "CustList";

  const dispatch = useDispatch();
  // const location = useLocation();

  // 🔹 derive which customer slot we are working on
  const customerKey = useMemo(
    () => usage || formType || "ledger",
    [usage, formType]
  );

  const customerState = useSelector(
    (state) => state.customerSearch.customers[customerKey] || {}
  );
  // const [localCustomerList, setLocalCustomerList] = useState([]);

  const {
    ID,
    popperOpen,
    phoneNumber,
    customerInput,
    selectedCustomer,
    customerSuggestions,
  } = customerState;

  const [acidInput, setAcidInput] = useState(selectedCustomer?.acid);
  const masterCustomerList = useSelector(
    (s) => s.customerData.masterCustomerList
  );
  const [localCustomerList, setLocalCustomerList] = useLocalStorageState(
    path,
    masterCustomerList
  );
  // Load from IndexedDB (via localforage) on mount
  useEffect(() => {
    dispatch(fetchMasterCustomerList());
  }, [dispatch]);

  useEffect(() => {}, [localCustomerList]);

  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const customerInputRef = useRef(null);
  const listRef = useRef(null);
  const searchButtonRef = useRef(null);
  const prevLength = useRef(masterCustomerList.length);

  const stableOnSelect = useStableCallback(onSelect);

  const fetchers = {
    debit: fetchDebitCustomers,
    credit: fetchCreditCustomers,
  };

  const {
    data = [],
    isLoading: isCustomerLoading,
    error: fetchError,
  } = useFetch(
    ["customers", formType, isAdmin],
    isAdmin ? fetchCustomers : fetchers[formType] || fetchCustomers
  );

  const allCustomerOptions = useMemo(
    () =>
      route
        ? localCustomerList.filter(
            (c) => c.route?.toLowerCase() === route.toLowerCase()
          )
        : localCustomerList,
    [route, localCustomerList]
  );
  useEffect(() => {
    console.log("All customers updated:", localCustomerList, data);
  }, [localCustomerList, data]);
  // Sync master list
  useEffect(() => {
    isCust && isCust(data.length !== 0);
    const status = fetchError?.status;
    // setLocalCustomerList(data);

    // if (!isEqual(data, localCustomerList) && fetchError?.status === 404) {
    // }
    console.log(
      "Data changed:",
      (navigator.onLine || !isEqual(data, localCustomerList)) &&
        status !== 500 &&
        status !== undefined &&
        status !== null,
      data,
      localCustomerList,
      status
    );
    if (
      (navigator.onLine || !isEqual(data, localCustomerList)) &&
      status !== 500 &&
      status !== undefined &&
      status !== null
    ) {
      setLocalCustomerList(data);
      if (!isAdmin && (formType === "debit" || formType === "credit")) return;
      setLocalCustomerList(data);
      const shouldUpdate = !isEqual(data, masterCustomerList);
      if (shouldUpdate) {
        dispatch(persistMasterCustomerList(data));
      }
    }
    // 🚨 don't add masterCustomerList here, or you loop forever
  }, [data]);

  // useEffect(() => {
  //   if (onSelect) onSelect(selectedCustomer);
  //   console.log(path, selectedCustomer);
  // }, [selectedCustomer, onSelect]);

  useEffect(() => {
    if (
      // prevLength.current !== masterCustomerList.length &&
      masterCustomerList.length === 1 ||
      localCustomerList?.length === 1
    ) {
      handleSelect(allCustomerOptions[0]);
    }
    prevLength.current = masterCustomerList.length;
  }, [masterCustomerList, allCustomerOptions, localCustomerList]);

  // 🔹 handle selecting a customer
  const handleSelect = useCallback(
    (customer) => {
      if (!customer) return;
      dispatch(setSelectedCustomer({ key: customerKey, customer }));
      dispatch(setCustomerSuggestions({ key: customerKey, suggestions: [] }));
      stableOnSelect(customer);

      if (onSelect) {
        onSelect(customer);
      }
    },
    [dispatch, selectedCustomer, customerKey, stableOnSelect, onSelect]
  );

  // Effect 1: Sync ID → selectedCustomer
  useEffect(() => {
    if (!ID || allCustomerOptions?.length === 0) return;

    if (selectedCustomer?.acid !== Number(ID)) {
      const customerToSelect = allCustomerOptions?.find(
        (c) => c.acid === Number(ID)
      );
      if (customerToSelect) {
        handleSelect(customerToSelect);
        return; // prevent unnecessary acidInput reset
      }
    }
  }, [ID, allCustomerOptions, selectedCustomer, handleSelect]);

  useEffect(() => {
    if (!acidInput) {
      handleReset();
    }
  }, [acidInput]);

  useEffect(() => {
    if (!selectedCustomer) {
      setAcidInput("");
    }
  }, [selectedCustomer]);

  // Effect 2: Filter suggestions by name
  useEffect(() => {
    const filterFn = debounce((inputValue) => {
      if (!inputValue) {
        dispatch(setCustomerSuggestions({ key: customerKey, suggestions: [] }));
        return;
      }

      const regex = new RegExp(wildcardToRegex(inputValue), "i");
      const filtered = allCustomerOptions.filter(
        (opt) => opt?.name && regex.test(opt.name)
      );

      if (filtered.length === 1 && inputValue.length > 2) {
        if (selectedCustomer?.acid !== filtered[0].acid) {
          handleSelect(filtered[0]);
        }
      } else {
        dispatch(
          setCustomerSuggestions({ key: customerKey, suggestions: filtered })
        );
        setHighlightedIndex(filtered.length > 0 ? 0 : -1);
      }
    }, 300);

    filterFn(customerInput);
    return () => filterFn.cancel();
  }, [
    customerInput,
    allCustomerOptions,
    dispatch,
    customerKey,
    selectedCustomer,
    handleSelect,
  ]);

  useEffect(() => {
    if (!acidInput && selectedCustomer) {
      setAcidInput(selectedCustomer.acid);
    }
  }, [selectedCustomer]);

  // debounced setter for ID
  const debouncedSetId = useMemo(
    () =>
      debounce((value, key) => {
        console.log("setting id...");
        dispatch(setIDWithKey({ key, value }));
      }, 1000),
    [dispatch]
  );

  const handleAcidInputChange = useCallback(
    (e) => {
      const value = e.target.value;
      setAcidInput(value);
      if (!value) {
        debouncedSetId.cancel();
        dispatch(clearSelection({ key: customerKey }));
        return;
      }
      debouncedSetId(value, customerKey);
    },
    [dispatch, customerKey, debouncedSetId]
  );

  const handleCustomerInputChange = useCallback(
    (event) => {
      const value = event.target.value;
      dispatch(setCustomerInputWithKey({ key: customerKey, value }));
      if (selectedCustomer && selectedCustomer.name !== value) {
        dispatch(clearSelection({ key: customerKey }));
      }
    },
    [dispatch, selectedCustomer, customerKey]
  );

  const handleReset = useCallback(() => {
    debouncedSetId.cancel();
    dispatch(clearSelection({ key: customerKey })); // resets all
    customerInputRef.current?.focus();
  }, [dispatch, debouncedSetId]);

  const handleTriggerFetch = useCallback(() => {
    if (!selectedCustomer?.acid) return;
    if (usage === "ledger" && onFetch) {
      onFetch({
        acid: selectedCustomer.acid,
        name: selectedCustomer.name,
        ...dates,
      });
    }
  }, [onFetch, selectedCustomer, dates, usage]);

  const handleInputKeyDown = useCallback(
    (event) => {
      const { key } = event;
      const count = customerSuggestions.length;
      if (popperOpen && count > 0) {
        if (key === "ArrowDown") {
          event.preventDefault();
          setHighlightedIndex((prev) => (prev < count - 1 ? prev + 1 : 0));
        } else if (key === "ArrowUp") {
          event.preventDefault();
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : count - 1));
        } else if (key === "Enter" && highlightedIndex > -1) {
          event.preventDefault();
          handleSelect(customerSuggestions[highlightedIndex]);
        } else if (key === "Escape") {
          dispatch(setPopperOpen({ key: customerKey, value: false }));
        }
      } else if (key === "Enter" && selectedCustomer) {
        event.preventDefault();
        searchButtonRef.current?.click();
      }
    },
    [
      popperOpen,
      customerSuggestions,
      highlightedIndex,
      selectedCustomer,
      handleSelect,
      dispatch,
      customerKey,
    ]
  );

  const handleClickAway = useCallback(
    () => dispatch(setPopperOpen({ key: customerKey, value: false })),
    [dispatch, customerKey]
  );
  const handleInputFocus = useCallback(
    () => customerInputRef.current?.select(),
    []
  );

  return {
    customerInput,
    acidInput,
    selectedCustomer,
    phoneNumber,
    suggestions: customerSuggestions,
    isPopperOpen: popperOpen,
    error: fetchError?.message,
    isCustomerLoading,
    highlightedIndex,
    customerInputRef,
    listRef,
    searchButtonRef,
    handleCustomerInputChange,
    handleAcidInputChange,
    handleReset,
    handleSuggestionClick: handleSelect,
    handleTriggerFetch,
    handleInputKeyDown,
    handleClickAway,
    handleInputFocus,
  };
};
