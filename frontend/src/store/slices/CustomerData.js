// src/store/customerDataSlice.js
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
  masterCustomerList: loadFromStorage("masterCustomerList", []),
};

const customerDataSlice = createSlice({
  name: "customerData",
  initialState,
  reducers: {
    setMasterCustomerList: (state, action) => {
      state.masterCustomerList = action.payload;
      localStorage.setItem(
        "masterCustomerList",
        JSON.stringify(action.payload)
      );
    },
    resetCustomerData: () => {
      localStorage.removeItem("masterCustomerList");
      return initialState;
    },
  },
});

export const { setMasterCustomerList, resetCustomerData } =
  customerDataSlice.actions;
export default customerDataSlice.reducer;
