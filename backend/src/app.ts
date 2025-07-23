import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { config } from './config/config';
import { generalLimiter, sensitiveLimiter, burstLimiter } from './middleware/rateLimiter';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import customerRoutes from './routes/customers';
import queueRoutes from './routes/queue';
import transactionRoutes from './routes/transactions';
import adminRoutes from './routes/admin';
import analyticsRoutes from './routes/analytics';
import smsRoutes from './routes/sms';
import settingsRoutes from './routes/settings';
import customerNotificationRoutes from './routes/customerNotifications';
import schedulerRoutes from './routes/scheduler';
import { authenticateToken } from './middleware/auth';
import { setupWebSocketHandlers } from './services/websocket';
import { errorHandler } from './middleware/errorHandler';

const app: express.Application = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

// Trust proxy configuration for rate limiter
if (process.env.NODE_ENV === 'development') {
  app.set('trust proxy', 'loopback');
} else {
  app.set('trust proxy', 1);
}

// Middleware
app.use(generalLimiter);
app.use(cors({
  origin: config.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Sensitive routes with stricter limits
app.use('/api/auth/login', sensitiveLimiter);
app.use('/api/auth/password-reset', sensitiveLimiter);
app.use('/api/auth/request-password-reset', sensitiveLimiter);
app.use('/api/auth/reset-password', burstLimiter);
app.use('/api/transactions/checkout', sensitiveLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/customers', authenticateToken, customerRoutes);
app.use('/api/queue', authenticateToken, queueRoutes);
app.use('/api/transactions', authenticateToken, transactionRoutes);
app.use('/api/admin', authenticateToken, adminRoutes);
app.use('/api/analytics', authenticateToken, analyticsRoutes);
app.use('/api/sms', authenticateToken, smsRoutes);
app.use('/api/settings', authenticateToken, settingsRoutes);
app.use('/api/customer-notifications', authenticateToken, customerNotificationRoutes);
app.use('/api/scheduler', authenticateToken, schedulerRoutes);

// Global error handler middleware
app.use(errorHandler);

// WebSocket setup
setupWebSocketHandlers(io);

// Make io available globally
app.set('io', io);

// Import and set WebSocket service
const { WebSocketService } = require('./services/websocket');
WebSocketService.setIO(io);

export default app;
export { server, io };
