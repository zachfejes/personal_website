import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  model,
  signal,
} from '@angular/core';
import { Control, Schema, Settings, Value, mergeSettings } from './tuning';

const JSON_INDENT = 2;
/** How long status messages stay up, ms. */
const STATUS_MS = 3000;

interface Row {
  key: string;
  control: Control;
}

/**
 * A floating panel for tuning a page's design settings live. Changes apply immediately, are
 * remembered in this browser, and can be copied as JSON (to send back) or pasted in again.
 * Development and staging only: pages include it behind environment.showDrafts.
 */
@Component({
  selector: 'app-tuner-panel',
  templateUrl: './tuner-panel.html',
  styleUrl: './tuner-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TunerPanel {
  readonly title = input.required<string>();
  readonly schema = input.required<Schema<Settings>>();
  readonly defaults = input.required<Settings>();
  readonly settings = model.required<Settings>();
  /** localStorage key; settings persist per page. */
  readonly storageKey = input.required<string>();

  protected readonly open = signal(false);
  protected readonly pasting = signal(false);
  protected readonly status = signal('');
  private statusTimer: ReturnType<typeof setTimeout> | undefined;

  protected readonly groups = computed(() =>
    Object.entries(this.schema()).map(([key, group]) => ({
      key,
      label: group.label,
      rows: Object.entries(group.controls).map(([k, control]): Row => ({ key: k, control })),
    })),
  );

  constructor() {
    // Restore saved settings once, then save every change.
    let restored = false;
    effect(() => {
      const settings = this.settings();
      if (!restored) {
        restored = true;
        const saved = this.read();
        if (saved) {
          this.settings.set(mergeSettings(this.defaults(), this.schema(), saved).settings);
          return;
        }
      }
      this.write(settings);
    });
  }

  protected value(group: string, key: string): Value {
    return this.settings()[group][key];
  }

  protected set(group: string, key: string, value: Value): void {
    const current = this.settings();
    this.settings.set({ ...current, [group]: { ...current[group], [key]: value } });
  }

  protected setNumber(group: string, key: string, event: Event): void {
    const value = (event.target as HTMLInputElement).valueAsNumber;
    if (Number.isFinite(value)) this.set(group, key, value);
  }

  protected setText(group: string, key: string, event: Event): void {
    this.set(group, key, (event.target as HTMLInputElement | HTMLSelectElement).value);
  }

  /** Hex text field: apply only once it's a full color, so typing doesn't fight the picker. */
  protected setHex(group: string, key: string, event: Event): void {
    const text = (event.target as HTMLInputElement).value.trim();
    const hex = text.startsWith('#') ? text : `#${text}`;
    const { settings, ignored } = mergeSettings(this.settings(), this.schema(), {
      [group]: { [key]: hex },
    });
    if (!ignored.length) this.settings.set(settings);
  }

  protected setToggle(group: string, key: string, event: Event): void {
    this.set(group, key, (event.target as HTMLInputElement).checked);
  }

  protected async copy(): Promise<void> {
    const json = JSON.stringify(this.settings(), null, JSON_INDENT);
    try {
      await navigator.clipboard.writeText(json);
      this.say('Settings copied');
    } catch {
      this.pasting.set(true);
      this.say('Copy blocked: select the text below and copy it');
    }
  }

  protected apply(text: string): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      this.say('That isn’t valid JSON');
      return;
    }
    const { settings, ignored } = mergeSettings(this.settings(), this.schema(), parsed);
    this.settings.set(settings);
    this.say(ignored.length ? `Applied; ignored ${ignored.join(', ')}` : 'Settings applied');
  }

  protected reset(): void {
    this.settings.set(structuredClone(this.defaults()));
    this.say('Reset to defaults');
  }

  protected json(): string {
    return JSON.stringify(this.settings(), null, JSON_INDENT);
  }

  private say(message: string): void {
    this.status.set(message);
    clearTimeout(this.statusTimer);
    this.statusTimer = setTimeout(() => this.status.set(''), STATUS_MS);
  }

  private read(): unknown {
    try {
      const raw = localStorage.getItem(this.storageKey());
      return raw ? (JSON.parse(raw) as unknown) : null;
    } catch {
      return null;
    }
  }

  private write(settings: Settings): void {
    try {
      localStorage.setItem(this.storageKey(), JSON.stringify(settings));
    } catch {
      // Storage unavailable (private mode): settings just won't persist.
    }
  }
}
