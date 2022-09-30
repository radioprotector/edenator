import { useState } from 'react';

import { ALL_THEMES, getContrast } from '../store/themes';
import './ThemeReviewer.css';

function getColorCell(color: THREE.Color, label: string | null = null, groupEnd: boolean = false): JSX.Element {
  return <td
    style={{
      'background': color.getStyle(), 
      'fontWeight': label ? 'bold' : 'normal',
      'color': getContrast(color).getStyle()
    }}
    title={label ?? undefined}
    className={groupEnd ? 'group-end' : undefined}
  >
    {color.getHexString()}
  </td>
}

function ThemeReviewer(): JSX.Element {
  const [reviewerVisible, setReviewerVisible] = useState(false);

  const themeRows: JSX.Element[] = ALL_THEMES.map((theme) => {
    return <tr
      key={theme.name}
    >
      <th
        scope="row"
        className="group-end"
        style={{'background': theme.background.fillColor.getStyle()}}
      >
        {theme.name}
      </th>
      {getColorCell(theme.beat.color, 'base', true)}

      {getColorCell(theme.frequencyGrid.lineColor, 'secondary', true)}

      {getColorCell(theme.bass.panelColor, 'tertiary')}
      {getColorCell(theme.bass.wireframeColor, null, true)}

      {getColorCell(theme.treble.spriteColor)}
      {getColorCell(theme.treble.lightColor, null, true)}

      {getColorCell(theme.background.sunColor)}
      {getColorCell(theme.background.burstLineColor)}
      {getColorCell(theme.background.starColor)}
      {getColorCell(theme.background.starFlashColor)}
      {getColorCell(theme.background.fillColor, null, true)}
    </tr>
  })

  return (
    <div>
      <button
        type="button"
        id="themeReviewerToggle"
        className="btn"
        onClick={() => setReviewerVisible(!reviewerVisible)}
      >
        {reviewerVisible ? "Hide themes" : "Review themes"}
      </button>
      <div
        id="themeReviewer"
        style={{'display': reviewerVisible ? 'block' : 'none'}}
      >
        <table>
          <thead>
            <tr>
              <th
                scope="colgroup"
                colSpan={1}
              >
              </th>
              <th
                scope="colgroup"
                colSpan={1}
              >
                Beat
              </th>
              <th
                scope="colgroup"
                colSpan={1}
              >
                Freq.
              </th>
              <th
                scope="colgroup"
                colSpan={2}
              >
                Bass
              </th>
              <th
                scope="colgroup"
                colSpan={2}
              >
                Treble
              </th>
              <th
                scope="colgroup"
                colSpan={5}
              >
                Background
              </th>
            </tr>
            <tr>
              <th
                scope="col"
                className="group-end"
              >
                Theme
              </th>
              {/* Beat */}
              <th
                scope="col"
                className="group-end"
              >
                Beat
              </th>
              {/* Frequency */}
              <th
                scope="col"
                className="group-end"
              >
                Line
              </th>
              {/* Bass */}
              <th scope="col">
                Panel
              </th>
              <th
                scope="col"
                className="group-end"
              >
                Wireframe
              </th>
              {/* Treble */}
              <th scope="col">
                Sprite
              </th>
              <th
                scope="col"
                className="group-end"
              >
                <s>Light</s>
              </th>
              {/* Background */}
              <th scope="col">
                Sun
              </th>
              <th scope="col">
                Rings
              </th>
              <th scope="col">
                Stars
              </th>
              <th scope="col">
                Star Flash
              </th>
              <th
                scope="col"
                className="group-end"
              >
                Fill
              </th>
            </tr>
          </thead>
          <tbody>
            {themeRows}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ThemeReviewer;
