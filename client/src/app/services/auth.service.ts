import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';

export interface User { id: string; email: string; name: string; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly API = '/api/auth';
  readonly user = signal<User | null>(this.loadUser());

  constructor(private http: HttpClient, private router: Router) {}

  register(name: string, email: string, password: string) {
    return this.http.post<{ token: string; user: User }>(`${this.API}/register`, { name, email, password })
      .pipe(tap(r => this.persist(r)));
  }

  login(email: string, password: string) {
    return this.http.post<{ token: string; user: User }>(`${this.API}/login`, { email, password })
      .pipe(tap(r => this.persist(r)));
  }

  logout() {
    localStorage.removeItem('ft_token');
    localStorage.removeItem('ft_user');
    this.user.set(null);
    this.router.navigate(['/auth']);
  }

  getToken() { return localStorage.getItem('ft_token'); }
  isLoggedIn() { return !!this.getToken(); }

  private persist(r: { token: string; user: User }) {
    localStorage.setItem('ft_token', r.token);
    localStorage.setItem('ft_user', JSON.stringify(r.user));
    this.user.set(r.user);
  }

  private loadUser(): User | null {
    const raw = localStorage.getItem('ft_user');
    return raw ? JSON.parse(raw) : null;
  }
}
