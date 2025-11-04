function convertPhoneNumber(number = "") {
  number = number.replace(/\D/g, "");
  if (number.startsWith("0")) {
    number = "92" + number.slice(1);
  }
  return number;
}

module.exports = convertPhoneNumber;
