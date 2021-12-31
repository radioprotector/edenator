import { useEffect } from 'react';
import { css } from "styled-components";

import { useStore } from './visualizerStore';

/**
 * A path for a round-rect background to use for dynamic icon generation.
 * Extracted from a 64x64 version of the logo SVG.
 */
const bevelPath = new Path2D('M64,12.8C64,5.735 58.265,0 51.2,0L12.8,0C5.735,0 0,5.735 0,12.8L0,51.2C0,58.265 5.735,64 12.8,64L51.2,64C58.265,64 64,58.265 64,51.2L64,12.8Z');

/**
 * A path for a waveform to use for dynamic icon generation.
 * Extracted from a 64x64 version of the logo SVG.
 */
const waveformPath = new Path2D('M-0.063,32C-0.063,32 0.1,14.756 0.706,14.762C1.308,14.768 1.352,48.687 2.623,48.679C3.713,48.672 4.033,19.674 6.498,19.72C8.476,19.757 9.898,44.125 11.665,44.137C13.269,44.148 15.225,27.314 18.123,27.262C19.97,27.228 22.316,34.293 24.748,34.262C26.547,34.239 29.486,30.126 31.915,30.179C33.821,30.22 36.836,32.346 39.185,32.262C41.258,32.188 44.23,31.313 45.976,31.262C47.511,31.217 51.354,32.125 53.396,32.058C55.048,32.004 58.987,31.707 60.222,31.672C61.416,31.638 62.61,31.788 63.804,31.845');

/**
 * A path for a star shape to use for dynamic icon generation.
 * Extracted from a 64x64 version of the logo SVG.
 */
const firstStarPath = new Path2D('M25.418,10.25L27.74,9.882L27.993,11.48L29.435,10.745L30.502,12.84L29.06,13.575L30.204,14.719L28.542,16.381L27.398,15.237L26.663,16.679L24.568,15.612L25.303,14.17L23.705,13.917L24.073,11.595L25.671,11.848L25.418,10.25Z');

/**
 * A path for a star shape to use for dynamic icon generation.
 * Extracted from a 64x64 version of the logo SVG.
 */
const secondStarPath = new Path2D('M44.075,49.242L45.903,47.762L46.921,49.02L47.802,47.663L49.774,48.943L48.893,50.3L50.456,50.719L49.847,52.99L48.284,52.571L48.369,54.187L46.021,54.31L45.936,52.694L44.426,53.274L43.583,51.079L45.094,50.499L44.075,49.242Z');

function AppStyles(): JSX.Element {
  const uiTheme = useStore((state) => state.theme.ui);

  useEffect(() => useStore.subscribe(
    (state) => state.theme.ui,
    (newUiTheme) => {
      // Update the theme-color meta tag to match our main color
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', newUiTheme.backgroundColor.getStyle());

      // Create a dummy canvas
      const canvasElem = document.createElement('canvas') as HTMLCanvasElement;
      canvasElem.setAttribute('width', '64px');
      canvasElem.setAttribute('height', '64px');

      // Try to get a 2D rendering context
      const ctx = canvasElem.getContext('2d', { alpha: true, desynchronized: true });

      if (ctx) {
        // If found, fill our bevel style and stroke in the waveform and stars.
        ctx.fillStyle = newUiTheme.backgroundColor.getStyle();
        ctx.fill(bevelPath);

        ctx.strokeStyle = newUiTheme.textColor.getStyle();
        ctx.lineWidth = 2;
        ctx.stroke(waveformPath);

        ctx.lineWidth = 1;
        ctx.stroke(firstStarPath);
        ctx.stroke(secondStarPath);

        // Convert to a data URL and use it to generate the favicon
        const iconUrl = canvasElem.toDataURL('image/png');
        document.querySelector('link[rel="icon"]')?.setAttribute('href', iconUrl);
      }

      canvasElem.remove();
    }),
    []);

  // Because we want to make this a reactive component, we can't manually use something like createGlobalStyle,
  // which handles component generation.
  return (
    <style
      type="text/css">
      {css`
        html {
          --ui-color-text: ${uiTheme.textColor.getStyle()};
          --ui-color-contrast: ${uiTheme.backgroundColor.getStyle()};
          --ui-color-contrast-disabled: ${uiTheme.disabledBackgroundColor.getStyle()};
          --ui-color-contrast-focus: ${uiTheme.focusBackgroundColor.getStyle()};
          --ui-color-border: ${uiTheme.borderColor.getStyle()};
      }`}
    </style>
  );
}

export default AppStyles;
