import { Router } from 'express';
import { budgetLinesDb } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const SECTIONS = ['income', 'savings', 'fixed', 'variable', 'debt'];
const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const { year, month } = req.query;
  const query = { userId: req.user.id };
  if (year)  query.year  = parseInt(year);
  if (month) query.month = parseInt(month);
  const lines = await budgetLinesDb.findAsync(query).sort({ section: 1, createdAt: 1 });
  res.json(lines);
});

// Returns year+month of the most recent month that has budget lines before the given date
router.get('/latest-month', async (req, res) => {
  const { before_year, before_month } = req.query;
  const all = await budgetLinesDb.findAsync({ userId: req.user.id });
  const pad = n => String(n).padStart(2, '0');

  let months = [...new Set(all.map(l => `${l.year}-${pad(l.month)}`))];
  if (before_year && before_month) {
    const cutoff = `${before_year}-${pad(before_month)}`;
    months = months.filter(ym => ym < cutoff);
  }
  months.sort().reverse();
  if (!months.length) return res.json(null);

  const [y, m] = months[0].split('-');
  res.json({ year: parseInt(y), month: parseInt(m) });
});

// Copy all budget lines from one month to another
router.post('/copy-from', async (req, res) => {
  const { fromYear, fromMonth, toYear, toMonth } = req.body;
  if (!fromYear || !fromMonth || !toYear || !toMonth)
    return res.status(400).json({ error: 'fromYear, fromMonth, toYear, toMonth are required' });

  const source = await budgetLinesDb.findAsync({
    userId: req.user.id,
    year: parseInt(fromYear),
    month: parseInt(fromMonth),
  });
  if (!source.length) return res.json([]);

  const copies = await Promise.all(
    source.map(l => budgetLinesDb.insertAsync({
      userId: req.user.id,
      year: parseInt(toYear),
      month: parseInt(toMonth),
      section: l.section,
      name: l.name,
      estimated: l.estimated,
      createdAt: new Date(),
    }))
  );
  res.status(201).json(copies);
});

router.put('/:id', async (req, res) => {
  const { name, estimated } = req.body;
  const update = {};
  if (name !== undefined)      update.name      = name.trim();
  if (estimated !== undefined) update.estimated = parseFloat(estimated) || 0;
  if (!Object.keys(update).length)
    return res.status(400).json({ error: 'Nothing to update' });

  const n = await budgetLinesDb.updateAsync(
    { _id: req.params.id, userId: req.user.id },
    { $set: update },
    {}
  );
  if (!n) return res.status(404).json({ error: 'Not found' });
  const updated = await budgetLinesDb.findOneAsync({ _id: req.params.id });
  res.json(updated);
});

router.delete('/:id', async (req, res) => {
  const removed = await budgetLinesDb.removeAsync({ _id: req.params.id, userId: req.user.id }, {});
  if (!removed) return res.status(404).json({ error: 'Not found' });
  res.json({ deleted: true });
});

export default router;
