import { Router } from 'express';
import { acctTxDb, accountsDb } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// GET /api/account-transactions?accountId=xxx  (all time, for balance computation)
// GET /api/account-transactions                (all accounts, all time)
router.get('/', async (req, res) => {
  const { accountId } = req.query;
  const query = { userId: req.user.id };
  if (accountId) query.accountId = accountId;
  const txs = await acctTxDb.findAsync(query).sort({ date: -1, createdAt: -1 });
  res.json(txs);
});

router.post('/', async (req, res) => {
  const { accountId, direction, amount, date, description, notes } = req.body;
  if (!accountId)            return res.status(400).json({ error: 'accountId is required' });
  if (!['credit','debit'].includes(direction))
                             return res.status(400).json({ error: 'direction must be credit or debit' });
  if (!amount || amount <= 0) return res.status(400).json({ error: 'amount must be positive' });
  if (!date)                  return res.status(400).json({ error: 'date is required' });
  if (!description?.trim())   return res.status(400).json({ error: 'description is required' });

  // Verify account belongs to user
  const account = await accountsDb.findOneAsync({ _id: accountId, userId: req.user.id });
  if (!account) return res.status(404).json({ error: 'Account not found' });

  const dateObj = new Date(date + 'T12:00:00');
  const doc = await acctTxDb.insertAsync({
    userId: req.user.id,
    accountId,
    direction,
    amount: parseFloat(amount),
    date,
    description: description.trim(),
    notes: notes?.trim() || '',
    month: dateObj.getMonth() + 1,
    year:  dateObj.getFullYear(),
    createdAt: new Date(),
  });
  res.status(201).json(doc);
});

router.delete('/:id', async (req, res) => {
  const removed = await acctTxDb.removeAsync({ _id: req.params.id, userId: req.user.id }, {});
  if (!removed) return res.status(404).json({ error: 'Not found' });
  res.json({ deleted: true });
});

export default router;
