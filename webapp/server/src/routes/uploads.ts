// src/routes/uploads.ts
import { Router, type Request, type Response } from 'express';
import { uploadMenuImage, publicMenuUrl } from '../config/storage';
import path from 'path';

const router = Router();

/**
 * POST /api/uploads/menu-image
 * form-data: file=<image>
 * return: { success, url, filename }
 */
router.post('/menu-image', (uploadMenuImage.single('file') as any), (req: Request, res: Response) => {
  const file = req.file as Express.Multer.File | undefined;
  if (!file) {
    return res.status(400).json({ success: false, error: 'No file' });
  }
  const filename = path.basename(file.filename);
  const url = publicMenuUrl(filename);
  res.status(201).json({ success: true, url, filename });
});

export default router;
