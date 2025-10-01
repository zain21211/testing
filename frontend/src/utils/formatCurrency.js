export const formatCurrency = (value) => {
  const num = Number(value);
  if (isNaN(num)) return "0";
  // Format to 0 decimal places for currency string, but keep as number for calculations
  // Use toLocaleString for thousands separators
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};
