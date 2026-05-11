import axios from "axios";
import { v4 as uuidv4 } from "uuid";

const user = JSON.parse(localStorage.getItem("user")) || {};
class LoggingInterceptor {
  constructor() {
    this.requestQueue = [];
    this.responseQueue = [];
    this.isProcessing = false;
    this.batchSize = 50;
    this.batchTimeout = 5000; // 5 seconds

    this.initializeInterceptors();
    this.startBatchProcessing();
  }

  /**
   * Initialize Axios interceptors
   */
  initializeInterceptors() {
    // Request interceptor
    axios.interceptors.request.use(
      (config) => {
        // Generate request ID if not present
        if (!config.headers["x-request-id"]) {
          config.headers["x-request-id"] = uuidv4();
        }

        // Generate session ID if not present
        if (!config.headers["x-session-id"]) {
          config.headers["x-session-id"] = this.getOrCreateSessionId();
        }

        // Store request start time
        config.metadata = {
          startTime: Date.now(),
          requestId: config.headers["x-request-id"],
          sessionId: config.headers["x-session-id"],
        };

        // Log request
        this.logRequest(config);

        return config;
      },
      (error) => {
        this.logRequestError(error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    axios.interceptors.response.use(
      (response) => {
        this.logResponse(response);
        return response;
      },
      (error) => {
        this.logResponseError(error);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Log API request
   * @param {Object} config - Axios request config
   */
  logRequest(config) {
    try {
      const requestData = {
        type: "request",
        username: user.username || "anonymous",
        userType: user.userType || "guest",
        requestId: config.metadata.requestId,
        sessionId: config.metadata.sessionId,
        timestamp: new Date().toISOString(),
        method: config.method?.toUpperCase(),
        url: config.url,
        baseURL: config.baseURL,
        fullURL: `${config.baseURL}${config.url}`,
        headers: this.sanitizeHeaders(config.headers),
        data: this.sanitizeData(config.data),
        params: config.params,
        userAgent: navigator.userAgent,
        referrer: document.referrer,
        timestamp: Date.now(),
      };

      this.addToQueue("request", requestData);
    } catch (error) {
      console.error("❌ Error logging request:", error);
    }
  }

  /**
   * Log API response
   * @param {Object} response - Axios response
   */
  logResponse(response) {
    try {
      const config = response.config;
      const responseTime = Date.now() - config.metadata.startTime;

      const responseData = {
        type: "response",
        username: user.username || "anonymous",
        userType: user.userType || "guest",
        requestId: config.metadata.requestId,
        sessionId: config.metadata.sessionId,
        timestamp: new Date().toISOString(),
        method: config.method?.toUpperCase(),
        url: config.url,
        fullURL: `${config.baseURL}${config.url}`,
        status: response.status,
        statusText: response.statusText,
        headers: this.sanitizeHeaders(response.headers),
        data: this.sanitizeData(response.data),
        responseTime: responseTime,
        success: response.status >= 200 && response.status < 400,
        timestamp: Date.now(),
      };

      this.addToQueue("response", responseData);
    } catch (error) {
      console.error("❌ Error logging response:", error);
    }
  }

  /**
   * Log request error
   * @param {Error} error - Request error
   */
  logRequestError(error) {
    try {
      const errorData = {
        type: "request_error",
        username: user.username || "anonymous",
        userType: user.userType || "guest",
        timestamp: new Date().toISOString(),
        error: {
          message: error.message,
          code: error.code,
          name: error.name,
        },
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
      };

      this.addToQueue("error", errorData);
    } catch (logError) {
      console.error("❌ Error logging request error:", logError);
    }
  }

  /**
   * Log response error
   * @param {Error} error - Response error
   */
  logResponseError(error) {
    try {
      const config = error.config || {};
      const responseTime = config.metadata
        ? Date.now() - config.metadata.startTime
        : 0;

      const errorData = {
        type: "response_error",
        username: user.username || "anonymous",
        userType: user.userType || "guest",
        requestId: config.metadata?.requestId,
        sessionId: config.metadata?.sessionId,
        timestamp: new Date().toISOString(),
        method: config.method?.toUpperCase(),
        url: config.url,
        fullURL: config.baseURL ? `${config.baseURL}${config.url}` : config.url,
        status: error.response?.status,
        statusText: error.response?.statusText,
        error: {
          message: error.message,
          code: error.code,
          name: error.name,
        },
        responseData: this.sanitizeData(error.response?.data),
        responseTime: responseTime,
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
      };

      this.addToQueue("error", errorData);
    } catch (logError) {
      console.error("❌ Error logging response error:", logError);
    }
  }

  /**
   * Add log to processing queue
   * @param {string} type - Log type
   * @param {Object} data - Log data
   */
  addToQueue(type, data) {
    this.requestQueue.push({ type, data, timestamp: Date.now() });

    // Start processing if not already scheduled
    if (!this.batchTimer) {
      this.startBatchProcessing();
    }

    // Process immediately if queue is full
    if (this.requestQueue.length >= this.batchSize) {
      this.processQueue();
    }
  }

  /**
   * Process log queue
   */
  async processQueue() {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      const batch = this.requestQueue.splice(0, this.batchSize);

      // Send logs to backend
      await this.sendLogsToBackend(batch);
    } catch (error) {
      console.error("❌ Error processing log queue:", error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Send logs to backend
   * @param {Array} logs - Array of log entries
   */
  async sendLogsToBackend(logs) {
    try {
      const API_BASE_URL =
        import.meta.env.VITE_API_URL || "http://localhost:5000/api";

      await axios.post(
        `${API_BASE_URL}/logs/frontend`,
        {
          logs: logs,
          username: user.username || "anonymous",
          userType: user.userType || "guest",
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href,
          referrer: document.referrer,
        },
        {
          timeout: 5000,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    } catch (error) {
      console.error("❌ Error sending logs to backend:", error);
    }
  }

  /**
   * Start batch processing
   */
  startBatchProcessing() {
    if (this.batchTimer) return; // avoid multiple timers

    this.batchTimer = setTimeout(() => {
      this.processQueue();

      // If there are still logs, schedule the next run
      if (this.requestQueue.length > 0) {
        this.startBatchProcessing();
      } else {
        this.batchTimer = null; // stop until new logs arrive
      }
    }, this.batchTimeout);
  }

  /**
   * Get or create session ID
   * @returns {string} Session ID
   */
  getOrCreateSessionId() {
    let sessionId = localStorage.getItem("sessionId");

    if (!sessionId) {
      sessionId = uuidv4();
      localStorage.setItem("sessionId", sessionId);
    }

    return sessionId;
  }

  /**
   * Sanitize headers to remove sensitive data
   * @param {Object} headers - Headers object
   * @returns {Object} Sanitized headers
   */
  sanitizeHeaders(headers) {
    if (!headers || typeof headers !== "object") {
      return headers;
    }

    const sensitiveFields = [
      "authorization",
      "cookie",
      "x-api-key",
      "x-auth-token",
      "x-access-token",
    ];

    const sanitized = {};

    for (const [key, value] of Object.entries(headers)) {
      const lowerKey = key.toLowerCase();

      if (sensitiveFields.some((field) => lowerKey.includes(field))) {
        sanitized[key] = "[REDACTED]";
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Sanitize data to remove sensitive information
   * @param {any} data - Data to sanitize
   * @returns {any} Sanitized data
   */
  sanitizeData(data) {
    if (!data || typeof data !== "object") {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.sanitizeData(item));
    }

    const sensitiveFields = [
      "password",
      "token",
      "secret",
      "key",
      "apiKey",
      "accessToken",
      "refreshToken",
      "ssn",
      "creditCard",
      "cvv",
      "pin",
    ];

    const sanitized = {};

    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();

      if (sensitiveFields.some((field) => lowerKey.includes(field))) {
        sanitized[key] = "[REDACTED]";
      } else if (typeof value === "object" && value !== null) {
        sanitized[key] = this.sanitizeData(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Log user activity
   * @param {string} activity - Activity type
   * @param {string} description - Activity description
   * @param {Object} metadata - Additional metadata
   */
  logUserActivity(activity, description, metadata = {}) {
    try {
      const activityData = {
        type: "user_activity",
        username: user.username || "anonymous",
        userType: user.userType || "guest",
        sessionId: this.getOrCreateSessionId(),
        timestamp: new Date().toISOString(),
        activity: activity,
        description: description,
        metadata: this.sanitizeData(metadata),
        url: window.location.href,
        referrer: document.referrer,
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
      };

      this.addToQueue("activity", activityData);
    } catch (error) {
      console.error("❌ Error logging user activity:", error);
    }
  }

  /**
   * Log frontend error
   * @param {Error} error - Error object
   * @param {Object} context - Additional context
   */
  logError(error, context = {}) {
    try {
      const errorData = {
        type: "frontend_error",
        username: user.username || "anonymous",
        userType: user.userType || "guest",
        sessionId: this.getOrCreateSessionId(),
        timestamp: new Date().toISOString(),
        error: {
          message: error.message,
          name: error.name,
          stack: error.stack,
        },
        context: this.sanitizeData(context),
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
      };

      this.addToQueue("error", errorData);
    } catch (logError) {
      console.error("❌ Error logging frontend error:", logError);
    }
  }
}

// Create singleton instance
const loggingInterceptor = new LoggingInterceptor();

// Export for use in other modules
export default loggingInterceptor;

// Export individual methods for convenience
export const logUserActivity = (activity, description, metadata) => {
  loggingInterceptor.logUserActivity(activity, description, metadata);
};

export const logError = (error, context) => {
  loggingInterceptor.logError(error, context);
};
