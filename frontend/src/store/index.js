// src/store/index.js
import { configureStore } from "@reduxjs/toolkit";
import customerSearchReducer from "./slices/CustomerSearch";
import customerDataReducer from "./slices/CustomerData";

const store = configureStore({
  reducer: {
    customerSearch: customerSearchReducer,
    customerData: customerDataReducer,
  },
});

export default store;
