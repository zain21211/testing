import { useEffect } from "react";
import { takeScreenShot } from "../fuctions";

export const useOrderCompletion = ({
  id,
  customer,
  isReady,
  cameFromOrderPage,
  targetRef,
}) => {
  useEffect(() => {
    const invoiceURL = location.pathname;
    if (!cameFromOrderPage || !targetRef.current || !invoiceURL) return;

    const key = `screenshot_taken_${invoiceURL}`;
    const alreadyTaken = sessionStorage.getItem(key);

    if (!alreadyTaken) {
      sessionStorage.setItem(key, "true");
      setTimeout(() => {
        takeScreenShot(targetRef);
      }, 1500);
    }

    // WhatsApp always opens regardless of screenshot status
    let phoneNumber;
    if (customer?.Number) {
      const localNumber = String(customer.Number).trim();
      const raw = localNumber.startsWith("0")
        ? "92" + localNumber.slice(1)
        : localNumber;
      phoneNumber = raw.replace(/\D/g, "");
    } else {
      console.warn("Customer number missing, using fallback.");
    }

    const message = encodeURIComponent("");
    const whatsappURL = `https://wa.me/${phoneNumber}?text=${message}`;
    window.open(whatsappURL, "_blank");
  }, [cameFromOrderPage, isReady, location.pathname, customer]);
};
