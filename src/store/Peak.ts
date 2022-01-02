/**
 * A peak that was detected.
 */
export default interface Peak {
  /**
   * The time at which the peak was encountered, in fractional seconds.
   */
  time: number;

  /**
   * The end of the peak, in fractional seconds.
   */
  end: number;

  /**
   * The maximum intensity of the peak on a 0.0-1.0 scale.
   */
  intensity: number;

  /**
   * The maximum intensity of the peak on a floating-point scale, normalized relative to the current volume.
   */
  intensityNormalized: number;
}
