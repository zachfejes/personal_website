/** One adjustable value in a tuning panel. */
export type Control =
  | { type: 'range'; label: string; min: number; max: number; step: number; unit?: string }
  | { type: 'color'; label: string }
  | { type: 'select'; label: string; options: readonly string[] }
  | { type: 'toggle'; label: string };

export type Value = number | string | boolean;

/** Settings are grouped one level deep: { group: { key: value } }. */
export type Settings = Record<string, Record<string, Value>>;

/** Describes every setting: same shape as the settings, with a control per key. */
export type Schema<S extends Settings> = {
  [G in keyof S]: { label: string; controls: { [K in keyof S[G]]: Control } };
};

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

/** Whether a value is acceptable for a control. Range values are clamped, not rejected. */
function accepts(control: Control, value: unknown): boolean {
  switch (control.type) {
    case 'range':
      return typeof value === 'number' && Number.isFinite(value);
    case 'color':
      return typeof value === 'string' && HEX_COLOR.test(value);
    case 'select':
      return typeof value === 'string' && control.options.includes(value);
    case 'toggle':
      return typeof value === 'boolean';
  }
}

const clamp = (control: Control, value: Value): Value =>
  control.type === 'range' && typeof value === 'number'
    ? Math.min(control.max, Math.max(control.min, value))
    : value;

/**
 * Merges pasted settings over a base, keeping only keys the schema knows and values its
 * controls accept. Anything else is reported, so a paste never silently breaks the page.
 */
export function mergeSettings<S extends Settings>(
  base: S,
  schema: Schema<S>,
  input: unknown,
): { settings: S; ignored: string[] } {
  const settings = structuredClone(base);
  const ignored: string[] = [];
  if (typeof input !== 'object' || input === null)
    return { settings, ignored: ['(not an object)'] };

  for (const [group, values] of Object.entries(input)) {
    const groupSchema = (
      schema as Record<string, { controls: Record<string, Control> } | undefined>
    )[group];
    if (!groupSchema || typeof values !== 'object' || values === null) {
      ignored.push(group);
      continue;
    }
    for (const [key, value] of Object.entries(values as Record<string, unknown>)) {
      const control = groupSchema.controls[key] as Control | undefined;
      if (!control || !accepts(control, value)) {
        ignored.push(`${group}.${key}`);
        continue;
      }
      (settings as Settings)[group][key] = clamp(control, value as Value);
    }
  }
  return { settings, ignored };
}
