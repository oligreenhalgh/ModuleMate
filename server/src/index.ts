import express from 'express';
import cors from 'cors';
import session from 'express-session';
import { getDb } from './db.js';
import modulesRouter from './routes/modules.js';
import majorsRouter from './routes/majors.js';

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
// etc.

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`ModuleMate API running on http://localhost:${PORT}`);
  });
}

export { app };
