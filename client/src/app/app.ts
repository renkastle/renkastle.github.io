import { Component, computed } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';
import { NavComponent } from './nav/nav.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavComponent],
  template: `
    @if (showNav()) { <app-nav /> }
    <router-outlet />
  `,
})
export class App {
  constructor(readonly auth: AuthService) {}
  showNav = computed(() => this.auth.isLoggedIn());
}
