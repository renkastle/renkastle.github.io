import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { BudgetService, BudgetLine } from '../services/budget.service';
import { TransactionService, Transaction, SectionType } from '../services/transaction.service';

const SECTIONS: { key: SectionType; label: string; icon: string }[] = [
  { key: 'income',   label: 'Income',           icon: '💰' },
  { key: 'savings',  label: 'Savings',           icon: '🏦' },
  { key: 'fixed',    label: 'Fixed Expenses',    icon: '📌' },
  { key: 'variable', label: 'Variable Expenses', icon: '🛒' },
  { key: 'debt',     label: 'Debts',             icon: '💳' },
];
const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

interface MonthData { est: number; actual: number; }
type AnnualData = Record<SectionType, MonthData[]>;

@Component({
  selector: 'app-annual-summary',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <div class="page-title">Annual Summary</div>

      <div class="year-nav">
        <button class="nav-arrow" (click)="changeYear(-1)">&#8249;</button>
        <span class="year-label">{{ year() }}</span>
        <button class="nav-arrow" (click)="changeYear(1)">&#8250;</button>
      </div>

      @if (loading()) {
        <div class="loading-state"><span class="spinner"></span> Loading annual data…</div>
      } @else {
        <!-- Year totals -->
        <div class="year-totals">
          @for (s of sections; track s.key) {
            <div class="yt-card card">
              <div class="yt-icon">{{ s.icon }}</div>
              <div class="yt-label">{{ s.label }}</div>
              <div class="yt-actual" [class.income]="s.key === 'income'"
                   [class.expense]="s.key !== 'income'">
                {{ yearActual(s.key) | currency }}
              </div>
              <div class="yt-est">of {{ yearEstimated(s.key) | currency }} budgeted</div>
            </div>
          }
          <div class="yt-card card remaining-card">
            <div class="yt-icon">🏁</div>
            <div class="yt-label">Net Remaining</div>
            <div class="yt-actual" [class.pos]="yearRemaining() >= 0" [class.neg]="yearRemaining() < 0">
              {{ yearRemaining() | currency }}
            </div>
            <div class="yt-est">{{ yearRemaining() >= 0 ? 'surplus' : 'deficit' }} for the year</div>
          </div>
        </div>

        <!-- Monthly breakdown table -->
        <div class="card table-card">
          <div class="tbl-title">Monthly Breakdown — Budget vs Actual</div>
          <div class="tbl-wrap">
            <table class="year-table">
              <thead>
                <tr>
                  <th class="cat-col">Category</th>
                  @for (m of months; track m) { <th>{{ m }}</th> }
                  <th class="total-col">Total</th>
                </tr>
              </thead>
              <tbody>
                @for (s of sections; track s.key) {
                  <tr class="section-row">
                    <td class="cat-cell">{{ s.icon }} {{ s.label }}</td>
                    @for (mi of monthIndices; track mi) {
                      <td class="month-cell">
                        <span class="cell-est">{{ monthEst(s.key, mi) | currency:'USD':'symbol':'1.0-0' }}</span>
                        <span class="cell-actual" [class.income]="s.key === 'income'"
                              [class.expense]="s.key !== 'income'">
                          {{ monthActual(s.key, mi) | currency:'USD':'symbol':'1.0-0' }}
                        </span>
                      </td>
                    }
                    <td class="total-cell">
                      <span class="cell-est">{{ yearEstimated(s.key) | currency:'USD':'symbol':'1.0-0' }}</span>
                      <span class="cell-actual" [class.income]="s.key === 'income'"
                            [class.expense]="s.key !== 'income'">
                        {{ yearActual(s.key) | currency:'USD':'symbol':'1.0-0' }}
                      </span>
                    </td>
                  </tr>
                }
                <tr class="remaining-row-tbl">
                  <td class="cat-cell">🏁 Remaining</td>
                  @for (mi of monthIndices; track mi) {
                    <td class="month-cell">
                      <span class="cell-est">{{ monthRemainingEst(mi) | currency:'USD':'symbol':'1.0-0' }}</span>
                      <span class="cell-actual"
                            [class.pos]="monthRemaining(mi) >= 0"
                            [class.neg]="monthRemaining(mi) < 0">
                        {{ monthRemaining(mi) | currency:'USD':'symbol':'1.0-0' }}
                      </span>
                    </td>
                  }
                  <td class="total-cell">
                    <span class="cell-est">{{ yearRemainingEst() | currency:'USD':'symbol':'1.0-0' }}</span>
                    <span class="cell-actual" [class.pos]="yearRemaining() >= 0" [class.neg]="yearRemaining() < 0">
                      {{ yearRemaining() | currency:'USD':'symbol':'1.0-0' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="tbl-legend">
            <span class="leg-item"><span class="leg-dot muted"></span> Budget</span>
            <span class="leg-item"><span class="leg-dot actual"></span> Actual</span>
          </div>
        </div>

        <!-- Monthly income vs expense bars -->
        <div class="card">
          <div class="tbl-title">Income vs Expenses by Month</div>
          <div class="chart-bars">
            @for (mi of monthIndices; track mi) {
              <div class="chart-col">
                <div class="bar-pair">
                  <div class="bar-wrap">
                    <div class="bar income-bar"
                         [style.height.%]="barPct(monthActual('income', mi), maxBarVal())">
                    </div>
                  </div>
                  <div class="bar-wrap">
                    <div class="bar expense-bar"
                         [style.height.%]="barPct(monthExpenseActual(mi), maxBarVal())">
                    </div>
                  </div>
                </div>
                <div class="bar-label">{{ months[mi] }}</div>
              </div>
            }
          </div>
          <div class="tbl-legend">
            <span class="leg-item"><span class="leg-dot income"></span> Income</span>
            <span class="leg-item"><span class="leg-dot expense"></span> Expenses</span>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .year-nav { display: flex; align-items: center; justify-content: center; gap: 20px; margin-bottom: 24px; }
    .nav-arrow { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; color: var(--text); cursor: pointer; font-size: 1.5rem; line-height: 1; padding: 4px 14px; transition: all .15s; }
    .nav-arrow:hover { border-color: var(--accent); color: var(--accent); }
    .year-label { font-size: 1.35rem; font-weight: 800; }

    .year-totals { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; margin-bottom: 20px; }
    .yt-card { padding: 14px 16px; text-align: center; }
    .yt-icon { font-size: 1.3rem; margin-bottom: 4px; }
    .yt-label { font-size: .7rem; text-transform: uppercase; letter-spacing: .08em; color: var(--muted); margin-bottom: 6px; }
    .yt-actual { font-size: 1.1rem; font-weight: 800; margin-bottom: 2px; }
    .yt-actual.income  { color: var(--green); }
    .yt-actual.expense { color: var(--red); }
    .yt-actual.pos { color: var(--blue); }
    .yt-actual.neg { color: var(--red); }
    .yt-est { font-size: .68rem; color: var(--muted); }

    .table-card { margin-bottom: 20px; overflow: hidden; }
    .tbl-title { font-size: .88rem; font-weight: 700; margin-bottom: 14px; }
    .tbl-wrap { overflow-x: auto; }

    .year-table { border-collapse: collapse; font-size: .75rem; min-width: 900px; width: 100%; }
    .year-table th { background: var(--surface2); color: var(--muted); font-size: .65rem; font-weight: 700; letter-spacing: .06em; padding: 8px 10px; text-align: center; text-transform: uppercase; white-space: nowrap; }
    .year-table th.cat-col { text-align: left; min-width: 140px; }
    .year-table th.total-col { background: #1a1d30; }
    .cat-cell { font-weight: 600; padding: 8px 10px; white-space: nowrap; }
    .month-cell, .total-cell { padding: 8px 10px; text-align: center; vertical-align: middle; }
    .total-cell { background: #131625; font-weight: 700; }
    .section-row:nth-child(even) td { background: rgba(255,255,255,.02); }
    .section-row:nth-child(even) .total-cell { background: #151826; }
    .cell-est { display: block; color: var(--muted); font-size: .68rem; }
    .cell-actual { display: block; font-weight: 600; font-size: .78rem; }
    .cell-actual.income  { color: var(--green); }
    .cell-actual.expense { color: var(--red); }
    .cell-actual.pos { color: var(--blue); }
    .cell-actual.neg { color: var(--red); }
    .remaining-row-tbl td { border-top: 2px solid var(--border); font-weight: 700; }

    .tbl-legend { display: flex; gap: 16px; margin-top: 12px; }
    .leg-item { display: flex; align-items: center; gap: 5px; font-size: .75rem; color: var(--muted); }
    .leg-dot { width: 10px; height: 10px; border-radius: 2px; }
    .leg-dot.muted  { background: var(--muted); }
    .leg-dot.actual { background: var(--text); }
    .leg-dot.income { background: var(--green); }
    .leg-dot.expense { background: var(--red); }

    .chart-bars { display: flex; gap: 8px; align-items: flex-end; height: 140px; margin-bottom: 8px; padding: 0 4px; }
    .chart-col { display: flex; flex-direction: column; align-items: center; flex: 1; height: 100%; }
    .bar-pair { display: flex; gap: 3px; align-items: flex-end; flex: 1; width: 100%; }
    .bar-wrap { flex: 1; display: flex; align-items: flex-end; height: 120px; }
    .bar { width: 100%; border-radius: 3px 3px 0 0; min-height: 2px; transition: height .4s ease; }
    .income-bar  { background: var(--green); opacity: .8; }
    .expense-bar { background: var(--red);   opacity: .8; }
    .bar-label { font-size: .62rem; color: var(--muted); margin-top: 4px; text-align: center; }

    .loading-state { color: var(--muted); padding: 60px; text-align: center; }

    @media (max-width: 900px) {
      .year-totals { grid-template-columns: repeat(3, 1fr); }
    }
    @media (max-width: 560px) {
      .year-totals { grid-template-columns: repeat(2, 1fr); }
    }
  `]
})
export class AnnualSummaryComponent implements OnInit {
  readonly sections = SECTIONS;
  readonly months = MONTH_ABBR;
  readonly monthIndices = Array.from({ length: 12 }, (_, i) => i);

  year    = signal(new Date().getFullYear());
  loading = signal(true);

  private allLines = signal<BudgetLine[]>([]);
  private allTxs   = signal<Transaction[]>([]);

  constructor(private budgetSvc: BudgetService, private txSvc: TransactionService) {}

  ngOnInit() { this.loadYear(); }

  loadYear() {
    this.loading.set(true);
    forkJoin({
      lines: this.budgetSvc.loadYear(this.year()),
      txs:   this.txSvc.loadYear(this.year()),
    }).subscribe({
      next: ({ lines, txs }) => {
        this.allLines.set(lines);
        this.allTxs.set(txs);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  changeYear(delta: number) { this.year.update(y => y + delta); this.loadYear(); }

  monthEst(section: SectionType, mi: number): number {
    return this.allLines()
      .filter(l => l.section === section && l.month === mi + 1)
      .reduce((s, l) => s + l.estimated, 0);
  }

  monthActual(section: SectionType, mi: number): number {
    return this.allTxs()
      .filter(t => t.section === section && t.month === mi + 1)
      .reduce((s, t) => s + t.amount, 0);
  }

  monthExpenseActual(mi: number): number {
    return (['savings','fixed','variable','debt'] as SectionType[])
      .reduce((s, sec) => s + this.monthActual(sec, mi), 0);
  }

  monthRemaining(mi: number): number {
    return this.monthActual('income', mi) - this.monthExpenseActual(mi);
  }

  monthRemainingEst(mi: number): number {
    const incEst = this.monthEst('income', mi);
    const expEst = (['savings','fixed','variable','debt'] as SectionType[])
      .reduce((s, sec) => s + this.monthEst(sec, mi), 0);
    return incEst - expEst;
  }

  yearEstimated(section: SectionType): number {
    return this.allLines().filter(l => l.section === section).reduce((s, l) => s + l.estimated, 0);
  }

  yearActual(section: SectionType): number {
    return this.allTxs().filter(t => t.section === section).reduce((s, t) => s + t.amount, 0);
  }

  yearRemaining = computed(() =>
    this.yearActual('income') -
    (['savings','fixed','variable','debt'] as SectionType[]).reduce((s, sec) => s + this.yearActual(sec), 0)
  );

  yearRemainingEst = computed(() =>
    this.yearEstimated('income') -
    (['savings','fixed','variable','debt'] as SectionType[]).reduce((s, sec) => s + this.yearEstimated(sec), 0)
  );

  maxBarVal = computed(() => {
    let max = 0;
    for (let i = 0; i < 12; i++) {
      max = Math.max(max, this.monthActual('income', i), this.monthExpenseActual(i));
    }
    return max || 1;
  });

  barPct(val: number, max: number): number { return Math.round(val / max * 100); }
}
