# Comprehensive Logging System

This logging system provides comprehensive tracking of user actions, API requests/responses, and errors across your application.

## Features

### 🔍 **API Request/Response Logging**

- Tracks all API endpoints with request/response data
- Records response times, status codes, and payloads
- Sanitizes sensitive data automatically
- Supports batch processing for high-volume scenarios

### 🚨 **Error Tracking**

- Captures and categorizes all application errors
- Tracks error severity levels (LOW, MEDIUM, HIGH, CRITICAL)
- Provides error resolution tracking
- Real-time error rate monitoring with alerts

### 👤 **User Activity Monitoring**

- Logs user actions and behaviors
- Tracks session information
- Monitors user navigation and interactions
- Provides user activity analytics

### 📊 **Analytics & Reporting**

- Performance statistics and trends
- Error rate analysis
- User behavior insights
- Export capabilities (CSV, JSON)

## Architecture

### Backend Components

```
backend/logging/
├── config/
│   ├── mongodb.js          # MongoDB connection
│   └── loggingConfig.js    # Logging configuration
├── middleware/
│   ├── requestLogger.js    # API request logging
│   ├── errorLogger.js      # Error handling
│   └── userActivityLogger.js # User activity tracking
├── models/
│   ├── ApiLog.js           # API logs schema
│   ├── ErrorLog.js         # Error logs schema
│   ├── UserActivity.js     # User activities schema
│   └── FrontendLog.js      # Frontend logs schema
├── services/
│   ├── loggingService.js   # Main logging service
│   └── errorService.js     # Error handling service
├── utils/
│   ├── logSanitizer.js     # Data sanitization
│   ├── logFormatter.js     # Log formatting
│   └── sessionManager.js   # Session management
└── routes/
    ├── logsRoutes.js       # Log management API
    └── frontendLogsRoutes.js # Frontend logs API
```

### Frontend Components

```
frontend/src/
├── utils/
│   └── loggingInterceptor.js # Axios interceptors
├── components/
│   ├── ErrorBoundary.jsx   # Error boundary
│   └── LogViewer.jsx       # Log viewing interface
```

## Setup Instructions

### 1. Install Dependencies

```bash
# Backend dependencies
cd backend
npm install mongodb mongoose uuid

# Frontend dependencies
cd frontend
npm install uuid
```

### 2. Environment Configuration

Add these environment variables to your `.env` file:

```env
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/ahmadinternational-logs

# Logging Configuration
LOG_LEVEL=INFO
ENABLE_API_LOGGING=true
ENABLE_ERROR_LOGGING=true
ENABLE_USER_ACTIVITY_LOGGING=true
ENABLE_ASYNC_LOGGING=true
LOG_BATCH_SIZE=100
LOG_BATCH_TIMEOUT=5000
SANITIZE_SENSITIVE_DATA=true
MAX_PAYLOAD_SIZE=10000
LOG_RETENTION_DAYS=90
ERROR_LOG_RETENTION_DAYS=365
```

### 3. MongoDB Setup

Make sure MongoDB is running and accessible at the configured URI.

### 4. Integration

The logging system is automatically integrated into your application:

- **Backend**: Middleware is added to `main.js`
- **Frontend**: Interceptors are initialized in `main.jsx`

## API Endpoints

### Log Management

- `GET /api/logs/api` - Get API logs
- `GET /api/logs/errors` - Get error logs
- `GET /api/logs/activities` - Get user activities
- `GET /api/logs/stats` - Get logging statistics
- `GET /api/logs/performance` - Get performance metrics
- `PUT /api/logs/errors/:id/resolve` - Mark error as resolved
- `GET /api/logs/export/:type` - Export logs (CSV/JSON)

### Frontend Logs

- `POST /api/logs/frontend` - Receive frontend logs
- `GET /api/logs/frontend` - Get frontend logs

## Usage Examples

### Backend - Log User Activity

```javascript
const { logUserActivity } = require("./logging/middleware/userActivityLogger");

// In your route handler
app.post(
  "/api/orders",
  logUserActivity("CREATE_ORDER", "User created a new order"),
  (req, res) => {
    // Your route logic
  }
);
```

### Frontend - Log User Activity

```javascript
import { logUserActivity } from "./utils/loggingInterceptor";

// Log user activity
logUserActivity("VIEW_REPORT", "User viewed sales report", {
  reportType: "sales",
  dateRange: "2024-01-01 to 2024-01-31",
});
```

### Frontend - Log Errors

```javascript
import { logError } from "./utils/loggingInterceptor";

try {
  // Some operation
} catch (error) {
  logError(error, {
    component: "OrderForm",
    action: "submitOrder",
  });
}
```

## Configuration Options

### Log Levels

- `DEBUG` - Detailed debugging information
- `INFO` - General information
- `WARN` - Warning messages
- `ERROR` - Error messages

### Error Severity Levels

- `LOW` - Minor issues
- `MEDIUM` - Moderate issues
- `HIGH` - Significant issues
- `CRITICAL` - Critical system issues

### Tracked Activities

- `LOGIN`, `LOGOUT`
- `CREATE_ORDER`, `UPDATE_ORDER`, `DELETE_ORDER`
- `CREATE_CUSTOMER`, `UPDATE_CUSTOMER`
- `CREATE_PRODUCT`, `UPDATE_PRODUCT`
- `VIEW_REPORT`, `EXPORT_DATA`
- `UPLOAD_FILE`, `DOWNLOAD_FILE`
- And more...

## Data Sanitization

The system automatically sanitizes sensitive data:

- Passwords, tokens, API keys
- Credit card information
- Personal identification numbers
- Authorization headers

## Performance Considerations

- **Async Logging**: Non-blocking log processing
- **Batch Processing**: Efficient handling of high-volume logs
- **TTL Indexes**: Automatic cleanup of old logs
- **Indexing**: Optimized database queries
- **Payload Limits**: Configurable size limits

## Monitoring & Alerts

- Real-time error rate monitoring
- Response time threshold alerts
- Concurrent user monitoring
- Automatic error categorization

## Security Features

- IP address anonymization option
- Sensitive data redaction
- Access control for log viewing
- Secure log transmission

## Maintenance

### Log Cleanup

```javascript
// Clean up old resolved errors (30+ days)
DELETE /api/logs/errors/cleanup?daysOld=30
```

### Health Monitoring

The system includes built-in health checks and monitoring endpoints.

## Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**

   - Check MongoDB is running
   - Verify connection string
   - Check network connectivity

2. **High Memory Usage**

   - Reduce batch size
   - Enable async logging
   - Check log retention settings

3. **Missing Logs**
   - Verify logging is enabled
   - Check excluded endpoints
   - Review log level settings

### Debug Mode

Enable debug logging by setting:

```env
LOG_LEVEL=DEBUG
```

## Support

For issues or questions about the logging system, check the logs themselves or contact the development team.

---

**Note**: This logging system is designed to be non-intrusive and should not impact your application's performance when properly configured.
