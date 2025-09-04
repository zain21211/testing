export const cleanString = (string) => {
  return string?.toLowerCase().replace(/\s/g, "");
};

export function cleanNumbers(input) {
  const cleaned = input.replace(/[^0-9]/g, ""); // keep only digits
  return cleaned ? parseFloat(cleaned) : 0; // convert to number
}

export function formatNumbers(input) {
  if (input === null || input === undefined || input === "") return "";

  const num = Number(input.toString().replace(/,/g, "")); // remove commas, convert to number
  if (isNaN(num)) return "";

  return num.toLocaleString("en-US");
}
