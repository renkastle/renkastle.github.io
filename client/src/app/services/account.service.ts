import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';

export type AccountType = 'savings' | 'checking' | 'credit' | 'loan' | 'debt';

export interface Account {
  _id: string;
  name: string;
  type: AccountType;
  openingBalance: number;
  notes: string;
  createdAt: string;
}

export interface AccountTransaction {
  _id: string;
  accountId: string;
  direction: 'credit' | 'debit';
  amount: number;
  date: string;
  description: string;
  notes: string;
  month: number;
  year: number;
  createdAt: string;
}

export const ACCOUNT_META: Record<AccountType, { label: string; icon: string; isAsset: boolean }> = {
  savings:  { label: 'Savings',      icon: '🏦', isAsset: true  },
  checking: { label: 'Checking',     icon: '🏧', isAsset: true  },
  credit:   { label: 'Credit Card',  icon: '💳', isAsset: false },
  loan:     { label: 'Loan',         icon: '📋', isAsset: false },
  debt:     { label: 'Debt',         icon: '⚖️', isAsset: false },
};

@Injectable({ providedIn: 'root' })
export class AccountService {
  private readonly ACCT_API = '/api/accounts';
  private readonly TX_API   = '/api/account-transactions';

  readonly accounts     = signal<Account[]>([]);
  readonly transactions = signal<AccountTransaction[]>([]);

  constructor(private http: HttpClient) {}

  loadAccounts() {
    return this.http.get<Account[]>(this.ACCT_API)
      .pipe(tap(list => this.accounts.set(list)));
  }

  loadAllTransactions() {
    return this.http.get<AccountTransaction[]>(this.TX_API)
      .pipe(tap(list => this.transactions.set(list)));
  }

  loadAccountTransactions(accountId: string) {
    return this.http.get<AccountTransaction[]>(`${this.TX_API}?accountId=${accountId}`)
      .pipe(tap(list => this.transactions.set(list)));
  }

  addAccount(data: Omit<Account, '_id' | 'createdAt'>) {
    return this.http.post<Account>(this.ACCT_API, data)
      .pipe(tap(a => this.accounts.update(list => [...list, a])));
  }

  updateAccount(id: string, patch: Partial<Pick<Account, 'name' | 'notes' | 'openingBalance'>>) {
    return this.http.put<Account>(`${this.ACCT_API}/${id}`, patch)
      .pipe(tap(updated => this.accounts.update(list => list.map(a => a._id === id ? updated : a))));
  }

  deleteAccount(id: string) {
    return this.http.delete(`${this.ACCT_API}/${id}`)
      .pipe(tap(() => {
        this.accounts.update(list => list.filter(a => a._id !== id));
        this.transactions.update(list => list.filter(t => t.accountId !== id));
      }));
  }

  addTransaction(tx: Omit<AccountTransaction, '_id' | 'month' | 'year' | 'createdAt'>) {
    return this.http.post<AccountTransaction>(this.TX_API, tx)
      .pipe(tap(created => this.transactions.update(list => [created, ...list])));
  }

  deleteTransaction(id: string) {
    return this.http.delete(`${this.TX_API}/${id}`)
      .pipe(tap(() => this.transactions.update(list => list.filter(t => t._id !== id))));
  }

  // Balance = openingBalance ± all transactions
  // Assets:      credit = +, debit = -
  // Liabilities: debit  = +owed, credit = -owed  →  we show the owed amount
  balance(account: Account, txs?: AccountTransaction[]): number {
    const relevant = (txs ?? this.transactions()).filter(t => t.accountId === account._id);
    const isAsset = ACCOUNT_META[account.type].isAsset;
    return account.openingBalance + relevant.reduce((sum, t) => {
      const isCredit = t.direction === 'credit';
      // Asset: credit adds, debit subtracts. Liability: debit adds owed, credit subtracts owed.
      return sum + (isAsset ? (isCredit ? t.amount : -t.amount) : (isCredit ? -t.amount : t.amount));
    }, 0);
  }

  totalAssets(): number {
    return this.accounts()
      .filter(a => ACCOUNT_META[a.type].isAsset)
      .reduce((s, a) => s + this.balance(a), 0);
  }

  totalLiabilities(): number {
    return this.accounts()
      .filter(a => !ACCOUNT_META[a.type].isAsset)
      .reduce((s, a) => s + this.balance(a), 0);
  }
}
