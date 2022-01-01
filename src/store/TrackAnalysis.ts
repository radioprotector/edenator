import Peak from "./Peak";

/**
 * The different key values that are supported
 * by Open Key Notation.
 * @see {@link https://www.beatunes.com/en/open-key-notation.html}
 */
 export enum OpenKey {
  C_Major = '1d',
  A_Minor = '1m',

  G_Major = '2d',
  E_Minor = '2m',

  D_Major = '3d',
  B_Minor = '3m',

  A_Major = '4d',
  F_Sharp_Minor = '4m',

  E_Major = '5d',
  C_Sharp_Minor = '5m',

  B_Major = '6m',
  G_Sharp_Minor = '6d',

  F_Sharp_Major = '7d',
  D_Sharp_Minor = '7m',

  D_Flat_Major = '8d',
  B_Flat_Minor = '8m',

  A_Flat_Major = '9d',
  F_Minor = '9m',

  E_Flat_Major = '10d',
  C_Minor = '10m',

  B_Flat_Major = '11d',
  G_Minor = '11m',

  F_Major = '12d',
  D_Minor = '12m',

  OffKey = '0'
}

/**
 * An analysis of a track to be played and visualized.
 */
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

  /**
   * The length of the song, in seconds.
   */
  public length: number = 0;

  /**
   * The key that was detected for the track, or null if not detected.
   */
  public key: OpenKey | null = null;

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
