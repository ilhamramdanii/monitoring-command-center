import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { BehaviorSubject, Observable, Subscription, combineLatest, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { ChartConfiguration, ChartData } from 'chart.js';
import { MonitoringService } from '../../core/services/monitoring.service';
import { SidebarService } from '../../core/services/sidebar.service';
import { AuthService } from '../../core/services/auth.service';
import { DateUtilService } from '../../shared/utils/date-util.service';
import { ActivityItemDto as ActivityItem, LogEntryDto as LogEntry, ServiceCategory, ServiceItemDto as ServiceItem, ServiceStatus } from '../../shared/dtos/service-item.dto';

type SortField = 'name' | 'status' | 'version' | 'lastHeartbeat';
type SortDir = 'asc' | 'desc';
type HealthStatus = 'operational' | 'degraded' | 'critical';
type ChartRange = '5m' | '15m' | '1h' | '5h' | '1d';

interface Summary { up: number; down: number; warning: number; total: number; }

/**
 * STATUS_RANK: Menentukan urutan prioritas tampilan.
 * DOWN (0) muncul paling atas, diikuti WARNING (1), lalu UP (2).
 * Ini krusial bagi operator Command Center untuk melihat masalah terlebih dahulu.
 */
const STATUS_RANK: Record<ServiceStatus, number> = { DOWN: 0, WARNING: 1, UP: 2 };
const CATEGORIES: Array<ServiceCategory | 'All'> = ['All', 'Core', 'Integration', 'Infrastructure', 'Data'];
const HISTORY_POINTS = 30;
const CHART_COLORS = {
  up:      { line: '#00C896', fill: 'rgba(0,200,150,0.18)' },
  down:    { line: '#E03C3C', fill: 'rgba(224,60,60,0.14)' },
  warning: { line: '#F5A623', fill: 'rgba(245,166,35,0.12)' },
} as const;

@Component({
  selector: 'app-dashboard',
  standalone: false,
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit, OnDestroy {
  readonly categories = CATEGORIES;
  readonly RING_RADIUS = 10;
  readonly RING_CIRCUMFERENCE = +(2 * Math.PI * this.RING_RADIUS).toFixed(2);
  readonly ACTIVITY_PREVIEW = 5;

  services$!: Observable<ServiceItem[]>;
  error$!: Observable<string | null>;
  isInitialLoading$!: Observable<boolean>;
  isRefreshing$!: Observable<boolean>;
  summary$!: Observable<Summary>;
  filteredServices$!: Observable<ServiceItem[]>;
  healthStatus$!: Observable<HealthStatus>;
  activityFeed$!: Observable<ActivityItem[]>;
  displayedFeed$!: Observable<ActivityItem[]>;
  totalFeedCount$!: Observable<number>;

  viewMode: 'grid' | 'list' = 'grid';
  chartRange: ChartRange = '15m';
  currentTime = '';
  showAllActivity = false;
  ringAnimating = false;

  get chartRangeLabel(): string {
    const labels: Record<ChartRange, string> = {
      '5m': 'last 5 minutes', '15m': 'last 15 minutes', '1h': 'last 1 hour', '5h': 'last 5 hours', '1d': 'last 24 hours',
    };
    return labels[this.chartRange];
  }

  /* ── Chart ────────────────────────────────────────────── */
  readonly chartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 400 },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: {
          color: '#7A9FBD',
          boxWidth: 12,
          boxHeight: 2,
          padding: 20,
          font: { size: 11, family: "'JetBrains Mono', monospace" },
        },
      },
      tooltip: {
        backgroundColor: '#0F1D30',
        borderColor: '#1A2E45',
        borderWidth: 1,
        titleColor: '#D8E8F2',
        bodyColor: '#7A9FBD',
        padding: 10,
      },
    },
    scales: {
      x: {
        ticks: { color: '#3D5A73', font: { size: 10, family: "'JetBrains Mono', monospace" }, maxTicksLimit: 8 },
        grid: { color: 'rgba(26,46,69,0.5)' },
        border: { color: '#1A2E45' },
      },
      y: {
        min: 0,
        max: 100,
        ticks: {
          color: '#3D5A73',
          font: { size: 10, family: "'JetBrains Mono', monospace" },
          callback: (v) => `${v}%`,
          stepSize: 25,
        },
        grid: {
          color: (ctx: { tick: { value: number } }) =>
            ctx.tick.value % 50 === 0 ? 'rgba(26,46,69,0.9)' : 'rgba(26,46,69,0.4)',
          lineWidth: (ctx: { tick: { value: number } }) =>
            ctx.tick.value % 50 === 0 ? 1.2 : 0.6,
        },
        border: { color: '#1A2E45' },
      },
    },
  };

  chartData: ChartData<'line'> = {
    labels: [],
    datasets: [
      {
        label: 'Uptime %',
        data: [],
        borderColor: CHART_COLORS.up.line,
        backgroundColor: CHART_COLORS.up.fill,
        pointBackgroundColor: CHART_COLORS.up.line,
        pointBorderColor: CHART_COLORS.up.line,
        pointRadius: 2,
        pointHoverRadius: 6,
        borderWidth: 2.5,
        fill: true,
        tension: 0.35,
      },
      {
        label: 'Error Rate %',
        data: [],
        borderColor: CHART_COLORS.down.line,
        backgroundColor: CHART_COLORS.down.fill,
        pointBackgroundColor: CHART_COLORS.down.line,
        pointBorderColor: CHART_COLORS.down.line,
        pointRadius: 2,
        pointHoverRadius: 6,
        borderWidth: 2.5,
        fill: true,
        tension: 0.35,
      },
      {
        label: 'Warning Rate %',
        data: [],
        borderColor: CHART_COLORS.warning.line,
        backgroundColor: CHART_COLORS.warning.fill,
        pointBackgroundColor: CHART_COLORS.warning.line,
        pointBorderColor: CHART_COLORS.warning.line,
        pointRadius: 2,
        pointHoverRadius: 6,
        borderWidth: 3,
        fill: true,
        tension: 0.35,
      },
    ],
  };

  private readonly sort$ = new BehaviorSubject<{ field: SortField; dir: SortDir }>({ field: 'status', dir: 'asc' });
  private readonly search$ = new BehaviorSubject<string>('');
  private readonly categoryFilter$ = new BehaviorSubject<string>('All');
  private readonly activityLimit$ = new BehaviorSubject<number>(this.ACTIVITY_PREVIEW);
  private clockInterval: ReturnType<typeof setInterval> | null = null;
  private chartSub: Subscription | null = null;
  private syncSub: Subscription | null = null;

  get sortField(): SortField { return this.sort$.value.field; }
  get sortDir(): SortDir { return this.sort$.value.dir; }
  get activeCategory(): string { return this.categoryFilter$.value; }

  constructor(
    public readonly monitoring: MonitoringService,
    public readonly sidebar: SidebarService,
    public readonly auth: AuthService,
    public readonly dateUtil: DateUtilService,
  ) {}

  @HostListener('document:keydown.escape')
  onEscape(): void { /* reserved for future modal/panel use */ }

  ngOnInit(): void {
    this.services$ = this.monitoring.services$;
    this.error$ = this.monitoring.error$;
    this.isInitialLoading$ = this.monitoring.isInitialLoading$;
    this.isRefreshing$ = this.monitoring.isRefreshing$;

    this.summary$ = this.services$.pipe(
      map(services => ({
        total: services.length,
        up: services.filter(s => s.status === 'UP').length,
        down: services.filter(s => s.status === 'DOWN').length,
        warning: services.filter(s => s.status === 'WARNING').length,
      }))
    );

    this.healthStatus$ = this.summary$.pipe(
      map(s => {
        if (s.down > 0) return 'critical';
        if (s.warning > 0) return 'degraded';
        return 'operational';
      })
    );

    const sorted$ = combineLatest([this.services$, this.sort$]).pipe(
      map(([services, sort]) => this.sortServices(services, sort.field, sort.dir))
    );

    this.filteredServices$ = combineLatest([sorted$, this.search$, this.categoryFilter$]).pipe(
      map(([services, search, category]) =>
        services
          .filter(s => category === 'All' || s.type === category)
          .filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()))
      )
    );

    // Piggyback on the service poll cycle so logs stay in sync with services
    this.activityFeed$ = combineLatest([
      this.monitoring.lastSyncAt$.pipe(
        switchMap(() => this.monitoring.getAllLogs(12).pipe(catchError(() => of([] as LogEntry[]))))
      ),
      this.monitoring.services$,
    ]).pipe(
      map(([logs, services]) => {
        const nameMap = new Map(services.map(s => [s.id, s.name]));
        return logs.map(log => ({ ...log, serviceName: nameMap.get(log.serviceId) ?? log.serviceId }));
      })
    );

    this.totalFeedCount$ = this.activityFeed$.pipe(map(f => f.length));

    this.displayedFeed$ = combineLatest([this.activityFeed$, this.activityLimit$]).pipe(
      map(([feed, limit]) => feed.slice(0, limit))
    );

    this.initChartHistory();

    this.updateClock();
    this.clockInterval = setInterval(() => this.updateClock(), 1000);

    // Restart CSS ring animation on each successful sync — no JS timing involved
    this.syncSub = this.monitoring.lastSyncAt$.subscribe(() => {
      this.ringAnimating = false;
      setTimeout(() => (this.ringAnimating = true), 0);
    });

    this.chartSub = this.summary$.subscribe(s => {
      if (s.total === 0) return;
      this.pushChartPoint(s);
    });
  }

  ngOnDestroy(): void {
    if (this.clockInterval) clearInterval(this.clockInterval);
    this.chartSub?.unsubscribe();
    this.syncSub?.unsubscribe();
  }

  /**
   * Algoritma "Random Walk":
   * Menghasilkan data simulasi yang terlihat realistis untuk keperluan demonstrasi/prototype.
   * Menggunakan bias (0.44) agar tren grafik cenderung stabil atau naik secara natural.
   */
  private initChartHistory(): void {
    const now = Date.now();
    const labels: string[] = [];
    const uptimePcts: number[] = [];
    const errorPcts: number[] = [];
    const warningPcts: number[] = [];

    const rangeMs: Record<ChartRange, number> = {
      '5m': 5 * 60_000, '15m': 15 * 60_000, '1h': 60 * 60_000, '5h': 5 * 60 * 60_000, '1d': 24 * 60 * 60_000,
    };
    const interval = rangeMs[this.chartRange] / HISTORY_POINTS;
    const timeOpts: Intl.DateTimeFormatOptions = interval < 60_000
      ? { hour: '2-digit', minute: '2-digit', second: '2-digit' }
      : { hour: '2-digit', minute: '2-digit' };

    // Proses Random Walk
    let upWalk = 82, downWalk = 5;
    for (let i = HISTORY_POINTS - 1; i >= 0; i--) {
      const t = new Date(now - i * interval);
      labels.push(t.toLocaleTimeString('en-GB', timeOpts));
      
      // Kalkulasi perubahan acak yang dibatasi (clamping)
      upWalk   = Math.max(55, Math.min(96, upWalk   + (Math.random() - 0.44) * 7));
      downWalk = Math.max(0,  Math.min(18, downWalk + (Math.random() - 0.5)  * 3));
      
      const up   = Math.round(upWalk);
      const down = Math.round(downWalk);
      const warn = Math.max(0, Math.min(100 - up - down, Math.round(Math.random() * 12)));
      
      uptimePcts.push(up);
      errorPcts.push(down);
      warningPcts.push(warn);
    }

    this.chartData = {
      ...this.chartData,
      labels,
      datasets: [
        { ...this.chartData.datasets[0], data: uptimePcts },
        { ...this.chartData.datasets[1], data: errorPcts },
        { ...this.chartData.datasets[2], data: warningPcts },
      ],
    };
  }

  private pushChartPoint(s: Summary): void {
    if (s.total === 0) return;
    const label = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const upPct = Math.round((s.up / s.total) * 100);
    const downPct = Math.round((s.down / s.total) * 100);
    const warnPct = Math.round((s.warning / s.total) * 100);

    const labels = [...(this.chartData.labels as string[]), label].slice(-HISTORY_POINTS);
    const datasets = this.chartData.datasets.map((ds, i) => ({
      ...ds,
      data: [...(ds.data as number[]), [upPct, downPct, warnPct][i]].slice(-HISTORY_POINTS),
    }));

    this.chartData = { ...this.chartData, labels, datasets };
  }

  setView(mode: 'grid' | 'list'): void { this.viewMode = mode; }
  setChartRange(range: ChartRange): void { this.chartRange = range; this.initChartHistory(); }
  setSearch(value: string): void { this.search$.next(value); }
  setCategoryFilter(cat: string): void { this.categoryFilter$.next(cat); }

  toggleAllActivity(): void {
    this.showAllActivity = !this.showAllActivity;
    this.activityLimit$.next(this.showAllActivity ? 999 : this.ACTIVITY_PREVIEW);
  }

  sortBy(field: SortField): void {
    const current = this.sort$.value;
    this.sort$.next({ field, dir: current.field === field && current.dir === 'asc' ? 'desc' : 'asc' });
  }

  private sortServices(services: ServiceItem[], field: SortField, dir: SortDir): ServiceItem[] {
    return [...services].sort((a, b) => {
      let cmp = 0;
      if (field === 'status') cmp = STATUS_RANK[a.status] - STATUS_RANK[b.status];
      else if (field === 'lastHeartbeat') cmp = new Date(a.lastHeartbeat).getTime() - new Date(b.lastHeartbeat).getTime();
      else cmp = a[field].localeCompare(b[field]);
      return dir === 'asc' ? cmp : -cmp;
    });
  }

  /**
   * trackById (Performance Optimization):
   * Memberi tahu Angular cara mengidentifikasi item dalam list unik.
   * Mencegah render ulang seluruh elemen DOM jika hanya data di dalam item yang berubah.
   */
  trackById(_: number, item: ServiceItem): string { return item.id; }
  trackByLogId(_: number, item: ActivityItem): string { return item.id; }

  private updateClock(): void {
    this.currentTime = new Date().toLocaleTimeString('en-GB', {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  }

  getServiceMetric(id: string, metric: 'latency' | 'errRate'): string {
    const h = id.split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) & 0xffff, 0);
    if (metric === 'latency') return `${8 + (h % 174)}ms`;
    return `${((h * 7) % 28 / 10).toFixed(1)}%`;
  }
}
