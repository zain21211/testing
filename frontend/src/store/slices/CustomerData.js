import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import localforage from "localforage";
import isEqual from "lodash/isEqual";

// configure a store for customers (optional, good for separation)
localforage.config({
  name: "CustomerDB",
  storeName: "customers",
});

// --- Thunks ---
export const fetchMasterCustomerList = createAsyncThunk(
  "customerData/fetchMasterCustomerList",
  async () => {
    const data = await localforage.getItem("masterCustomerList");
    return data || [];
  }
);

export const persistMasterCustomerList = createAsyncThunk(
  "customerData/persistMasterCustomerList",
  async (list) => {
    await localforage.setItem("masterCustomerList", list);
    return list;
  }
);

export const resetMasterCustomerList = createAsyncThunk(
  "customerData/resetMasterCustomerList",
  async () => {
    await localforage.removeItem("masterCustomerList");
    return [];
  }
);

// --- Slice ---
const customerDataSlice = createSlice({
  name: "customerData",
  initialState: {
    masterCustomerList: [],
    status: "idle",
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMasterCustomerList.fulfilled, (state, action) => {
        if (!isEqual(state.masterCustomerList, action.payload)) {
          state.masterCustomerList = action.payload;
        }
      })
      .addCase(persistMasterCustomerList.fulfilled, (state, action) => {
        if (!isEqual(state.masterCustomerList, action.payload)) {
          state.masterCustomerList = action.payload;
        }
      })
      .addCase(resetMasterCustomerList.fulfilled, (state) => {
        state.masterCustomerList = [];
      });
  },
});

export default customerDataSlice.reducer;
