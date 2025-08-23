// src/hooks/useCustomerSearch.js
import { useEffect, useMemo, useCallback, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useLocation } from "react-router-dom";
import { useFetch } from "./useFetch";
import { fetchCustomers } from "../utils/api";
import debounce from "lodash.debounce";
import {
    setSelectedCustomer,
    setAcidInput,
    setCustomerInputWithKey,
    setIDWithKey,
    setCustomerSuggestions,
    setPopperOpen,
    clearSelection,
    resetCustomerSearch,
} from "../store/slices/CustomerSearch";

const wildcardToRegex = (pattern) => {
    return pattern?.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*");
};

// Custom hook to ensure a prop function can be used in effects without causing re-renders.
const useStableCallback = (callback) => {
    const callbackRef = useRef(callback);
    useEffect(() => {
        callbackRef.current = callback;
    });
    return useCallback((...args) => callbackRef.current?.(...args), []);
};

export const useCustomerSearch = ({ usage, formType, route, onSelect, onFetch, dates }) => {
    const dispatch = useDispatch();
    const location = useLocation();

    const {
        customerInput, acidInput, ID, selectedCustomer,
        customerSuggestions, popperOpen
    } = useSelector((state) => state.customerInput);

    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const customerInputRef = useRef(null);
    const listRef = useRef(null);
    const searchButtonRef = useRef(null);

    // This creates a stable reference to the onSelect function prop.
    const stableOnSelect = useStableCallback(onSelect);


    const localStorageKey = useMemo(() => (usage === "orderForm" ? "orderFormCustomerInput" : usage === "recovery" ? "recoverpaperCustomerInput" : formType ? `customerInput${formType}` : "ledgerCustomerInput"), [usage, formType]);
    const storageKey = useMemo(() => (formType ? `accountID${formType}${location.pathname}` : `accountID-${location.pathname}`), [formType, location.pathname]);


    const { data: masterCustomerList = [], isLoading: isCustomerLoading, error: fetchError } = useFetch("customers", fetchCustomers);
    const allCustomerOptions = useMemo(() => (route ? masterCustomerList.filter((c) => c.route?.toLowerCase() === route.toLowerCase()) : masterCustomerList), [route, masterCustomerList]);

    // The handleSelect function is now stable and doesn't depend on changing state.
    const handleSelect = useCallback(
        (customer) => {
            if (!customer) return;

            // ✅ don’t dispatch if already selected
            if (selectedCustomer?.acid === customer.acid) return;

            dispatch(setSelectedCustomer(customer));
            dispatch(setCustomerSuggestions([])); // clear dropdown
            // ❌ REMOVE this line: dispatch(setCustomerInput(customer.name));
        },
        [dispatch, selectedCustomer]
    );



    // --- FINAL FIX FOR INFINITE LOOP ---

    // Effect for searching by ID. Runs ONLY when ID or the customer list changes.
    // ✅ Effect 1: Sync ID → selectedCustomer
    useEffect(() => {
        if (!ID || allCustomerOptions.length === 0) return;

        // only select if different
        if (selectedCustomer?.acid !== Number(ID)) {
            const customerToSelect = allCustomerOptions.find(
                (c) => c.acid === Number(ID)
            );
            if (customerToSelect) {
                handleSelect(customerToSelect);
            }
        }
    }, [ID, allCustomerOptions, selectedCustomer, handleSelect]);


    // ✅ Effect 2: Filter customer suggestions
    useEffect(() => {
        const filterFn = debounce((inputValue) => {
            if (!inputValue) {
                dispatch(setCustomerSuggestions([]));
                return;
            }

            const regex = new RegExp(wildcardToRegex(inputValue), "i");
            const filtered = allCustomerOptions.filter(
                (opt) => opt?.name && regex.test(opt.name)
            );

            if (filtered.length === 1 && inputValue.length > 2) {
                // only select if different
                if (selectedCustomer?.acid !== filtered[0].acid) {
                    handleSelect(filtered[0]);
                }
            } else {
                dispatch(setCustomerSuggestions(filtered));
                setHighlightedIndex(filtered.length > 0 ? 0 : -1);
            }
        }, 300);

        if (customerInput && !selectedCustomer) {
            filterFn(customerInput);
        } else if (!customerInput) {
            dispatch(setCustomerSuggestions([]));
        }

        return () => filterFn.cancel();
    }, [customerInput, allCustomerOptions, selectedCustomer, dispatch, handleSelect]);
    // <-- MINIMAL, STABLE DEPENDENCIES. `selectedCustomer` is NOT included.

    // Effect for searching by Customer Name. Runs ONLY when the text input or list changes.
    // useEffect(() => {
    //     const filterFn = debounce((inputValue) => {
    //         if (!inputValue) {
    //             dispatch(setCustomerSuggestions([]));
    //             return;
    //         }
    //         const regex = new RegExp(wildcardToRegex(inputValue), "i");
    //         const filtered = allCustomerOptions.filter((opt) => opt?.name && regex.test(opt.name));

    //         if (filtered.length === 1 && inputValue.length > 2) {
    //             handleSelect(filtered[0]);
    //         } else {
    //             dispatch(setCustomerSuggestions(filtered));
    //             setHighlightedIndex(filtered.length > 0 ? 0 : -1);
    //         }
    //     }, 300);

    //     // This logic runs the filter ONLY when appropriate (when there is text and no selection).
    //     // It does not cause the effect to re-run when a selection is made.
    //     if (customerInput && !selectedCustomer) {
    //         filterFn(customerInput);
    //     } else if (!customerInput) {
    //         dispatch(setCustomerSuggestions([]));
    //     }

    //     return () => filterFn.cancel();
    // }, [customerInput, allCustomerOptions, dispatch, handleSelect]); // <-- MINIMAL, STABLE DEPENDENCIES. `selectedCustomer` is NOT included.

    // --- END OF FIX ---

    const debouncedSetId = useMemo(() => debounce((value, key) => dispatch(setIDWithKey({ key, value })), 1000), [dispatch]);

    const handleAcidInputChange = useCallback((e) => {
        const value = e.target.value;
        dispatch(setAcidInput(value));
        if (!value) {
            debouncedSetId.cancel();
            dispatch(clearSelection());
            return;
        }
        if (selectedCustomer && String(selectedCustomer.acid) !== value) {
            dispatch(setSelectedCustomer(null));
        }
        debouncedSetId(value, storageKey);
    }, [dispatch, selectedCustomer, storageKey, debouncedSetId]);

    const handleCustomerInputChange = useCallback((event) => {
        const value = event.target.value;
        dispatch(setCustomerInputWithKey({ key: localStorageKey, value }));
        if (selectedCustomer && selectedCustomer.name !== value) {
            dispatch(clearSelection());
        }
    }, [dispatch, selectedCustomer, localStorageKey]);

    const handleReset = useCallback(() => {
        debouncedSetId.cancel();
        dispatch(resetCustomerSearch({ keysToClear: [localStorageKey, storageKey] }));
        customerInputRef.current?.focus();
    }, [dispatch, localStorageKey, storageKey, debouncedSetId]);

    const handleTriggerFetch = useCallback(() => {
        if (!selectedCustomer?.acid) return;
        if (usage === "ledger" && onFetch) {
            onFetch({ acid: selectedCustomer.acid, name: selectedCustomer.name, ...dates });
        }
    }, [onFetch, selectedCustomer, dates, usage]);

    const handleInputKeyDown = useCallback((event) => {
        const { key } = event;
        const count = customerSuggestions.length;
        if (popperOpen && count > 0) {
            if (key === "ArrowDown") {
                event.preventDefault();
                setHighlightedIndex(prev => prev < count - 1 ? prev + 1 : 0);
            } else if (key === "ArrowUp") {
                event.preventDefault();
                setHighlightedIndex(prev => prev > 0 ? prev - 1 : count - 1);
            } else if (key === "Enter" && highlightedIndex > -1) {
                event.preventDefault();
                handleSelect(customerSuggestions[highlightedIndex]);
            } else if (key === "Escape") {
                dispatch(setPopperOpen(false));
            }
        } else if (key === 'Enter' && selectedCustomer) {
            event.preventDefault();
            searchButtonRef.current?.click();
        }
    }, [popperOpen, customerSuggestions, highlightedIndex, selectedCustomer, handleSelect, dispatch]);

    const handleClickAway = useCallback(() => dispatch(setPopperOpen(false)), [dispatch]);
    const handleInputFocus = useCallback(() => customerInputRef.current?.select(), []);

    return {
        customerInput, acidInput, selectedCustomer, phoneNumber: selectedCustomer?.OCell,
        suggestions: customerSuggestions, isPopperOpen: popperOpen,
        error: fetchError?.message, isCustomerLoading, highlightedIndex,
        customerInputRef, listRef, searchButtonRef,
        handleCustomerInputChange, handleAcidInputChange, handleReset,
        handleSuggestionClick: handleSelect, handleTriggerFetch,
        handleInputKeyDown, handleClickAway, handleInputFocus,
    };
};