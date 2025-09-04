// createCustomerSlice.js
import { createSlice } from "@reduxjs/toolkit";

const createCustomerSlice = createSlice({
  name: "createCustomer",
  initialState: {
    accounts: [], // parent-level data
    // other customer-related fields if needed
  },
  reducers: {
    setAccounts: (state, action) => {
      state.accounts = action.payload;
    },
    // updateCustomer: (state, action) => {
    //   const { name } = action.payload;
    //   // call your useCOAUpdate or equivalent logic here
    //   useUpdateCustomer(state.accounts, name);
    // },
  },
});

export const { setAccounts } = createCustomerSlice.actions;
export default createCustomerSlice.reducer;
