import create from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware'

import { EmptyTrackAnalysis, TrackAnalysis } from './TrackAnalysis';
import { defaultTheme, Theme } from './themes';
import { HapticManager } from './HapticManager';

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

  /**
   * The manager for haptic feedback.
   */
  hapticManager: HapticManager,

  setAnalysis: (newAnalysis: TrackAnalysis) => void;

  setTheme: (newTheme: Theme) => void;

  indicateAudioSeeked: () => void;
}

export const useStore = create<VisualizerState>()(subscribeWithSelector((set) => ({
  analysis: EmptyTrackAnalysis,
  theme: defaultTheme,
  audioLastSeeked: 0,
  hapticManager: new HapticManager(),

  setAnalysis: (newAnalysis) => set({ analysis: newAnalysis }),
  setTheme: (newTheme) => set({ theme: newTheme }),
  indicateAudioSeeked: () => set({ audioLastSeeked: Date.now() })
})));