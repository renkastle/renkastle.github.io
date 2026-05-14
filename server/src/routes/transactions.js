import { Router } from 'express';
import { txDb } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const docs = await txDb.findAsync({ userId: req.user.id }).sort({ date: -1, createdAt: -1 });
  res.json(docs);
});

router.post('/', async (req, res) => {
  const { type, amount, date, category, description } = req.body;
  if (!type || !amount || !date || !category)
    return res.status(400).json({ error: 'type, amount, date and category are required' });
  if (!['income', 'expense'].includes(type))
    return res.status(400).json({ error: 'type must be income or expense' });
  if (typeof amount !== 'number' || amount <= 0)
    return res.status(400).json({ error: 'amount must be a positive number' });

  const doc = await txDb.insertAsync({
    userId: req.user.id,
    type,
    amount,
    date,
    category,
    description: description || category,
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
