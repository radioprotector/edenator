import React, { useRef, useCallback, useState, useMemo, useEffect } from 'react';
import { analyzeTrack } from './Analyzer';
import { EmptyTrackAnalysis, TrackAnalysis } from './TrackAnalysis';

import './App.css';
import Visualizer from './Visualizer';

function App(): JSX.Element {
  // Keep track of what we played last so we can free the object URL when switching tracks
  let playingFileUrl: string = '';

  // Keep track of our current song analysis as well as a sentinel timestamp for when we've skipped around
  // and need to ensure that all time-based queues are alerted
  const [currentAnalysis, updateCurrentAnalysis] = useState(EmptyTrackAnalysis);
  const [audioLastSeeked, indicateAudioSeeked] = useState(0);

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
        .then((analyzerResult: TrackAnalysis) => {
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
          updateCurrentAnalysis(analyzerResult);
          indicateAudioSeeked(Date.now());
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

  // When the audio track changes position abnormally, we need to re-set time-based indices
  const onAudioSeeked = () => {
    // console.debug('audio seek');
    indicateAudioSeeked(Date.now());
  };

  // Update the page title based on the currently playing song
  useEffect(() => {
    if (currentAnalysis !== null && currentAnalysis.artist !== '' && currentAnalysis.title !== '') {
      document.title = `Edenator (${currentAnalysis.artist} - ${currentAnalysis.title})`;
    }
    else {
      document.title = 'Edenator';
    }
  }, [currentAnalysis])

  return (
    <div>
      <label htmlFor="sourceFile">
        Choose an audio file
        <input type="file" ref={sourceFileElement} id="sourceFile" accept="audio/*" onChange={selectedFileChange} />
      </label>
      <audio ref={audioPlayerRef} id="audioPlayer" onSeeked={onAudioSeeked} controls></audio>
      <div id="canvas-container">
        <Visualizer audio={audioPlayerElement} analyser={audioAnalyser} trackAnalysis={currentAnalysis} audioLastSeeked={audioLastSeeked} />
      </div>
    </div>
  );
}

export default App;
