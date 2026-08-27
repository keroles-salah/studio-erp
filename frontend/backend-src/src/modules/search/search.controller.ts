import { Request, Response } from 'express';
import { globalSearch } from './search.service';

export async function search(req: Request, res: Response) {
  const q = typeof req.query.q === 'string' ? req.query.q : '';
  const results = await globalSearch(q);
  return res.json({ success: true, data: results });
}
