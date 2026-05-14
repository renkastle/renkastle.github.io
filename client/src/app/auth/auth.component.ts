import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="auth-wrap">
      <div class="auth-box card">
        <div class="brand">$ Finance Tracker</div>

        <div class="tabs">
          <button [class.active]="mode() === 'login'"    (click)="mode.set('login')">Sign In</button>
          <button [class.active]="mode() === 'register'" (click)="mode.set('register')">Create Account</button>
        </div>

        @if (error()) {
          <div class="alert alert-error">{{ error() }}</div>
        }

        <!-- Login -->
        @if (mode() === 'login') {
          <form (ngSubmit)="onLogin()">
            <div class="field">
              <label>Email</label>
              <input type="email" [(ngModel)]="email" name="email" placeholder="you@example.com" required />
            </div>
            <div class="field">
              <label>Password</label>
              <input type="password" [(ngModel)]="password" name="password" placeholder="••••••••" required />
            </div>
            <button type="submit" class="btn btn-primary" [disabled]="loading()">
              @if (loading()) { <span class="spinner"></span> } @else { Sign In }
            </button>
          </form>
        }

        <!-- Register -->
        @if (mode() === 'register') {
          <form (ngSubmit)="onRegister()">
            <div class="field">
              <label>Name</label>
              <input type="text" [(ngModel)]="name" name="name" placeholder="Your name" required />
            </div>
            <div class="field">
              <label>Email</label>
              <input type="email" [(ngModel)]="email" name="email" placeholder="you@example.com" required />
            </div>
            <div class="field">
              <label>Password <span class="hint">(min 6 chars)</span></label>
              <input type="password" [(ngModel)]="password" name="password" placeholder="••••••••" required />
            </div>
            <button type="submit" class="btn btn-primary" [disabled]="loading()">
              @if (loading()) { <span class="spinner"></span> } @else { Create Account }
            </button>
          </form>
        }
      </div>
    </div>
  `,
  styles: [`
    .auth-wrap {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .auth-box {
      width: 100%;
      max-width: 420px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .brand {
      font-size: 1.35rem;
      font-weight: 800;
      color: var(--accent);
      text-align: center;
      letter-spacing: -.3px;
    }
    .tabs {
      display: grid;
      grid-template-columns: 1fr 1fr;
      background: var(--surface2);
      border-radius: 10px;
      padding: 4px;
      gap: 4px;
    }
    .tabs button {
      background: none;
      border: none;
      border-radius: 8px;
      color: var(--muted);
      cursor: pointer;
      font-family: inherit;
      font-size: .9rem;
      font-weight: 600;
      padding: 9px;
      transition: all .15s;
    }
    .tabs button.active { background: var(--surface); color: var(--text); }
    form { display: flex; flex-direction: column; gap: 14px; }
    .hint { color: var(--muted); font-size: .75rem; text-transform: none; font-weight: 400; }
  `]
})
export class AuthComponent {
  mode    = signal<'login' | 'register'>('login');
  loading = signal(false);
  error   = signal('');

  name = ''; email = ''; password = '';

  constructor(private auth: AuthService, private router: Router) {}

  onLogin() {
    this.error.set('');
    this.loading.set(true);
    this.auth.login(this.email, this.password).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: err => { this.error.set(err.error?.error || 'Login failed'); this.loading.set(false); },
    });
  }

  onRegister() {
    this.error.set('');
    this.loading.set(true);
    this.auth.register(this.name, this.email, this.password).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: err => { this.error.set(err.error?.error || 'Registration failed'); this.loading.set(false); },
    });
  }
}
