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

router.post('/', async (req, res) => {
  const { year, month, section, name, estimated } = req.body;
  if (!year || !month || !section || !name)
    return res.status(400).json({ error: 'year, month, section and name are required' });
  if (!SECTIONS.includes(section))
    return res.status(400).json({ error: `section must be one of: ${SECTIONS.join(', ')}` });

  const doc = await budgetLinesDb.insertAsync({
    userId: req.user.id,
    year: parseInt(year),
    month: parseInt(month),
    section,
    name: name.trim(),
    estimated: parseFloat(estimated) || 0,
    createdAt: new Date(),
  });
  res.status(201).json(doc);
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
