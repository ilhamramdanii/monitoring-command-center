import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  username = '';
  password = '';
  errorMessage = '';
  isLoading = false;

  constructor(private readonly auth: AuthService, private readonly router: Router) {}

  onSubmit(): void {
    this.errorMessage = '';
    if (!this.username || !this.password) {
      this.errorMessage = 'Username and password are required.';
      return;
    }
    this.isLoading = true;
    setTimeout(() => {
      const success = this.auth.login(this.username, this.password);
      this.isLoading = false;
      if (success) {
        this.router.navigate(['/']);
      } else {
        this.errorMessage = 'Invalid credentials. Please try again.';
      }
    }, 400);
  }
}
