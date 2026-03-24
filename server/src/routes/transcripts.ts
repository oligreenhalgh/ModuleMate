import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

const router = Router();

/** GET / — list all transcripts */
router.get('/', (_req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT id, filename, type, processed_date FROM transcripts').all();
  res.json(rows);
});

/** POST / — upload a PDF transcript */
router.post('/', upload.single('file'), (req, res) => {
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: 'No PDF file provided' });
    return;
  }

  const db = getDb();
  const id = uuidv4();
  const filename = file.originalname;
  const type = (req.body.type as string) || 'Official';
  const filePath = file.path;

  db.prepare('INSERT INTO transcripts (id, filename, type, file_path) VALUES (?, ?, ?, ?)').run(id, filename, type, filePath);

  res.status(201).json({ id, filename });
});

/** DELETE /:id — delete a transcript record and its file */
router.delete('/:id', (req, res) => {
  const db = getDb();
  const { id } = req.params;

  const row = db.prepare('SELECT file_path FROM transcripts WHERE id = ?').get(id) as { file_path: string } | undefined;
  if (!row) {
    res.status(404).json({ error: 'Transcript not found' });
    return;
  }

  // Delete file from disk (ignore errors if file doesn't exist)
  try {
    if (fs.existsSync(row.file_path)) {
      fs.unlinkSync(row.file_path);
    }
  } catch {
    // File may already be gone; continue with DB deletion
  }

  db.prepare('DELETE FROM transcripts WHERE id = ?').run(id);
  res.json({ success: true });
});

export default router;
