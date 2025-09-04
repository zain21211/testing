// src/store/customerSearchSlice.js
import { createSlice } from "@reduxjs/toolkit";

const CUSTOMER_KEYS = ["orderForm", "ledger", "recovery", "customerform"];

function loadFromStorage(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

function createCustomerState(key) {
  return {
    selectedCustomer: loadFromStorage(`${key}_selectedCustomer`, null),
    phoneNumber: loadFromStorage(`${key}_phoneNumber`, null),
    customerInput: loadFromStorage(`${key}_customerInput`, ""),
    ID: loadFromStorage(`${key}_ID`, null),
    // customerSuggestions: [],
    popperOpen: false,
  };
}

const initialState = {
  customers: CUSTOMER_KEYS.reduce((acc, key) => {
    acc[key] = createCustomerState(key);
    return acc;
  }, {}),
};

const customerSearchSlice = createSlice({
  name: "customerSearch",
  initialState,
  reducers: {
    setSelectedCustomer: (state, action) => {
      const { key, customer } = action.payload; // e.g. { key: "ledger", customer: {...} }
      state.customers[key].selectedCustomer = customer;

      if (customer) {
        state.customers[key].ID = customer.acid || null;
        state.customers[key].customerInput = customer.name || "";
        state.customers[key].phoneNumber = customer.OCell || null;
        state.customers[key].popperOpen = false;
        state.customers[key].customerSuggestions = [];
      }

      localStorage.setItem(`${key}_selectedCustomer`, JSON.stringify(customer));
      localStorage.setItem(`${key}_ID`, JSON.stringify(customer?.acid || null));
      localStorage.setItem(
        `${key}_customerInput`,
        JSON.stringify(customer?.name || "")
      );
      localStorage.setItem(
        `${key}_phoneNumber`,
        JSON.stringify(customer?.OCell || null)
      );
    },

    // Case 2: Only selectedCustomer
    setOnlySelectedCustomer: (state, action) => {
      const { key, customer } = action.payload;
      state.customers[key].selectedCustomer = customer;

      localStorage.setItem(`${key}_selectedCustomer`, JSON.stringify(customer));
    },

    setPhoneNumber: (state, action) => {
      const { key, value } = action.payload;
      state.customers[key].phoneNumber = value;
      localStorage.setItem(`${key}_phoneNumber`, JSON.stringify(value));
    },

    setCustomerInputWithKey: (state, action) => {
      const { key, value } = action.payload;
      state.customers[key].customerInput = value;
      state.customers[key].popperOpen = !!value;
      localStorage.setItem(`${key}_customerInput`, JSON.stringify(value));
    },

    setIDWithKey: (state, action) => {
      console.log(action.payload);
      const { key, value } = action.payload;
      state.customers[key].ID = value;
      localStorage.setItem(`${key}_ID`, JSON.stringify(value));
    },

    setCustomerSuggestions: (state, action) => {
      const { key, suggestions } = action.payload;
      state.customers[key].customerSuggestions = suggestions;
    },

    setPopperOpen: (state, action) => {
      const { key, value } = action.payload;
      state.customers[key].popperOpen = value;
    },

    clearSelection: (state, action) => {
      const { key } = action.payload;

      // Clear from storage
      [
        `${key}_selectedCustomer`,
        `${key}_ID`,
        `${key}_customerInput`,
        `${key}_phoneNumber`,
      ].forEach((k) => localStorage.removeItem(k));

      state.customers[key] = createCustomerState(key);
    },

    resetCustomerSearch: (state) => {
      CUSTOMER_KEYS.forEach((key) => {
        [
          `${key}_selectedCustomer`,
          `${key}_ID`,
          `${key}_customerInput`,
          `${key}_phoneNumber`,
        ].forEach((k) => localStorage.removeItem(k));

        state.customers[key] = createCustomerState(key);
      });
    },
  },
});

export const {
  setSelectedCustomer,
  setPhoneNumber,
  setCustomerInputWithKey,
  setIDWithKey,
  setCustomerSuggestions,
  setPopperOpen,
  clearSelection,
  resetCustomerSearch,
} = customerSearchSlice.actions;

export default customerSearchSlice.reducer;
