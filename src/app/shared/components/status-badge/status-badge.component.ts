import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ServiceStatus } from '../../dtos/service-item.dto';

@Component({
  selector: 'app-status-badge',
  standalone: false,
  template: `
    <span class="badge" [ngClass]="'badge--' + status.toLowerCase()">
      <span class="badge__dot" [class.badge__dot--pulse]="status === 'DOWN'"></span>
      {{ status }}
    </span>
  `,
  styleUrls: ['./status-badge.component.scss'],
})
export class StatusBadgeComponent {
  @Input() status: ServiceStatus = 'UP';
}
