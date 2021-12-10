import { Reader } from "jsmediatags";
import { TagType } from "jsmediatags/types";
import Peak from "./Peak";
import { TrackAnalysis } from "./TrackAnalysis";

function getBpmTagValue(tagCollection: TagType): number | null {
  // Look for, in order of preference: BPM, TBPM, TMPO
  // FUTURE: Handle TXXX arrays and look for items where data.user_description === 'fBPM'
  let bpmValue: any = '';

  // console.trace(tagCollection.tags);

  if ('BPM' in tagCollection.tags) {
    bpmValue = tagCollection.tags['BPM'].data;
  }
  else if ('TBPM' in tagCollection.tags) {
    bpmValue = tagCollection.tags['TBPM'].data;
  }
  else if ('TMPO' in tagCollection.tags) {
    bpmValue = tagCollection.tags['TMPO'].data;
  }
  else {
    return null;
  }

  // Coalesce to a float value
  if (typeof bpmValue === 'string') {
    bpmValue = parseFloat(bpmValue);
  }

  // Make sure it's a finite number greater than zero
  if (typeof bpmValue === 'number' && Number.isFinite(bpmValue) && bpmValue > 0) {
    return bpmValue;
  }
  else {
    return null;
  }
}

async function getTrackTags(file: File): Promise<TagType> {
  return new Promise((resolve, reject) => {
    new Reader(file)
      .read({
        onSuccess: (tagData) => {
          resolve(tagData)
        },
        onError: (error) => {
          reject(error);
        }
      })
  });
}

async function getPeaks(audioData: ArrayBuffer, minFrequency: number | null, maxFrequency: number | null, expectedMaximumPeaksPerMinute: number): Promise<Peak[]> {
  // For processing, downmix to mono
  // HACK: Assume that the offline audio buffer length won't be any different from the bytebuffer length
  // XXX: Look at getting webkitOfflineAudioContext supported as well
  const SAMPLE_RATE = 44100;
  const audioContext = new window.OfflineAudioContext(1, audioData.byteLength, SAMPLE_RATE);
  
  return audioContext.decodeAudioData(audioData)
    .then((decodedData: AudioBuffer) => {
      const bufferSource = audioContext.createBufferSource();
      let lastNode: AudioNode = bufferSource;

      bufferSource.buffer = decodedData;

      // Add a minimum frequency filter if we need it
      if (minFrequency != null) {
        const minFrequencyFilter = new BiquadFilterNode(audioContext, { type: 'highpass', Q: 1, frequency: minFrequency });

        lastNode.connect(minFrequencyFilter);
        lastNode = minFrequencyFilter;
      }

      // Do the same for the maximum frequency
      if (maxFrequency != null) {
        const maxFrequencyFilter = new BiquadFilterNode(audioContext, { type: 'lowpass', Q: 1, frequency: maxFrequency });

        lastNode.connect(maxFrequencyFilter);
        lastNode = maxFrequencyFilter;
      }

      // Now wire up the destination
      lastNode.connect(audioContext.destination);
      bufferSource.start(0);
      return audioContext.startRendering();
    })
    .then((renderedBuffer: AudioBuffer) => {
      // console.trace('audio rendered', { length: renderedBuffer.length, sampleRate: renderedBuffer.sampleRate, channels: renderedBuffer.numberOfChannels, duration: renderedBuffer.duration });
      const frames = renderedBuffer.getChannelData(0);
      const peaksList: Peak[] = [];
      const INITIAL_THRESHOLD = 0.5;

      for(let frameIdx = 0; frameIdx < frames.length;)
      {
        // See if we're ready to start a new peak
        if (Math.abs(frames[frameIdx]) >= INITIAL_THRESHOLD) 
        {
          // Start a new peak, and mark when it was encountered
          const newPeak = {
            time: frameIdx / SAMPLE_RATE,
            intensity: 0,
            frames: 1
          };

          // Determine the maximum intensity and number of frames it was above the threshold
          do {
            // See if this peak reached a new intensity
            newPeak.intensity = Math.max(newPeak.intensity, Math.abs(frames[frameIdx]))
            newPeak.frames++;

            // Look at the next frame
            frameIdx++;
          } while(frameIdx < frames.length && Math.abs(frames[frameIdx]) >= INITIAL_THRESHOLD)

          peaksList.push(newPeak);

          // Move forward a sixteenth of a second
          frameIdx += Math.ceil(SAMPLE_RATE / 16);
        }

        frameIdx++;
      }

      // See if we have too many peaks - if so, trim
      const expectedMaximumPeaks = Math.ceil(expectedMaximumPeaksPerMinute * renderedBuffer.duration / 60);

      if (peaksList.length > expectedMaximumPeaks) {
        // Sort from least-intense to most-intense
        peaksList.sort((a, b) => a.intensity - b.intensity);

        // Remove the least-intense
        peaksList.splice(0, peaksList.length - expectedMaximumPeaks);

        // Restore implicit time-based sorting order
        peaksList.sort((a, b) => a.time - b.time);
      }

      return peaksList;
    });
}

export async function analyzeTrack(file: File): Promise<TrackAnalysis> {
  const rawByteBuffer = file.arrayBuffer();

  const tags = rawByteBuffer.then(() => getTrackTags(file));
  // const tags = getTrackTags(file);

  const subBass = Promise.resolve([]);
  const bass = Promise.resolve([]);
  const beat = rawByteBuffer.then((byteBuffer) => getPeaks(byteBuffer, 100, 150, 300));
  const treble = Promise.resolve([]);

  return Promise.all([tags, subBass, bass, beat, treble])
    .then((values): TrackAnalysis => {
      const [tagResult, subBassResult, bassResult, beatResult, trebleResult] = values;

      return {
        title: tagResult.tags.title ?? 'Unknown',
        artist: tagResult.tags.artist ?? 'Unknown',
        bpm: getBpmTagValue(tagResult) ?? 120,
        subBass: subBassResult,
        bass: bassResult,
        beat: beatResult,
        treble: trebleResult
      };
    });
}
