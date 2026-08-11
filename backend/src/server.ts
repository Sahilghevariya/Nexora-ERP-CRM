import app from './app';
import { config } from './config/environment';

const server = app.listen(config.PORT, () => {
  console.log(`[Server] Running in ${config.NODE_ENV} mode on port ${config.PORT}`);
});

// Graceful shutdowns
process.on('unhandledRejection', (reason: any) => {
  console.error('[Unhandled Rejection] Reason:', reason);
  server.close(() => process.exit(1));
});

process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received. Shutting down gracefully.');
  server.close(() => process.exit(0));
});
