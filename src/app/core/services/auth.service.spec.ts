import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: '**', redirectTo: '' }])],
    });
    service = TestBed.inject(AuthService);
    sessionStorage.clear();
  });

  afterEach(() => sessionStorage.clear());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return false when not authenticated', () => {
    expect(service.isAuthenticated()).toBe(false);
  });

  it('should authenticate with valid credentials', () => {
    const result = service.login('admin', 'admin123');
    expect(result).toBe(true);
    expect(service.isAuthenticated()).toBe(true);
  });

  it('should reject invalid credentials', () => {
    const result = service.login('admin', 'wrongpassword');
    expect(result).toBe(false);
    expect(service.isAuthenticated()).toBe(false);
  });

  it('should store a token on successful login', () => {
    service.login('admin', 'admin123');
    expect(service.getToken()).toBeTruthy();
  });

  it('should clear token on logout', () => {
    service.login('admin', 'admin123');
    service.logout();
    expect(service.getToken()).toBeNull();
  });
});
