// src/routes/auth.ts
import { Router } from 'express';
import { pool } from '../config/db';
import crypto from 'crypto';

const router = Router();

/**
 * Login:
 * - รับทั้ง body.identifier หรือ body.username
 * - ให้ Postgres ตรวจรหัสผ่านด้วย crypt($input, password_hash)
 *   → ต้องเปิด extension: CREATE EXTENSION IF NOT EXISTS pgcrypto;
 */
router.post('/login', async (req, res, next) => {
  try {
    const rawIdentifier = (req.body?.identifier ?? req.body?.username ?? '').toString().trim();
    const password = (req.body?.password ?? '').toString();

    if (!rawIdentifier || !password) {
      return res.status(400).json({ success: false, message: 'Missing identifier or password' });
    }

    // ให้ DB เทียบรหัสผ่าน: WHERE ... AND password_hash = crypt($2, password_hash)
    const q = await pool.query(
      `
      SELECT account_id, store_id, email, username, role
      FROM pos.accounts
      WHERE (LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($1))
        AND password_hash = crypt($2, password_hash)
      LIMIT 1
      `,
      [rawIdentifier, password]
    );

    const acc = q.rows[0];
    if (!acc) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // สร้าง session token แบบง่าย
    const token = crypto.randomBytes(32).toString('hex');
    await pool.query(
      `INSERT INTO pos.sessions (store_id, account_id, token)
       VALUES ($1,$2,$3)
       ON CONFLICT (token) DO NOTHING`,
      [acc.store_id, acc.account_id, token]
    );

    // เซ็ต cookie
    res.cookie('session', token, {
      httpOnly: true,
      sameSite: 'lax',
      // secure: true, // เปิดใน production หลัง HTTPS/Reverse proxy
      maxAge: 1000 * 60 * 60 * 12,
    });

    res.json({
      success: true,
      data: {
        account_id: acc.account_id,
        store_id: acc.store_id,
        role: acc.role,
        email: acc.email,
        username: acc.username,
      },
    });
  } catch (e) {
    next(e);
  }
});

router.get('/me', async (req, res, next) => {
  try {
    const token = (req.cookies?.session ?? req.get('x-session-token') ?? '').toString();
    if (!token) return res.status(401).json({ success: false, message: 'Not authenticated' });

    const { rows } = await pool.query(
      `SELECT a.account_id, a.store_id, a.role, a.email, a.username
       FROM pos.sessions s
       JOIN pos.accounts a ON a.account_id = s.account_id
       WHERE s.token = $1`,
      [token]
    );

    if (!rows[0]) return res.status(401).json({ success: false, message: 'Not authenticated' });

    res.json({ success: true, data: rows[0] });
  } catch (e) { next(e); }
});

router.post('/logout', async (req, res, next) => {
  try {
    const token = (req.cookies?.session ?? req.get('x-session-token') ?? '').toString();
    if (token) {
      await pool.query(`DELETE FROM pos.sessions WHERE token = $1`, [token]);
    }
    res.clearCookie('session');
    res.json({ success: true, message: 'Logged out' });
  } catch (e) { next(e); }
});

export default router;
