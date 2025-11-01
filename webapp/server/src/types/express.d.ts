// src/types/express.d.ts
import 'express';

declare global {
  namespace Express {
    // เพิ่ม field ที่ multer เติมให้
    interface Request {
      file?: Multer.File;
      files?: {
        [fieldname: string]: Multer.File[] | undefined;
      } | Multer.File[];
    }
  }
}

export {};
