import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private readonly auth: AuthService) {}

  /**
   * Intercept:
   * Menangkap setiap request HTTP keluar dan menyisipkan Bearer Token otomatis ke header.
   * Ini memastikan semua request ke API terautentikasi tanpa harus manual di setiap service.
   */
  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = this.auth.getToken();
    if (!token) return next.handle(req);
    
    // Request bersifat immutable, jadi kita gunakan clone() untuk memodifikasinya.
    return next.handle(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
  }
}
