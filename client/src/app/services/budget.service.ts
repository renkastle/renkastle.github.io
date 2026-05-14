import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { tap } from 'rxjs';
import { SectionType } from './transaction.service';

export interface BudgetLine {
  _id: string;
  year: number;
  month: number;
  section: SectionType;
  name: string;
  estimated: number;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class BudgetService {
  private readonly API = '/api/budget-lines';
  readonly lines = signal<BudgetLine[]>([]);

  constructor(private http: HttpClient) {}

  load(year: number, month: number) {
    const params = new HttpParams().set('year', year).set('month', month);
    return this.http.get<BudgetLine[]>(this.API, { params })
      .pipe(tap(list => this.lines.set(list)));
  }

  loadYear(year: number) {
    const params = new HttpParams().set('year', year);
    return this.http.get<BudgetLine[]>(this.API, { params });
  }

  latestMonth(beforeYear: number, beforeMonth: number) {
    const params = new HttpParams()
      .set('before_year', beforeYear)
      .set('before_month', beforeMonth);
    return this.http.get<{ year: number; month: number } | null>(
      `${this.API}/latest-month`, { params }
    );
  }

  copyFrom(fromYear: number, fromMonth: number, toYear: number, toMonth: number) {
    return this.http.post<BudgetLine[]>(`${this.API}/copy-from`, { fromYear, fromMonth, toYear, toMonth })
      .pipe(tap(lines => this.lines.set(lines)));
  }

  add(line: Omit<BudgetLine, '_id' | 'createdAt'>) {
    return this.http.post<BudgetLine>(this.API, line)
      .pipe(tap(created => this.lines.update(list => [...list, created])));
  }

  update(id: string, patch: Partial<Pick<BudgetLine, 'name' | 'estimated'>>) {
    return this.http.put<BudgetLine>(`${this.API}/${id}`, patch)
      .pipe(tap(updated => this.lines.update(list => list.map(l => l._id === id ? updated : l))));
  }

  remove(id: string) {
    return this.http.delete(`${this.API}/${id}`)
      .pipe(tap(() => this.lines.update(list => list.filter(l => l._id !== id))));
  }
}
