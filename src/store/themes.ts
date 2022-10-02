import * as THREE from 'three';
import { GeometricScenery, SceneryKey } from './scenery';
import { OpenKey, TrackAnalysis } from './TrackAnalysis';

/**
 * 360 degrees expressed as radians.
 */
const FULL_RADIANS = 2 * Math.PI;

const BLACK_COLOR = new THREE.Color(0x000000);

const WHITE_COLOR = new THREE.Color(0xFFFFFF);

/**
 * The threshold against which the color is considered dark enough to support legible white text.
 * @see {@link https://lesscss.org/functions/#color-operations-contrast}
 */
const LIGHT_LUMA_THRESHOLD = 0.43;

/**
 * Contains theming information relevant to the BeatQueue component.
 */
export interface BeatTheme {
  /**
   * The color to use for incoming beat peaks.
   */
  color: THREE.Color;

  /**
   * The number of sides to use for the beat pattern arrangement.
   */
  sides: number,

  /**
   * The offset, in radians, to use for successive "layers" of beat patterns.
   */
  radiansOffset: number[],
}

/**
 * A theme to use for the visualizer.
 */
export interface Theme {
  name: string;

  /**
   * Contains theming information relevant to the BassTunnel component.
   */
  bass: {
    /**
     * The color to use for wireframes that form the "tunnel".
     */
    wireframeColor: THREE.Color;

    /**
     * The color to use for panels that fill different parts of the tunnel.
     */
    panelColor: THREE.Color;
  },

  /**
   * Contains theming information relevant to the BeatQueue component.
   */
  beat: BeatTheme,

  /**
   * Contains theming information relevant to the TrebleQueue component.
   */
  treble: {
    /**
     * The sprite color to use for incoming treble peaks.
     */
    spriteColor: THREE.Color;

    /**
     * The path to the sprite texture to use for incoming treble peaks.
     */
    spriteTexture: string;

    /**
     * The light color to use for incoming treble peaks.
     */
    lightColor: THREE.Color;
  },

  /**
   * Contains theming information relevant to the FrequencyGrid component.
   */
  frequencyGrid: {
    /**
     * The color to use for drawing frequency lines.
     */
    lineColor: THREE.Color;
  },

  /**
   * Contains theming information relevant to the SceneryQueue component.
   */
  scenery: {
    /**
     * The items that are available for scenery.
     */
    availableItems: readonly SceneryKey[];  
  },

  /**
   * Contains theming information relevant to the overall visualizer and BackgroundManager component.
   */
  background: {
    /**
     * The color to use for filling the background scene.
     */
    fillColor: THREE.Color;

    /**
     * The color to use for the sun.
     */
    sunColor: THREE.Color;

    /**
     * The color to use for the "burst" lines that rotate around the sun.
     */
    burstLineColor: THREE.Color;

    /**
     * The standard color to use for stars in the background.
     */
    starColor: THREE.Color;

    /**
     * The color to use for "flashed" stars in the background.
     */
    starFlashColor: THREE.Color;
  },

  /**
   * Contains theming information for the overall application UI.
   */
  ui: {
    textColor: THREE.Color;

    backgroundColor: THREE.Color;

    disabledBackgroundColor: THREE.Color;

    focusBackgroundColor: THREE.Color;

    borderColor: THREE.Color;
  }
}

/**
 * Gets the sRGB value to use in luma calculations for the specified color component.
 * @param floatColor The color component, on a 0.0-1.0 scale.
 * @returns The corresponding luma component.
 * @see {@link https://www.w3.org/TR/2008/REC-WCAG20-20081211/#relativeluminancedef}
 */
function getLumaComponent(floatColor: number): number {
  const cutoff = 0.03928;

  if (floatColor <= cutoff) {
    return floatColor / 12.92;
  }
  else {
    return Math.pow(((floatColor + 0.055) / 1.055), 2.4);
  }
}

/**
 * Gets the luma value for the specified color.
 * @param color The color.
 * @returns The corresponding luma value.
 * @see {@link https://www.w3.org/TR/2008/REC-WCAG20-20081211/#relativeluminancedef}
 */
function getLuma(color: THREE.Color): number {
  return (0.2126 * getLumaComponent(color.r)) + (0.7152 * getLumaComponent(color.g)) + (0.0722 * getLumaComponent(color.b));
}

/**
 * Gets a black or white color to contrast against the provided color.
 * @param color The color to check against.
 * @returns The equivalent contrasting color.
 */
export function getContrast(color: THREE.Color): THREE.Color {
  if (getLuma(color) < LIGHT_LUMA_THRESHOLD) {
    return WHITE_COLOR;
  }
  else {
    return BLACK_COLOR;
  }
}

function generateThemeForColor(name: string, baseColor: THREE.Color, secondaryColor: THREE.Color, tertiaryColor: THREE.Color | null = null): Theme {
  // Default the tertiary color if not specified
  if (tertiaryColor === null) {
    tertiaryColor = new THREE.Color(baseColor).lerp(secondaryColor, 0.5);
  }

  // Determine the UI text color to use
  let uiTextColor: THREE.Color;
  let uiDisabledBgColor: THREE.Color;
  let uiFocusBgColor: THREE.Color;

  if (getLuma(baseColor) < LIGHT_LUMA_THRESHOLD) {
    uiTextColor = WHITE_COLOR;
    uiDisabledBgColor = new THREE.Color(baseColor).lerp(BLACK_COLOR, 0.3);
    uiFocusBgColor = new THREE.Color(baseColor).lerp(WHITE_COLOR, 0.2);
  }
  else {
    uiTextColor = BLACK_COLOR;
    uiDisabledBgColor = new THREE.Color(baseColor).lerp(WHITE_COLOR, 0.3);
    uiFocusBgColor = new THREE.Color(baseColor).lerp(BLACK_COLOR, 0.2);
  }

  return {
    name: name,
    bass: {
      wireframeColor: new THREE.Color(tertiaryColor).lerp(BLACK_COLOR, 0.3),
      panelColor: new THREE.Color(tertiaryColor)
    },
    beat: {
      color: new THREE.Color(baseColor),
      sides: 6,
      radiansOffset: [0, FULL_RADIANS / 12] // Alternate between 0 degrees and 30 degrees adjustment
    },
    treble: {
      spriteColor: new THREE.Color(baseColor).lerp(WHITE_COLOR, 0.65),
      spriteTexture: process.env.PUBLIC_URL + '/textures/extendring.png',
      lightColor: new THREE.Color(baseColor).lerp(WHITE_COLOR, 0.75),
    },
    frequencyGrid: {
      lineColor: new THREE.Color(secondaryColor)
    },
    scenery: {
      availableItems: GeometricScenery
    },
    background: {
      fillColor: new THREE.Color(baseColor).lerp(BLACK_COLOR, 0.97),
      sunColor: new THREE.Color(baseColor).lerp(secondaryColor, 0.75).lerp(WHITE_COLOR, 0.5),
      burstLineColor: new THREE.Color(baseColor).lerp(secondaryColor, 0.75).lerp(WHITE_COLOR, 0.25),
      starColor: new THREE.Color(baseColor).lerp(secondaryColor, 0.75).lerp(WHITE_COLOR, 0.1),
      starFlashColor: new THREE.Color(baseColor).lerp(secondaryColor, 0.75)
    },
    ui: {
      textColor: uiTextColor,
      backgroundColor: new THREE.Color(baseColor),
      disabledBackgroundColor: uiDisabledBgColor,
      focusBackgroundColor: uiFocusBgColor,
      borderColor: new THREE.Color(secondaryColor)
    }
  };
}

export const defaultTheme = generateThemeForColor('default', new THREE.Color(0xff6600), new THREE.Color(0xff3333), new THREE.Color(0xff9933));

const magentaTheme = generateThemeForColor('magenta', new THREE.Color(0xff33ff), new THREE.Color(0x993399), new THREE.Color(0x0033ff));
const indigoTheme = generateThemeForColor('indigo', new THREE.Color(0xcc00ff), new THREE.Color(0x6666ff), new THREE.Color(0x6633ff));
const darkBlueTheme = generateThemeForColor('deep blue', new THREE.Color(0x0033ff), new THREE.Color(0xcc9900), new THREE.Color(0x00cccc));
const midBlueTheme = generateThemeForColor('mid blue', new THREE.Color(0x6699ff), new THREE.Color(0x66cc66), new THREE.Color(0x3366ff));
const lightBlueTheme = generateThemeForColor('light blue', new THREE.Color(0x99ccff), new THREE.Color(0xff66ff), new THREE.Color(0x33ff33));
const blueGreenTheme = generateThemeForColor('blue-green', new THREE.Color(0x00ffff), new THREE.Color(0xcc6600), new THREE.Color(0x339999));
const greenTheme = generateThemeForColor('green', new THREE.Color(0x00ff00), new THREE.Color(0xFF0099), new THREE.Color(0x00ff99));
const yellowGreenTheme = generateThemeForColor('yellow-green', new THREE.Color(0x99ffcc), new THREE.Color(0xffcc33), new THREE.Color(0x33cc00));
const yellowTheme = generateThemeForColor('yellow', new THREE.Color(0xffcc00), new THREE.Color(0x3333FF), new THREE.Color(0xcccc33));
const orangeTheme = generateThemeForColor('orange', new THREE.Color(0xff6600), new THREE.Color(0x33FFFF), new THREE.Color(0xff0000));
const redTheme = generateThemeForColor('red', new THREE.Color(0xff0000), new THREE.Color(0x99FFcc), new THREE.Color(0xff6699));
const pinkTheme = generateThemeForColor('pink', new THREE.Color(0xff99cc), new THREE.Color(0xff3333), new THREE.Color(0xcc33cc));

const hotdogStandTheme = generateThemeForColor('hotdog stand', new THREE.Color(0xff0000), new THREE.Color(0xffff00));
const fluorescentTheme = generateThemeForColor('fluorescent', new THREE.Color(0xff00ff), new THREE.Color(0x00ff00));
const plasmaPowerSaverTheme = generateThemeForColor('plasma power saver', new THREE.Color(0x0000ff), new THREE.Color(0xff00ff), new THREE.Color(0xcc0066));

// Light blue gets flowers and some trees 
[lightBlueTheme].forEach((theme) => {
  theme.scenery.availableItems = [
    SceneryKey.FlowerAModel,
    SceneryKey.FlowerAModel,
    SceneryKey.FlowerBModel,
    SceneryKey.FlowerBModel,
    SceneryKey.FlowerCModel,
    SceneryKey.FlowerCModel,
    SceneryKey.TreePlateauModel,
    SceneryKey.TreeSimpleModel,
    SceneryKey.TreeThinModel,
  ];
});

// Blue-green gets an evergreen forest theme with rocks
[blueGreenTheme].forEach((theme) => {
  // Double up on some of the entries to make them more likely
  theme.scenery.availableItems = [
    SceneryKey.StumpOldTallModel,
    SceneryKey.StumpRoundDetailedModel,
    SceneryKey.TreeFatModel,
    SceneryKey.TreeFatModel,
    SceneryKey.TreeOakModel,
    SceneryKey.TreeOakModel,
    SceneryKey.TreeOakModel,
    SceneryKey.TreePineRoundAModel,
    SceneryKey.TreePineRoundAModel,
    SceneryKey.TreePineRoundAModel,
    SceneryKey.TreePlateauModel,
    SceneryKey.TreePlateauModel,
    SceneryKey.TreeSimpleModel,
    SceneryKey.TreeSimpleModel,
    SceneryKey.StoneTallBModel,
    SceneryKey.StoneTallGModel,
    SceneryKey.StoneTallIModel
  ];
});

// Green gets a forest theme
[greenTheme].forEach((theme) => {
  theme.scenery.availableItems = [
    SceneryKey.StumpOldTallModel,
    SceneryKey.StumpRoundDetailedModel,
    SceneryKey.TreeFatModel,
    SceneryKey.TreeOakModel,
    SceneryKey.TreePineRoundAModel,
    SceneryKey.TreePlateauModel,
    SceneryKey.TreeSimpleModel,
    SceneryKey.TreeThinModel,
  ];
});

// Yellow theme gets a desert theme
[yellowTheme].forEach((theme) => {
  // Duplicate some of these keys to make them more likely
  theme.scenery.availableItems = [
    SceneryKey.CactusShortModel,
    SceneryKey.CactusShortModel,
    SceneryKey.CactusShortModel,
    SceneryKey.CactusTallModel,
    SceneryKey.CactusTallModel,
    SceneryKey.CactusTallModel,
    SceneryKey.StoneTallBModel,
    SceneryKey.StoneTallGModel,
    SceneryKey.StoneTallIModel
  ];
});

// Orange theme gets an autumnal theme
[orangeTheme].forEach((theme) => {
  theme.scenery.availableItems = [
    SceneryKey.CornStageAModel,
    SceneryKey.CornStageAModel,
    SceneryKey.CornStageBModel,
    SceneryKey.CornStageBModel,
    SceneryKey.CornStageCModel,
    SceneryKey.CornStageCModel,
    SceneryKey.PumpkinModel,
    SceneryKey.PumpkinModel,
    SceneryKey.StumpOldTallModel,
    SceneryKey.StumpRoundDetailedModel
  ];
});

// For magenta, indigo, and plasma power saver themes, use a "vaporwave" style
[magentaTheme, indigoTheme, plasmaPowerSaverTheme].forEach((theme) => {
  theme.scenery.availableItems = [
    SceneryKey.StatueColumnModel,
    SceneryKey.StatueColumnDamagedModel,
    SceneryKey.StatueObeliskModel,
    SceneryKey.StatueBlockModel,
    SceneryKey.TreePalmTallModel,
    SceneryKey.TreePalmBendModel
  ];
});

// Change certain themes to use 5 or 8 sides for the beat patterns
[redTheme, orangeTheme, fluorescentTheme].forEach((theme) => {
  // For 5 sides, alternate between 90 degrees (to align the tip of the star with (x: 0, y: 1) on the unit circle) and 45 degrees
  theme.beat.sides = 5;
  theme.beat.radiansOffset = [FULL_RADIANS / 4, FULL_RADIANS / 8];
});

[midBlueTheme, yellowGreenTheme, hotdogStandTheme].forEach((theme) => {
  // For 8 sides, alternate between 0 degrees and 15 degrees
  theme.beat.sides = 8;
  theme.beat.radiansOffset = [0, FULL_RADIANS / 24];
});

/**
 * An array of all themes that can be assigned randomly by getThemeForTrack.
 */
export const ALL_THEMES = [
  defaultTheme,
  magentaTheme,
  indigoTheme,
  darkBlueTheme,
  midBlueTheme,
  lightBlueTheme,
  blueGreenTheme,
  greenTheme,
  yellowGreenTheme,
  yellowTheme,
  orangeTheme,
  redTheme,
  pinkTheme,
  hotdogStandTheme,
  fluorescentTheme,
  plasmaPowerSaverTheme
];

export function getThemeForTrack(track: TrackAnalysis): Theme {
  if (track === null) {
    return defaultTheme;
  }

  // Randomly assign a key if we didn't detect one 
  if (track.key === null) {
    const keyIndex = track.getTrackRandomInt(0, ALL_THEMES.length - 1);
    return ALL_THEMES[keyIndex];
  }

  // Map keys to specific themes
  switch(track.key) {
    case OpenKey.C_Major:
    case OpenKey.A_Minor:
      return magentaTheme;

    case OpenKey.G_Major:
    case OpenKey.E_Minor:
      return indigoTheme;

    case OpenKey.D_Major:
    case OpenKey.B_Minor:
      return darkBlueTheme;

    case OpenKey.A_Major:
    case OpenKey.F_Sharp_Minor:
      return midBlueTheme;

    case OpenKey.E_Major:
    case OpenKey.C_Sharp_Minor:
      return lightBlueTheme;

    case OpenKey.B_Major:
    case OpenKey.G_Sharp_Minor:
      return blueGreenTheme;

    case OpenKey.F_Sharp_Major:
    case OpenKey.D_Sharp_Minor:
      return greenTheme;

    case OpenKey.D_Flat_Major:
    case OpenKey.B_Flat_Minor:
      return yellowGreenTheme;

    case OpenKey.A_Flat_Major:
    case OpenKey.F_Minor:
      return yellowTheme;

    case OpenKey.E_Flat_Major:
    case OpenKey.C_Minor:
      return orangeTheme;

    case OpenKey.B_Flat_Major:
    case OpenKey.G_Minor:
      return redTheme;

    case OpenKey.F_Major:
    case OpenKey.D_Minor:
      return pinkTheme;

    case OpenKey.OffKey:
      return hotdogStandTheme;

    default:
      return defaultTheme;
  }
}

export function getNextTheme(currentTheme: Theme): Theme {
  const currentThemeIndex = ALL_THEMES.indexOf(currentTheme);

  // Return the first theme if we didn't find a match or we need to wrap around
  if (currentThemeIndex === -1 || currentThemeIndex === ALL_THEMES.length - 1) {
    return ALL_THEMES[0];
  }

  return ALL_THEMES[currentThemeIndex + 1];
}
