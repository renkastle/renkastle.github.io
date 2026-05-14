import { Router } from 'express';
import { accountsDb, acctTxDb } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const TYPES = ['savings', 'checking', 'credit', 'loan', 'debt'];
const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const accounts = await accountsDb.findAsync({ userId: req.user.id }).sort({ createdAt: 1 });
  res.json(accounts);
});

router.post('/', async (req, res) => {
  const { name, type, openingBalance, notes } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
  if (!TYPES.includes(type)) return res.status(400).json({ error: `type must be one of: ${TYPES.join(', ')}` });

  const doc = await accountsDb.insertAsync({
    userId: req.user.id,
    name: name.trim(),
    type,
    openingBalance: parseFloat(openingBalance) || 0,
    notes: notes?.trim() || '',
    createdAt: new Date(),
  });
  res.status(201).json(doc);
});

router.put('/:id', async (req, res) => {
  const { name, notes, openingBalance } = req.body;
  const update = {};
  if (name !== undefined)          update.name          = name.trim();
  if (notes !== undefined)         update.notes         = notes.trim();
  if (openingBalance !== undefined) update.openingBalance = parseFloat(openingBalance) || 0;
  if (!Object.keys(update).length) return res.status(400).json({ error: 'Nothing to update' });

  const n = await accountsDb.updateAsync(
    { _id: req.params.id, userId: req.user.id },
    { $set: update },
    {}
  );
  if (!n) return res.status(404).json({ error: 'Not found' });
  const updated = await accountsDb.findOneAsync({ _id: req.params.id });
  res.json(updated);
});

router.delete('/:id', async (req, res) => {
  const removed = await accountsDb.removeAsync({ _id: req.params.id, userId: req.user.id }, {});
  if (!removed) return res.status(404).json({ error: 'Not found' });
  await acctTxDb.removeAsync({ accountId: req.params.id }, { multi: true });
  res.json({ deleted: true });
});

export default router;
