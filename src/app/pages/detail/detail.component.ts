import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, combineLatest, of } from 'rxjs';
import { catchError, filter, map, switchMap } from 'rxjs/operators';
import { MonitoringService } from '../../core/services/monitoring.service';
import { DateUtilService } from '../../shared/utils/date-util.service';
import { LogEntryDto as LogEntry, ServiceItemDto as ServiceItem } from '../../shared/dtos/service-item.dto';

@Component({
  selector: 'app-detail',
  standalone: false,
  templateUrl: './detail.component.html',
  styleUrls: ['./detail.component.scss'],
})
export class DetailComponent implements OnInit {
  service$!: Observable<ServiceItem | undefined>;
  logs$!: Observable<LogEntry[]>;
  logsError: string | null = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly monitoring: MonitoringService,
    public readonly dateUtil: DateUtilService,
  ) {}

  ngOnInit(): void {
    const id$ = this.route.paramMap.pipe(map(p => p.get('id') ?? ''));

    // service$ auto-updates because services$ is a BehaviorSubject refreshed every 15s
    this.service$ = id$.pipe(
      switchMap(id =>
        this.monitoring.services$.pipe(map(list => list.find(s => s.id === id)))
      )
    );

    // logs$ re-fetches on each poll cycle, keeping it in sync with service status updates
    this.logs$ = combineLatest([
      id$,
      this.monitoring.lastSyncAt$.pipe(filter(Boolean)),
    ]).pipe(
      switchMap(([id]) =>
        this.monitoring.getServiceLogs(id, 10).pipe(
          catchError(err => {
            this.logsError = err.message;
            return of([] as LogEntry[]);
          })
        )
      )
    );
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}
