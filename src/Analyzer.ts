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

function getPeaks(audioData: ArrayBuffer, minFrequency: number | null, maxFrequency: number | null, expectedMaximumPeaksPerMinute: number): Promise<Peak[]> {
  // For processing, downmix to mono
  // HACK: Assume that the offline audio buffer length won't be any different from the bytebuffer length
  // XXX: Look at getting webkitOfflineAudioContext supported as well
  const audioContext = new window.OfflineAudioContext(1, audioData.byteLength, ANALYZER_SAMPLE_RATE);
  
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
            time: frameIdx / ANALYZER_SAMPLE_RATE,
            intensity: 0,
            frames: 1,
            end: 0 // To be calculated
          };

          // Determine the maximum intensity and number of frames it was above the threshold
          do {
            // See if this peak reached a new intensity
            newPeak.intensity = Math.max(newPeak.intensity, Math.abs(frames[frameIdx]))
            newPeak.frames++;

            // Look at the next frame
            frameIdx++;
          } while(frameIdx < frames.length && Math.abs(frames[frameIdx]) >= INITIAL_THRESHOLD)

          // Now calculate the end of the peak
          newPeak.end = frameIdx / ANALYZER_SAMPLE_RATE;

          // Store the peak
          peaksList.push(newPeak);

          // Move forward 1/32 of a second
          frameIdx += Math.ceil(ANALYZER_SAMPLE_RATE / 32);
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
  const tags = getTrackTags(file);
  const subBass = file.arrayBuffer().then((byteBuffer) => getPeaks(byteBuffer, 20, 60, 60));
  const bass = file.arrayBuffer().then((byteBuffer) => getPeaks(byteBuffer, 60, 100, 120));
  const beat = file.arrayBuffer().then((byteBuffer) => getPeaks(byteBuffer, 100, 250, 300));
  const treble = file.arrayBuffer().then((byteBuffer) => getPeaks(byteBuffer, 2048, null, 120));

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
