import * as THREE from 'three';

export interface Theme {
  bass: {
    wireframeColor: THREE.Color;

    panelColor: THREE.Color;
  },
  beat: {
    color: THREE.Color;

    sides: number;
  },
  treble: {
    spriteColor: THREE.Color;

    spriteTexture: string;

    lightColor: THREE.Color;
  },
  frequencyGrid: {
    lineColor: THREE.Color;
  },
  background: {
    sunColor: THREE.Color;

    burstLineColor: THREE.Color;

    starColor: THREE.Color;

    starFlashColor: THREE.Color;
  }
}

const defaultTheme: Theme = {
  bass: {
    wireframeColor: new THREE.Color(0x8f074b),
    panelColor: new THREE.Color(0x850707)
  },
  beat: {
    color: new THREE.Color(0x770077),
    sides: 6
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
}
