import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Load .env from project root (two levels up from server/src/)
config({ path: resolve(__dirname, '..', '..', '.env') });

import express from 'express';
import cors from 'cors';
import session from 'express-session';
import { getDb } from './db.js';
import modulesRouter from './routes/modules.js';
import majorsRouter from './routes/majors.js';
import scheduleRouter from './routes/schedule.js';
import chatRouter from './routes/chat.js';
import settingsRouter from './routes/settings.js';
import userRouter from './routes/user.js';
import transcriptsRouter from './routes/transcripts.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize DB on startup
getDb();

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'modulemate-dev-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Route mounting
app.use('/api/modules', modulesRouter);
app.use('/api/majors', majorsRouter);
app.use('/api/schedule', scheduleRouter);
app.use('/api/chat', chatRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/user', userRouter);
app.use('/api/transcripts', transcriptsRouter);
// etc.

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`ModuleMate API running on http://localhost:${PORT}`);
  });
}

export { app };
