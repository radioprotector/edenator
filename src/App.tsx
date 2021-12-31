import React, { useRef, useCallback, useMemo, useEffect, Suspense, useState } from 'react';
import { Stats } from '@react-three/drei';

import { analyzeTrack } from './Analyzer';
import { useStore } from './visualizerStore';
import { getNextTheme, getThemeForTrack } from './Themes';

import './App.css';
import AppStyles from './AppStyles';
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
  const introElement = useRef<HTMLDivElement>(null!);
  const sourceFileElement = useRef<HTMLInputElement>(null!);
  const dummyFileButtonElement = useRef<HTMLButtonElement>(null!);
  const [fileError, setFileError] = useState('');

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

  const dummyFilePickerClicked = () => {
    sourceFileElement.current.click();
  };

  const selectedFileChange = () => {
    if (sourceFileElement.current?.files?.length === 1)
    {
      // Disable the file picker while we analyze the track
      dummyFileButtonElement.current.disabled = true;
      dummyFileButtonElement.current.innerText = "Analyzing...";
      sourceFileElement.current.disabled = true;
      sourceFileElement.current.readOnly = true;

      // Reset the file error message
      setFileError('');

      // Disable the audio player while we analyze - we don't want
      // weird concurrency issues when we're updating the element
      if (audioPlayerElement.current) {
        audioPlayerElement.current.pause();
        audioPlayerElement.current.controls = false;
      }

      const trackFile = sourceFileElement.current.files[0];

      analyzeTrack(trackFile)
        .then((analyzerResult) => {
          if (process.env.NODE_ENV !== 'production') {
            console.log(analyzerResult);
          }

          // Create a URL for the new file
          const newAudioUrl = URL.createObjectURL(trackFile);

          // Switch the audio over to that
          if (audioPlayerElement.current !== null) {
            audioPlayerElement.current.src = newAudioUrl;
            audioPlayerElement.current.load();

            // HACK: Play the audio player in an event loop *after* we've finished handling the file selection.
            // Even though the file selector has been clicked, we're still in the event handler for that
            // so Chrome's auto-play blocking doesn't consider the interaction "complete".
            window.setTimeout(() => {
              if (audioPlayerElement.current) {
                audioPlayerElement.current.play();
              }
            })       
          }

          // Free the previously-playing URL over if we had one
          if (playingFileUrl !== '') {
            URL.revokeObjectURL(playingFileUrl);
          }

          playingFileUrl = newAudioUrl;
          introElement.current.hidden = true;
          setStoreAnalysis(analyzerResult);
          setStoreTheme(getThemeForTrack(analyzerResult));
          setStoreAudioSeeked();
        })
        .catch((reason: any) => {
          console.error(reason);
          setFileError(`Error opening "${trackFile?.name}":\n${reason.toString()}`);
        })
        .finally(() => {
          // Re-enable the file picker
          if (sourceFileElement.current) {
            sourceFileElement.current.disabled = false;
            sourceFileElement.current.readOnly = false;
          }

          if (dummyFileButtonElement.current) {
            dummyFileButtonElement.current.disabled = false;
            dummyFileButtonElement.current.innerText = "Choose a track";
          }

          if (audioPlayerElement.current && audioPlayerElement.current.src) {
            audioPlayerElement.current.controls = true;
          }
        })
    }
  };

  const cycleTheme = () => {
    const nextTheme = getNextTheme(useStore.getState().theme);
    
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`switching to ${nextTheme.name} theme`);
    }

    setStoreTheme(nextTheme);
  };

  // Update the page title based on the currently playing song
  useEffect(() => useStore.subscribe(
    (state) => state.analysis, 
    (newAnalysis) => {
      if (newAnalysis !== null && !newAnalysis.isEmpty && newAnalysis.artist !== '' && newAnalysis.title !== '') {
        document.title = `Edenator (${newAnalysis.artist} - ${newAnalysis.title})`;
      }
      else {
        document.title = 'Edenator';
      }
    }),
    []);

  return (
    <div>
      <AppStyles />
      <div
        ref={introElement}
        className='app-title'
      > 
        <h1>
          Edenator
        </h1>
        <p>
          Start by choosing a song.
        </p>
        <p>
          <strong><em>The visuals used by this application may not be suitable for
          people with photosensitive epilepsy.</em></strong>
        </p>
      </div>
      <div
        className="app-error"
        hidden={!fileError}
      >
        {fileError}
        <button
          type="button"
          onClick={() => setFileError('')}
        >
          Dismiss
        </button>
      </div>
      <div id="filePicker">
        <button
          type="button"
          ref={dummyFileButtonElement}
          id="dummyFilePicker"
          onClick={dummyFilePickerClicked}
        >
          Choose a track
        </button>
        <input
          type="file"
          ref={sourceFileElement}
          id="sourceFile"
          aria-label="Choose an audio file"
          accept="audio/*"
          onChange={selectedFileChange}
        />
      </div>
      <button
        type="button"
        id="themeCycler"
        onClick={cycleTheme}
      >
        Switch theme
      </button>
      <audio
        ref={audioPlayerRef}
        id="audioPlayer"
        onSeeked={setStoreAudioSeeked}
      >
      </audio>
      <div id="canvas-container">
        <Suspense fallback={null}>
          <Visualizer
            audio={audioPlayerElement}
            analyser={audioAnalyser}
          />
        </Suspense>
      </div>
      {/* Only include stats in development */}
      {
        process.env.NODE_ENV !== 'production'
        &&
        <Stats
          showPanel={0}
          className="stats"
        />
      }   
    </div>
  );
}

export default App;
