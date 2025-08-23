// src/components/CustomerSearch.jsx
import React from "react";
import { useDateRange } from "./hooks/useDateRange";
import { useCustomerSearch } from "./hooks/useCustomerData";
import CustomerSearchUI from "./components/CustomerSearchUI";

const CustomerSearch = ({
  usage = "ledger", // default usage
  onFetch,
  onSelect,
  route,
  disabled = false,
  ledgerLoading = false,
}) => {
  // 1. Call the date hook
  const dateHookData = useDateRange("3-Months");

  // const handleAcidInputChange
  // 2. Call the main logic hook, passing it dependencies
  const customerSearchHookData = useCustomerSearch({
    route,
    onSelect,
    onFetch,
    usage,
    dates: dateHookData.dates, // Pass dates to the search hook
  });

  // 3. Render the UI component, passing all props from both hooks
  return (
    <CustomerSearchUI
      {...customerSearchHookData}
      {...dateHookData}
      // handleAcidInputChange={handleAcidInputChange}
      usage={usage}
      disabled={disabled}
      ledgerLoading={ledgerLoading}
    />
  );
};

export default CustomerSearch;