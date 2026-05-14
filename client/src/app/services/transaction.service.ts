import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { tap } from 'rxjs';

export type SectionType = 'income' | 'savings' | 'fixed' | 'variable' | 'debt';

export interface Transaction {
  _id: string;
  year: number;
  month: number;
  section: SectionType;
  lineName: string;
  amount: number;
  date: string;
  notes: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class TransactionService {
  private readonly API = '/api/transactions';
  readonly transactions = signal<Transaction[]>([]);

  constructor(private http: HttpClient) {}

  load(year: number, month: number) {
    const params = new HttpParams().set('year', year).set('month', month);
    return this.http.get<Transaction[]>(this.API, { params })
      .pipe(tap(list => this.transactions.set(list)));
  }

  loadYear(year: number) {
    const params = new HttpParams().set('year', year);
    return this.http.get<Transaction[]>(this.API, { params });
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
