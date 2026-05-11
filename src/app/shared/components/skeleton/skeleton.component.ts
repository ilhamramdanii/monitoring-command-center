import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-skeleton',
  standalone: false,
  template: `
    <div class="skeleton-card" *ngFor="let i of items">
      <div class="skeleton-line skeleton-line--title"></div>
      <div class="skeleton-line skeleton-line--sub"></div>
      <div class="skeleton-line skeleton-line--badge"></div>
    </div>
  `,
  styleUrls: ['./skeleton.component.scss'],
})
export class SkeletonComponent {
  @Input() count = 6;
  get items() { return Array(this.count); }
}
