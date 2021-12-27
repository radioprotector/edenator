import * as THREE from 'three';

/**
 * A theme to use for the visualizer.
 */
export interface Theme {
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
  beat: {
    /**
     * The color to use for incoming beat peaks.
     */
    color: THREE.Color;
  },

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
   * Contains theming information relevant to the overall visualizer and BackgroundManager component.
   */
  background: {
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
  }
}

export const defaultTheme: Theme = {
  bass: {
    wireframeColor: new THREE.Color(0x8f074b),
    panelColor: new THREE.Color(0x850707)
  },
  beat: {
    color: new THREE.Color(0x770077)
  },
  treble: {
    spriteColor: new THREE.Color(0xffaaff),
    spriteTexture: 'textures/extendring.png',
    lightColor: new THREE.Color(0xffffff)
  },
  frequencyGrid: {
    lineColor: new THREE.Color(0xaa00aa)
  },
  background: {
    sunColor: new THREE.Color(0xffcc55),
    burstLineColor: new THREE.Color(0xffffaa),
    starColor: new THREE.Color(0xaa66aa),
    starFlashColor: new THREE.Color(0xffffff)
  }
};

export const pinkTheme: Theme = {
  bass: {
    wireframeColor: new THREE.Color(0xFF00E4),
    panelColor: new THREE.Color(0xED50F1)
  },
  beat: {
    color: new THREE.Color(0xFDB9FC)
  },
  treble: {
    spriteColor: new THREE.Color(0xffdcdc),
    spriteTexture: 'textures/extendring.png',
    lightColor: new THREE.Color(0xffeeee)
  },
  frequencyGrid: {
    lineColor: new THREE.Color(0xaa00aa)
  },
  background: {
    sunColor: new THREE.Color(0xffcc55),
    burstLineColor: new THREE.Color(0xffdcdc),
    starColor: new THREE.Color(0xaa00aa),
    starFlashColor: new THREE.Color(0xffffff)
  }
};
