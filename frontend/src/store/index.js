// src/store/index.js
import { configureStore } from "@reduxjs/toolkit";
import customerSearchReducer from "./slices/CustomerSearch";
import customerDataReducer from "./slices/CustomerData";
import createCustomerReducer from "./slices/CreateCustomer"; // import your new slice

const store = configureStore({
  reducer: {
    customerSearch: customerSearchReducer,
    customerData: customerDataReducer,
    createCustomer: createCustomerReducer, // add it here
  },
});

export default store;
