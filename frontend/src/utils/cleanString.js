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

export function makeStringPrettier(str = "") {
  return str
    .replace(/[_-]+/g, " ") // replace underscores and hyphens with spaces
    .replace(/([a-z])([A-Z])/g, "$1 $2") // add space before capital letters (camelCase → spaced)
    .replace(/\s+/g, " ") // collapse multiple spaces
    .trim() // remove leading/trailing spaces
    .replace(/\b\w/g, (c) => c.toUpperCase()); // capitalize each word
}
