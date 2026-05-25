import { Component, Input } from '@angular/core';
import { DateUtilService } from '../../utils/date-util.service';

@Component({
  selector: 'app-error-banner',
  standalone: false,
  template: `
    <div class="error-banner" *ngIf="message" role="alert" aria-live="assertive">
      <div class="error-banner__left">
        <span class="error-banner__icon" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 1.5L14.5 13.5H1.5L8 1.5Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
            <path d="M8 6v3.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
            <circle cx="8" cy="11.5" r="0.6" fill="currentColor"/>
          </svg>
        </span>
      </div>
      <div class="error-banner__body">
        <span class="error-banner__message">{{ message }}</span>
        <span class="error-banner__stale" *ngIf="lastSyncAt">
          Menampilkan data terakhir dari pukul {{ dateUtil.formatDate(lastSyncAt!) }}
          &mdash; sistem akan pulih otomatis
        </span>
        <span class="error-banner__stale error-banner__stale--nodata" *ngIf="!lastSyncAt">
          Belum ada data yang berhasil dimuat &mdash; menunggu koneksi...
        </span>
      </div>
      <div class="error-banner__pulse" aria-hidden="true"></div>
    </div>
  `,
  styleUrls: ['./error-banner.component.scss'],
})
export class ErrorBannerComponent {
  @Input() message: string | null = null;
  @Input() lastSyncAt: Date | null = null;

  constructor(public readonly dateUtil: DateUtilService) {}
}
