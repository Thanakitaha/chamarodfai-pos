import { Router } from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../config/db';

const router = Router();

/**
 * POST /api/auth/login
 * body: { email: string, password: string }
 * success: { success:true, data:{ account_id, store_id, full_name, role, email } }
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Missing email or password' });
    }

    const q = `
      SELECT account_id, store_id, full_name, role, email, password_hash, is_active
      FROM pos.accounts
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1
    `;
    const { rows } = await pool.query(q, [email]);
    if (!rows.length) return res.status(401).json({ success:false, message:'Invalid credentials' });

    const acc = rows[0];
    if (!acc.is_active) return res.status(403).json({ success:false, message:'Account disabled' });

    const ok = await bcrypt.compare(password, acc.password_hash);
    if (!ok) return res.status(401).json({ success:false, message:'Invalid credentials' });

    // (ถ้าจะทำ JWT ก็ต่อจากนี้—ตอนนี้ส่งโปรไฟล์พอ)
    const { account_id, store_id, full_name, role } = acc;
    return res.json({ success:true, data:{ account_id, store_id, full_name, role, email: acc.email } });
  } catch (err:any) {
    console.error(err);
    return res.status(500).json({ success:false, message: 'Auth error' });
  }
});

export default router;
