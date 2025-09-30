// hooks/usePaymentVoucherForm.js
import { useState, useRef, useEffect } from "react";
import { formatCurrency } from "../utils/formatCurrency";
import { cleanNumbers } from "../utils/cleanString";

export const usePayVouForm = (isCust) => {
  const [formData, setFormData] = useState({
    description: "",
  });
  const [displayValue, setDisplayValue] = useState(""); // For formatted cash amount
  const descRef = useRef(null);

  useEffect(() => {
    // Focus description field if needed
    if (isCust) {
      setTimeout(() => {
        descRef.current?.focus();
      }, 50);
    }
  }, [isCust]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleCashAmountChange = (e) => {
    const value = e.target.value;
    const raw = cleanNumbers(value);
    const formatted = formatCurrency(raw);
    setDisplayValue(formatted);
    // We don't store the formatted value in formData,
    // but the raw numeric value is extracted during submission.
  };

  const clearForm = () => {
    setFormData({ description: "" });
    setDisplayValue("");
  };

  return {
    formData,
    displayValue,
    descRef,
    handleChange,
    handleCashAmountChange,
    clearForm,
  };
};
