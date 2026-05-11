import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { SidebarService } from './core/services/sidebar.service';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  standalone: false,
  styleUrl: './app.scss',
})
export class App {
  constructor(
    public readonly sidebar: SidebarService,
    private readonly router: Router,
    private readonly auth: AuthService,
  ) {}

  // Synchronous getter — evaluated on every CD cycle, no observable timing gap.
  // Prevents sidebar flash: returns false before auth guard fires its first redirect.
  get showSidebar(): boolean {
    return this.auth.isAuthenticated() && !this.router.url.startsWith('/login');
  }
}
