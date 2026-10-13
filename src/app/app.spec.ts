import { TestBed } from '@angular/core/testing';
import { Meta } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('marks non-production builds as noindex', () => {
    TestBed.createComponent(App);
    const robots = TestBed.inject(Meta).getTag('name="robots"');
    expect(robots?.content).toBe('noindex, nofollow');
  });

  it('shows the environment name in the footer outside production', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const env = (fixture.nativeElement as HTMLElement).querySelector('app-site-footer .env');
    expect(env?.textContent).toContain('development');
  });

  it('renders the main navigation', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const links = (fixture.nativeElement as HTMLElement).querySelectorAll(
      'nav[aria-label="Main"] a',
    );
    expect(Array.from(links).map((a) => a.textContent?.trim())).toEqual([
      'Projects',
      'About',
      'Contact',
    ]);
  });
});
