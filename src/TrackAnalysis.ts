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
    return this.getTrackSeededRandomInt(low, high, 0);
  }

  /**
   * Gets a random integer that is deterministic for the track and specified seed.
   * @param low The minimum possible integer value.
   * @param high The maximum possible integer value.
   * @param seed The seed to use.
   */
  public getTrackSeededRandomInt(low: number, high: number, seed: number): number {
    // Because our random number seeds aren't as clustered around pi, this should vary *enough* for our purposes
    // Something like THREE.MathUtils.seededRandom exhibits very little variation between small seed increments of 1,
    // which doesn't work well for our purposes.
    const random = (Math.sin(this.trackHash + seed) + 1) / 2;

    // Because we're using Math.floor on the random result, we need to go 1 *above* the high
    return low + Math.floor(random * (high - low + 1));
  }

  /**
   * Gets a random float that is deterministic for the track and specified seed.
   * @param min The minimum possible floating-point value.
   * @param max The maximum possible floating-point value.
   * @param seed The seed to use.
   */
  public getTrackSeededRandomFloat(min: number, max: number, seed: number) {
    // Because our random number seeds aren't as clustered around pi, this should vary *enough* for our purposes
    // Something like THREE.MathUtils.seededRandom exhibits very little variation between small seed increments of 1,
    // which doesn't work well for our purposes.
    const random = (Math.sin(this.trackHash + seed) + 1) / 2;

    return min + (random * (max - min));    
  }
}

export const EmptyTrackAnalysis = new TrackAnalysis();
EmptyTrackAnalysis.isEmpty = true;
