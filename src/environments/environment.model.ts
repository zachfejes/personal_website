export interface Environment {
  /** Which deployment this build is for. */
  name: 'development' | 'staging' | 'production';
  /** Absolute origin + base path the site is served from, without a trailing slash. */
  siteUrl: string;
  /** Whether search engines may index the site. */
  indexable: boolean;
  /** Whether draft project pages get routes (never listed or linked). */
  showDrafts: boolean;
}
