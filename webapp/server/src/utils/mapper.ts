// src/utils/mapper.ts
import type { MenuItem } from '../types';

export function mapMenuRowToApi(row: any): MenuItem {
  return {
    id: row.id,
    name: row.name,
    price: Number(row.price),
    cost: Number(row.cost),
    category: row.category ?? null,
    categoryId: row.category_id ?? row.categoryId ?? null,
    description: row.description ?? null,
    image: row.image ?? row.image_url ?? null,
    available: row.available === true || row.available === 't',
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
  };
}
