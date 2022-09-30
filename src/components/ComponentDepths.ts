/**
 * Describes different z-depths of components in world coordinates.
 */
export const ComponentDepths = {
  LightPosition: 20,

  /**
   * The depth of the camera, pointing towards (0, 0, 0)
   */
  CameraPosition: 10,

  /**
   * The far plane of the frustrum.
   */
  CameraFrustrumFar: 2000,

  /**
   * The ending depth of the frequency grid lines.
   */
  FrequencyEnd: -10,

  /**
   * The ending depth of the bass tunnel segments.
   */
  TunnelEnd: 5,
  BeatStart: -200,
  BeatEnd: -10,
  TrebleStart: -200,
  TrebleEnd: 10,
  SceneryStart: -1000,
  SceneryEnd: 0,
  Sun: -1500,
  SunFlash: -1500,
  SunRing: -1600,
  StarsLayer1: -1700,
  StarsLayer2: -1800,
  StarsLayer3: -1900
} as const;
