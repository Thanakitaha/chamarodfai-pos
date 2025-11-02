import { Router } from 'express';
import { pool } from '../config/db';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const router = Router();

function nowStamp() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function ensureDir(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function runCmd(cmd: string, args: string[], env: NodeJS.ProcessEnv) {
  return new Promise<{code:number, out:string, err:string}>((resolve) => {
    const child = spawn(cmd, args, { env });
    let out = '', err = '';
    child.stdout.on('data', d => out += d.toString());
    child.stderr.on('data', d => err += d.toString());
    child.on('close', code => resolve({ code: code ?? 1, out, err }));
  });
}

function getLatestDumpFile(dir: string): string | null {
  if (!fs.existsSync(dir)) return null;
  const dumps = fs.readdirSync(dir)
    .filter(f => f.endsWith('.dump'))
    .map(f => ({ f, t: fs.statSync(path.join(dir, f)).mtime.getTime() }))
    .sort((a,b) => b.t - a.t);
  return dumps.length ? path.join(dir, dumps[0].f) : null;
}

/** POST /api/admin/close-shop
 * 1) set active=false
 * 2) pg_dump -> BACKUP_DIR/backup_YYYYMMDD_HHMMSS.dump
 */
router.post('/close-shop', async (_req, res) => {
  try {
    const storeId = Number(process.env.STORE_ID || 1);
    await pool.query('UPDATE pos.stores SET active = FALSE WHERE store_id = $1', [storeId]);

    const BACKUP_DIR = process.env.BACKUP_DIR || '/backups';
    ensureDir(BACKUP_DIR);

    const stamp = nowStamp();
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) return res.status(500).json({ success:false, error:'DATABASE_URL missing' });

    const outfile = path.join(BACKUP_DIR, `backup_${stamp}.dump`);
    const { code, out, err } = await runCmd('pg_dump', ['-Fc', '-f', outfile, dbUrl], process.env);

    if (code !== 0) {
      return res.status(500).json({ success:false, message:'Backup failed', detail: err || out });
    }
    return res.json({ success:true, message:'Shop closed & backup complete', file: outfile });
  } catch (e:any) {
    return res.status(500).json({ success:false, error: e.message || String(e) });
  }
});

/** POST /api/admin/restore-latest
 * - เลือกไฟล์ .dump ล่าสุดจาก BACKUP_DIR
 * - DROP/CREATE schema pos แล้ว pg_restore
 */
router.post('/restore-latest', async (_req, res) => {
  try {
    const BACKUP_DIR = process.env.BACKUP_DIR || '/backups';
    const latest = getLatestDumpFile(BACKUP_DIR);
    if (!latest) return res.status(404).json({ success:false, error:'No backup files' });

    const dbUrl = process.env.DATABASE_URL!;
    await pool.query('DROP SCHEMA IF EXISTS pos CASCADE; CREATE SCHEMA pos;');

    const { code, out, err } = await runCmd('pg_restore', ['-d', dbUrl, '--clean', '--if-exists', '--no-owner', latest], process.env);
    if (code !== 0) return res.status(500).json({ success:false, message:'Restore failed', detail: err || out });

    return res.json({ success:true, message:`Restored ${path.basename(latest)}` });
  } catch (e:any) {
    return res.status(500).json({ success:false, error: e.message || String(e) });
  }
});

/** POST /api/admin/open-shop
 * กด = กู้ทันทีจากไฟล์ .dump ล่าสุด (ไม่เช็คฐานว่าง)
 * แล้วค่อย set active=true
 */
router.post('/open-shop', async (_req, res) => {
  try {
    const storeId   = Number(process.env.STORE_ID || 1);
    const BACKUP_DIR = process.env.BACKUP_DIR || '/backups';
    const dbUrl     = process.env.DATABASE_URL;

    if (!dbUrl) {
      return res.status(500).json({ success:false, error:'DATABASE_URL missing' });
    }

    const latest = getLatestDumpFile(BACKUP_DIR);
    if (!latest) {
      return res.status(404).json({ success:false, error:'No backup files found' });
    }

    // รีเซ็ต schema แล้วกู้จากไฟล์ล่าสุด (บังคับทุกครั้ง)
    await pool.query('DROP SCHEMA IF EXISTS pos CASCADE; CREATE SCHEMA pos;');

    const { code, out, err } = await runCmd(
      'pg_restore',
      ['-d', dbUrl, '--clean', '--if-exists', '--no-owner', latest],
      process.env
    );

    if (code !== 0) {
      return res.status(500).json({
        success: false,
        message: 'Restore failed',
        detail: err || out
      });
    }

    // เปิดร้านหลัง restore สำเร็จ
    await pool.query('UPDATE pos.stores SET active = TRUE WHERE store_id = $1', [storeId]);

    return res.json({
      success: true,
      message: 'Shop opened & restored latest backup',
      file: path.basename(latest)
    });
  } catch (e:any) {
    return res.status(500).json({ success:false, error: e.message || String(e) });
  }
});

export default router;
