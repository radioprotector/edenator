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
   */
  public trackHash: number = 0;

  /**
   * Gets a random integer that is deterministic for the track.
   * @param low The minimum possible integer value.
   * @param high The maximum possible integer value.
   */
  public getTrackRandomInt(low: number, high: number): number {
    // Because we're using Math.floor on the random result, we need to go 1 *above* the high
    return low + Math.floor(MathUtils.seededRandom(this.trackHash) * (high + 1));
  }

  /**
   * Gets a random integer that is deterministic for the track and current time.
   * @param low The minimum possible integer value.
   * @param high The maximum possible integer value.
   * @param time The current time to use as a seed. Fractional seconds will be rounded with a granularity of 1ms.
   */
   public getTrackTimeRandomInt(low: number, high: number, time: number): number {
    // Multiply the time against 1000 to ensure resolution with 1ms granularity
    const roundedTime = Math.floor(time * 1000);

    // Because we're using Math.floor on the random result, we need to go 1 *above* the high
    return low + Math.floor(MathUtils.seededRandom(this.trackHash + roundedTime) * (high + 1));
   }
}

export const EmptyTrackAnalysis = new TrackAnalysis();
