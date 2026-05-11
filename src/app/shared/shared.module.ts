import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatusBadgeComponent } from './components/status-badge/status-badge.component';
import { ErrorBannerComponent } from './components/error-banner/error-banner.component';
import { SkeletonComponent } from './components/skeleton/skeleton.component';

@NgModule({
  declarations: [StatusBadgeComponent, ErrorBannerComponent, SkeletonComponent],
  imports: [CommonModule],
  exports: [StatusBadgeComponent, ErrorBannerComponent, SkeletonComponent],
})
export class SharedModule {}
