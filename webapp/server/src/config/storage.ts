// src/config/storage.ts
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import type { Request } from 'express';

const BASE = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
const SUBDIR = 'menus';
const DEST = path.join(BASE, SUBDIR);

// ensure folders exist
if (!fs.existsSync(BASE)) fs.mkdirSync(BASE, { recursive: true });
if (!fs.existsSync(DEST)) fs.mkdirSync(DEST, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb: (error: any, destination: string) => void) => {
    cb(null, DEST);
  },
  filename: (_req: Request, file: Express.Multer.File, cb: (error: any, filename: string) => void) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const ts = Date.now();
    const ext = path.extname(safe) || '.png';
    cb(null, `menu_${ts}${ext}`);
  }
});

export const uploadMenuImage = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (!/^image\/(png|jpe?g|webp|gif)$/i.test(file.mimetype)) {
      return cb(new Error('Invalid image type'));
    }
    cb(null, true);
  }
});

export function publicMenuUrl(filename: string): string {
  return `/uploads/${SUBDIR}/${filename}`;
}
