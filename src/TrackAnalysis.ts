import Peak from "./Peak";

export interface TrackAnalysis
{
  title: string;

  artist: string;

  bpm: number;

  subBass: Peak[];

  bass: Peak[];

  beat: Peak[];

  treble: Peak[];
}

export const EmptyTrackAnalysis: TrackAnalysis = {
  title: '',
  artist: '',
  bpm: 120,
  subBass: [],
  bass: [],
  beat: [],
  treble: []
};