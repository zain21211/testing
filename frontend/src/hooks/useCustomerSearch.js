// src/hooks/useCustomerSearch.js
import { useEffect, useMemo, useCallback, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useLocation } from "react-router-dom";
import { useFetch } from "./useFetch";
import { fetchCustomers } from "../utils/api";
import debounce from "lodash.debounce";
import isEqual from "lodash/isEqual";
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
    resetMasterCustomerList,
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
    usage,      // "orderForm" | "ledger" | "recoverpaper"
    formType,
    route,
    onSelect,
    onFetch,
    dates,
}) => {
    const dispatch = useDispatch();
    // const location = useLocation();

    // 🔹 derive which customer slot we are working on
    const customerKey = useMemo(() =>
        usage || formType || "ledger"
        , [usage, formType]);

    const customerState = useSelector(
        (state) => state.customerSearch.customers[customerKey] || {}
    );

    const {
        ID,
        popperOpen,
        phoneNumber,
        customerInput,
        selectedCustomer,
        customerSuggestions,
    } = customerState;

    const [acidInput, setAcidInput] = useState(selectedCustomer?.acid);
    const masterCustomerList = useSelector((s) => s.customerData.masterCustomerList);

    // Load from IndexedDB (via localforage) on mount
    useEffect(() => {
        dispatch(fetchMasterCustomerList());
    }, [dispatch]);

    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const customerInputRef = useRef(null);
    const listRef = useRef(null);
    const searchButtonRef = useRef(null);

    const stableOnSelect = useStableCallback(onSelect);

    // Fetch customers
    const { data: data = [], isLoading: isCustomerLoading, error: fetchError } =
        useFetch("customers", fetchCustomers);

    const allCustomerOptions = useMemo(
        () =>
            route
                ? masterCustomerList.filter(
                    (c) => c.route?.toLowerCase() === route.toLowerCase()
                )
                : masterCustomerList,
        [route, masterCustomerList]
    );

    // keep master list synced
    useEffect(() => {
        if (fetchError) return;

        if (data.length > 0 && !isEqual(data, masterCustomerList)) {
            const updated = [...data];
            dispatch(persistMasterCustomerList(updated));
        }

        if (masterCustomerList.length === 1) {
            handleSelect(allCustomerOptions[0])
            return;
        }
    }, [data, masterCustomerList, dispatch]);

    // 🔹 handle selecting a customer
    const handleSelect = useCallback(
        (customer) => {
            if (!customer) return;
            if (selectedCustomer?.acid === customer.acid) return;
            dispatch(setSelectedCustomer({ key: customerKey, customer }));
            dispatch(setCustomerSuggestions({ key: customerKey, suggestions: [] }));
            stableOnSelect(customer);
        },
        [dispatch, selectedCustomer, customerKey, stableOnSelect]
    );


    // Effect 1: Sync ID → selectedCustomer
    useEffect(() => {
        if (!ID || allCustomerOptions.length === 0) return;

        if (selectedCustomer?.acid !== Number(ID)) {
            const customerToSelect = allCustomerOptions.find(
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
            handleReset()
        }
    }, [acidInput])

    useEffect(() => {
        if (!selectedCustomer) {
            setAcidInput('')
        }
    }, [selectedCustomer])

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
    }, [customerInput, allCustomerOptions, dispatch, customerKey, selectedCustomer, handleSelect]);

    // debounced setter for ID
    const debouncedSetId = useMemo(
        () =>
            debounce((value, key) => {
                console.log("setting id...")
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
                    setHighlightedIndex((prev) =>
                        prev < count - 1 ? prev + 1 : 0
                    );
                } else if (key === "ArrowUp") {
                    event.preventDefault();
                    setHighlightedIndex((prev) =>
                        prev > 0 ? prev - 1 : count - 1
                    );
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



