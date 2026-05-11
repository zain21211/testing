const { v4: uuidv4 } = require("uuid");

class LogFormatter {
  constructor() {
    this.requestIdHeader = "x-request-id";
    this.sessionIdHeader = "x-session-id";
  }

  /**
   * Generate unique request ID
   * @returns {string} Unique request ID
   */
  generateRequestId() {
    return uuidv4();
  }

  /**
   * Generate unique session ID
   * @returns {string} Unique session ID
   */
  generateSessionId() {
    return uuidv4();
  }

  /**
   * Extract user information from JWT token
   * @param {Object} req - Express request object
   * @returns {Object} User information
   */
  extractUserInfo(req) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return { username: null, userType: null };
      }

      const token = authHeader.substring(7);
      const decoded = this.decodeJWT(token);

      return {
        username: decoded.username || decoded.sub || null,
        userType: decoded.userType || decoded.role || null,
      };
    } catch (error) {
      return { username: null, userType: null };
    }
  }

  /**
   * Decode JWT token (basic implementation)
   * @param {string} token - JWT token
   * @returns {Object} Decoded token payload
   */
  decodeJWT(token) {
    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      return {};
    }
  }

  /**
   * Format API log data
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {number} responseTime - Response time in milliseconds
   * @param {Object} sanitizer - Log sanitizer instance
   * @returns {Object} Formatted API log data
   */
  formatApiLog(req, res, responseTime, sanitizer) {
    const userInfo = this.extractUserInfo(req);
    const requestId =
      req.headers[this.requestIdHeader] || this.generateRequestId();
    const sessionId =
      req.headers[this.sessionIdHeader] || this.generateSessionId();

    return {
      sessionId,
      username: userInfo.username,
      userType: userInfo.userType,
      requestId,
      timestamp: new Date(),
      method: req.method,
      endpoint: req.route?.path || req.path,
      url: req.originalUrl || req.url,
      userAgent: sanitizer.sanitizeUserAgent(
        req.headers?.["User-Agent"] || "unknown"
      ),
      ipAddress: sanitizer.sanitizeIP(req.ip || req.connection.remoteAddress),
      requestHeaders: sanitizer.sanitizeHeaders(req.headers),
      requestPayload: sanitizer.sanitizeRequestPayload({
        body: req.body,
        query: req.query,
        params: req.params,
      }),
      responseStatus: res.statusCode,
      responseHeaders: sanitizer.sanitizeHeaders(res.getHeaders()),
      responsePayload: sanitizer.sanitizeResponsePayload(
        res.locals.responseData
      ),
      responseTime,
      errorDetails: res.locals.errorDetails || null,
      success: res.statusCode >= 200 && res.statusCode < 400,
    };
  }

  /**
   * Format error log data
   * @param {Error} error - Error object
   * @param {Object} req - Express request object
   * @param {Object} additionalContext - Additional context
   * @param {Object} sanitizer - Log sanitizer instance
   * @returns {Object} Formatted error log data
   */
  formatErrorLog(error, req, additionalContext = {}, sanitizer) {
    const userInfo = this.extractUserInfo(req);
    const requestId =
      req.headers[this.requestIdHeader] || this.generateRequestId();
    const sessionId =
      req.headers[this.sessionIdHeader] || this.generateSessionId();

    return {
      sessionId,
      username: userInfo.username,
      requestId,
      timestamp: new Date(),
      errorType: this.determineErrorType(error, req),
      errorCode: error.code || error.statusCode || "UNKNOWN_ERROR",
      errorMessage: error.message || "Unknown error occurred",
      stackTrace: error.stack,
      endpoint: req.route?.path || req.path,
      requestPayload: sanitizer.sanitizeRequestPayload({
        body: req.body,
        query: req.query,
        params: req.params,
      }),
      severity: this.determineErrorSeverity(error, req),
      resolved: false,
      environment: process.env.NODE_ENV || "development",
      additionalContext: {
        ...additionalContext,
        userAgent: sanitizer.sanitizeUserAgent(
          req.headers?.["User-Agent"] || "unknown"
        ),
        ipAddress: sanitizer.sanitizeIP(req.ip || req.connection.remoteAddress),
      },
    };
  }

  /**
   * Format user activity log data
   * @param {string} activity - Activity type
   * @param {string} description - Activity description
   * @param {Object} req - Express request object
   * @param {Object} metadata - Additional metadata
   * @param {Object} sanitizer - Log sanitizer instance
   * @returns {Object} Formatted user activity log data
   */
  formatUserActivity(activity, description, req, metadata = {}, sanitizer) {
    const userInfo = this.extractUserInfo(req);
    const sessionId =
      req.headers[this.sessionIdHeader] || this.generateSessionId();

    return {
      sessionId,
      username: userInfo.username,
      userType: userInfo.userType,
      activity,
      description,
      metadata: sanitizer.sanitizeData(metadata),
      timestamp: new Date(),
      ipAddress: sanitizer.sanitizeIP(req.ip || req.connection.remoteAddress),
      userAgent: sanitizer.sanitizeUserAgent(req.get("User-Agent")),
      success: true,
      additionalContext: {
        endpoint: req.route?.path || req.path,
        method: req.method,
      },
    };
  }

  /**
   * Determine error type based on error and request
   * @param {Error} error - Error object
   * @param {Object} req - Express request object
   * @returns {string} Error type
   */
  determineErrorType(error, req) {
    if (error.name === "ValidationError") return "VALIDATION_ERROR";
    if (error.name === "UnauthorizedError") return "AUTHENTICATION_ERROR";
    if (error.name === "ForbiddenError") return "AUTHORIZATION_ERROR";
    if (error.name === "CastError") return "VALIDATION_ERROR";
    if (error.code === "ECONNREFUSED") return "NETWORK_ERROR";
    if (error.code === "ENOTFOUND") return "NETWORK_ERROR";
    if (error.statusCode >= 400 && error.statusCode < 500)
      return "CLIENT_ERROR";
    if (error.statusCode >= 500) return "SYSTEM_ERROR";
    if (req.route?.path?.includes("database")) return "DATABASE_ERROR";

    return "SYSTEM_ERROR";
  }

  /**
   * Determine error severity based on error and request
   * @param {Error} error - Error object
   * @param {Object} req - Express request object
   * @returns {string} Error severity
   */
  determineErrorSeverity(error, req) {
    if (error.statusCode >= 500) return "CRITICAL";
    if (error.statusCode === 404) return "LOW";
    if (error.statusCode >= 400 && error.statusCode < 500) return "MEDIUM";
    if (error.name === "ValidationError") return "LOW";
    if (error.name === "UnauthorizedError") return "HIGH";
    if (error.name === "ForbiddenError") return "HIGH";

    return "MEDIUM";
  }

  /**
   * Extract client IP address from request
   * @param {Object} req - Express request object
   * @returns {string} Client IP address
   */
  getClientIP(req) {
    return (
      req.ip ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      "unknown"
    );
  }
}

module.exports = new LogFormatter();
