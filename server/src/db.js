import Datastore from '@seald-io/nedb';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');

export const usersDb = new Datastore({
  filename: path.join(dataDir, 'users.db'),
  autoload: true,
});

export const txDb = new Datastore({
  filename: path.join(dataDir, 'transactions.db'),
  autoload: true,
});

usersDb.ensureIndex({ fieldName: 'email', unique: true });
