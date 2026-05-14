import { Component, computed, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AccountService, Account, AccountTransaction, ACCOUNT_META } from '../services/account.service';

@Component({
  selector: 'app-account-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    @if (loading()) {
      <div class="loading-full"><span class="spinner"></span> Loading…</div>
    } @else if (!account()) {
      <div class="loading-full">Account not found. <a routerLink="/accounts">← Back</a></div>
    } @else {
      <div class="page">

        <!-- Header -->
        <div class="acct-header">
          <a class="back-link" routerLink="/accounts">← Accounts</a>
          <div class="acct-hero">
            <div class="hero-icon">{{ meta.icon }}</div>
            <div class="hero-info">
              <div class="hero-name">{{ account()!.name }}</div>
              <div class="hero-type">{{ meta.label }}</div>
            </div>
            <div class="hero-balance-wrap">
              <div class="hero-bal"
                   [class.asset-pos]=" meta.isAsset && currentBalance() >= 0"
                   [class.asset-neg]=" meta.isAsset && currentBalance() < 0"
                   [class.liab-pos]="!meta.isAsset && currentBalance() > 0"
                   [class.liab-zero]="!meta.isAsset && currentBalance() <= 0">
                {{ currentBalance() | currency }}
              </div>
              <div class="hero-bal-label">
                {{ meta.isAsset ? 'current balance' : (currentBalance() > 0 ? 'currently owed' : 'paid off') }}
              </div>
            </div>
          </div>
        </div>

        <!-- Add transaction form -->
        <div class="card tx-form-card">
          <div class="tx-form-title">Add Transaction</div>

          <div class="direction-row">
            <button class="dir-btn" [class.active-credit]="txForm.direction === 'credit'"
                    (click)="txForm.direction = 'credit'">
              {{ meta.isAsset ? '+ Deposit / Income' : '− Payment (reduces debt)' }}
            </button>
            <button class="dir-btn" [class.active-debit]="txForm.direction === 'debit'"
                    (click)="txForm.direction = 'debit'">
              {{ meta.isAsset ? '− Withdrawal / Expense' : '+ Charge / New expense' }}
            </button>
          </div>

          @if (txError()) {
            <div class="alert alert-error" style="margin-bottom:12px">{{ txError() }}</div>
          }

          <div class="tx-form-grid">
            <div class="field">
              <label>Amount ($)</label>
              <input type="number" [(ngModel)]="txForm.amount" placeholder="0.00" min="0.01" step="0.01" />
            </div>
            <div class="field">
              <label>Date (DD/MM/YYYY)</label>
              <input type="date" [(ngModel)]="txForm.date" />
            </div>
            <div class="field span2">
              <label>Description</label>
              <input type="text" [(ngModel)]="txForm.description"
                     placeholder="e.g. Salary deposit, Super El Súper, Visa payment" maxlength="100" />
            </div>
            <div class="field span2">
              <label>Notes <span class="hint">(optional)</span></label>
              <input type="text" [(ngModel)]="txForm.notes" placeholder="Extra details" maxlength="100" />
            </div>
            <div class="field span2">
              <button class="btn btn-primary" (click)="addTx()" [disabled]="saving()">
                @if (saving()) { <span class="spinner"></span> } @else { Add Transaction }
              </button>
            </div>
          </div>
        </div>

        <!-- Month filter -->
        <div class="list-controls">
          <span class="list-title">Transaction History</span>
          <div class="list-filters">
            <select [(ngModel)]="filterYear">
              <option value="all">All years</option>
              @for (y of availableYears(); track y) {
                <option [value]="y">{{ y }}</option>
              }
            </select>
            <select [(ngModel)]="filterMonth">
              <option value="all">All months</option>
              @for (m of monthOptions; track m.value) {
                <option [value]="m.value">{{ m.label }}</option>
              }
            </select>
          </div>
        </div>

        @if (filteredRows().length === 0) {
          <div class="empty-state">
            <strong>No transactions</strong>
            Add your first transaction above.
          </div>
        } @else {
          <div class="tx-table card">
            <table>
              <thead>
                <tr>
                  <th class="col-date">Date</th>
                  <th>Description</th>
                  <th class="col-amt">Debit</th>
                  <th class="col-amt">Credit</th>
                  <th class="col-bal">Balance</th>
                  <th class="col-del"></th>
                </tr>
              </thead>
              <tbody>
                @for (row of filteredRows(); track row._id) {
                  <tr>
                    <td class="col-date muted">{{ row.date | date:'dd/MM/yyyy' }}</td>
                    <td>
                      <div class="tx-desc">{{ row.description }}</div>
                      @if (row.notes) { <div class="tx-note">{{ row.notes }}</div> }
                    </td>
                    <td class="col-amt debit-col">
                      @if (row.direction === 'debit') { {{ row.amount | currency }} }
                    </td>
                    <td class="col-amt credit-col">
                      @if (row.direction === 'credit') { {{ row.amount | currency }} }
                    </td>
                    <td class="col-bal"
                        [class.bal-pos]="row.runningBalance >= 0 &&  meta.isAsset"
                        [class.bal-neg]="row.runningBalance <  0 &&  meta.isAsset"
                        [class.bal-owed]="row.runningBalance > 0 && !meta.isAsset"
                        [class.bal-ok]="row.runningBalance <= 0 && !meta.isAsset">
                      {{ row.runningBalance | currency }}
                    </td>
                    <td class="col-del">
                      <button class="btn-del" (click)="deleteTx(row._id)">✕</button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

      </div>
    }
  `,
  styles: [`
    .loading-full { color:var(--muted); padding:80px; text-align:center; }
    .loading-full a { color:var(--accent); }

    .back-link { color:var(--accent); font-size:.83rem; text-decoration:none; display:inline-block; margin-bottom:16px; }
    .back-link:hover { text-decoration:underline; }

    .acct-hero { display:flex; align-items:center; gap:16px; background:var(--surface); border:1px solid var(--border); border-radius:var(--r); padding:20px 24px; margin-bottom:22px; }
    .hero-icon { font-size:2.2rem; width:52px; text-align:center; flex-shrink:0; }
    .hero-info { flex:1; }
    .hero-name { font-size:1.25rem; font-weight:800; }
    .hero-type { color:var(--muted); font-size:.82rem; margin-top:3px; }
    .hero-balance-wrap { text-align:right; flex-shrink:0; }
    .hero-bal { font-size:1.8rem; font-weight:800; line-height:1; }
    .hero-bal.asset-pos { color:var(--green); }
    .hero-bal.asset-neg { color:var(--red); }
    .hero-bal.liab-pos  { color:var(--red); }
    .hero-bal.liab-zero { color:var(--green); }
    .hero-bal-label { font-size:.72rem; color:var(--muted); margin-top:4px; }

    .tx-form-card { margin-bottom:22px; }
    .tx-form-title { font-size:.95rem; font-weight:600; margin-bottom:14px; }
    .direction-row { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:16px; }
    .dir-btn {
      background:var(--surface2); border:2px solid var(--border); border-radius:10px;
      color:var(--muted); cursor:pointer; font-family:inherit; font-size:.88rem;
      font-weight:600; padding:11px 14px; transition:all .15s; text-align:center;
    }
    .dir-btn.active-credit { border-color:var(--green); color:var(--green); background:#0e2820; }
    .dir-btn.active-debit  { border-color:var(--red);   color:var(--red);   background:#2a1212; }
    .tx-form-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    .tx-form-grid .span2 { grid-column:1/-1; }
    .hint { color:var(--muted); font-size:.72rem; font-weight:400; text-transform:none; }

    .list-controls { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; flex-wrap:wrap; gap:10px; }
    .list-title { font-size:.95rem; font-weight:600; }
    .list-filters { display:flex; gap:8px; }
    .list-filters select { font-size:.8rem; padding:7px 32px 7px 12px; }

    .tx-table { padding:0; overflow:hidden; }
    table { border-collapse:collapse; width:100%; font-size:.83rem; }
    thead th { background:var(--surface2); color:var(--muted); font-size:.67rem; font-weight:700; letter-spacing:.07em; padding:10px 14px; text-align:left; text-transform:uppercase; border-bottom:1px solid var(--border); white-space:nowrap; }
    tbody tr { border-bottom:1px solid var(--border); transition:background .12s; }
    tbody tr:last-child { border-bottom:none; }
    tbody tr:hover { background:var(--surface2); }
    td { padding:10px 14px; vertical-align:middle; }
    .col-date { white-space:nowrap; width:100px; }
    .col-amt  { text-align:right; width:110px; white-space:nowrap; font-weight:600; }
    .col-bal  { text-align:right; width:120px; font-weight:700; white-space:nowrap; }
    .col-del  { width:36px; text-align:center; }
    .muted    { color:var(--muted); }

    .debit-col  { color:var(--red); }
    .credit-col { color:var(--green); }
    .bal-pos  { color:var(--green); }
    .bal-neg  { color:var(--red); }
    .bal-owed { color:var(--red); }
    .bal-ok   { color:var(--green); }

    .tx-desc { font-weight:500; }
    .tx-note { color:var(--muted); font-size:.72rem; margin-top:2px; }

    .btn-del { background:none; border:none; color:var(--border); cursor:pointer; font-size:.8rem; padding:4px 6px; border-radius:4px; transition:color .15s; }
    .btn-del:hover { color:var(--red); }

    .empty-state { background:var(--surface); border:1px dashed var(--border); border-radius:var(--r); color:var(--muted); padding:40px; text-align:center; font-size:.875rem; }
    .empty-state strong { display:block; font-size:.95rem; color:var(--text); margin-bottom:5px; }

    @media (max-width:600px) {
      .acct-hero { flex-wrap:wrap; }
      .hero-balance-wrap { width:100%; text-align:left; }
      .tx-form-grid { grid-template-columns:1fr; }
      .tx-form-grid .span2 { grid-column:1; }
      .direction-row { grid-template-columns:1fr; }
      .col-bal { display:none; }
    }
  `]
})
export class AccountDetailComponent implements OnInit {
  loading = signal(true);
  saving  = signal(false);
  txError = signal('');

  accountId = '';
  filterYear  = 'all';
  filterMonth = 'all';

  txForm = {
    direction: 'debit' as 'credit' | 'debit',
    amount:      '',
    date:        new Date().toISOString().slice(0, 10),
    description: '',
    notes:       '',
  };

  readonly monthOptions = [
    {value:'1',label:'January'},{value:'2',label:'February'},{value:'3',label:'March'},
    {value:'4',label:'April'},{value:'5',label:'May'},{value:'6',label:'June'},
    {value:'7',label:'July'},{value:'8',label:'August'},{value:'9',label:'September'},
    {value:'10',label:'October'},{value:'11',label:'November'},{value:'12',label:'December'},
  ];

  constructor(private route: ActivatedRoute, private acctSvc: AccountService) {}

  ngOnInit() {
    this.accountId = this.route.snapshot.paramMap.get('id') ?? '';
    let done = 0;
    const fin = () => { if (++done === 2) this.loading.set(false); };
    if (!this.acctSvc.accounts().length) {
      this.acctSvc.loadAccounts().subscribe({ complete: fin, error: fin });
    } else { fin(); }
    this.acctSvc.loadAccountTransactions(this.accountId).subscribe({ complete: fin, error: fin });
  }

  account = computed(() => this.acctSvc.accounts().find(a => a._id === this.accountId) ?? null);
  get meta() { return ACCOUNT_META[this.account()?.type ?? 'checking']; }

  currentBalance = computed(() => {
    const a = this.account();
    return a ? this.acctSvc.balance(a) : 0;
  });

  private allRows = computed(() => {
    const acct = this.account();
    if (!acct) return [];
    const txs = this.acctSvc.transactions()
      .filter(t => t.accountId === this.accountId);
    const sorted = [...txs].sort((a, b) =>
      a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt)
    );
    const isAsset = ACCOUNT_META[acct.type].isAsset;
    let running = acct.openingBalance;
    return sorted.map(tx => {
      running += isAsset
        ? (tx.direction === 'credit' ? tx.amount : -tx.amount)
        : (tx.direction === 'debit'  ? tx.amount : -tx.amount);
      return { ...tx, runningBalance: running };
    }).reverse();
  });

  filteredRows = computed(() => {
    return this.allRows().filter(r => {
      if (this.filterYear  !== 'all' && String(r.year)  !== this.filterYear)  return false;
      if (this.filterMonth !== 'all' && String(r.month) !== this.filterMonth) return false;
      return true;
    });
  });

  availableYears = computed(() => {
    const years = [...new Set(this.allRows().map(r => r.year))].sort().reverse();
    return years;
  });

  addTx() {
    const amt = parseFloat(this.txForm.amount as string);
    if (!this.txForm.description.trim()) { this.txError.set('Description is required.'); return; }
    if (!amt || amt <= 0)                { this.txError.set('Enter a valid amount.'); return; }
    if (!this.txForm.date)               { this.txError.set('Pick a date.'); return; }
    this.txError.set('');
    this.saving.set(true);
    this.acctSvc.addTransaction({
      accountId:   this.accountId,
      direction:   this.txForm.direction,
      amount:      amt,
      date:        this.txForm.date,
      description: this.txForm.description.trim(),
      notes:       this.txForm.notes,
    }).subscribe({
      next: () => {
        this.txForm.description = '';
        this.txForm.amount      = '';
        this.txForm.notes       = '';
        this.txForm.date        = new Date().toISOString().slice(0, 10);
        this.saving.set(false);
      },
      error: () => { this.txError.set('Failed to save. Try again.'); this.saving.set(false); },
    });
  }

  deleteTx(id: string) { this.acctSvc.deleteTransaction(id).subscribe(); }
}
