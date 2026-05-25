import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

const TOKEN_KEY = 'mcc_auth_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private readonly router: Router) {}

  login(username: string, password: string): boolean {
    if (username === environment.demoUsername && password === environment.demoPassword) {
      sessionStorage.setItem(TOKEN_KEY, crypto.randomUUID());
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
