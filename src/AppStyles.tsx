import { useStore } from './visualizerStore';
import { css } from "styled-components";

function AppStyles(): JSX.Element {
  const uiTheme = useStore((state) => state.theme.ui);

  return (
    <style
      type="text/css">
      {css`
        html {
          --ui-color-text: ${uiTheme.textColor.getStyle()};
          --ui-color-contrast: ${uiTheme.backgroundColor.getStyle()};
          --ui-color-contrast-disabled: ${uiTheme.disabledBackgroundColor.getStyle()};
          --ui-color-border: ${uiTheme.borderColor.getStyle()};
      }`}
    </style>
  );
}

export default AppStyles;
