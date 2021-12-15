import { Reader } from "jsmediatags";
import { FrameType, TagType } from "jsmediatags/types";
import Peak from "./Peak";
import { TrackAnalysis } from "./TrackAnalysis";

const ANALYZER_SAMPLE_RATE = 44100;

/**
 * Attempts to get all media tags for the specified file.
 * @param file The file to open.
 * @returns A promise to retrieve all tags for the file.
 */
 function getTrackTags(file: File): Promise<TagType> {
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

/**
 * Attempts to retrieve a tag value that could reside in any number of standard or custom tag values.
 * @param tagCollection The collection of tags to search through.
 * @param standardTags The standard tags to search for, in priority order.
 * @param customTagDescriptions The collection of user descriptions to search for, in priority order, in custom tags if no standard tags were found.
 * @returns The specified tag and value, if found; otherwise, null.
 */
function findTagValue(tagCollection: TagType, standardTags: string[] | null, customTagDescriptions: string[] | null): FrameType | null {
  // First check standard tags
  if (standardTags !== null) {
    for (let standardTagName of standardTags) {
      if (standardTagName in tagCollection.tags) {
        return tagCollection.tags[standardTagName];
      }
    }
  }

  // Then look for custom tags if any are defined
  if (customTagDescriptions !== null) {
    if ('TXXX' in tagCollection.tags) {
      let customTags: FrameType[] = [];

      // See if this is already an array
      if (Array.isArray(tagCollection.tags['TXXX'])) {
        customTags = tagCollection.tags['TXXX'];
      }
      else {
        // Wrap the single tag in an array
        customTags = [tagCollection.tags['TXXX']];
      }

      // Iterate through our custom descriptions
      // XXX: This is technically quadratic but I don't know how long customTagDescriptions will be, realistically
      for (let targetDescription of customTagDescriptions) {
        for (let customTag of customTags) {
          // In this case, the description and value we want is wrapped further in customTag.data
          if ('user_description' in customTag.data && 'data' in customTag.data && customTag.data['user_description'] === targetDescription) {
            return {
              id: targetDescription,
              description: targetDescription,
              data: customTag.data['data']
            };
          }
        }
      }
    }
  }

  return null;
}

function getBpmTagValue(tagCollection: TagType): number | null {
  // Look for, in order of preference: BPM, TBPM, TMPO
  // In addition, we want to support fBPM as set by programs like Traktor
  let bpmTag = findTagValue(tagCollection, ['BPM', 'TBPM', 'TMPO'], ['fBPM']);
  let bpmValue: any = '';

  if (bpmTag === null) {
    return null;
  }
  else {
    bpmValue = bpmTag.data;
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

function getTrackVolume(audioData: ArrayBuffer): Promise<Float32Array> {
  // For processing, downmix to mono
  // HACK: Assume that the offline audio buffer length won't be any different from the bytebuffer length
  // XXX: Look at getting webkitOfflineAudioContext supported as well
  const audioContext = new window.OfflineAudioContext(1, audioData.byteLength, ANALYZER_SAMPLE_RATE);

  return audioContext.decodeAudioData(audioData)
  .then((decodedData: AudioBuffer) => {
    const bufferSource = audioContext.createBufferSource();
    bufferSource.buffer = decodedData;

    // Now wire up the destination
    bufferSource.connect(audioContext.destination);
    bufferSource.start(0);
    return audioContext.startRendering();
  })
  .then((renderedBuffer: AudioBuffer) => {
    const rawSamples = renderedBuffer.getChannelData(0);

    // Convert the channel data to the equivalent volume
    // Code based on https://webaudio.github.io/web-audio-api/#vu-meter-mode
    const smoothedVolume = new Float32Array(rawSamples);
    const SAMPLE_WINDOW = Math.floor(ANALYZER_SAMPLE_RATE / 50);
    const DECAY_FACTOR = 0.9;
    let volume = 0.0;

    for (let frameIdx = 0; frameIdx < rawSamples.length; frameIdx = frameIdx + SAMPLE_WINDOW)
    {
      // Calculate RMS across the sample window
      let sum = 0;
      let rms = 0;
      let windowedIndex = 0;

      for (windowedIndex = 0; windowedIndex < SAMPLE_WINDOW && (frameIdx + windowedIndex) < rawSamples.length; windowedIndex++) {
        sum += rawSamples[frameIdx + windowedIndex] * rawSamples[frameIdx + windowedIndex];
      }

      rms = Math.sqrt(sum / (windowedIndex + 1));

      // Update the volume
      volume = Math.max(rms, volume * DECAY_FACTOR);

      // Fill our sample window with that smoothed volume
      for (windowedIndex = 0; windowedIndex < SAMPLE_WINDOW && (frameIdx + windowedIndex) < rawSamples.length; windowedIndex++) {
        smoothedVolume[frameIdx + windowedIndex] = volume;
      }
    }

    console.debug('volume analyzed', renderedBuffer, smoothedVolume);

    return smoothedVolume;
  });
}

function getPeaks(audioData: ArrayBuffer, overallVolume: Float32Array, minFrequency: number | null, maxFrequency: number | null, expectedMaximumPeaksPerMinute: number): Promise<Peak[]> {
  // For processing, downmix to mono
  // XXX: Look at getting webkitOfflineAudioContext supported as well
  const audioContext = new window.OfflineAudioContext(1, overallVolume.length, ANALYZER_SAMPLE_RATE);
  
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
      console.debug(`buffer for ${minFrequency} to ${maxFrequency}`, renderedBuffer);
      const frames = renderedBuffer.getChannelData(0);
      const peaksList: Peak[] = [];
      const peaksHistogram: { [roundedIntensity: string]: number } = {};
      const ABSOLUTE_THRESHOLD = 0.4;
      const RELATIVE_THRESHOLD = 0.5;

      for(let frameIdx = 0; frameIdx < frames.length;)
      {
        // Make sure we have audio data on this frame
        if (overallVolume[frameIdx] === 0) {
          frameIdx++;
          continue;
        }

        let currentFrameIntensity = Math.abs(frames[frameIdx]);
        let currentFrameIntensityNormalized = currentFrameIntensity / overallVolume[frameIdx];

        // See if we're ready to start a new peak
        if (currentFrameIntensity >= ABSOLUTE_THRESHOLD && currentFrameIntensityNormalized >= RELATIVE_THRESHOLD)
        {
          // Start a new peak, and mark when it was encountered
          const newPeak = {
            time: frameIdx / ANALYZER_SAMPLE_RATE,
            intensity: 0,
            intensityNormalized: 0,
            frames: 0,
            end: 0 // To be calculated
          };

          // Determine the maximum intensity and number of frames it was above the threshold
          do {
            // See if this peak reached a new intensity
            newPeak.intensity = Math.max(newPeak.intensity, currentFrameIntensity)
            newPeak.intensityNormalized = Math.max(newPeak.intensityNormalized, currentFrameIntensityNormalized)
            newPeak.frames++;

            // Look at the next frame.
            // If we have audio data, recalculate the current intensity (both absolute and normalized)
            // and see whether we can keep going
            frameIdx++;

            if (frameIdx >= frames.length || overallVolume[frameIdx] === 0) {
              break;
            }

            currentFrameIntensity = Math.abs(frames[frameIdx]);
            currentFrameIntensityNormalized = currentFrameIntensity / overallVolume[frameIdx];

            // if (currentFrameIntensityNormalized > 1) {
            //   console.debug('INTENSITY OUT OF RANGE', { currentFrameIntensity, currentFrameIntensityNormalized });
            // }
          } while(currentFrameIntensity >= ABSOLUTE_THRESHOLD && currentFrameIntensityNormalized >= RELATIVE_THRESHOLD)

          // Now calculate the end of the peak
          newPeak.end = frameIdx / ANALYZER_SAMPLE_RATE;

          // Store the peak
          peaksList.push(newPeak);

          // Update the histogram
          const roundedIntensity = newPeak.intensityNormalized.toFixed(2);

          if (roundedIntensity in peaksHistogram) {
            peaksHistogram[roundedIntensity]++;
          }
          else {
            peaksHistogram[roundedIntensity] = 1;
          }

          // Move forward 1/32 of a second
          frameIdx += Math.ceil(ANALYZER_SAMPLE_RATE / 32);
        }

        frameIdx++;
      }

      console.debug(`peak histogram for ${minFrequency} to ${maxFrequency}`, peaksHistogram);

      // See if we have too many peaks - if so, trim
      const expectedMaximumPeaks = Math.ceil(expectedMaximumPeaksPerMinute * renderedBuffer.duration / 60);

      if (peaksList.length > expectedMaximumPeaks) {
        // Look at the histogram to figure out the cutoff.
        // Convert each truncated bucket back to its actual intensity float, and sort intensity in decreasing order
        const sortedBuckets = Object.keys(peaksHistogram)
          .map((k) => {
            return { 
              intensity: parseFloat(k), 
              count: peaksHistogram[k]
            };
          })
          .sort((a, b) => b.intensity - a.intensity);

        // Start at the maximum intensity, and keep decreasing until we get more peaks
        let intensityIndex = 0;
        let intensityCutoff = sortedBuckets[0].intensity;
        let totalPeaks = sortedBuckets[0].count;

        while(totalPeaks < expectedMaximumPeaks && intensityIndex < sortedBuckets.length - 1)
        {
          intensityIndex++;
          intensityCutoff = sortedBuckets[intensityIndex].intensity;
          totalPeaks += sortedBuckets[intensityIndex].count;
        }

        // Once we determine the cutoff, filter out elements that don't match
        console.debug(`cutting off peaks for ${minFrequency} to ${maxFrequency} at ${intensityCutoff}`);
        return peaksList.filter((p) => p.intensityNormalized >= intensityCutoff);
      }

      return peaksList;
    });
}

export async function analyzeTrack(file: File): Promise<TrackAnalysis> {
  const tags = getTrackTags(file);
  const overallVolume = await file.arrayBuffer().then((byteBuffer) => getTrackVolume(byteBuffer));

  const subBass = file.arrayBuffer().then((byteBuffer) => getPeaks(byteBuffer, overallVolume, 20, 50, 60));
  const bass = file.arrayBuffer().then((byteBuffer) => getPeaks(byteBuffer, overallVolume, 50, 90, 120));
  const beat = file.arrayBuffer().then((byteBuffer) => getPeaks(byteBuffer, overallVolume, 90, 250, 300));
  const treble = file.arrayBuffer().then((byteBuffer) => getPeaks(byteBuffer, overallVolume, 2048, null, 120));

  return Promise.all([tags, subBass, bass, beat, treble])
    .then((values): TrackAnalysis => {
      const [tagResult, subBassResult, bassResult, beatResult, trebleResult] = values;
      const bpmFromTags = getBpmTagValue(tagResult);

      return {
        title: tagResult.tags.title ?? 'Unknown',
        artist: tagResult.tags.artist ?? 'Unknown',
        bpm: bpmFromTags ?? 120,
        subBass: subBassResult,
        bass: bassResult,
        beat: beatResult,
        treble: trebleResult
      };
    });
}
