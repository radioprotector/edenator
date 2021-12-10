import React, { useRef, useCallback, useState } from 'react';
import { analyzeTrack } from './Analyzer';
import './App.css';
import { EmptyTrackAnalysis, TrackAnalysis } from './TrackAnalysis';

function App(): JSX.Element {
  // Keep track of what we played last
  let playingFileUrl: string = '';

  const [currentAnalysis, updateCurrentAnalysis] = useState(EmptyTrackAnalysis);

  // XXX: Investigate supprting webkitAudioContext
  const audioContext = new AudioContext();
  const sourceFileElement = useRef<HTMLInputElement>(null);

  // These are indirect refs set up via audio player callback
  const audioPlayerElement = useRef<HTMLAudioElement | null>(null);
  const audioAnalyser = useRef<AnalyserNode | null>(null);
  
  // Ensure that the audio player has an audio context/analyzer node set up
  const audioPlayerRef = useCallback(
    (node: HTMLAudioElement) => {
      const audioSource = new MediaElementAudioSourceNode(audioContext, { mediaElement: node });
      const analyser = new AnalyserNode(audioContext, { fftSize: 128 });

      audioSource.connect(analyser);
      analyser.connect(audioContext.destination);

      audioPlayerElement.current = node;
      audioAnalyser.current = analyser;
    },
    [],
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

  return (
    <div>
      <label htmlFor="sourceFileElement">
        Choose an audio file
        <input type="file" ref={sourceFileElement} id="sourceFileElement" accept="audio/*" onChange={selectedFileChange} />
      </label>
      <audio ref={audioPlayerRef} id="audioPlayerElement" controls></audio>
    </div>
  );
}

export default App;
