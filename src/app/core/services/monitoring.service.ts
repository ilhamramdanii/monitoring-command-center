import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, EMPTY, Observable, Subject, timer } from 'rxjs';
import { catchError, finalize, switchMap, takeUntil, tap } from 'rxjs/operators';
import { LogEntryDto as LogEntry, ServiceItemDto as ServiceItem } from '../../shared/dtos/service-item.dto';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MonitoringService implements OnDestroy {
  private readonly API = environment.apiUrl;
  // private readonly POLL_INTERVAL = 15_000;
  private readonly POLL_INTERVAL = 15_000;
  private readonly destroy$ = new Subject<void>();
  // Set to true after the first attempt (success OR failure) so skeleton never
  // re-appears on subsequent polls — stale data stays visible during errors.
  private firstAttemptDone = false;

  // BehaviorSubject: Single Source of Truth untuk state aplikasi. 
  // Menyimpan nilai terakhir agar subscriber baru langsung mendapatkan data tanpa menunggu stream berikutnya.
  readonly services$ = new BehaviorSubject<ServiceItem[]>([]);
  readonly error$ = new BehaviorSubject<string | null>(null);
  readonly isInitialLoading$ = new BehaviorSubject<boolean>(true);
  readonly isRefreshing$ = new BehaviorSubject<boolean>(false);
  readonly lastSyncAt$ = new BehaviorSubject<Date | null>(null);

  constructor(private readonly http: HttpClient) {
    this.startPolling();
  }

  /**
   * Logika Smart Polling:
   * Menggunakan timer untuk eksekusi berkala dan switchMap untuk keamanan asinkron.
   */
  private startPolling(): void {
    timer(0, this.POLL_INTERVAL)
      .pipe(
        // switchMap: Jika request sebelumnya belum selesai tapi waktu polling berikutnya tiba,
        // request lama akan dibatalkan (canceled) dan request baru dimulai. Mencegah race condition.
        switchMap(() => this.fetchServices()), 
        takeUntil(this.destroy$) // Menghindari memory leak saat service dihancurkan.
      )
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
        // Stale-While-Revalidate: Jika API error, kita tetap memancarkan data lama (stale)
        // agar UI tidak kosong/blank, meningkatkan User Experience.
        const stale = this.services$.getValue();
        if (stale.length > 0) this.services$.next([...stale]);
        return EMPTY;
      }),
      finalize(() => {
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
