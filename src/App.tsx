import React, { useRef, useCallback, useMemo, useEffect, Suspense } from 'react';
import { Stats } from '@react-three/drei';

import { analyzeTrack } from './Analyzer';
import { useStore } from './visualizerStore';
import { getThemeForTrack } from './Themes';

import './App.css';
import Visualizer from './Visualizer';

function App(): JSX.Element {
  // Keep track of what we played last so we can free the object URL when switching tracks
  let playingFileUrl: string = '';

  // Wire up store hooks
  const setStoreAnalysis = useStore(store => store.setAnalysis);
  const setStoreTheme = useStore(store => store.setTheme);
  const setStoreAudioSeeked = useStore(store => store.indicateAudioSeeked);

  // XXX: Investigate supprting webkitAudioContext
  const audioContext = useMemo(() => new AudioContext(), []);
  const sourceFileElement = useRef<HTMLInputElement>(null);

  // These are indirect refs set up via audio player callback
  const audioPlayerElement = useRef<HTMLAudioElement | null>(null);
  const audioAnalyser = useRef<AnalyserNode | null>(null);
  
  // Ensure that the audio player has an audio context/analyzer node set up
  const audioPlayerRef = useCallback(
    (node: HTMLAudioElement) => {
      if (node != null) {
        const audioSource = new MediaElementAudioSourceNode(audioContext, { mediaElement: node });
        const analyser = new AnalyserNode(audioContext, { fftSize: 128 });

        audioSource.connect(analyser);
        analyser.connect(audioContext.destination);

        audioPlayerElement.current = node;
        audioAnalyser.current = analyser;
      }
    },
    [audioContext],
  );

  const selectedFileChange = () => {
    if (sourceFileElement.current?.files?.length === 1)
    {
      // Disable the file picker while we analyze the track
      sourceFileElement.current.disabled = true;
      sourceFileElement.current.readOnly = true;

      const trackFile = sourceFileElement.current.files[0];

      analyzeTrack(trackFile)
        .then((analyzerResult) => {
          console.log(analyzerResult);

          // Create a URL for the new file
          const newAudioUrl = URL.createObjectURL(trackFile);

          // Switch the audio over to that
          if (audioPlayerElement.current !== null) {
            audioPlayerElement.current.src = newAudioUrl;
            audioPlayerElement.current.load();
            audioPlayerElement.current.play();
          }

          // Free the previously-playing URL over if we had one
          if (playingFileUrl !== '') {
            URL.revokeObjectURL(playingFileUrl);
          }

          playingFileUrl = newAudioUrl;
          setStoreAnalysis(analyzerResult);
          setStoreTheme(getThemeForTrack(analyzerResult));
          setStoreAudioSeeked();
        })
        .catch((reason: any) => {
          console.error(reason);
        })
        .finally(() => {
          // Re-enable the file picker
          if (sourceFileElement.current) {
            sourceFileElement.current.disabled = false;
            sourceFileElement.current.readOnly = false;
          }
        })
    }
  };

  // Update the page title based on the currently playing song
  useEffect(() => useStore.subscribe(
    (state) => state.analysis, 
    (newAnalysis) => {
      if (newAnalysis !== null && newAnalysis.artist !== '' && newAnalysis.title !== '') {
        document.title = `Edenator (${newAnalysis.artist} - ${newAnalysis.title})`;
      }
      else {
        document.title = 'Edenator';
      }
    }),
    []);

  return (
    <div>
      <label htmlFor="sourceFile">
        Choose an audio file
        <input
          type="file"
          ref={sourceFileElement}
          id="sourceFile"
          accept="audio/*"
          onChange={selectedFileChange}
        />
      </label>
      <audio
        ref={audioPlayerRef}
        id="audioPlayer"
        onSeeked={setStoreAudioSeeked}
        controls>
      </audio>
      <div id="canvas-container">
        <Suspense fallback={null}>
          <Visualizer
            audio={audioPlayerElement}
            analyser={audioAnalyser}
          />
        </Suspense>
      </div>
      <Stats
        showPanel={0}
        className="stats"
      />
    </div>
  );
}

export default App;
