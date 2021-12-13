/**
 * A peak that was detected.
 */
export default interface Peak {
  /**
   * The time at which the peak was encountered, in seconds.
   */
  time: number;

  /**
   * The end of the peak, in seconds.
   */
   end: number;

  /**
   * The intensity of the peak on a 0.0-1.0 scale.
   */
  intensity: number;

  /**
   * The number of sample frames for which the peak was encountered.
   */
  frames: number;
}
