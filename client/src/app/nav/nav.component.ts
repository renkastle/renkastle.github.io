import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav>
      <a class="brand" routerLink="/budget">$ Finance Tracker</a>
      <div class="links">
        <a routerLink="/budget"  routerLinkActive="active">Monthly Budget</a>
        <a routerLink="/summary" routerLinkActive="active">Annual Summary</a>
      </div>
      <div class="user-area">
        <span class="name">{{ auth.user()?.name }}</span>
        <button class="btn-logout" (click)="auth.logout()">Sign Out</button>
      </div>
    </nav>
  `,
  styles: [`
    nav {
      align-items: center; background: var(--surface); border-bottom: 1px solid var(--border);
      display: flex; gap: 12px; height: 58px; padding: 0 28px;
      position: sticky; top: 0; z-index: 50;
    }
    .brand { color: var(--accent); font-size: 1.05rem; font-weight: 800; letter-spacing: -.3px; text-decoration: none; margin-right: 8px; }
    .links { display: flex; gap: 2px; flex: 1; }
    .links a { border-radius: 8px; color: var(--muted); font-size: .85rem; font-weight: 500; padding: 7px 13px; text-decoration: none; transition: all .15s; }
    .links a:hover { color: var(--text); background: var(--surface2); }
    .links a.active { color: var(--accent); background: #1e1a40; }
    .user-area { display: flex; align-items: center; gap: 12px; margin-left: auto; }
    .name { color: var(--muted); font-size: .83rem; }
    .btn-logout { background: none; border: 1px solid var(--border); border-radius: 7px; color: var(--muted); cursor: pointer; font-family: inherit; font-size: .8rem; padding: 6px 12px; transition: all .15s; }
    .btn-logout:hover { color: var(--red); border-color: var(--red); }
  `]
})
export class NavComponent {
  constructor(readonly auth: AuthService) {}
}
