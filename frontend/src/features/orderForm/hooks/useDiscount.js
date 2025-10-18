// src/hooks/useDiscount.js
import { useState, useEffect } from "react";
import { fetchDiscount, fetchDiscountAll } from "../utils/api";
import { useFetch } from "./useFetch";

export function useDiscount(
  selectedCustomer,
  selectedProduct = null,
  all = false
) {
  const [discount1, setDiscount1] = useState(0);
  const [discount2, setDiscount2] = useState(0);
  const [list, setList] = useState([]);

  const params = all
    ? [selectedProduct?.Company] // 👈 params for fetchDiscountAll
    : [selectedCustomer?.acid, selectedProduct?.Company]; // 👈 params for fetchDiscount

  const { data, isLoading, error } = useFetch(
    "discount",
    all ? fetchDiscountAll : fetchDiscount,
    params,
    {
      enabled: all
        ? !!selectedProduct?.Company
        : !!(selectedCustomer?.acid && selectedProduct?.Company),
    }
  );

  // ✅ update state only when `data` changes
  useEffect(() => {
    if (data) {
      if (all) {
        console.log(data);
        setList(data);
        return;
      }
      setDiscount1(data.disc1P || 0);
      setDiscount2(data.discount || 0);
    } else {
      setDiscount1(0);
      setDiscount2(0);
    }
  }, [data]);

  return {
    discount1,
    setDiscount1,
    discount2,
    setDiscount2,
    isLoading,
    error,
    list,
  };
}
