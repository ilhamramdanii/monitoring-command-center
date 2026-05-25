import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  errorMessage = '';
  isLoading = false;

  constructor(
    private readonly fb: FormBuilder,
    private readonly auth: AuthService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  get usernameControl() { return this.loginForm.get('username'); }
  get passwordControl() { return this.loginForm.get('password'); }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }
    this.errorMessage = '';
    this.isLoading = true;
    const { username, password } = this.loginForm.value;
    setTimeout(() => {
      const success = this.auth.login(username, password);
      this.isLoading = false;
      if (success) {
        this.router.navigate(['/']);
      } else {
        this.errorMessage = 'Invalid credentials. Please try again.';
      }
    }, 400);
  }
}
