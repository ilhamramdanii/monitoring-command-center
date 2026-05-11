import { Injectable } from '@angular/core';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Observable, throwError, timer } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(req).pipe(
      retry({
        count: 3,
        delay: (err: HttpErrorResponse, attempt: number) => {
          if (err.status === 500 && attempt < 3) {
            return timer(3_000);
          }
          return throwError(() => err);
        },
      }),
      catchError((err: HttpErrorResponse) => {
        let message: string;
        switch (err.status) {
          case 0:
            message = 'Cannot connect to server. Is the mock server running?';
            break;
          case 404:
            message = 'Service endpoint not found (404).';
            break;
          case 500:
            message = `Server error (500): ${err.statusText || 'Internal Server Error'}`;
            break;
          default:
            message = `Unexpected error (${err.status}): ${err.message}`;
        }
        return throwError(() => new Error(message));
      })
    );
  }
}
