import Datastore from '@seald-io/nedb';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');

export const usersDb       = new Datastore({ filename: path.join(dataDir, 'users.db'),        autoload: true });
export const txDb          = new Datastore({ filename: path.join(dataDir, 'transactions.db'), autoload: true });
export const budgetLinesDb = new Datastore({ filename: path.join(dataDir, 'budget-lines.db'), autoload: true });
export const accountsDb    = new Datastore({ filename: path.join(dataDir, 'accounts.db'),     autoload: true });
export const acctTxDb      = new Datastore({ filename: path.join(dataDir, 'account-txs.db'), autoload: true });

usersDb.ensureIndex({ fieldName: 'email', unique: true });
txDb.ensureIndex({ fieldName: 'userId' });
budgetLinesDb.ensureIndex({ fieldName: 'userId' });
accountsDb.ensureIndex({ fieldName: 'userId' });
acctTxDb.ensureIndex({ fieldName: 'userId' });
acctTxDb.ensureIndex({ fieldName: 'accountId' });
