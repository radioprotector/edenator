import { useRef, useCallback, useEffect, Suspense, useState } from 'react';
import { Stats } from '@react-three/drei';

import { analyzeTrack } from '../store/analyzer';
import { useStore } from '../store/visualizerStore';
import { getThemeForTrack } from '../store/themes';

import './App.css';
import AppStyles from './AppStyles';
import Visualizer from './Visualizer';
import HapticFeedbackButton from './HapticFeedbackButton';
import ThemeCyclerButton from './ThemeCyclerButton';
import ThemeReviewer from './ThemeReviewer';

function isSafari(): boolean {
  return navigator.userAgent.indexOf('AppleWebKit') > -1 && navigator.userAgent.indexOf('Chrome') === -1;
}

function getAllowedAudioFileTypes(): string {
  // Work around Webkit bug https://bugs.webkit.org/show_bug.cgi?id=34442
  if (isSafari()) {
    return '.mp3,.m4a,.ogg,.aac,.flac';
  }
  else {
    return 'audio/*';
  }
}

function App(): JSX.Element {
  // Keep track of what we played last so we can free the object URL when switching tracks
  let playingFileUrl: string = '';

  // Wire up store hooks
  const setStoreAnalysis = useStore(store => store.setAnalysis);
  const setStoreTheme = useStore(store => store.setTheme);
  const setStoreAudioSeeked = useStore(store => store.indicateAudioSeeked);

  // XXX: Investigate supprting webkitAudioContext
  // audioContext is a ref so that we can try to preserve state during fast-refresh in Chrome
  const audioContext = useRef(new AudioContext());
  const introElement = useRef<HTMLDivElement>(null!);
  const sourceFileElement = useRef<HTMLInputElement>(null!);
  const dummyFileButtonElement = useRef<HTMLButtonElement>(null!);
  const [fileError, setFileError] = useState('');

  // These are indirect refs set up via audio player callback
  const audioPlayerElement = useRef<HTMLAudioElement | null>(null);
  const audioAnalyser = useRef<AnalyserNode | null>(null);

  // Like audioContext, this is a ref so that we can preserve it during Chrome fast-refresh
  const mediaElementSourceNodes = useRef(new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>());
  
  // Ensure that the audio player has an audio context/analyzer node set up
  const audioPlayerRef = useCallback(
    (node: HTMLAudioElement) => {
      if (node != null) {
        // HACK: Work around hot-reload issues in Chrome by ensuring we re-use media source nodes
        // https://stackoverflow.com/a/39725071
        let audioSource: MediaElementAudioSourceNode;

        if (mediaElementSourceNodes.current.has(node)) {
          audioSource = mediaElementSourceNodes.current.get(node)!;
        }
        else {
          audioSource = new MediaElementAudioSourceNode(audioContext.current, { mediaElement: node });
          mediaElementSourceNodes.current.set(node, audioSource);
        }

        const analyser = new AnalyserNode(audioContext.current, { fftSize: 128 });

        audioSource.connect(analyser);
        analyser.connect(audioContext.current.destination);

        audioPlayerElement.current = node;
        audioAnalyser.current = analyser;
      }
    },
    [audioContext],
  );

  const dummyFilePickerClicked = () => {
    // HACK: Work around Mobile Safari autoplay limitations:
    // http://www.schillmania.com/projects/soundmanager2/doc/technotes/#mobile-device-limitations
    // If we have an audio player but haven't wired up a source yet, set one and load
    if (isSafari() && audioContext.current && audioPlayerElement.current && !audioPlayerElement.current.src) {
      try {
        audioContext.current.resume();
        audioPlayerElement.current.play();
      }
      catch {
      }
    }

    // Now open the file picker
    sourceFileElement.current.click();
  };

  const selectedFileChange = () => {
    if (sourceFileElement.current?.files?.length === 1) {
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

            // HACK: As needed, start the audio player in an event loop *after* we've finished handling the file selection.
            // Even though the file selector has been clicked, we're still in the event handler for that
            // so Chrome's auto-play blocking doesn't consider the interaction "complete".
            const initialContextPromise = audioContext.current.resume();
            const initialPlayerPromise = audioPlayerElement.current.play();

            if (initialContextPromise !== undefined && initialPlayerPromise !== undefined) {

              Promise.all([initialContextPromise, initialPlayerPromise])
                .then(() => {
                  // We're good!
                })
                .catch(() => {
                  // We need to wait for the next event loop
                  window.setTimeout(() => {
                    if (audioContext.current && audioPlayerElement.current) {
                      audioContext.current.resume();
                      audioPlayerElement.current.play();
                    }
                  });
                });
            }
          }

          // Free the previously-playing URL over if we had one
          if (playingFileUrl !== '') {
            URL.revokeObjectURL(playingFileUrl);
          }

          playingFileUrl = newAudioUrl;
          introElement.current.hidden = true;
          const newTheme = getThemeForTrack(analyzerResult);

          if (process.env.NODE_ENV !== 'production') {
            console.debug(`switching to ${newTheme.name} theme`);
          }

          setStoreAnalysis(analyzerResult);
          setStoreTheme(newTheme);
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
          An in-browser audio visualizer.
          Start by choosing a track.
        </p>
        <p>
          <strong><em>The visuals used by this application may not be suitable for
          people with photosensitive epilepsy.</em></strong>
        </p>
        <p>
          This visualizer requires support for WebGL 2.0 and the Web Audio API.
          All audio processing is performed in-browser and is not uploaded.
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
          className="btn"
          onClick={dummyFilePickerClicked}
        >
          Choose a track
        </button>
        <input
          type="file"
          ref={sourceFileElement}
          id="sourceFile"
          aria-label="Choose an audio file"
          accept={getAllowedAudioFileTypes()}
          onChange={selectedFileChange}
        />
      </div>

      <div
        id="interfaceButtonRow"
      >
        <ThemeCyclerButton />
        <HapticFeedbackButton />
      </div>

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
      {/* Only include stats and theme reviewer in development */}
      {
        process.env.NODE_ENV !== 'production'
        &&
        <Stats
          showPanel={0}
          className="stats"
        />
      }
      {
        process.env.NODE_ENV !== 'production'
        &&
        <ThemeReviewer />
      }
    </div>
  );
}

export default App;
