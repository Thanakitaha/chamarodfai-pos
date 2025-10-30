import { Router } from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../config/db';

const router = Router();

/**
 * POST /api/auth/login
 * body: { identifier: string, password: string }
 * success: { success:true, data:{ account_id, store_id, full_name, role, email, username } }
 */
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body || {};
    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Missing identifier or password' });
    }

    // อนุญาตทั้ง email หรือ username (ไม่สนเคส)
    const sql = `
      SELECT account_id, store_id, email, username, password_hash, full_name, role, is_active
      FROM pos.accounts
      WHERE (LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($1))
      LIMIT 1
    `;
    const { rows } = await pool.query(sql, [identifier]);
    if (rows.length === 0) {
      return res.status(401).json({ success:false, message:'Invalid credentials' });
    }

    const acc = rows[0];
    if (!acc.is_active) {
      return res.status(403).json({ success:false, message:'Account inactive' });
    }

    const ok = await bcrypt.compare(password, acc.password_hash);
    if (!ok) {
      return res.status(401).json({ success:false, message:'Invalid credentials' });
    }

    // (ถ้าต้องการ JWT ให้ต่อเพิ่มได้; ตอนนี้คืนโปรไฟล์)
    const { account_id, store_id, full_name, role, email, username } = acc;
    return res.json({ success:true, data:{ account_id, store_id, full_name, role, email, username } });
  } catch (err:any) {
    console.error(err);
    return res.status(500).json({ success:false, message: 'Auth error' });
  }
});

export default router;
