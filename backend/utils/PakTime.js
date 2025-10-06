function getPakistanISODateString(date) {
  const now = date ? new Date(date) : new Date();

  const options = {
    timeZone: "Asia/Karachi",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  };

  const formatter = new Intl.DateTimeFormat("en-GB", options);
  const parts = formatter.formatToParts(now);
  const get = (type) => parts.find((p) => p.type === type)?.value;

  const year = get("year");
  const month = get("month");
  const day = get("day");
  const hour = get("hour");
  const minute = get("minute");
  const second = get("second");

  // No timezone offset for DATETIME2 — returns Pakistan local ISO-like string
  return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
}

module.exports = getPakistanISODateString;
