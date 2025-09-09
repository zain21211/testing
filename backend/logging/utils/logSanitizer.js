const loggingConfig = require("../config/loggingConfig");

class LogSanitizer {
  constructor() {
    this.sensitiveFields = loggingConfig.sensitiveFields || [];
    this.maxPayloadSize = loggingConfig.maxPayloadSize || 5000;
  }

  /**
   * Sanitize sensitive data from objects with depth guard + cycle detection
   * @param {Object} data - Data to sanitize
   * @param {boolean} deep - Whether to perform deep sanitization
   * @param {number} depth - Current recursion depth
   * @param {WeakSet} seen - Track visited objects to prevent cycles
   * @returns {Object|Array|string|number|null} Sanitized data
   */
  sanitizeData(data, deep = true, depth = 0, seen = new WeakSet()) {
    if (!data || typeof data !== "object") return data;

    if (seen.has(data)) return "[Cyclic Reference]";
    seen.add(data);

    if (Array.isArray(data)) {
      if (depth > 5) return "[Max Depth Reached]";
      return data.map((item) => this.sanitizeData(item, deep, depth + 1, seen));
    }

    if (depth > 5) return "[Max Depth Reached]";

    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();

      // Check if field is sensitive
      if (
        this.sensitiveFields.some((field) =>
          lowerKey.includes(field.toLowerCase())
        )
      ) {
        sanitized[key] = "[REDACTED]";
      } else if (deep && typeof value === "object" && value !== null) {
        sanitized[key] = this.sanitizeData(value, deep, depth + 1, seen);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  /**
   * Sanitize request headers
   */
  sanitizeHeaders(headers) {
    if (!headers || typeof headers !== "object") return headers;

    const sanitized = {};
    for (const [key, value] of Object.entries(headers)) {
      const lowerKey = key.toLowerCase();
      if (
        this.sensitiveFields.some((field) =>
          lowerKey.includes(field.toLowerCase())
        )
      ) {
        sanitized[key] = "[REDACTED]";
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  /**
   * Truncate large payloads safely
   * Always return a string when truncated
   */
  truncatePayload(payload) {
    if (!payload) return payload;

    try {
      const payloadStr = JSON.stringify(payload);
      if (payloadStr.length <= this.maxPayloadSize) {
        return payloadStr; // safe JSON string
      }
      // Truncate and add indicator
      return (
        payloadStr.substring(0, this.maxPayloadSize - 50) + "... [TRUNCATED]"
      );
    } catch (err) {
      return "[Unserializable Payload]";
    }
  }

  /**
   * Sanitize + truncate request payload
   */
  sanitizeRequestPayload(payload) {
    if (!loggingConfig.sanitizeSensitiveData) {
      return this.truncatePayload(payload);
    }
    const sanitized = this.sanitizeData(payload);
    return this.truncatePayload(sanitized);
  }

  /**
   * Sanitize + truncate response payload
   */
  sanitizeResponsePayload(payload) {
    if (!loggingConfig.sanitizeSensitiveData) {
      return this.truncatePayload(payload);
    }
    const sanitized = this.sanitizeData(payload);
    return this.truncatePayload(sanitized);
  }

  /**
   * Sanitize error details
   */
  sanitizeError(error) {
    if (!error) return null;

    const sanitized = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };

    // Remove sensitive data from error message
    if (error.message) {
      let message = error.message;
      this.sensitiveFields.forEach((field) => {
        const regex = new RegExp(field, "gi");
        message = message.replace(regex, "[REDACTED]");
      });
      sanitized.message = message;
    }

    return sanitized;
  }

  /**
   * Sanitize IP address (optional anonymization)
   */
  sanitizeIP(ip) {
    if (!ip) return ip;
    if (loggingConfig.anonymizeIP) {
      const parts = ip.split(".");
      if (parts.length === 4) {
        parts[3] = "xxx";
        return parts.join(".");
      }
    }
    return ip;
  }

  /**
   * Sanitize user agent (remove version numbers for privacy)
   */
  sanitizeUserAgent(userAgent) {
    if (!userAgent) return userAgent;

    return userAgent
      .replace(/\d+\.\d+\.\d+/g, "x.x.x") // hide versions
      .replace(/\([^)]*\)/g, "(...)") // hide OS/build details
      .substring(0, 200); // cap length
  }
}

module.exports = new LogSanitizer();
