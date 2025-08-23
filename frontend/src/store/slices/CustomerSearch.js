// src/store/customerSearchSlice.js
import { createSlice } from "@reduxjs/toolkit";

function loadFromStorage(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

const initialState = {
  selectedCustomer: loadFromStorage("selectedCustomer", null),
  phoneNumber: loadFromStorage("phoneNumber", null),
  acidInput: loadFromStorage("acidInput", ""),
  customerInput: "", // dynamic key will set this
  ID: null, // dynamic key will set this
  customerSuggestions: [],
  popperOpen: false,
};

const customerSearchSlice = createSlice({
  name: "customerSearch",
  initialState,
  reducers: {
    setSelectedCustomer: (state, action) => {
      state.selectedCustomer = action.payload;
      if (action.payload) {
        state.acidInput = action.payload.acid;
        state.customerInput = action.payload.name;
        state.phoneNumber = action.payload.OCell || null;
        state.popperOpen = false;
        state.customerSuggestions = [];
      }
      localStorage.setItem("selectedCustomer", JSON.stringify(action.payload));
    },
    setPhoneNumber: (state, action) => {
      state.phoneNumber = action.payload;
      localStorage.setItem("phoneNumber", JSON.stringify(action.payload));
    },
    setAcidInput: (state, action) => {
      state.acidInput = action.payload;
      localStorage.setItem("acidInput", JSON.stringify(action.payload));
    },
    setCustomerInputWithKey: (state, action) => {
      const { key, value } = action.payload;
      state.customerInput = value;
      state.popperOpen = !!value;
      localStorage.setItem(key, JSON.stringify(value));
    },
    setIDWithKey: (state, action) => {
      const { key, value } = action.payload;
      state.ID = value;
      localStorage.setItem(key, JSON.stringify(value));
    },
    setCustomerSuggestions: (state, action) => {
      state.customerSuggestions = action.payload;
    },
    setPopperOpen: (state, action) => {
      state.popperOpen = action.payload;
    },
    clearSelection: (state) => {
      state.selectedCustomer = null;
      state.acidInput = "";
      state.ID = null;
      state.customerInput = "";
      state.phoneNumber = null;
    },
    resetCustomerSearch: (state, action) => {
      const { keysToClear = [] } = action.payload;
      // Clear specified dynamic and static keys
      ["selectedCustomer", "phoneNumber", "acidInput", ...keysToClear].forEach(
        (key) => localStorage.removeItem(key)
      );

      return {
        ...initialState,
        customerInput: "",
        ID: null,
      };
    },
  },
});

export const {
  setSelectedCustomer,
  setPhoneNumber,
  setAcidInput,
  setCustomerInputWithKey,
  setIDWithKey,
  setCustomerSuggestions,
  setPopperOpen,
  clearSelection,
  resetCustomerSearch,
} = customerSearchSlice.actions;

export default customerSearchSlice.reducer;
