import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { connectDB } from './config/db';
import { seedDatabase } from './seed/seedData';
import { validateProductionEnv, isProduction } from './config/env';

import authRoutes from './routes/authRoutes';
import eventRoutes from './routes/eventRoutes';
import registrationRoutes from './routes/registrationRoutes';
import paymentRoutes from './routes/paymentRoutes';
import adminRoutes from './routes/adminRoutes';
import coordinatorRoutes from './routes/coordinatorRoutes';
import couponRoutes from './routes/couponRoutes';

const app = express();
const PORT = process.env.PORT || 5000;

// Trust the Render proxy/load balancer (first hop) so rate limiting and
// client-IP detection see the real client address. Single-hop trust only.
app.set('trust proxy', 1);

// Secure HTTP headers. CSP is off so Razorpay Checkout (cross-origin
// iframe/popup) and the Vite bundle keep working; CORS behaviour unchanged.
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

// Enable CORS for frontend development and production URLs
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  })
);

// Razorpay webhooks need the ORIGINAL RAW body for HMAC verification.
// Mounted before the JSON parser; the raw middleware marks the request as
// parsed so later body parsers skip it.
app.use('/api/payment/webhook', express.raw({ type: 'application/json', limit: '100kb' }));

// Body parsers with explicit size limits (announcements/descriptions/team data
// are all far below this; file uploads do not exist in this app).
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Request logging in development
if (process.env.NODE_ENV !== 'test') {
  app.use((req, _res, next) => {
    console.log(`[API ${req.method}] ${req.url}`);
    next();
  });
}

// Health Check
app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'Lakshya 2027 Symposium Backend',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/coordinator', coordinatorRoutes);
app.use('/api/coupons', couponRoutes);

// 404 handler for unknown API routes only (frontend routes fall through to the SPA fallback below)
app.use('/api', (_req, res) => {
  res.status(404).json({ success: false, message: 'API endpoint not found.' });
});

// Serve the production frontend build (created by `npm run build` -> dist/).
// Local dev is unaffected: dist/ usually doesn't exist when running `npm run dev`.
const serverDir = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(serverDir, '..', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

// Global error handler. In production, unexpected errors return a generic
// message (no stack traces, paths, or secrets leak to clients); details stay
// in server logs.
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Unhandled Server Error]', err);
  const status = typeof err?.status === 'number' ? err.status : 500;
  res.status(status).json({
    success: false,
    message: status === 500 && isProduction ? 'Internal Server Error.' : err.message || 'Internal Server Error',
  });
});

// Start Server and connect to MongoDB
async function startServer() {
  // Fail fast on missing/weak production secrets before opening any socket.
  validateProductionEnv();
  await connectDB();
  await seedDatabase();

  // Verify mail delivery path at boot so Render logs show
  // immediately whether OTP emails can go out (no secrets logged).
  try {
    if (process.env.BREVO_API_KEY) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      try {
        const res = await fetch('https://api.brevo.com/v3/account', {
          headers: { accept: 'application/json', 'api-key': process.env.BREVO_API_KEY },
          signal: controller.signal,
        });
        if (res.ok) {
          console.log('[EmailService] Brevo HTTPS API verified — OTP emails can be sent.');
        } else {
          console.error(`[EmailService] Brevo API key rejected (HTTP ${res.status}) — OTP emails will fail.`);
        }
      } finally {
        clearTimeout(timeout);
      }
    } else {
      const { createTransporter } = await import('./services/emailService');
      const transporter = createTransporter();
      if (!transporter) {
        console.error('[EmailService] SMTP credentials missing — OTP emails will fail.');
      } else {
        await transporter.verify();
        console.log('[EmailService] SMTP relay verified — OTP emails can be sent.');
      }
    }
  } catch (err: any) {
    console.error('[EmailService] Mail delivery verification FAILED:', err?.message || err);
  }

  const server = app.listen(PORT, () => {
    console.log(`🚀 [Server] Lakshya 2027 Backend running on http://localhost:${PORT}`);
  });
  // Optimize keep-alive connections for high concurrency (1000+ simultaneous requests)
  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;
