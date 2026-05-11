import { TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { App } from './app';
import { SidebarService } from './core/services/sidebar.service';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterModule.forRoot([])],
      declarations: [App],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should inject SidebarService', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance.sidebar).toBeTruthy();
  });
});

describe('SidebarService', () => {
  let service: SidebarService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SidebarService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should expose collapsed$ observable', () => {
    expect(service.collapsed$).toBeTruthy();
  });

  it('should toggle collapsed state on each call', () => {
    const states: boolean[] = [];
    service.collapsed$.subscribe(v => states.push(v));
    service.toggle();
    service.toggle();
    expect(states).toEqual([false, true, false]);
  });
});
