import create, { GetState, SetState } from 'zustand';
import { StoreApiWithSubscribeWithSelector, subscribeWithSelector } from 'zustand/middleware'

import { EmptyTrackAnalysis, TrackAnalysis } from './TrackAnalysis';
import { defaultTheme, Theme } from './Themes';

interface VisualizerState {
  /**
   * The analysis for the current track being played.
   */
  analysis: TrackAnalysis;

  /**
   * The theme to use.
   */
  theme: Theme;

  /**
   * A time stamp to indicate that the current track's audio has been seeked.
   */
  audioLastSeeked: number;

  setAnalysis: (newAnalysis: TrackAnalysis) => void;

  setTheme: (newTheme: Theme) => void;

  indicateAudioSeeked: () => void;
}

export const useStore = create<
  VisualizerState,
  SetState<VisualizerState>,
  GetState<VisualizerState>,
  StoreApiWithSubscribeWithSelector<VisualizerState>
>(subscribeWithSelector((set) => ({
  analysis: EmptyTrackAnalysis,
  theme: defaultTheme,
  audioLastSeeked: 0,

  setAnalysis: (newAnalysis) => set(state => { state.analysis = newAnalysis }),
  setTheme: (newTheme) => set(state => { state.theme = newTheme }),
  indicateAudioSeeked: () => set(state => { state.audioLastSeeked = Date.now() })
})));