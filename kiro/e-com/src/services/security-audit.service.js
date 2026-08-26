const { setupLogger, logSecurityEvent } = require("../utils/logger");
const dataProtectionService = require("./data-protection.service");

/**
 * Security Audit Service
 * Tracks and logs security-related events and sensitive operations
 */

const logger = setupLogger();

class SecurityAuditService {
  constructor() {
    this.auditEvents = new Map();
    this.suspiciousActivityThresholds = {
      failedLogins: 5,
      timeWindow: 15 * 60 * 1000, // 15 minutes
      suspiciousRequests: 10,
      dataAccessAttempts: 20,
    };
  }

  /**
   * Log authentication events
   */
  logAuthenticationEvent(event, userId, details = {}) {
    try {
      const auditData = {
        event,
        userId,
        timestamp: new Date().toISOString(),
        ip: details.ip,
        userAgent: details.userAgent,
        success: details.success,
        reason: details.reason,
        sessionId: details.sessionId,
      };

      logSecurityEvent("AUTHENTICATION_EVENT", auditData);

      // Track failed login attempts
      if (event === "LOGIN_ATTEMPT" && !details.success) {
        this.trackFailedLogin(details.ip, userId);
      }

      // Track successful logins
      if (event === "LOGIN_SUCCESS") {
        this.clearFailedLoginAttempts(details.ip, userId);
      }

      return auditData;
    } catch (error) {
      logger.error("Failed to log authentication event", {
        error: error.message,
        event,
        userId,
      });
    }
  }

  /**
   * Log authorization events
   */
  logAuthorizationEvent(event, userId, resource, details = {}) {
    try {
      const auditData = {
        event,
        userId,
        resource,
        timestamp: new Date().toISOString(),
        ip: details.ip,
        userAgent: details.userAgent,
        success: details.success,
        requiredRole: details.requiredRole,
        userRole: details.userRole,
        action: details.action,
      };

      logSecurityEvent("AUTHORIZATION_EVENT", auditData);

      // Track unauthorized access attempts
      if (!details.success) {
        this.trackUnauthorizedAccess(userId, resource, details.ip);
      }

      return auditData;
    } catch (error) {
      logger.error("Failed to log authorization event", {
        error: error.message,
        event,
        userId,
        resource,
      });
    }
  }

  /**
   * Log data access events
   */
  logDataAccessEvent(event, userId, dataType, details = {}) {
    try {
      const auditData = {
        event,
        userId,
        dataType,
        timestamp: new Date().toISOString(),
        ip: details.ip,
        userAgent: details.userAgent,
        recordId: details.recordId,
        action: details.action, // CREATE, READ, UPDATE, DELETE
        fieldsAccessed: details.fieldsAccessed,
        success: details.success,
        reason: details.reason,
      };

      logSecurityEvent("DATA_ACCESS_EVENT", auditData);

      // Track excessive data access
      this.trackDataAccess(userId, dataType, details.ip);

      return auditData;
    } catch (error) {
      logger.error("Failed to log data access event", {
        error: error.message,
        event,
        userId,
        dataType,
      });
    }
  }

  /**
   * Log sensitive operations
   */
  logSensitiveOperation(operation, userId, details = {}) {
    try {
      const auditData = {
        operation,
        userId,
        timestamp: new Date().toISOString(),
        ip: details.ip,
        userAgent: details.userAgent,
        targetUserId: details.targetUserId,
        targetResource: details.targetResource,
        changes: dataProtectionService.maskSensitiveData(details.changes || {}),
        success: details.success,
        reason: details.reason,
      };

      logSecurityEvent("SENSITIVE_OPERATION", auditData);

      // Alert on critical operations
      const criticalOperations = [
        "USER_ROLE_CHANGE",
        "PERMISSION_GRANT",
        "PERMISSION_REVOKE",
        "DATA_EXPORT",
        "SYSTEM_CONFIG_CHANGE",
        "ENCRYPTION_KEY_CHANGE",
      ];

      if (criticalOperations.includes(operation)) {
        this.alertCriticalOperation(operation, userId, details);
      }

      return auditData;
    } catch (error) {
      logger.error("Failed to log sensitive operation", {
        error: error.message,
        operation,
        userId,
      });
    }
  }

  /**
   * Log security violations
   */
  logSecurityViolation(violation, details = {}) {
    try {
      const auditData = {
        violation,
        timestamp: new Date().toISOString(),
        ip: details.ip,
        userAgent: details.userAgent,
        userId: details.userId,
        severity: details.severity || "medium",
        description: details.description,
        requestData: dataProtectionService.maskSensitiveData(
          details.requestData || {}
        ),
        blocked: details.blocked || false,
      };

      logSecurityEvent("SECURITY_VIOLATION", auditData);

      // Auto-block on severe violations
      if (details.severity === "high" || details.severity === "critical") {
        this.handleSevereViolation(violation, details);
      }

      return auditData;
    } catch (error) {
      logger.error("Failed to log security violation", {
        error: error.message,
        violation,
      });
    }
  }

  /**
   * Track failed login attempts
   */
  trackFailedLogin(ip, userId) {
    try {
      const key = `failed_login:${ip}:${userId}`;
      const now = Date.now();

      if (!this.auditEvents.has(key)) {
        this.auditEvents.set(key, []);
      }

      const attempts = this.auditEvents.get(key);
      attempts.push(now);

      // Remove old attempts outside time window
      const validAttempts = attempts.filter(
        (time) => now - time < this.suspiciousActivityThresholds.timeWindow
      );

      this.auditEvents.set(key, validAttempts);

      // Check if threshold exceeded
      if (
        validAttempts.length >= this.suspiciousActivityThresholds.failedLogins
      ) {
        this.alertSuspiciousActivity("EXCESSIVE_FAILED_LOGINS", {
          ip,
          userId,
          attempts: validAttempts.length,
          timeWindow: this.suspiciousActivityThresholds.timeWindow,
        });
      }
    } catch (error) {
      logger.error("Failed to track failed login", {
        error: error.message,
        ip,
        userId,
      });
    }
  }

  /**
   * Clear failed login attempts on successful login
   */
  clearFailedLoginAttempts(ip, userId) {
    try {
      const key = `failed_login:${ip}:${userId}`;
      this.auditEvents.delete(key);
    } catch (error) {
      logger.error("Failed to clear failed login attempts", {
        error: error.message,
        ip,
        userId,
      });
    }
  }

  /**
   * Track unauthorized access attempts
   */
  trackUnauthorizedAccess(userId, resource, ip) {
    try {
      const key = `unauthorized_access:${ip}:${userId}`;
      const now = Date.now();

      if (!this.auditEvents.has(key)) {
        this.auditEvents.set(key, []);
      }

      const attempts = this.auditEvents.get(key);
      attempts.push({ time: now, resource });

      // Remove old attempts
      const validAttempts = attempts.filter(
        (attempt) =>
          now - attempt.time < this.suspiciousActivityThresholds.timeWindow
      );

      this.auditEvents.set(key, validAttempts);

      // Check threshold
      if (validAttempts.length >= 5) {
        this.alertSuspiciousActivity("EXCESSIVE_UNAUTHORIZED_ACCESS", {
          ip,
          userId,
          attempts: validAttempts.length,
          resources: validAttempts.map((a) => a.resource),
        });
      }
    } catch (error) {
      logger.error("Failed to track unauthorized access", {
        error: error.message,
        userId,
        resource,
        ip,
      });
    }
  }

  /**
   * Track data access patterns
   */
  trackDataAccess(userId, dataType, ip) {
    try {
      const key = `data_access:${ip}:${userId}:${dataType}`;
      const now = Date.now();

      if (!this.auditEvents.has(key)) {
        this.auditEvents.set(key, []);
      }

      const accesses = this.auditEvents.get(key);
      accesses.push(now);

      // Remove old accesses
      const validAccesses = accesses.filter(
        (time) => now - time < this.suspiciousActivityThresholds.timeWindow
      );

      this.auditEvents.set(key, validAccesses);

      // Check threshold
      if (
        validAccesses.length >=
        this.suspiciousActivityThresholds.dataAccessAttempts
      ) {
        this.alertSuspiciousActivity("EXCESSIVE_DATA_ACCESS", {
          ip,
          userId,
          dataType,
          accesses: validAccesses.length,
          timeWindow: this.suspiciousActivityThresholds.timeWindow,
        });
      }
    } catch (error) {
      logger.error("Failed to track data access", {
        error: error.message,
        userId,
        dataType,
        ip,
      });
    }
  }

  /**
   * Alert on suspicious activity
   */
  alertSuspiciousActivity(activityType, details) {
    try {
      const alert = {
        type: "SUSPICIOUS_ACTIVITY",
        activityType,
        details,
        timestamp: new Date().toISOString(),
        severity: "high",
      };

      logSecurityEvent("SUSPICIOUS_ACTIVITY_ALERT", alert);

      // In production, send immediate notifications
      if (process.env.NODE_ENV === "production") {
        // Send to security team, SIEM, etc.
        this.sendSecurityAlert(alert);
      }
    } catch (error) {
      logger.error("Failed to alert suspicious activity", {
        error: error.message,
        activityType,
      });
    }
  }

  /**
   * Alert on critical operations
   */
  alertCriticalOperation(operation, userId, details) {
    try {
      const alert = {
        type: "CRITICAL_OPERATION",
        operation,
        userId,
        details: dataProtectionService.maskSensitiveData(details),
        timestamp: new Date().toISOString(),
        severity: "critical",
      };

      logSecurityEvent("CRITICAL_OPERATION_ALERT", alert);

      // Send immediate notification for critical operations
      this.sendSecurityAlert(alert);
    } catch (error) {
      logger.error("Failed to alert critical operation", {
        error: error.message,
        operation,
        userId,
      });
    }
  }

  /**
   * Handle severe security violations
   */
  handleSevereViolation(violation, details) {
    try {
      const response = {
        violation,
        details,
        timestamp: new Date().toISOString(),
        actions: [],
      };

      // Auto-block IP for severe violations
      if (details.ip && details.severity === "critical") {
        response.actions.push("IP_BLOCKED");
        // In a real implementation, add IP to blocklist
      }

      // Suspend user account for critical violations
      if (details.userId && details.severity === "critical") {
        response.actions.push("USER_SUSPENDED");
        // In a real implementation, suspend user account
      }

      logSecurityEvent("SEVERE_VIOLATION_RESPONSE", response);

      // Send immediate alert
      this.sendSecurityAlert({
        type: "SEVERE_VIOLATION",
        violation,
        details,
        response,
        severity: "critical",
      });
    } catch (error) {
      logger.error("Failed to handle severe violation", {
        error: error.message,
        violation,
      });
    }
  }

  /**
   * Send security alert (placeholder for actual implementation)
   */
  async sendSecurityAlert(alert) {
    try {
      // In a real implementation, this would:
      // - Send email to security team
      // - Post to Slack/Discord security channel
      // - Send to SIEM system
      // - Trigger incident response workflow

      logger.warn("Security alert generated", {
        alertType: alert.type,
        severity: alert.severity,
        timestamp: alert.timestamp,
      });

      // Example: Send to error notification service
      const errorNotificationService = require("./error-notification.service");
      await errorNotificationService.notifyCriticalError(
        new Error(`Security Alert: ${alert.type}`),
        alert
      );
    } catch (error) {
      logger.error("Failed to send security alert", {
        error: error.message,
        alert: alert.type,
      });
    }
  }

  /**
   * Generate security audit report
   */
  generateAuditReport(startDate, endDate, filters = {}) {
    try {
      // In a real implementation, this would query audit logs from database
      const report = {
        period: {
          start: startDate,
          end: endDate,
        },
        filters,
        summary: {
          totalEvents: 0,
          authenticationEvents: 0,
          authorizationEvents: 0,
          dataAccessEvents: 0,
          sensitiveOperations: 0,
          securityViolations: 0,
          suspiciousActivities: 0,
        },
        events: [], // Would contain actual audit events
        recommendations: this.generateSecurityRecommendations(),
        generatedAt: new Date().toISOString(),
      };

      logSecurityEvent("AUDIT_REPORT_GENERATED", {
        period: report.period,
        filters,
        eventCount: report.summary.totalEvents,
      });

      return report;
    } catch (error) {
      logger.error("Failed to generate audit report", {
        error: error.message,
        startDate,
        endDate,
      });
      throw new Error("Audit report generation failed");
    }
  }

  /**
   * Generate security recommendations
   */
  generateSecurityRecommendations() {
    return [
      {
        category: "Authentication",
        recommendation:
          "Enable multi-factor authentication for all admin accounts",
        priority: "high",
      },
      {
        category: "Access Control",
        recommendation: "Review and update user permissions quarterly",
        priority: "medium",
      },
      {
        category: "Data Protection",
        recommendation: "Implement data encryption for all PII fields",
        priority: "high",
      },
      {
        category: "Monitoring",
        recommendation: "Set up real-time security event monitoring",
        priority: "medium",
      },
      {
        category: "Incident Response",
        recommendation: "Develop and test incident response procedures",
        priority: "high",
      },
    ];
  }

  /**
   * Clean up old audit events from memory
   */
  cleanupOldEvents() {
    try {
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      for (const [key, events] of this.auditEvents.entries()) {
        if (Array.isArray(events)) {
          const validEvents = events.filter(
            (event) => now - (event.time || event) < maxAge
          );

          if (validEvents.length === 0) {
            this.auditEvents.delete(key);
          } else {
            this.auditEvents.set(key, validEvents);
          }
        }
      }

      logger.debug("Cleaned up old audit events", {
        remainingKeys: this.auditEvents.size,
      });
    } catch (error) {
      logger.error("Failed to cleanup old audit events", {
        error: error.message,
      });
    }
  }
}

module.exports = new SecurityAuditService();
