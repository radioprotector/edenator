/**
 * A lull that was detected.
 */
 export default interface Lull {
  /**
   * The time at which the lull started, in fractional seconds.
   */
  time: number;

  /**
   * The duration of the lull, in fractional seconds.
   */
   duration: number;
}
