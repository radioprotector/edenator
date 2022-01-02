/**
 * A lull that was detected.
 */
 export default interface Lull {
  /**
   * The time at which the lull started, in fractional seconds.
   */
  time: number;

  /**
   * The end of the lull, in fractional seconds.
   * This is included for symmetry with Peak for the purposes of union typing.
   */
  end: number;

  /**
   * The duration of the lull, in fractional seconds.
   */
  duration: number;
}
