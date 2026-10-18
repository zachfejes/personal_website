import { Environment } from './environment.model';

// Production settings. Other configurations swap this file out via
// `fileReplacements` in angular.json.
export const environment: Environment = {
  name: 'production',
  siteUrl: 'https://zachfejes.com',
  indexable: true,
  showDrafts: false,
};
