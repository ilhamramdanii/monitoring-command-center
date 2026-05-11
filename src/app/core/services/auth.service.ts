import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

const TOKEN_KEY = 'mcc_auth_token';
const DEMO_CREDENTIALS = { username: 'admin', password: 'admin123' };

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private readonly router: Router) {}

  login(username: string, password: string): boolean {
    if (username === DEMO_CREDENTIALS.username && password === DEMO_CREDENTIALS.password) {
      sessionStorage.setItem(TOKEN_KEY, btoa(`${username}:${Date.now()}`));
      return true;
    }
    return false;
  }

  logout(): void {
    sessionStorage.removeItem(TOKEN_KEY);
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    return !!sessionStorage.getItem(TOKEN_KEY);
  }

  getToken(): string | null {
    return sessionStorage.getItem(TOKEN_KEY);
  }
}
