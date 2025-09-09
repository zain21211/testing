const { v4: uuidv4 } = require("uuid");

class SessionManager {
  constructor() {
    this.sessions = new Map();
    this.sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    this.cleanupInterval = 60 * 60 * 1000; // 1 hour in milliseconds

    // Start cleanup interval
    this.startCleanupInterval();
  }

  /**
   * Create a new session
   * @param {string} username - Username
   * @param {Object} req - Express request object
   * @returns {string} Session ID
   */
  createSession(username, req) {
    const sessionId = uuidv4();
    const sessionData = {
      sessionId,
      username,
      userType: req.user?.userType || null,
      ipAddress: this.getClientIP(req),
      userAgent: req.get("User-Agent"),
      createdAt: new Date(),
      lastActivity: new Date(),
      isActive: true,
    };

    this.sessions.set(sessionId, sessionData);
    return sessionId;
  }

  /**
   * Get session data
   * @param {string} sessionId - Session ID
   * @returns {Object|null} Session data
   */
  getSession(sessionId) {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return null;
    }

    // Check if session is expired
    if (this.isSessionExpired(session)) {
      this.sessions.delete(sessionId);
      return null;
    }

    // Update last activity
    session.lastActivity = new Date();
    return session;
  }

  /**
   * Update session activity
   * @param {string} sessionId - Session ID
   * @param {Object} activity - Activity data
   */
  updateSessionActivity(sessionId, activity) {
    const session = this.sessions.get(sessionId);

    if (session) {
      session.lastActivity = new Date();
      session.lastActivityType = activity.type;
      session.lastActivityDescription = activity.description;
    }
  }

  /**
   * End a session
   * @param {string} sessionId - Session ID
   */
  endSession(sessionId) {
    const session = this.sessions.get(sessionId);

    if (session) {
      session.isActive = false;
      session.endedAt = new Date();
    }
  }

  /**
   * Check if session is expired
   * @param {Object} session - Session data
   * @returns {boolean} True if expired
   */
  isSessionExpired(session) {
    const now = new Date();
    const timeSinceLastActivity = now - session.lastActivity;
    return timeSinceLastActivity > this.sessionTimeout;
  }

  /**
   * Get all active sessions for a user
   * @param {string} username - Username
   * @returns {Array} Array of active sessions
   */
  getUserSessions(username) {
    const userSessions = [];

    for (const [sessionId, session] of this.sessions) {
      if (
        session.username === username &&
        session.isActive &&
        !this.isSessionExpired(session)
      ) {
        userSessions.push(session);
      }
    }

    return userSessions;
  }

  /**
   * Get all active sessions
   * @returns {Array} Array of all active sessions
   */
  getAllActiveSessions() {
    const activeSessions = [];

    for (const [sessionId, session] of this.sessions) {
      if (session.isActive && !this.isSessionExpired(session)) {
        activeSessions.push(session);
      }
    }

    return activeSessions;
  }

  /**
   * Get session statistics
   * @returns {Object} Session statistics
   */
  getSessionStats() {
    const now = new Date();
    let activeCount = 0;
    let expiredCount = 0;
    let totalCount = this.sessions.size;

    for (const [sessionId, session] of this.sessions) {
      if (this.isSessionExpired(session)) {
        expiredCount++;
      } else if (session.isActive) {
        activeCount++;
      }
    }

    return {
      total: totalCount,
      active: activeCount,
      expired: expiredCount,
      inactive: totalCount - activeCount - expiredCount,
    };
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions() {
    const expiredSessions = [];

    for (const [sessionId, session] of this.sessions) {
      if (this.isSessionExpired(session)) {
        expiredSessions.push(sessionId);
      }
    }

    expiredSessions.forEach((sessionId) => {
      this.sessions.delete(sessionId);
    });

    if (expiredSessions.length > 0) {
      console.log(`🧹 Cleaned up ${expiredSessions.length} expired sessions`);
    }
  }

  /**
   * Start cleanup interval
   */
  startCleanupInterval() {
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, this.cleanupInterval);
  }

  /**
   * Extract client IP from request
   * @param {Object} req - Express request object
   * @returns {string} Client IP
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

  /**
   * Get session ID from request headers
   * @param {Object} req - Express request object
   * @returns {string|null} Session ID
   */
  getSessionIdFromRequest(req) {
    return req.headers["x-session-id"] || null;
  }

  /**
   * Set session ID in response headers
   * @param {Object} res - Express response object
   * @param {string} sessionId - Session ID
   */
  setSessionIdInResponse(res, sessionId) {
    res.setHeader("x-session-id", sessionId);
  }

  /**
   * Validate session and return session data
   * @param {Object} req - Express request object
   * @returns {Object|null} Session data or null if invalid
   */
  validateSession(req) {
    const sessionId = this.getSessionIdFromRequest(req);

    if (!sessionId) {
      return null;
    }

    return this.getSession(sessionId);
  }
}

module.exports = new SessionManager();
