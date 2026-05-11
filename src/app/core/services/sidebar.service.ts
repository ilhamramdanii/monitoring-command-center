import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SidebarService {
  private _collapsed$ = new BehaviorSubject<boolean>(false);
  readonly collapsed$ = this._collapsed$.asObservable();
  toggle(): void { this._collapsed$.next(!this._collapsed$.value); }
}
