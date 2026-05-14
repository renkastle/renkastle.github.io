import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';

export interface Transaction {
  _id: string;
  type: 'income' | 'expense';
  amount: number;
  date: string;
  category: string;
  description: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class TransactionService {
  private readonly API = '/api/transactions';
  readonly transactions = signal<Transaction[]>([]);

  constructor(private http: HttpClient) {}

  load() {
    return this.http.get<Transaction[]>(this.API)
      .pipe(tap(list => this.transactions.set(list)));
  }

  add(tx: Omit<Transaction, '_id' | 'createdAt'>) {
    return this.http.post<Transaction>(this.API, tx)
      .pipe(tap(created => this.transactions.update(list => [created, ...list])));
  }

  remove(id: string) {
    return this.http.delete(`${this.API}/${id}`)
      .pipe(tap(() => this.transactions.update(list => list.filter(t => t._id !== id))));
  }
}
