import express from 'express';
import cors from 'cors';
import routes from './routes';
import { errorHandler } from './middlewares/error.middleware';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// API Version 1 entry
app.use('/api/v1', routes);

// Health-check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// Root health check route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Nexora — ERP & CRM Operations Portal API Server is running.',
  });
});

// 404 Not Found fallback
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'API resource not found',
  });
});

// Centralized error treatment
app.use(errorHandler);

export default app;
