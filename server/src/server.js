import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import txRoutes from './routes/transactions.js';
import budgetLinesRoutes from './routes/budget-lines.js';
import accountsRoutes from './routes/accounts.js';
import acctTxRoutes from './routes/account-transactions.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:4200' }));
app.use(express.json());

app.use('/api/auth',                authRoutes);
app.use('/api/transactions',        txRoutes);
app.use('/api/budget-lines',        budgetLinesRoutes);
app.use('/api/accounts',            accountsRoutes);
app.use('/api/account-transactions', acctTxRoutes);

app.get('/api/health', (_, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
