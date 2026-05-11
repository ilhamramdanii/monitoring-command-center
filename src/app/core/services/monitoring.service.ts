import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, EMPTY, Observable, Subject, timer } from 'rxjs';
import { catchError, finalize, switchMap, takeUntil, tap } from 'rxjs/operators';
import { LogEntry, ServiceItem } from '../models/service-item.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MonitoringService implements OnDestroy {
  private readonly API = environment.apiUrl;
  private readonly POLL_INTERVAL = 15_000;
  private readonly destroy$ = new Subject<void>();
  // Set to true after the first attempt (success OR failure) so skeleton never
  // re-appears on subsequent polls — stale data stays visible during errors.
  private firstAttemptDone = false;

  readonly services$ = new BehaviorSubject<ServiceItem[]>([]);
  readonly error$ = new BehaviorSubject<string | null>(null);
  readonly isInitialLoading$ = new BehaviorSubject<boolean>(true);
  readonly isRefreshing$ = new BehaviorSubject<boolean>(false);
  readonly lastSyncAt$ = new BehaviorSubject<Date | null>(null);

  constructor(private readonly http: HttpClient) {
    this.startPolling();
  }

  private startPolling(): void {
    timer(0, this.POLL_INTERVAL)
      .pipe(switchMap(() => this.fetchServices()), takeUntil(this.destroy$))
      .subscribe();
  }

  private fetchServices(): Observable<ServiceItem[]> {
    if (!this.firstAttemptDone) {
      this.isInitialLoading$.next(true);
    } else {
      this.isRefreshing$.next(true);
    }

    return this.http.get<ServiceItem[]>(`${this.API}/api/services`).pipe(
      tap(data => {
        this.services$.next(data);
        this.error$.next(null);
        this.lastSyncAt$.next(new Date());
      }),
      catchError(err => {
        this.error$.next(err.message);
        // Re-emit stale data so existing cards stay rendered
        const stale = this.services$.getValue();
        if (stale.length > 0) this.services$.next([...stale]);
        return EMPTY;
      }),
      finalize(() => {
        // Mark first attempt done regardless of success/failure — skeleton
        // never shows again after this point; stale data or empty state persists.
        this.firstAttemptDone = true;
        this.isInitialLoading$.next(false);
        this.isRefreshing$.next(false);
      })
    );
  }

  refresh(): void {
    this.fetchServices().subscribe();
  }

  getServiceById(id: string): Observable<ServiceItem> {
    return this.http.get<ServiceItem>(`${this.API}/api/services/${id}`);
  }

  getServiceLogs(id: string, limit = 10): Observable<LogEntry[]> {
    return this.http.get<LogEntry[]>(`${this.API}/api/services/${id}/logs?limit=${limit}`);
  }

  getAllLogs(limit = 12): Observable<LogEntry[]> {
    return this.http.get<LogEntry[]>(`${this.API}/api/logs?limit=${limit}`);
  }

  simulateError(code: 500 | 404 | 'reset'): Observable<unknown> {
    return this.http.get(`${this.API}/api/services?simulate=${code}`);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
