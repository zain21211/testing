// src/components/LogCard.js
import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Grid,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { format } from 'date-fns';

const getMethodColor = (method) => {
  switch (method?.toUpperCase()) {
    case 'GET':
      return 'primary';
    case 'POST':
      return 'success';
    case 'PUT':
      return 'warning';
    case 'DELETE':
      return 'error';
    default:
      return 'default';
  }
};

const getStatusColor = (status) => {
  if (status >= 200 && status < 300) return 'success';
  if (status >= 300 && status < 400) return 'info';
  if (status >= 400 && status < 500) return 'warning';
  if (status >= 500) return 'error';
  return 'default';
};

const formatJson = (json) => {
  if (typeof json === 'object' && json !== null) {
    return JSON.stringify(json, null, 2);
  }
  return String(json);
};

// Helper function to extract username and userType (placeholder)
const extractUserInfo = (log) => {
  console.log('Extracting user info from log:', log);
  let username = log.username || 'N/A';
  let userType = log.userType || 'N/A';

  // --- Hypothetical Extraction Logic ---
  // If username/userType were in custom headers:
  if (log.requestHeaders && log.requestHeaders['x-username']) {
    username = log.requestHeaders['x-username'];
  }
  if (log.requestHeaders && log.requestHeaders['x-usertype']) {
    userType = log.requestHeaders['x-usertype'];
  }

  // If you could parse the requestPayload and it contained them:
  // try {
  //   const payload = JSON.parse(log.requestPayload);
  //   if (payload.username) username = payload.username;
  //   if (payload.userType) userType = payload.userType;
  // } catch (e) { /* ignore */ }
  // --- End Hypothetical Extraction Logic ---

  return { username, userType };
};


const LogCard = ({ log }) => {
  const createdAt = log.createdAt?.date ? new Date(log.createdAt.date) : null;
  const logDate = log._id?.date ? new Date(log._id.date) : null;

  const { username, userType } = extractUserInfo(log); // Extract info for display


  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Grid container spacing={1} alignItems="center">
          <Grid item>
            <Chip label={log.method} color={getMethodColor(log.method)} />
          </Grid>
          <Grid item>
            <Chip
              label={`Status: ${log.responseStatus}`}
              color={getStatusColor(log.responseStatus)}
            />
          </Grid>
          <Grid item xs>
            <Typography variant="h6" component="div">
              {log.endpoint}
            </Typography>
          </Grid>
        </Grid>

        <Box sx={{ mt: 1 }}>
          <Typography variant="body2" component="span" sx={{ fontWeight: 'bold' }}>
            User:
          </Typography>{' '}
          <Typography variant="body2" component="span">
            {username}
          </Typography>{' '}
          {userType !== 'N/A' && ( // Only show userType if it's not the default N/A
            <>
              <Typography variant="body2" component="span" sx={{ fontWeight: 'bold', ml: 2 }}>
                Type:
              </Typography>{' '}
              <Typography variant="body2" component="span">
                {userType}
              </Typography>
            </>
          )}
        </Box>


        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          URL: {log.url}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          IP Address: {log.ipAddress}
        </Typography>
        {createdAt && (
          <Typography variant="body2" color="text.secondary">
            Logged At: {format(createdAt, 'PPPpp')}
          </Typography>
        )}
        {logDate && (
          <Typography variant="body2" color="text.secondary">
            Request Start: {format(logDate, 'PPPpp')}
          </Typography>
        )}
        <Typography variant="body2" color="text.secondary">
          Response Time: {log.responseTime} ms
        </Typography>

        <Accordion sx={{ mt: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Details</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="subtitle2" sx={{ mt: 1 }}>
              User Agent:
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
              {log.userAgent}
            </Typography>

            <Typography variant="subtitle2" sx={{ mt: 1 }}>
              Request Headers:
            </Typography>
            <Box
              sx={{
                bgcolor: 'grey.100',
                p: 1,
                borderRadius: 1,
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap',
                maxHeight: 200,
                overflow: 'auto',
              }}
            >
              <pre>{formatJson(log.requestHeaders)}</pre>
            </Box>

            <Typography variant="subtitle2" sx={{ mt: 1 }}>
              Request Payload:
            </Typography>
            <Box
              sx={{
                bgcolor: 'grey.100',
                p: 1,
                borderRadius: 1,
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap',
                maxHeight: 200,
                overflow: 'auto',
              }}
            >
              <pre>{log.requestPayload}</pre>
            </Box>

            <Typography variant="subtitle2" sx={{ mt: 1 }}>
              Response Headers:
            </Typography>
            <Box
              sx={{
                bgcolor: 'grey.100',
                p: 1,
                borderRadius: 1,
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap',
                maxHeight: 200,
                overflow: 'auto',
              }}
            >
              <pre>{formatJson(log.responseHeaders)}</pre>
            </Box>

            <Typography variant="subtitle2" sx={{ mt: 1 }}>
              Response Payload:
            </Typography>
            <Box
              sx={{
                bgcolor: 'grey.100',
                p: 1,
                borderRadius: 1,
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap',
                maxHeight: 200,
                overflow: 'auto',
              }}
            >
              <pre>{log.responsePayload}</pre>
            </Box>

            {log.errorDetails && (
              <>
                <Typography variant="subtitle2" color="error" sx={{ mt: 1 }}>
                  Error Details:
                </Typography>
                <Box
                  sx={{
                    bgcolor: 'error.light',
                    color: 'error.contrastText',
                    p: 1,
                    borderRadius: 1,
                    fontFamily: 'monospace',
                    whiteSpace: 'pre-wrap',
                    maxHeight: 200,
                    overflow: 'auto',
                  }}
                >
                  <pre>{formatJson(log.errorDetails)}</pre>
                </Box>
              </>
            )}
          </AccordionDetails>
        </Accordion>
      </CardContent>
    </Card>
  );
};

export default LogCard;