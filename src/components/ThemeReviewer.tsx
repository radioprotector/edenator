import { useState } from 'react';
import { Color } from 'three';

import { useStore } from '../store/visualizerStore';
import { ALL_THEMES, getContrast } from '../store/themes';
import { SceneryMap } from '../store/scenery';

import './ThemeReviewer.css';

const RAD2DEG = 180 / Math.PI;

function getColorCell(color: Color, label: string | null = null, groupEnd: boolean = false): JSX.Element {
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
  const currentThemeName = useStore(store => store.theme.name);
  const [reviewerVisible, setReviewerVisible] = useState(false);

  const themeRows: JSX.Element[] = ALL_THEMES.map((theme) => {
    // Calculate beat sides/positions
    const beatPositionAngles = theme.beat.radiansOffset.map((offsetRad) => {
      return (offsetRad * RAD2DEG).toFixed(0) + '°';
    }).join(', ');
    const beatPositions = `${theme.beat.sides} [${beatPositionAngles}]`;

    // Calculate theme scenery
    const sceneryItemNames: string[] = [];
    for(const sceneryKey of theme.scenery.availableItems) {
      const item = SceneryMap[sceneryKey];
      const name = item.modelName ?? item.primitiveDesc;

      if (name && !sceneryItemNames.includes(name)) {
        sceneryItemNames.push(name);
      }
    }

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
      {getColorCell(theme.beat.color, 'base', false)}
      <td
        className="group-end"
        style={{'background': theme.background.fillColor.getStyle()}}>
        {beatPositions}
      </td>

      {getColorCell(theme.frequencyGrid.lineColor, 'secondary', true)}

      {getColorCell(theme.bass.panelColor, 'tertiary')}
      {getColorCell(theme.bass.wireframeColor, null, true)}

      {getColorCell(theme.treble.spriteColor, null, true)}

      {getColorCell(theme.background.sunColor)}
      {getColorCell(theme.background.burstLineColor)}
      {getColorCell(theme.background.starColor)}
      {getColorCell(theme.background.starFlashColor)}
      {getColorCell(theme.background.fillColor, null, true)}

      <td
        className="group-end"
        style={{'background': theme.background.fillColor.getStyle()}}>
        {sceneryItemNames.join(', ')}
      </td>
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
        &nbsp;
        (current: {currentThemeName})
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
                colSpan={2}
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
                colSpan={1} // Was 2 but we're hiding light
              >
                Treble
              </th>
              <th
                scope="colgroup"
                colSpan={5}
              >
                Background
              </th>
              <th
                scope="colgroup"
                colSpan={1}
              >
                Scenery
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
              >
                Beat
              </th>
              <th
                scope="col"
                className="group-end"
              >
                Positioning
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
              <th
                scope="col"
                className="group-end"
              >
                Sprite
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
              {/* Scenery */}
              <th
                scope="col"
                className="group-end"
              >
                Items
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
