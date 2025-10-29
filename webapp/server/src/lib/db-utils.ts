// webapp/server/src/lib/db-utils.ts
import type { QueryResult } from 'pg';

/**
 * คืนจำนวนแถวแบบปลอดภัย:
 * - ถ้า rowCount เป็น number → ใช้ rowCount
 * - กรณี SELECT บางครั้ง rowCount อาจ null → ใช้ rows.length แทน
 */
export function safeRowCount(r: QueryResult<any>): number {
  if (typeof r.rowCount === 'number') return r.rowCount;
  return Array.isArray(r.rows) ? r.rows.length : 0;
}

/**
 * ถ้าอยากแยกตามคำสั่ง (SELECT vs INSERT/UPDATE/DELETE) ใช้อันนี้ได้
 * แต่ส่วนใหญ่ safeRowCount ก็เพียงพอ
 */
export function computeRowCount(r: QueryResult<any>): number {
  const cmd = String((r as any).command || '').toUpperCase();
  if (cmd === 'SELECT') return Array.isArray(r.rows) ? r.rows.length : 0;
  return typeof r.rowCount === 'number' ? r.rowCount : 0;
}
