import { MathUtils } from "three";
import Peak from "./Peak";

export class TrackAnalysis
{
  public title: string = '';

  public artist: string = '';

  public bpm: number = 120;

  public get secondsPerMeasure(): number {
    // Assuming 4 beats per measure, BPM / 4 => measures/minute / 60 => BPM/240 for measures per second
    // Use the inverse to get seconds per measure
    return 240 / this.bpm;
  }

  public subBass: Peak[] = [];

  public bass: Peak[] = [];

  public beat: Peak[] = [];

  public treble: Peak[] = [];

  /**
   * The hash to identify the track. This is not guaranteed to be unique, but is
   * intended to help ensure deterministic results for the same track.
   * 
   * This should be a positive non-zero finite integer.
   */
  public trackHash: number = 1;

  /**
   * Used to indicate "empty" instances for special default displays.
   */
  public isEmpty: boolean = false;

  /**
   * Gets a random integer that is deterministic for the track.
   * @param low The minimum possible integer value.
   * @param high The maximum possible integer value.
   */
  public getTrackRandomInt(low: number, high: number): number {
    return this.getTrackTimeRandomInt(low, high, 0);
  }

  /**
   * Gets a random integer that is deterministic for the track and current time.
   * @param low The minimum possible integer value.
   * @param high The maximum possible integer value.
   * @param time The current time to use as a seed. Fractional seconds will be rounded with a granularity of 10ms.
   */
   public getTrackTimeRandomInt(low: number, high: number, time: number): number {
    // Multiply the time against 100 to ensure resolution with 10ms granularity
    const roundedTime = Math.floor(time * 100);

    // Because we're using Math.floor on the random result, we need to go 1 *above* the high
    const result = low + Math.floor(MathUtils.seededRandom(this.trackHash + roundedTime) * (high - low + 1));

    // HACK: Because seededRandom returns over the range [0, 1], we need to handle the special case where it legitimately returns 1
    return MathUtils.clamp(result, low, high);
  }
}

export const EmptyTrackAnalysis = new TrackAnalysis();
EmptyTrackAnalysis.isEmpty = true;
