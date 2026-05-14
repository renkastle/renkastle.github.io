import { Component, computed, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TransactionService } from '../services/transaction.service';

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page">
      <div class="page-title">Overview</div>
      <div class="page-sub">Spending breakdown &amp; monthly history</div>

      <div class="ov-grid">
        <!-- Income bars -->
        <div class="card">
          <div class="ov-title">Top Income Sources</div>
          @if (incomeBars().length === 0) {
            <div class="no-data">No income recorded yet</div>
          } @else {
            @for (b of incomeBars(); track b.label) {
              <div class="bar-item">
                <div class="bar-top">
                  <span>{{ b.label }}</span>
                  <span>{{ b.amount | currency }}</span>
                </div>
                <div class="bar-track">
                  <div class="bar-fill income" [style.width.%]="b.pct"></div>
                </div>
              </div>
            }
          }
        </div>

        <!-- Expense bars -->
        <div class="card">
          <div class="ov-title">Top Expense Categories</div>
          @if (expenseBars().length === 0) {
            <div class="no-data">No expenses recorded yet</div>
          } @else {
            @for (b of expenseBars(); track b.label) {
              <div class="bar-item">
                <div class="bar-top">
                  <span>{{ b.label }}</span>
                  <span>{{ b.amount | currency }}</span>
                </div>
                <div class="bar-track">
                  <div class="bar-fill expense" [style.width.%]="b.pct"></div>
                </div>
              </div>
            }
          }
        </div>

        <!-- Monthly history -->
        <div class="card full">
          <div class="ov-title">Monthly Summary</div>
          @if (monthRows().length === 0) {
            <div class="no-data">No data yet — add some transactions first.</div>
          } @else {
            @for (m of monthRows(); track m.label) {
              <div class="month-row">
                <span class="m-label">{{ m.label }}</span>
                <span class="m-detail">+{{ m.inc | currency }} / −{{ m.exp | currency }}</span>
                <span class="m-net" [class.pos]="m.net >= 0" [class.neg]="m.net < 0">
                  {{ m.net >= 0 ? '+' : '' }}{{ m.net | currency }}
                </span>
              </div>
            }
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .ov-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .full { grid-column: 1 / -1; }
    .ov-title { font-size: .82rem; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: var(--muted); margin-bottom: 18px; }

    .bar-item { margin-bottom: 14px; }
    .bar-item:last-child { margin-bottom: 0; }
    .bar-top { display: flex; justify-content: space-between; font-size: .83rem; margin-bottom: 6px; }
    .bar-track { background: var(--surface2); border-radius: 4px; height: 7px; overflow: hidden; }
    .bar-fill { border-radius: 4px; height: 100%; transition: width .4s ease; }
    .bar-fill.income  { background: var(--green); }
    .bar-fill.expense { background: var(--red); }

    .month-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 11px 14px;
      background: var(--surface2);
      border-radius: 10px;
      font-size: .85rem;
      margin-bottom: 8px;
    }
    .month-row:last-child { margin-bottom: 0; }
    .m-label { font-weight: 600; min-width: 140px; }
    .m-detail { color: var(--muted); font-size: .8rem; flex: 1; text-align: center; }
    .m-net { font-weight: 700; }
    .m-net.pos { color: var(--green); }
    .m-net.neg { color: var(--red); }

    .no-data { color: var(--muted); font-size: .85rem; padding: 16px 0; text-align: center; }

    @media (max-width: 560px) {
      .ov-grid { grid-template-columns: 1fr; }
      .full { grid-column: 1; }
      .m-detail { display: none; }
    }
  `]
})
export class OverviewComponent implements OnInit {
  constructor(readonly txSvc: TransactionService) {}

  ngOnInit() {
    if (!this.txSvc.transactions().length) {
      this.txSvc.load().subscribe();
    }
  }

  private barData(type: 'income' | 'expense') {
    const totals: Record<string, number> = {};
    this.txSvc.transactions()
      .filter(t => t.type === type)
      .forEach(t => { totals[t.category] = (totals[t.category] ?? 0) + t.amount; });
    const sorted = Object.entries(totals).sort((a,b) => b[1] - a[1]).slice(0, 6);
    const max = sorted[0]?.[1] ?? 1;
    return sorted.map(([label, amount]) => ({ label, amount, pct: Math.round(amount / max * 100) }));
  }

  incomeBars  = computed(() => this.barData('income'));
  expenseBars = computed(() => this.barData('expense'));

  monthRows = computed(() => {
    const map: Record<string, { inc: number; exp: number }> = {};
    this.txSvc.transactions().forEach(t => {
      const m = t.date.slice(0, 7);
      if (!map[m]) map[m] = { inc: 0, exp: 0 };
      t.type === 'income' ? (map[m].inc += t.amount) : (map[m].exp += t.amount);
    });
    return Object.entries(map)
      .sort((a,b) => b[0].localeCompare(a[0]))
      .map(([key, v]) => ({
        label: new Date(key + '-02').toLocaleString('default', { month: 'long', year: 'numeric' }),
        inc: v.inc,
        exp: v.exp,
        net: v.inc - v.exp,
      }));
  });
}
