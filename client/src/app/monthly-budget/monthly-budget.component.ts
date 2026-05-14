import { Component, computed, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BudgetService, BudgetLine } from '../services/budget.service';
import { TransactionService, Transaction, SectionType } from '../services/transaction.service';

interface SectionMeta { key: SectionType; label: string; icon: string; inflow: boolean; }
const SECTIONS: SectionMeta[] = [
  { key: 'income',   label: 'Income',           icon: '💰', inflow: true  },
  { key: 'savings',  label: 'Savings',           icon: '🏦', inflow: false },
  { key: 'fixed',    label: 'Fixed Expenses',    icon: '📌', inflow: false },
  { key: 'variable', label: 'Variable Expenses', icon: '🛒', inflow: false },
  { key: 'debt',     label: 'Debts',             icon: '💳', inflow: false },
];
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

@Component({
  selector: 'app-monthly-budget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">

      <!-- Month navigation -->
      <div class="month-nav">
        <button class="nav-arrow" (click)="changeMonth(-1)">&#8249;</button>
        <div class="month-label">
          <span class="m-name">{{ monthName() }}</span>
          <span class="m-year">{{ year() }}</span>
        </div>
        <button class="nav-arrow" (click)="changeMonth(1)">&#8250;</button>
      </div>

      <!-- Auto-copy notice -->
      @if (copiedFromLabel()) {
        <div class="copy-notice">
          <span>📋 Budget copied from <strong>{{ copiedFromLabel() }}</strong> — adjust estimates as needed.</span>
          <button class="notice-close" (click)="copiedFromLabel.set('')">✕</button>
        </div>
      }

      <!-- Top summary bar -->
      <div class="summary-bar">
        <div class="sbar-item income">
          <div class="sbar-label">Income</div>
          <div class="sbar-val">{{ sectionActual('income') | currency }}</div>
          <div class="sbar-est">of {{ sectionEstimated('income') | currency }} budgeted</div>
        </div>
        <div class="sbar-item expense">
          <div class="sbar-label">Expenses</div>
          <div class="sbar-val">{{ totalExpensesActual() | currency }}</div>
          <div class="sbar-est">of {{ totalExpensesEstimated() | currency }} budgeted</div>
        </div>
        <div class="sbar-item" [class.remaining-ok]="remaining() >= 0" [class.remaining-over]="remaining() < 0">
          <div class="sbar-label">Remaining</div>
          <div class="sbar-val">{{ remaining() | currency }}</div>
          <div class="sbar-est">{{ remaining() >= 0 ? 'within budget' : 'over budget' }}</div>
        </div>
      </div>

      @if (loading()) {
        <div class="loading-state"><span class="spinner"></span> Loading budget…</div>
      } @else {

        <!-- MONEY IN -->
        <div class="group-header in">💰 Money Coming In</div>
        <div class="sections-row in">
          @for (sec of inflowSections; track sec.key) {
            <div class="section-card card">
              <div class="sec-head">{{ sec.icon }} {{ sec.label }}</div>
              <table class="budget-table">
                <thead>
                  <tr><th>Name</th><th>Budget</th><th>Actual</th><th>Diff</th><th></th></tr>
                </thead>
                <tbody>
                  @for (line of linesFor(sec.key); track line._id) {
                    <tr>
                      <td class="name-cell">{{ line.name }}</td>
                      <td>
                        @if (editingLineId() === line._id) {
                          <input class="inline-input" type="number" [(ngModel)]="editEstimated"
                                 (blur)="saveEdit(line)" (keydown.enter)="saveEdit(line)" min="0" step="0.01" />
                        } @else {
                          <span class="editable" (click)="startEdit(line)">{{ line.estimated | currency }}</span>
                        }
                      </td>
                      <td class="actual-val">{{ actualFor(sec.key, line.name) | currency }}</td>
                      <td [class.diff-pos]="diffFor(sec.key, line.name) >= 0"
                          [class.diff-neg]="diffFor(sec.key, line.name) < 0">
                        {{ diffFor(sec.key, line.name) | currency }}
                      </td>
                      <td><button class="btn-icon del" (click)="deleteLine(line._id)">✕</button></td>
                    </tr>
                  }
                  @if (linesFor(sec.key).length === 0) {
                    <tr><td colspan="5" class="no-lines">No items yet — add one below</td></tr>
                  }
                </tbody>
                <tfoot>
                  <tr class="total-row">
                    <td>Total</td>
                    <td>{{ sectionEstimated(sec.key) | currency }}</td>
                    <td>{{ sectionActual(sec.key) | currency }}</td>
                    <td [class.diff-pos]="sectionDiff(sec.key) >= 0" [class.diff-neg]="sectionDiff(sec.key) < 0">
                      {{ sectionDiff(sec.key) | currency }}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
              <div class="add-line-row">
                <input class="add-name" type="text" [(ngModel)]="addForms[sec.key].name"
                       [placeholder]="'+ New ' + sec.label.toLowerCase() + ' source'"
                       (keydown.enter)="addLine(sec.key)" />
                <input class="add-est" type="number" [(ngModel)]="addForms[sec.key].estimated"
                       placeholder="Budget $" min="0" step="0.01" (keydown.enter)="addLine(sec.key)" />
                <button class="btn-add-line" (click)="addLine(sec.key)">Add</button>
              </div>
            </div>
          }
        </div>

        <!-- MONEY OUT -->
        <div class="group-header out">💸 Money Going Out</div>
        <div class="sections-row out">
          @for (sec of outflowSections; track sec.key) {
            <div class="section-card card">
              <div class="sec-head">{{ sec.icon }} {{ sec.label }}</div>
              <table class="budget-table">
                <thead>
                  <tr><th>Name</th><th>Budget</th><th>Actual</th><th>Diff</th><th></th></tr>
                </thead>
                <tbody>
                  @for (line of linesFor(sec.key); track line._id) {
                    <tr>
                      <td class="name-cell">{{ line.name }}</td>
                      <td>
                        @if (editingLineId() === line._id) {
                          <input class="inline-input" type="number" [(ngModel)]="editEstimated"
                                 (blur)="saveEdit(line)" (keydown.enter)="saveEdit(line)" min="0" step="0.01" />
                        } @else {
                          <span class="editable" (click)="startEdit(line)">{{ line.estimated | currency }}</span>
                        }
                      </td>
                      <td class="actual-val">{{ actualFor(sec.key, line.name) | currency }}</td>
                      <td [class.diff-pos]="diffFor(sec.key, line.name) >= 0"
                          [class.diff-neg]="diffFor(sec.key, line.name) < 0">
                        {{ diffFor(sec.key, line.name) | currency }}
                      </td>
                      <td><button class="btn-icon del" (click)="deleteLine(line._id)">✕</button></td>
                    </tr>
                  }
                  @if (linesFor(sec.key).length === 0) {
                    <tr><td colspan="5" class="no-lines">No items yet — add one below</td></tr>
                  }
                </tbody>
                <tfoot>
                  <tr class="total-row">
                    <td>Total</td>
                    <td>{{ sectionEstimated(sec.key) | currency }}</td>
                    <td>{{ sectionActual(sec.key) | currency }}</td>
                    <td [class.diff-pos]="sectionDiff(sec.key) >= 0" [class.diff-neg]="sectionDiff(sec.key) < 0">
                      {{ sectionDiff(sec.key) | currency }}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
              <div class="add-line-row">
                <input class="add-name" type="text" [(ngModel)]="addForms[sec.key].name"
                       [placeholder]="'+ New ' + sec.label.toLowerCase() + ' item'"
                       (keydown.enter)="addLine(sec.key)" />
                <input class="add-est" type="number" [(ngModel)]="addForms[sec.key].estimated"
                       placeholder="Budget $" min="0" step="0.01" (keydown.enter)="addLine(sec.key)" />
                <button class="btn-add-line" (click)="addLine(sec.key)">Add</button>
              </div>
            </div>
          }
        </div>

        <!-- Month summary -->
        <div class="month-summary card">
          <div class="ms-title">📊 Month Summary</div>
          <div class="ms-header-row">
            <span></span><span class="ms-col-head">Budget</span>
            <span class="ms-col-head">Actual</span><span class="ms-col-head">Diff</span>
          </div>
          @for (row of summaryRows(); track row.label) {
            <div class="ms-row">
              <span class="ms-label">{{ row.label }}</span>
              <span class="ms-est">{{ row.est | currency }}</span>
              <span class="ms-actual">{{ row.actual | currency }}</span>
              <span class="ms-diff" [class.diff-pos]="row.diff >= 0" [class.diff-neg]="row.diff < 0">
                {{ row.diff >= 0 ? '+' : '' }}{{ row.diff | currency }}
              </span>
            </div>
          }
          <div class="ms-row remaining-row">
            <span class="ms-label">🏁 Remaining</span>
            <span class="ms-est">{{ remainingEstimated() | currency }}</span>
            <span class="ms-actual" [class.diff-pos]="remaining() >= 0" [class.diff-neg]="remaining() < 0">
              {{ remaining() | currency }}
            </span>
            <span class="ms-diff"></span>
          </div>
        </div>

        <!-- Transaction Log -->
        <div class="tx-section">
          <div class="tx-head">
            <span class="tx-title">🧾 Transaction Log</span>
            <span class="tx-count">{{ transactions().length }} entries</span>
          </div>

          <div class="card tx-form">
            @if (txError()) {
              <div class="alert alert-error" style="margin-bottom:12px">{{ txError() }}</div>
            }
            <div class="tx-form-grid">
              <div class="field">
                <label>Section</label>
                <select [(ngModel)]="txForm.section" (ngModelChange)="onSectionChange()">
                  @for (s of allSections; track s.key) {
                    <option [value]="s.key">{{ s.icon }} {{ s.label }}</option>
                  }
                </select>
              </div>
              <div class="field">
                <label>Budget Line</label>
                <input type="text" [(ngModel)]="txForm.lineName"
                       placeholder="Type or pick a line" list="line-suggestions" />
                <datalist id="line-suggestions">
                  @for (l of linesFor(txForm.section); track l._id) {
                    <option [value]="l.name"></option>
                  }
                </datalist>
              </div>
              <div class="field">
                <label>Amount ($)</label>
                <input type="number" [(ngModel)]="txForm.amount" placeholder="0.00" min="0.01" step="0.01" />
              </div>
              <div class="field">
                <label>Date (DD/MM/YYYY)</label>
                <input type="date" [(ngModel)]="txForm.date" />
              </div>
              <div class="field span2">
                <label>Notes <span class="hint">(optional)</span></label>
                <input type="text" [(ngModel)]="txForm.notes"
                       placeholder="e.g. Super El Súper receipt" maxlength="100" />
              </div>
              <div class="field span2">
                <button class="btn btn-primary" (click)="addTransaction()" [disabled]="txSaving()">
                  @if (txSaving()) { <span class="spinner"></span> } @else { Log Transaction }
                </button>
              </div>
            </div>
          </div>

          @if (transactions().length === 0) {
            <div class="empty-state">
              <strong>No transactions yet</strong>
              Log your first transaction using the form above.
            </div>
          } @else {
            <div class="tx-list">
              @for (tx of transactions(); track tx._id) {
                <div class="tx-row">
                  <div class="tx-section-badge" [class]="tx.section">
                    {{ sectionIcon(tx.section) }}
                  </div>
                  <div class="tx-body">
                    <div class="tx-line">{{ tx.lineName }}</div>
                    <div class="tx-meta">
                      {{ sectionLabel(tx.section) }}
                      @if (tx.notes) { · {{ tx.notes }} }
                    </div>
                  </div>
                  <div class="tx-right">
                    <span class="tx-date">{{ tx.date | date:'dd/MM/yyyy' }}</span>
                    <span class="tx-amt" [class]="tx.section === 'income' ? 'inc' : 'exp'">
                      {{ tx.section === 'income' ? '+' : '−' }}{{ tx.amount | currency }}
                    </span>
                    <button class="btn-icon del" (click)="deleteTransaction(tx._id)">✕</button>
                  </div>
                </div>
              }
            </div>
          }
        </div>

      }
    </div>
  `,
  styles: [`
    .month-nav { display:flex; align-items:center; justify-content:center; gap:20px; margin-bottom:16px; }
    .nav-arrow { background:var(--surface); border:1px solid var(--border); border-radius:8px; color:var(--text); cursor:pointer; font-size:1.5rem; line-height:1; padding:4px 14px; transition:all .15s; }
    .nav-arrow:hover { border-color:var(--accent); color:var(--accent); }
    .month-label { text-align:center; }
    .m-name { display:block; font-size:1.35rem; font-weight:800; }
    .m-year { color:var(--muted); font-size:.9rem; }

    .copy-notice {
      display:flex; align-items:center; justify-content:space-between;
      background:#1a1a35; border:1px solid var(--accent); border-radius:10px;
      color:var(--text); font-size:.83rem; margin-bottom:16px; padding:10px 16px;
    }
    .notice-close { background:none; border:none; color:var(--muted); cursor:pointer; font-size:.85rem; padding:2px 6px; }
    .notice-close:hover { color:var(--text); }

    .summary-bar { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:28px; }
    .sbar-item { background:var(--surface); border:1px solid var(--border); border-radius:var(--r); padding:16px 20px; text-align:center; }
    .sbar-label { font-size:.72rem; text-transform:uppercase; letter-spacing:.1em; color:var(--muted); }
    .sbar-val { font-size:1.55rem; font-weight:800; margin:6px 0 2px; }
    .sbar-est { font-size:.72rem; color:var(--muted); }
    .sbar-item.income  .sbar-val { color:var(--green); }
    .sbar-item.expense .sbar-val { color:var(--red); }
    .remaining-ok  .sbar-val { color:var(--blue); }
    .remaining-over .sbar-val { color:var(--red); }

    .group-header { font-size:.78rem; font-weight:700; text-transform:uppercase; letter-spacing:.1em; padding:6px 4px; margin-bottom:10px; margin-top:4px; }
    .group-header.in  { color:var(--green); border-bottom:1px solid #0e2820; }
    .group-header.out { color:var(--red);   border-bottom:1px solid #2a1212; }

    .sections-row { display:grid; gap:14px; margin-bottom:24px; }
    .sections-row.in  { grid-template-columns:repeat(2,1fr); }
    .sections-row.out { grid-template-columns:repeat(3,1fr); }
    .section-card { padding:16px 18px; }
    .sec-head { font-size:.88rem; font-weight:700; margin-bottom:12px; padding-bottom:8px; border-bottom:1px solid var(--border); }

    .budget-table { width:100%; border-collapse:collapse; font-size:.8rem; margin-bottom:10px; }
    .budget-table th { color:var(--muted); font-size:.68rem; font-weight:600; text-transform:uppercase; letter-spacing:.06em; padding:5px 6px; text-align:left; border-bottom:1px solid var(--border); }
    .budget-table td { padding:6px 6px; vertical-align:middle; }
    .budget-table tbody tr:hover { background:var(--surface2); }
    .name-cell { font-weight:500; max-width:100px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .diff-pos { color:var(--green); }
    .diff-neg { color:var(--red); }
    .total-row td { border-top:1px solid var(--border); font-weight:700; padding-top:8px; }
    .no-lines { color:var(--muted); font-style:italic; padding:12px 6px; font-size:.78rem; }
    .editable { cursor:pointer; border-bottom:1px dashed var(--border); }
    .editable:hover { color:var(--accent); border-color:var(--accent); }
    .inline-input { background:var(--surface2); border:1px solid var(--accent); border-radius:5px; color:var(--text); font-size:.8rem; padding:3px 6px; width:80px; }

    .add-line-row { display:flex; gap:6px; margin-top:4px; }
    .add-name { flex:1; font-size:.8rem; padding:7px 10px; }
    .add-est  { width:90px; font-size:.8rem; padding:7px 10px; }
    .btn-add-line { background:var(--surface2); border:1px solid var(--border); border-radius:8px; color:var(--muted); cursor:pointer; font-family:inherit; font-size:.8rem; font-weight:600; padding:7px 12px; transition:all .15s; white-space:nowrap; }
    .btn-add-line:hover { border-color:var(--accent); color:var(--accent); }
    .btn-icon { background:none; border:none; cursor:pointer; font-size:.8rem; padding:3px 5px; border-radius:4px; transition:color .15s; }
    .btn-icon.del { color:var(--border); }
    .btn-icon.del:hover { color:var(--red); }

    .month-summary { margin-bottom:28px; }
    .ms-title { font-size:.88rem; font-weight:700; margin-bottom:12px; padding-bottom:8px; border-bottom:1px solid var(--border); }
    .ms-header-row { display:grid; grid-template-columns:1fr 110px 110px 90px; padding:4px 10px; }
    .ms-col-head { font-size:.68rem; text-transform:uppercase; letter-spacing:.08em; color:var(--muted); text-align:right; }
    .ms-row { display:grid; grid-template-columns:1fr 110px 110px 90px; align-items:center; padding:8px 10px; border-radius:8px; font-size:.85rem; }
    .ms-row:nth-child(odd) { background:var(--surface2); }
    .ms-label { font-weight:600; }
    .ms-est, .ms-actual, .ms-diff { text-align:right; }
    .ms-est { color:var(--muted); font-size:.82rem; }
    .ms-actual { font-weight:600; }
    .ms-diff { font-size:.82rem; font-weight:600; }
    .remaining-row { background:var(--surface2) !important; border:1px solid var(--border); border-radius:10px; margin-top:8px; }

    .tx-section {}
    .tx-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; }
    .tx-title { font-size:.95rem; font-weight:600; }
    .tx-count { font-size:.78rem; color:var(--muted); }
    .tx-form { margin-bottom:16px; }
    .tx-form-grid { display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:12px; }
    .tx-form-grid .span2 { grid-column:span 2; }
    .hint { color:var(--muted); font-size:.72rem; font-weight:400; text-transform:none; }

    .tx-list { display:flex; flex-direction:column; gap:7px; }
    .tx-row { align-items:center; background:var(--surface); border:1px solid var(--border); border-radius:11px; display:flex; gap:12px; padding:11px 14px; transition:filter .15s; }
    .tx-row:hover { filter:brightness(1.07); }
    .tx-section-badge { align-items:center; border-radius:50%; display:flex; font-size:1rem; height:36px; justify-content:center; width:36px; flex-shrink:0; }
    .tx-section-badge.income   { background:#0e2820; }
    .tx-section-badge.savings  { background:#0d1f30; }
    .tx-section-badge.fixed    { background:#1a1330; }
    .tx-section-badge.variable { background:#1e1530; }
    .tx-section-badge.debt     { background:#2a1212; }
    .tx-body { flex:1; min-width:0; }
    .tx-line { font-size:.88rem; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .tx-meta { color:var(--muted); font-size:.72rem; margin-top:2px; }
    .tx-right { display:flex; align-items:center; gap:10px; }
    .tx-date { color:var(--muted); font-size:.75rem; white-space:nowrap; }
    .tx-amt { font-size:.92rem; font-weight:700; white-space:nowrap; }
    .tx-amt.inc { color:var(--green); }
    .tx-amt.exp { color:var(--red); }

    .loading-state { color:var(--muted); padding:40px; text-align:center; }
    .empty-state { background:var(--surface); border:1px dashed var(--border); border-radius:var(--r); color:var(--muted); padding:36px; text-align:center; font-size:.875rem; }
    .empty-state strong { display:block; font-size:.95rem; color:var(--text); margin-bottom:5px; }

    @media (max-width:900px) {
      .sections-row.out { grid-template-columns:1fr 1fr; }
      .tx-form-grid { grid-template-columns:1fr 1fr; }
    }
    @media (max-width:600px) {
      .summary-bar { grid-template-columns:1fr; }
      .sections-row.in, .sections-row.out { grid-template-columns:1fr; }
      .tx-form-grid { grid-template-columns:1fr; }
      .tx-form-grid .span2 { grid-column:1; }
      .ms-header-row, .ms-row { grid-template-columns:1fr 80px 80px; }
      .ms-diff { display:none; }
    }
  `]
})
export class MonthlyBudgetComponent implements OnInit {
  readonly inflowSections  = SECTIONS.filter(s => s.inflow);
  readonly outflowSections = SECTIONS.filter(s => !s.inflow);
  readonly allSections = SECTIONS;

  loading   = signal(true);
  txSaving  = signal(false);
  txError   = signal('');
  copiedFromLabel = signal('');

  year  = signal(new Date().getFullYear());
  month = signal(new Date().getMonth() + 1);
  monthName = computed(() => MONTHS[this.month() - 1]);

  editingLineId = signal<string | null>(null);
  editEstimated = 0;

  addForms: Record<SectionType, { name: string; estimated: string }> = {
    income:   { name: '', estimated: '' },
    savings:  { name: '', estimated: '' },
    fixed:    { name: '', estimated: '' },
    variable: { name: '', estimated: '' },
    debt:     { name: '', estimated: '' },
  };

  txForm = {
    section:  'income' as SectionType,
    lineName: '',
    amount:   '',
    date:     this.todayISO(),
    notes:    '',
  };

  constructor(private budgetSvc: BudgetService, private txSvc: TransactionService) {}

  ngOnInit() { this.loadMonth(); }

  loadMonth() {
    this.loading.set(true);
    this.copiedFromLabel.set('');
    const y = this.year(), m = this.month();

    let txDone = false, linesDone = false;
    const tryFinish = () => {
      if (!txDone || !linesDone) return;
      if (this.budgetSvc.lines().length === 0) {
        this.autoCopyBudget(y, m);
      } else {
        this.loading.set(false);
      }
    };

    this.txSvc.load(y, m).subscribe({ complete: () => { txDone = true; tryFinish(); }, error: () => { txDone = true; tryFinish(); } });
    this.budgetSvc.load(y, m).subscribe({ complete: () => { linesDone = true; tryFinish(); }, error: () => { linesDone = true; tryFinish(); } });
  }

  private autoCopyBudget(y: number, m: number) {
    this.budgetSvc.latestMonth(y, m).subscribe({
      next: source => {
        if (!source) { this.loading.set(false); return; }
        this.budgetSvc.copyFrom(source.year, source.month, y, m).subscribe({
          next: () => {
            this.copiedFromLabel.set(`${MONTHS[source.month - 1]} ${source.year}`);
            this.loading.set(false);
          },
          error: () => this.loading.set(false),
        });
      },
      error: () => this.loading.set(false),
    });
  }

  changeMonth(delta: number) {
    let m = this.month() + delta;
    let y = this.year();
    if (m > 12) { m = 1;  y++; }
    if (m < 1)  { m = 12; y--; }
    this.month.set(m);
    this.year.set(y);
    this.editingLineId.set(null);
    this.loadMonth();
  }

  /* ── Lines helpers ── */
  linesFor(section: SectionType): BudgetLine[] {
    return this.budgetSvc.lines().filter(l => l.section === section);
  }

  actualFor(section: SectionType, name: string): number {
    return this.txSvc.transactions()
      .filter(t => t.section === section && t.lineName === name)
      .reduce((s, t) => s + t.amount, 0);
  }

  diffFor(section: SectionType, name: string): number {
    const line = this.budgetSvc.lines().find(l => l.section === section && l.name === name);
    const est = line?.estimated ?? 0;
    const act = this.actualFor(section, name);
    return section === 'income' ? act - est : est - act;
  }

  sectionEstimated(section: SectionType): number {
    return this.linesFor(section).reduce((s, l) => s + l.estimated, 0);
  }

  sectionActual(section: SectionType): number {
    return this.txSvc.transactions()
      .filter(t => t.section === section)
      .reduce((s, t) => s + t.amount, 0);
  }

  sectionDiff(section: SectionType): number {
    const est = this.sectionEstimated(section);
    const act = this.sectionActual(section);
    return section === 'income' ? act - est : est - act;
  }

  totalExpensesEstimated = computed(() =>
    (['savings','fixed','variable','debt'] as SectionType[])
      .reduce((s, sec) => s + this.sectionEstimated(sec), 0)
  );

  totalExpensesActual = computed(() =>
    (['savings','fixed','variable','debt'] as SectionType[])
      .reduce((s, sec) => s + this.sectionActual(sec), 0)
  );

  remaining          = computed(() => this.sectionActual('income')    - this.totalExpensesActual());
  remainingEstimated = computed(() => this.sectionEstimated('income') - this.totalExpensesEstimated());

  summaryRows = computed(() => SECTIONS.map(s => ({
    label:  `${s.icon} ${s.label}`,
    est:    this.sectionEstimated(s.key),
    actual: this.sectionActual(s.key),
    diff:   this.sectionDiff(s.key),
  })));

  /* ── Add / Edit / Delete lines ── */
  addLine(section: SectionType) {
    const f = this.addForms[section];
    if (!f.name.trim()) return;
    this.budgetSvc.add({
      year: this.year(), month: this.month(), section,
      name: f.name.trim(),
      estimated: parseFloat(f.estimated) || 0,
    }).subscribe();
    f.name = ''; f.estimated = '';
  }

  startEdit(line: BudgetLine) {
    this.editingLineId.set(line._id);
    this.editEstimated = line.estimated;
  }

  saveEdit(line: BudgetLine) {
    if (this.editingLineId() !== line._id) return;
    this.budgetSvc.update(line._id, { estimated: this.editEstimated }).subscribe();
    this.editingLineId.set(null);
  }

  deleteLine(id: string) { this.budgetSvc.remove(id).subscribe(); }

  /* ── Transactions ── */
  onSectionChange() { this.txForm.lineName = ''; }

  addTransaction() {
    const { section, lineName, amount, date, notes } = this.txForm;
    const amt = parseFloat(amount as string);
    if (!lineName.trim()) { this.txError.set('Enter a budget line name.'); return; }
    if (!amt || amt <= 0) { this.txError.set('Enter a valid amount.'); return; }
    if (!date)            { this.txError.set('Pick a date.'); return; }
    this.txError.set('');
    this.txSaving.set(true);
    this.txSvc.add({
      year: this.year(), month: this.month(),
      section, lineName: lineName.trim(), amount: amt, date, notes,
    }).subscribe({
      next: () => {
        this.txForm.lineName = '';
        this.txForm.amount   = '';
        this.txForm.notes    = '';
        this.txForm.date     = this.todayISO();
        this.txSaving.set(false);
      },
      error: () => { this.txError.set('Failed to save. Try again.'); this.txSaving.set(false); },
    });
  }

  deleteTransaction(id: string) { this.txSvc.remove(id).subscribe(); }

  sectionIcon(s: SectionType)  { return SECTIONS.find(x => x.key === s)?.icon  ?? '•'; }
  sectionLabel(s: SectionType) { return SECTIONS.find(x => x.key === s)?.label ?? s; }

  transactions = computed(() => this.txSvc.transactions());

  private todayISO() { return new Date().toISOString().slice(0, 10); }
}
