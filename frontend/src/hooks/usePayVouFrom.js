// hooks/usePaymentVoucherForm.js
import { useState, useRef, useEffect } from "react";
import { formatCurrency } from "../utils/formatCurrency";

export const usePayVouForm = () => {
  const [formData, setFormData] = useState({
    description: "",
  });
  const [displayValue, setDisplayValue] = useState(""); // For formatted cash amount
  const descRef = useRef(null);

  useEffect(() => {
    // Focus description field if needed
    setTimeout(() => {
      descRef.current?.focus();
    }, 50);
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleCashAmountChange = (e) => {
    const value = e.target.value;
    const formatted = formatCurrency(value);
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
