import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import katex from 'katex';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { TEX_RENDERER, typeset } from './projects/armada-scaling/tex-render';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    // Prerendering typesets every equation at once, so pages ship finished math.
    {
      provide: TEX_RENDERER,
      useValue: (tex: string, display: boolean) => typeset(katex, tex, display),
    },
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
