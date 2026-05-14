import { Component, computed, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TransactionService, Transaction } from '../services/transaction.service';

const CATS = {
  income:  ['Salary', 'Freelance', 'Investment', 'Gift', 'Bonus', 'Other Income'],
  expense: ['Food & Drink', 'Housing', 'Transport', 'Health', 'Shopping',
            'Entertainment', 'Education', 'Utilities', 'Subscriptions', 'Other Expense'],
};
const ICONS: Record<string, string> = {
  'Salary':'💼','Freelance':'💻','Investment':'📈','Gift':'🎁','Bonus':'🏆','Other Income':'💰',
  'Food & Drink':'🍔','Housing':'🏠','Transport':'🚗','Health':'💊','Shopping':'🛍️',
  'Entertainment':'🎬','Education':'📚','Utilities':'⚡','Subscriptions':'📱','Other Expense':'💸',
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <!-- Summary -->
      <div class="summary-grid">
        <div class="card stat-card">
          <div class="stat-label">Balance</div>
          <div class="stat-value" [style.color]="balance() < 0 ? 'var(--red)' : 'var(--blue)'">
            {{ balance() | currency }}
          </div>
          <div class="stat-sub">income minus expenses</div>
        </div>
        <div class="card stat-card">
          <div class="stat-label">Total Income</div>
          <div class="stat-value income">{{ totalIncome() | currency }}</div>
          <div class="stat-sub">{{ incomeCount() }} transaction{{ incomeCount() !== 1 ? 's' : '' }}</div>
        </div>
        <div class="card stat-card">
          <div class="stat-label">Total Expenses</div>
          <div class="stat-value expense">{{ totalExpense() | currency }}</div>
          <div class="stat-sub">{{ expenseCount() }} transaction{{ expenseCount() !== 1 ? 's' : '' }}</div>
        </div>
      </div>

      <!-- Add form -->
      <div class="card form-card">
        <div class="form-title">Add Transaction</div>

        <div class="type-row">
          <button class="type-btn" [class.on-income]="txType === 'income'"
                  (click)="setType('income')">+ Income</button>
          <button class="type-btn" [class.on-expense]="txType === 'expense'"
                  (click)="setType('expense')">− Expense</button>
        </div>

        @if (formError()) {
          <div class="alert alert-error">{{ formError() }}</div>
        }

        <div class="fields">
          <div class="field">
            <label>Amount</label>
            <input type="number" [(ngModel)]="amount" placeholder="0.00" min="0.01" step="0.01" />
          </div>
          <div class="field">
            <label>Date</label>
            <input type="date" [(ngModel)]="date" />
          </div>
          <div class="field">
            <label>Category</label>
            <select [(ngModel)]="category">
              @for (c of currentCats(); track c) {
                <option [value]="c">{{ c }}</option>
              }
            </select>
          </div>
          <div class="field">
            <label>Description <span class="hint">(optional)</span></label>
            <input type="text" [(ngModel)]="description" placeholder="e.g. Weekly groceries" maxlength="70" />
          </div>
          <div class="field span2">
            <button class="btn btn-primary" (click)="addTx()" [disabled]="saving()">
              @if (saving()) { <span class="spinner"></span> } @else { Add Transaction }
            </button>
          </div>
        </div>
      </div>

      <!-- Filters + List -->
      <div class="list-head">
        <span class="list-title">Transactions</span>
        <div class="filters">
          <select [(ngModel)]="filterType" (ngModelChange)="filterType = $event">
            <option value="all">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
          <select [(ngModel)]="filterCat">
            <option value="all">All categories</option>
            @for (c of allCats; track c) {
              <option [value]="c">{{ c }}</option>
            }
          </select>
          <select [(ngModel)]="filterMonth">
            <option value="all">All time</option>
            @for (m of months(); track m.value) {
              <option [value]="m.value">{{ m.label }}</option>
            }
          </select>
        </div>
      </div>

      @if (loading()) {
        <div class="empty-state"><span class="spinner"></span> Loading…</div>
      } @else if (filtered().length === 0) {
        <div class="empty-state">
          <strong>No transactions found</strong>
          Add one using the form above.
        </div>
      } @else {
        <div class="tx-list">
          @for (tx of filtered(); track tx._id) {
            <div class="tx-row">
              <div class="tx-icon" [class]="tx.type">{{ icon(tx.category) }}</div>
              <div class="tx-body">
                <div class="tx-desc">{{ tx.description }}</div>
                <div class="tx-meta">{{ tx.category }} · {{ tx.date | date:'mediumDate' }}</div>
              </div>
              <span class="tx-amt" [class]="tx.type">
                {{ tx.type === 'income' ? '+' : '−' }}{{ tx.amount | currency }}
              </span>
              <button class="btn-del" (click)="deleteTx(tx._id)" title="Delete">✕</button>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 14px;
      margin-bottom: 20px;
    }
    .stat-card { position: relative; overflow: hidden; }
    .stat-label { font-size: .72rem; text-transform: uppercase; letter-spacing: .1em; color: var(--muted); }
    .stat-value { font-size: 1.7rem; font-weight: 800; margin: 8px 0 2px; line-height: 1; }
    .stat-value.income  { color: var(--green); }
    .stat-value.expense { color: var(--red); }
    .stat-sub { font-size: .73rem; color: var(--muted); }

    .form-card { margin-bottom: 24px; }
    .form-title { font-size: .95rem; font-weight: 600; margin-bottom: 16px; }

    .type-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; }
    .type-btn {
      align-items: center; border-radius: 10px; border: 2px solid var(--border);
      background: var(--surface2); color: var(--muted); cursor: pointer;
      display: flex; font-family: inherit; font-size: .95rem; font-weight: 600;
      justify-content: center; padding: 11px; transition: all .15s;
    }
    .type-btn.on-income  { border-color: var(--green); color: var(--green); background: #0e2820; }
    .type-btn.on-expense { border-color: var(--red);   color: var(--red);   background: #2a1212; }

    .fields { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .fields .span2 { grid-column: 1 / -1; }
    .hint { color: var(--muted); font-size: .75rem; text-transform: none; font-weight: 400; }

    .list-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; flex-wrap: wrap; gap: 10px; }
    .list-title { font-size: .95rem; font-weight: 600; }
    .filters { display: flex; gap: 8px; flex-wrap: wrap; }
    .filters select { padding: 7px 32px 7px 12px; font-size: .8rem; }

    .tx-list { display: flex; flex-direction: column; gap: 8px; }
    .tx-row {
      align-items: center; background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--r); display: flex; gap: 14px; padding: 13px 16px;
      transition: filter .15s;
    }
    .tx-row:hover { filter: brightness(1.08); }
    .tx-icon {
      align-items: center; border-radius: 50%; display: flex; font-size: 1.15rem;
      height: 40px; justify-content: center; width: 40px; flex-shrink: 0;
    }
    .tx-icon.income  { background: #0e2820; }
    .tx-icon.expense { background: #2a1212; }
    .tx-body { flex: 1; min-width: 0; }
    .tx-desc { font-size: .9rem; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .tx-meta { color: var(--muted); font-size: .73rem; margin-top: 3px; }
    .tx-amt { font-size: .97rem; font-weight: 700; white-space: nowrap; }
    .tx-amt.income  { color: var(--green); }
    .tx-amt.expense { color: var(--red); }
    .btn-del {
      background: none; border: none; border-radius: 6px;
      color: var(--border); cursor: pointer; font-size: .95rem;
      line-height: 1; padding: 5px; transition: color .15s;
    }
    .btn-del:hover { color: var(--red); }
    .empty-state {
      background: var(--surface); border: 1px dashed var(--border);
      border-radius: var(--r); color: var(--muted); font-size: .875rem;
      padding: 48px; text-align: center;
    }
    .empty-state strong { display: block; font-size: 1rem; color: var(--text); margin-bottom: 6px; }
    @media (max-width: 560px) {
      .summary-grid { grid-template-columns: 1fr; }
      .fields { grid-template-columns: 1fr; }
      .fields .span2 { grid-column: 1; }
    }
  `]
})
export class DashboardComponent implements OnInit {
  loading = signal(true);
  saving  = signal(false);
  formError = signal('');

  txType: 'income' | 'expense' = 'income';
  amount = '';
  date = new Date().toISOString().slice(0, 10);
  category = CATS.income[0];
  description = '';

  filterType  = 'all';
  filterCat   = 'all';
  filterMonth = 'all';

  readonly allCats = [...CATS.income, ...CATS.expense];

  currentCats = computed(() => CATS[this.txType]);

  totalIncome  = computed(() => this.txSvc.transactions().filter(t => t.type === 'income').reduce((s,t) => s + t.amount, 0));
  totalExpense = computed(() => this.txSvc.transactions().filter(t => t.type === 'expense').reduce((s,t) => s + t.amount, 0));
  balance      = computed(() => this.totalIncome() - this.totalExpense());
  incomeCount  = computed(() => this.txSvc.transactions().filter(t => t.type === 'income').length);
  expenseCount = computed(() => this.txSvc.transactions().filter(t => t.type === 'expense').length);

  months = computed(() => {
    const seen = new Set<string>();
    this.txSvc.transactions().forEach(t => seen.add(t.date.slice(0,7)));
    return [...seen].sort().reverse().map(v => ({
      value: v,
      label: new Date(v + '-02').toLocaleString('default', { month: 'long', year: 'numeric' }),
    }));
  });

  filtered = computed(() => {
    return this.txSvc.transactions().filter(t => {
      if (this.filterType  !== 'all' && t.type     !== this.filterType)    return false;
      if (this.filterCat   !== 'all' && t.category !== this.filterCat)     return false;
      if (this.filterMonth !== 'all' && !t.date.startsWith(this.filterMonth)) return false;
      return true;
    });
  });

  constructor(readonly txSvc: TransactionService) {}

  ngOnInit() {
    this.txSvc.load().subscribe({ complete: () => this.loading.set(false) });
  }

  setType(t: 'income' | 'expense') {
    this.txType = t;
    this.category = CATS[t][0];
  }

  icon(cat: string) { return ICONS[cat] ?? '💳'; }

  addTx() {
    const amt = parseFloat(this.amount);
    if (!amt || amt <= 0) { this.formError.set('Enter a valid amount.'); return; }
    if (!this.date)        { this.formError.set('Pick a date.'); return; }
    this.formError.set('');
    this.saving.set(true);
    this.txSvc.add({
      type: this.txType,
      amount: amt,
      date: this.date,
      category: this.category,
      description: this.description || this.category,
    }).subscribe({
      next: () => {
        this.amount = '';
        this.description = '';
        this.date = new Date().toISOString().slice(0, 10);
        this.saving.set(false);
      },
      error: () => { this.formError.set('Failed to save. Try again.'); this.saving.set(false); },
    });
  }

  deleteTx(id: string) {
    this.txSvc.remove(id).subscribe();
  }
}
