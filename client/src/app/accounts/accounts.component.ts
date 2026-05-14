import { Component, computed, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AccountService, Account, AccountType, ACCOUNT_META } from '../services/account.service';

const TYPE_ORDER: AccountType[] = ['savings', 'checking', 'credit', 'loan', 'debt'];

@Component({
  selector: 'app-accounts',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <div class="page-title">Accounts</div>
          <div class="page-sub">Track all your balances in one place</div>
        </div>
        <button class="btn btn-ghost" (click)="showForm.set(!showForm())">
          {{ showForm() ? '✕ Cancel' : '+ Add Account' }}
        </button>
      </div>

      <!-- Add account form -->
      @if (showForm()) {
        <div class="card add-form">
          <div class="add-form-title">New Account</div>
          @if (formError()) {
            <div class="alert alert-error" style="margin-bottom:12px">{{ formError() }}</div>
          }
          <div class="add-form-grid">
            <div class="field">
              <label>Account Name</label>
              <input type="text" [(ngModel)]="form.name" placeholder='e.g. Chase Checking, Visa Sapphire' />
            </div>
            <div class="field">
              <label>Type</label>
              <select [(ngModel)]="form.type">
                @for (t of accountTypes; track t.key) {
                  <option [value]="t.key">{{ t.icon }} {{ t.label }}</option>
                }
              </select>
            </div>
            <div class="field">
              <label>
                {{ isAsset(form.type) ? 'Current Balance ($)' : 'Current Balance Owed ($)' }}
              </label>
              <input type="number" [(ngModel)]="form.openingBalance"
                     placeholder="0.00" min="0" step="0.01" />
            </div>
            <div class="field">
              <label>Notes <span class="hint">(optional)</span></label>
              <input type="text" [(ngModel)]="form.notes" placeholder="e.g. Joint account" />
            </div>
            <div class="field span2">
              <button class="btn btn-primary" (click)="addAccount()" [disabled]="saving()">
                @if (saving()) { <span class="spinner"></span> } @else { Create Account }
              </button>
            </div>
          </div>
        </div>
      }

      @if (loading()) {
        <div class="loading-state"><span class="spinner"></span> Loading accounts…</div>
      } @else {

        <!-- Net worth banner -->
        <div class="net-worth-banner">
          <div class="nw-item assets">
            <div class="nw-label">Total Assets</div>
            <div class="nw-value">{{ totalAssets() | currency }}</div>
          </div>
          <div class="nw-divider">−</div>
          <div class="nw-item liabilities">
            <div class="nw-label">Total Owed</div>
            <div class="nw-value">{{ totalLiabilities() | currency }}</div>
          </div>
          <div class="nw-divider">=</div>
          <div class="nw-item net" [class.pos]="netWorth() >= 0" [class.neg]="netWorth() < 0">
            <div class="nw-label">Net Worth</div>
            <div class="nw-value">{{ netWorth() | currency }}</div>
          </div>
        </div>

        @if (accounts().length === 0) {
          <div class="empty-state">
            <strong>No accounts yet</strong>
            Click "Add Account" to create your first account.
          </div>
        } @else {
          <!-- Accounts by type group -->
          @for (group of accountGroups(); track group.label) {
            <div class="group-section">
              <div class="group-label">{{ group.label }}</div>
              <div class="accounts-grid">
                @for (acct of group.accounts; track acct._id) {
                  <a class="acct-card card" [routerLink]="['/accounts', acct._id]">
                    <div class="acct-top">
                      <div class="acct-icon">{{ meta(acct.type).icon }}</div>
                      <div class="acct-info">
                        <div class="acct-name">{{ acct.name }}</div>
                        <div class="acct-type">{{ meta(acct.type).label }}</div>
                      </div>
                      <div class="acct-bal-wrap">
                        <div class="acct-bal"
                             [class.asset-pos]=" meta(acct.type).isAsset && balance(acct) >= 0"
                             [class.asset-neg]=" meta(acct.type).isAsset && balance(acct) < 0"
                             [class.liab-pos]="!meta(acct.type).isAsset && balance(acct) > 0"
                             [class.liab-zero]="!meta(acct.type).isAsset && balance(acct) <= 0">
                          {{ balance(acct) | currency }}
                        </div>
                        <div class="acct-bal-label">
                          {{ meta(acct.type).isAsset ? 'available' : (balance(acct) > 0 ? 'owed' : 'paid off') }}
                        </div>
                      </div>
                    </div>
                    @if (acct.notes) {
                      <div class="acct-notes">{{ acct.notes }}</div>
                    }
                    <div class="acct-footer">
                      <span class="acct-link">View transactions →</span>
                      <button class="btn-icon del" (click)="deleteAccount($event, acct._id)">Delete</button>
                    </div>
                  </a>
                }
              </div>
            </div>
          }
        }
      }
    </div>
  `,
  styles: [`
    .page-header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:24px; }

    .add-form { margin-bottom:24px; }
    .add-form-title { font-size:.95rem; font-weight:600; margin-bottom:16px; }
    .add-form-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    .add-form-grid .span2 { grid-column:1/-1; }
    .hint { color:var(--muted); font-size:.72rem; font-weight:400; text-transform:none; }

    .net-worth-banner {
      display:flex; align-items:center; justify-content:center;
      gap:20px; background:var(--surface); border:1px solid var(--border);
      border-radius:var(--r); padding:20px 32px; margin-bottom:28px;
      flex-wrap:wrap;
    }
    .nw-item { text-align:center; min-width:100px; }
    .nw-label { font-size:.72rem; text-transform:uppercase; letter-spacing:.08em; color:var(--muted); }
    .nw-value { font-size:1.5rem; font-weight:800; margin-top:4px; }
    .nw-item.assets      .nw-value { color:var(--green); }
    .nw-item.liabilities .nw-value { color:var(--red); }
    .nw-item.net.pos .nw-value { color:var(--blue); }
    .nw-item.net.neg .nw-value { color:var(--red); }
    .nw-divider { font-size:1.8rem; color:var(--border); font-weight:300; }

    .group-section { margin-bottom:24px; }
    .group-label { font-size:.72rem; font-weight:700; text-transform:uppercase; letter-spacing:.1em; color:var(--muted); margin-bottom:12px; padding-bottom:6px; border-bottom:1px solid var(--border); }

    .accounts-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }
    .acct-card { display:flex; flex-direction:column; gap:10px; padding:18px 20px; text-decoration:none; color:inherit; cursor:pointer; transition:border-color .15s, filter .15s; }
    .acct-card:hover { border-color:var(--accent); filter:brightness(1.08); }

    .acct-top { display:flex; align-items:center; gap:12px; }
    .acct-icon { font-size:1.6rem; flex-shrink:0; width:40px; text-align:center; }
    .acct-info { flex:1; min-width:0; }
    .acct-name { font-size:.95rem; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .acct-type { font-size:.72rem; color:var(--muted); margin-top:2px; }

    .acct-bal-wrap { text-align:right; flex-shrink:0; }
    .acct-bal { font-size:1.15rem; font-weight:800; }
    .acct-bal.asset-pos  { color:var(--green); }
    .acct-bal.asset-neg  { color:var(--red); }
    .acct-bal.liab-pos   { color:var(--red); }
    .acct-bal.liab-zero  { color:var(--green); }
    .acct-bal-label { font-size:.68rem; color:var(--muted); margin-top:1px; }

    .acct-notes { font-size:.75rem; color:var(--muted); }
    .acct-footer { display:flex; align-items:center; justify-content:space-between; margin-top:2px; }
    .acct-link { font-size:.75rem; color:var(--accent); }

    .btn-icon { background:none; border:none; border-radius:6px; color:var(--muted); cursor:pointer; font-size:.72rem; padding:4px 8px; transition:all .15s; }
    .btn-icon.del:hover { color:var(--red); background:#2a1212; }

    .loading-state { color:var(--muted); padding:60px; text-align:center; }
    .empty-state { background:var(--surface); border:1px dashed var(--border); border-radius:var(--r); color:var(--muted); font-size:.875rem; padding:48px; text-align:center; }
    .empty-state strong { display:block; font-size:1rem; color:var(--text); margin-bottom:6px; }

    @media (max-width:900px) { .accounts-grid { grid-template-columns:repeat(2,1fr); } }
    @media (max-width:560px) {
      .accounts-grid { grid-template-columns:1fr; }
      .add-form-grid { grid-template-columns:1fr; }
      .add-form-grid .span2 { grid-column:1; }
      .net-worth-banner { gap:12px; padding:16px; }
    }
  `]
})
export class AccountsComponent implements OnInit {
  loading = signal(true);
  saving  = signal(false);
  showForm = signal(false);
  formError = signal('');

  form = { name: '', type: 'checking' as AccountType, openingBalance: '', notes: '' };

  readonly accountTypes = Object.entries(ACCOUNT_META).map(([key, v]) => ({ key: key as AccountType, ...v }));

  constructor(readonly acctSvc: AccountService) {}

  ngOnInit() {
    let done = 0;
    const fin = () => { if (++done === 2) this.loading.set(false); };
    this.acctSvc.loadAccounts().subscribe({ complete: fin, error: fin });
    this.acctSvc.loadAllTransactions().subscribe({ complete: fin, error: fin });
  }

  accounts  = computed(() => this.acctSvc.accounts());
  balance   = (a: Account) => this.acctSvc.balance(a);
  meta      = (t: AccountType) => ACCOUNT_META[t];
  isAsset   = (t: AccountType) => ACCOUNT_META[t].isAsset;
  totalAssets      = computed(() => this.acctSvc.totalAssets());
  totalLiabilities = computed(() => this.acctSvc.totalLiabilities());
  netWorth  = computed(() => this.totalAssets() - this.totalLiabilities());

  accountGroups = computed(() => {
    const groups: { label: string; accounts: Account[] }[] = [
      { label: '🏦 Assets — Savings & Checking', accounts: this.accounts().filter(a => ACCOUNT_META[a.type].isAsset) },
      { label: '💳 Liabilities — Cards, Loans & Debt', accounts: this.accounts().filter(a => !ACCOUNT_META[a.type].isAsset) },
    ];
    return groups.filter(g => g.accounts.length > 0);
  });

  addAccount() {
    if (!this.form.name.trim()) { this.formError.set('Account name is required.'); return; }
    this.formError.set('');
    this.saving.set(true);
    this.acctSvc.addAccount({
      name: this.form.name,
      type: this.form.type,
      openingBalance: parseFloat(this.form.openingBalance) || 0,
      notes: this.form.notes,
    }).subscribe({
      next: () => {
        this.form = { name: '', type: 'checking', openingBalance: '', notes: '' };
        this.showForm.set(false);
        this.saving.set(false);
      },
      error: () => { this.formError.set('Failed to create account.'); this.saving.set(false); },
    });
  }

  deleteAccount(e: Event, id: string) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Delete this account and all its transactions?')) return;
    this.acctSvc.deleteAccount(id).subscribe();
  }
}
