import { Router } from 'express';
import { txDb } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const SECTIONS = ['income', 'savings', 'fixed', 'variable', 'debt'];
const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const { year, month } = req.query;
  const query = { userId: req.user.id };
  if (year)  query.year  = parseInt(year);
  if (month) query.month = parseInt(month);
  const docs = await txDb.findAsync(query).sort({ date: -1, createdAt: -1 });
  res.json(docs);
});

router.post('/', async (req, res) => {
  const { year, month, section, lineName, amount, date, notes } = req.body;
  if (!year || !month || !section || !lineName || !amount || !date)
    return res.status(400).json({ error: 'year, month, section, lineName, amount and date are required' });
  if (!SECTIONS.includes(section))
    return res.status(400).json({ error: `section must be one of: ${SECTIONS.join(', ')}` });
  if (typeof amount !== 'number' || amount <= 0)
    return res.status(400).json({ error: 'amount must be a positive number' });

  const doc = await txDb.insertAsync({
    userId: req.user.id,
    year: parseInt(year),
    month: parseInt(month),
    section,
    lineName,
    amount,
    date,
    notes: notes || '',
    createdAt: new Date(),
  });
  res.status(201).json(doc);
});

router.delete('/:id', async (req, res) => {
  const removed = await txDb.removeAsync({ _id: req.params.id, userId: req.user.id }, {});
  if (!removed) return res.status(404).json({ error: 'Not found' });
  res.json({ deleted: true });
});

export default router;
