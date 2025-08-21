# Document Processing Resilience Solution

## Overview

This solution makes the document processing system resilient to FastAPI server crashes and interruptions by implementing automatic monitoring, health checks, and restart mechanisms in the NestJS backend.

## Problem Statement

When the FastAPI server crashes or stops while processing documents:

- Documents remain stuck in "PROCESSING" status indefinitely
- Frontend continues polling without resolution
- No automatic recovery mechanism exists
- User experience degrades significantly

## Solution Architecture

### 1. Backend Monitoring Service (`DocumentProcessingMonitorService`)

**Location**: `apps/backend/src/documents/document-processing-monitor.service.ts`

**Key Features**:

- **Automatic Health Monitoring**: Runs every 30 seconds via cron job
- **FastAPI Health Checks**: Monitors if FastAPI service is responding
- **Stuck Document Detection**: Identifies documents that haven't been updated for 10+ minutes
- **Automatic Restart**: Calls FastAPI restart endpoint for stuck documents
- **Comprehensive Logging**: Logs all monitoring activities and issues

**Monitoring Cycle**:

```typescript
@Cron(CronExpression.EVERY_30_SECONDS)
async monitorDocumentProcessing() {
  // 1. Check FastAPI health
  // 2. Find stuck documents
  // 3. Handle stuck documents
  // 4. Retry failed processing
}
```

### 2. FastAPI Health & Restart Endpoints

**Health Check Endpoint**: `GET /health`

- Validates API key
- Checks essential services (embedding model, Qdrant client)
- Returns service status and warnings

**Restart Processing Endpoint**: `POST /restart-processing/{document_id}`

- Validates document exists and is stuck
- Resets processing status to start fresh
- Logs restart activities

### 3. Database Integration

**Status Tracking**:

- Monitors `updatedAt` timestamps for processing documents
- Identifies documents stuck in "PROCESSING" status
- Updates document status based on FastAPI responses

**Logging**:

- Comprehensive logging of all monitoring activities
- Tracks processing timeouts, restarts, and failures
- Maintains audit trail for debugging

### 4. Admin Interface

**Endpoints**:

- `GET /admin/document-processing/stats` - View processing statistics
- `POST /admin/document-processing/health-check` - Manual health check trigger

**Statistics Provided**:

- Total documents processing
- Total documents processed
- Number of stuck documents
- Last check timestamp

## Configuration

### Environment Variables

```bash
# AI Service Configuration
AI_SERVICE_URL="http://localhost:8002"
AI_SERVICE_API_KEY="your-api-key"
```

### Timeout Settings

```typescript
private readonly processingTimeout = 10 * 60 * 1000; // 10 minutes
private readonly healthCheckInterval = 30 * 1000; // 30 seconds
```

## How It Works

### 1. Normal Operation

- Documents are uploaded and processing starts
- Frontend polls status every 2 seconds
- Backend monitors processing every 30 seconds
- FastAPI processes documents normally

### 2. FastAPI Server Crash Detection

- Backend health check fails
- Monitoring continues but skips FastAPI-dependent operations
- Logs warning about service unavailability

### 3. Stuck Document Detection

- Documents not updated for 10+ minutes are flagged
- Backend checks current status from FastAPI (if available)
- Updates database status if processing completed

### 4. Automatic Recovery

- When FastAPI comes back online, health check passes
- Stuck documents are automatically restarted
- Processing resumes from where it left off
- Comprehensive logging of recovery process

### 5. Manual Intervention

- Admins can trigger health checks manually
- View processing statistics and stuck document counts
- Monitor system health through admin endpoints

## Benefits

### 1. **Automatic Recovery**

- No manual intervention required for most issues
- Documents automatically resume processing
- System self-heals from temporary failures

### 2. **Improved User Experience**

- No more infinite loading states
- Clear error messages when issues occur
- Processing continues automatically when possible

### 3. **System Reliability**

- Comprehensive monitoring of processing health
- Automatic detection of stuck processes
- Built-in retry mechanisms

### 4. **Operational Visibility**

- Real-time processing statistics
- Detailed logging of all activities
- Admin dashboard for system health

### 5. **Resource Efficiency**

- No unnecessary API calls for completed documents
- Intelligent polling based on document status
- Automatic cleanup of completed processes

## Installation & Setup

### 1. Install Dependencies

```bash
cd apps/backend
yarn add @nestjs/schedule
```

### 2. Module Integration

The following modules are automatically integrated:

- `DocumentProcessingMonitorModule` in `DocumentsModule`
- `ScheduleModule` in `AppModule`
- `DocumentProcessingMonitorModule` in `AdminModule`

### 3. Database Schema

No additional database changes required. The system uses existing:

- `DocumentStatus` enum values
- `updatedAt` timestamp field
- `aiDocumentId` field for tracking

## Monitoring & Maintenance

### 1. Log Monitoring

Monitor these log levels:

- **INFO**: Normal operations, successful restarts
- **WARN**: Processing timeouts, service degradation
- **ERROR**: Failed restarts, system errors

### 2. Performance Metrics

Track these metrics:

- Processing completion rates
- Average processing time
- Number of stuck documents
- Service availability percentage

### 3. Alerting

Consider setting up alerts for:

- High number of stuck documents
- Frequent FastAPI health check failures
- Processing restart failures

## Troubleshooting

### Common Issues

1. **FastAPI Service Unavailable**
   - Check if FastAPI server is running
   - Verify network connectivity
   - Check API key configuration

2. **Documents Not Restarting**
   - Verify FastAPI restart endpoint is working
   - Check database connectivity
   - Review processing timeout settings

3. **High CPU Usage**
   - Adjust monitoring frequency (currently 30 seconds)
   - Review timeout thresholds
   - Check for infinite loops in processing

### Debug Commands

```bash
# Manual health check
curl -X POST http://localhost:3889/admin/document-processing/health-check \
  -H "Authorization: Bearer <jwt-token>"

# View processing stats
curl http://localhost:3889/admin/document-processing/stats \
  -H "Authorization: Bearer <jwt-token>"
```

## Future Enhancements

### 1. **Advanced Retry Logic**

- Exponential backoff for failed restarts
- Configurable retry limits per document
- Priority-based restart queue

### 2. **Processing State Persistence**

- Save intermediate processing state
- Resume from exact failure point
- Progress tracking across restarts

### 3. **Distributed Processing**

- Multiple FastAPI instances
- Load balancing and failover
- Processing queue management

### 4. **Real-time Notifications**

- WebSocket notifications for status changes
- Email alerts for critical failures
- Slack/Teams integration

## Conclusion

This solution provides a robust, self-healing document processing system that automatically recovers from FastAPI server crashes and processing interruptions. It significantly improves system reliability and user experience while requiring minimal operational overhead.

The system is designed to be:

- **Non-intrusive**: No changes to existing FastAPI code
- **Automatic**: Self-healing without manual intervention
- **Observable**: Comprehensive monitoring and logging
- **Scalable**: Easy to extend and enhance
- **Reliable**: Built-in error handling and recovery
