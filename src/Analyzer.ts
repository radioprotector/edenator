import { Reader } from "jsmediatags";
import { FrameType, TagType } from "jsmediatags/types";
import Peak from "./Peak";
import { OpenKey, TrackAnalysis } from "./TrackAnalysis";

const ANALYZER_SAMPLE_RATE = 44100;

const RECOGNIZED_KEY_VALUES = Object.values(OpenKey);

/**
 * Converts various key formats into a corresponding Open Key Notation representation.
 * @see {@link https://id3.org/id3v2.3.0|TKEY value definition} (TKEY)
 * @see {@link https://mixedinkey.com/harmonic-mixing-guide/|Camelot mixing keys}
 */
const KEY_CONVERSION_CHART: { [key: string]: OpenKey } = {
  // A-flat/G-sharp minor
  '1A': OpenKey.G_Sharp_Minor,
  'G#m': OpenKey.G_Sharp_Minor,
  'Abm': OpenKey.G_Sharp_Minor,

  // B major
  '1B': OpenKey.B_Major,
  'B': OpenKey.B_Major,

  // E-flat/D-sharp minor
  '2A': OpenKey.D_Sharp_Minor,
  'D#m': OpenKey.D_Sharp_Minor,
  'Ebm': OpenKey.D_Sharp_Minor,

  // F-sharp/G-flat major
  '2B': OpenKey.F_Sharp_Major,
  'F#': OpenKey.F_Sharp_Major,
  'Gb': OpenKey.F_Sharp_Major,

  // B-flat/A-sharp minor
  '3A': OpenKey.B_Flat_Minor,
  'A#m': OpenKey.B_Flat_Minor,
  'Bbm': OpenKey.B_Flat_Minor,

  // D-flat/C-sharp major
  '3B': OpenKey.D_Flat_Major,
  'C#': OpenKey.D_Flat_Major,
  'Db': OpenKey.D_Flat_Major,

  // F minor
  '4A': OpenKey.F_Minor,
  'Fm': OpenKey.F_Minor,

  // A-flat/G-sharp major
  '4B': OpenKey.A_Flat_Major,
  'G#': OpenKey.A_Flat_Major,
  'Ab': OpenKey.A_Flat_Major,

  // C minor
  '5A': OpenKey.C_Minor,
  'Cm': OpenKey.C_Minor,

  // E-flat/D-sharp major
  '5B': OpenKey.E_Flat_Major,
  'D#': OpenKey.E_Flat_Major,
  'Eb': OpenKey.E_Flat_Major,

  // G minor
  '6A': OpenKey.G_Minor,
  'Gm': OpenKey.G_Minor,

  // B-flat/A-sharp major
  '6B': OpenKey.B_Flat_Major,
  'A#': OpenKey.B_Flat_Major,
  'Bb': OpenKey.B_Flat_Major,

  // D minor
  '7A': OpenKey.D_Minor,
  'Dm': OpenKey.D_Minor,

  // F major
  '7B': OpenKey.F_Major,
  'F': OpenKey.F_Major,

  // A minor
  '8A': OpenKey.A_Minor,
  'Am': OpenKey.A_Minor,

  // C major
  '8B': OpenKey.C_Major,
  'C': OpenKey.C_Major,

  // E minor
  '9A': OpenKey.E_Minor,
  'Em': OpenKey.E_Minor,

  // G major
  '9B': OpenKey.G_Major,
  'G': OpenKey.G_Major,

  // B minor
  '10A': OpenKey.B_Minor,
  'Bm': OpenKey.B_Minor,

  // D major
  '10B': OpenKey.D_Major,
  'D': OpenKey.D_Major,

  // G-flat/F-sharp minor
  '11A': OpenKey.F_Sharp_Minor,
  'F#m': OpenKey.F_Sharp_Minor,
  'Gbm': OpenKey.F_Sharp_Minor,

  // A major
  '11B': OpenKey.A_Major,
  'A': OpenKey.A_Major,

  // D-flat/C-sharp minor
  '12A': OpenKey.C_Sharp_Minor,
  'C#m': OpenKey.C_Sharp_Minor,
  'Dbm': OpenKey.C_Sharp_Minor,

  // E major
  '12B': OpenKey.E_Major,
  'E': OpenKey.E_Major,

  // Map off-key items to '0' placeholder
  'o': OpenKey.OffKey,
  'O': OpenKey.OffKey
};

/**
 * Describes the parameters to use for a specific song peak analysis pass.
 */
interface PeakAnalysisArgs {
  minFrequency: number | null;
  
  maxFrequency: number | null;
  
  expectedMaxPeaksPerMinute: number;

  initialAbsoluteThreshold: number;

  initialRelativeThreshold: number;

  sustainAbsoluteThreshold: number;

  sustainRelativeThreshold: number;
}

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
          // Wrap the jsmediatagsError into a true error object
          // XXX: This won't let us use options.cause
          const wrappedError = new Error(error.info);
          wrappedError.name = 'MediaTagsError';

          reject(wrappedError);
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

/**
 * Attempts to retrieve the BPM of the track as stored in its metadata tags.
 * @param tagCollection The collection of tags to search.
 * @returns The fractional BPM, if found; otherwise, null.
 */
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

/**
 * Attempts to retrieve the key of the track as stored in its metadata tags.
 * @param tagCollection The collection of tags to search.
 * @returns The OpenKey representation of the key, if found; otherwise, null.
 */
function getKeyTagValue(tagCollection: TagType): OpenKey | null {
  let keyTag = findTagValue(tagCollection, ['KEY', 'TKEY'], ['INITIAL KEY', 'INITIAL_KEY']);
  let keyValue: string = '';

  if (keyTag === null) {
    return null;
  }
  else {
    keyValue = keyTag.data.toString();
  }

  // Remove spaces
  keyValue = keyValue.replace(/ /, '');

  // Convert appropriate values to open key notation
  if (keyValue in KEY_CONVERSION_CHART) {
    keyValue = KEY_CONVERSION_CHART[keyValue];
  }

  // See if this matches a recognized key value
  if (keyValue !== null && RECOGNIZED_KEY_VALUES.includes(keyValue.trim() as OpenKey)) {
    return keyValue as OpenKey;
  }
  else {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`unrecognized key value: ${keyValue}`);
    }
    return null;
  }
}

/**
 * Gets the track volume for the specified audio data.
 * @param audioData The raw encoded audio data.
 * @returns A promise for the equivalent mono track volume, smoothed and sampled at periodic 
 */
function getTrackVolume(audioData: ArrayBuffer): Promise<Float32Array> {
  // For processing, downmix to mono
  // HACK: We need to use one audio context just so we can decode the audio (and get the correct buffer length)
  // After that, we use a *separate* audio context with the correct buffer length
  // XXX: Look at getting webkitOfflineAudioContext supported as well
  const dummyAudioContext = new window.OfflineAudioContext(1, ANALYZER_SAMPLE_RATE, ANALYZER_SAMPLE_RATE);

  return dummyAudioContext.decodeAudioData(audioData)
  .then((decodedData: AudioBuffer) => {
    // if (process.env.NODE_ENV !== 'production') {
    //   console.debug('audio decoded', decodedData);
    // }
    const audioContext = new window.OfflineAudioContext(1, decodedData.length, ANALYZER_SAMPLE_RATE);
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

    // if (process.env.NODE_ENV !== 'production') {
    //   console.debug('volume analyzed', renderedBuffer, smoothedVolume);
    // }
    return smoothedVolume;
  });
}

/**
 * Gets peaks from the provided audio data that meet the specified criteria.
 * @param audioData The raw encoded audio data.
 * @param overallVolume The mono volume progression for the entire track.
 * @param analysisArgs The parameters to use for the analysis.
 * @returns A promise for the relevant peak collection.
 */
function getPeaks(audioData: ArrayBuffer, overallVolume: Float32Array, analysisArgs: PeakAnalysisArgs): Promise<Peak[]> {
  // For processing, downmix to mono
  // XXX: Look at getting webkitOfflineAudioContext supported as well
  const audioContext = new window.OfflineAudioContext(1, overallVolume.length, ANALYZER_SAMPLE_RATE);
  
  return audioContext.decodeAudioData(audioData)
    .then((decodedData: AudioBuffer) => {
      const bufferSource = audioContext.createBufferSource();
      let lastNode: AudioNode = bufferSource;

      bufferSource.buffer = decodedData;

      // Add a minimum frequency filter if we need it
      if (analysisArgs.minFrequency != null) {
        const minFrequencyFilter = new BiquadFilterNode(audioContext, { type: 'highpass', Q: 1, frequency: analysisArgs.minFrequency });

        lastNode.connect(minFrequencyFilter);
        lastNode = minFrequencyFilter;
      }

      // Do the same for the maximum frequency
      if (analysisArgs.maxFrequency != null) {
        const maxFrequencyFilter = new BiquadFilterNode(audioContext, { type: 'lowpass', Q: 1, frequency: analysisArgs.maxFrequency });

        lastNode.connect(maxFrequencyFilter);
        lastNode = maxFrequencyFilter;
      }

      // Now wire up the destination
      lastNode.connect(audioContext.destination);
      bufferSource.start(0);
      return audioContext.startRendering();
    })
    .then((renderedBuffer: AudioBuffer) => {    
      // if (process.env.NODE_ENV !== 'production') {
      //   console.debug(`buffer for ${analysisArgs.minFrequency} to ${analysisArgs.maxFrequency}`, renderedBuffer);
      // }
      const frames = renderedBuffer.getChannelData(0);
      const peaksList: Peak[] = [];
      const peaksHistogram: { [roundedIntensity: string]: number } = {};

      for(let frameIdx = 0; frameIdx < frames.length;)
      {
        // Make sure we have audio data on this frame
        if (overallVolume[frameIdx] === 0) {
          frameIdx++;
          continue;
        }

        let absoluteIntensity = Math.abs(frames[frameIdx]);
        let relativeIntensity = absoluteIntensity / overallVolume[frameIdx];

        // See if we're ready to start a new peak
        if (absoluteIntensity >= analysisArgs.initialAbsoluteThreshold && relativeIntensity >= analysisArgs.initialRelativeThreshold)
        {
          // Start a new peak, and mark when it was encountered
          const newPeak: Peak = {
            time: frameIdx / ANALYZER_SAMPLE_RATE,
            intensity: 0,
            intensityNormalized: 0,
            end: 0 // To be calculated
          };

          // Determine the maximum intensity and number of frames it was above the threshold
          do {
            // See if this peak reached a new intensity
            newPeak.intensity = Math.max(newPeak.intensity, absoluteIntensity)
            newPeak.intensityNormalized = Math.max(newPeak.intensityNormalized, relativeIntensity)

            // Look at the next frame.
            // If we have audio data, recalculate the current intensity (both absolute and normalized)
            // and see whether we can keep going based on the *sustain* thresholds
            frameIdx++;

            if (frameIdx >= frames.length || overallVolume[frameIdx] === 0) {
              break;
            }

            absoluteIntensity = Math.abs(frames[frameIdx]);
            relativeIntensity = absoluteIntensity / overallVolume[frameIdx];
          } while(absoluteIntensity >= analysisArgs.sustainAbsoluteThreshold && relativeIntensity >= analysisArgs.sustainRelativeThreshold)

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

          // Move forward 1/16 of a second
          frameIdx += Math.ceil(ANALYZER_SAMPLE_RATE / 16);
        }

        frameIdx++;
      }
  
      if (process.env.NODE_ENV !== 'production') {
        console.debug(`peak histogram for ${analysisArgs.minFrequency} to ${analysisArgs.maxFrequency}`, peaksHistogram);
      }

      // See if we have too many peaks - if so, trim
      const expectedMaximumPeaks = Math.ceil(analysisArgs.expectedMaxPeaksPerMinute * renderedBuffer.duration / 60);

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
        if (process.env.NODE_ENV !== 'production') {
          console.debug(`cutting off peaks for ${analysisArgs.minFrequency} to ${analysisArgs.maxFrequency} at ${intensityCutoff}`);
        }

        return peaksList.filter((p) => p.intensityNormalized >= intensityCutoff);
      }

      return peaksList;
    });
}

/**
 * Attempts to detect the BPM from the provided collection of peaks.
 * @param beats The collection of beats that are used to determine the peaks.
 * @param trackLength The length of the track, in seconds.
 * @returns The resulting BPM, if successfully detected; otherwise, null.
 */
function getBpmFromPeaks(beats: Peak[], trackLength: number) : number | null {
  const MINIMUM_INTERVAL = 0.25;

  if (!beats) {
    return null;
  }

  // If we don't have many beats (assume we want probably 45 per minute) also exit out
  const minimumBeats = 45 * (trackLength / 60);

  if (beats.length < minimumBeats) {
    return null;
  }

  // Generate a histogram of the average distance between beats
  const intervalHistogram: { [roundedInterval: string]: number } = {};

  beats.forEach((beat, index) => {
    for(let relativeIndex = 1; relativeIndex < 10; relativeIndex++) {
      // Make sure we don't skip too far out
      if (index + relativeIndex >= beats.length) {
        break;
      }

      // Instead of counting all beats equally, count ones with more intensity
      const interval = beats[index + relativeIndex].time - beat.time;
      const roundedInterval = interval.toFixed(2);
      // const averageIntensity = (beats[index + relativeIndex].intensityNormalized + beat.intensityNormalized) / 2;

      // Skip over beats that happen too soon
      if (interval < MINIMUM_INTERVAL) {
        continue;
      }

      if (roundedInterval in intervalHistogram) {
        // intervalHistogram[roundedInterval] += averageIntensity;
        intervalHistogram[roundedInterval]++;
      }
      else {
        // intervalHistogram[roundedInterval] = averageIntensity;
        intervalHistogram[roundedInterval] = 1;
      }
    }
  });

  // Map that to an equivalent tempo histogram
  const tempoHistogram: { [roundedTempo: string]: number } = {};

  Object.keys(intervalHistogram).forEach((roundedInterval) => {
    const intervalFloat = parseFloat(roundedInterval);
    let tempoForInterval = 60 / (intervalFloat / ANALYZER_SAMPLE_RATE);

    // Adjust to fit within the typical range of 90-180 BPM
    while (tempoForInterval < 90) {
      tempoForInterval *= 2;
    }

    while (tempoForInterval > 180) {
      tempoForInterval /= 2;
    }

    // Round the tempo and add all of its intervals
    const roundedTempoForInterval = tempoForInterval.toFixed(0);

    if (roundedTempoForInterval in tempoHistogram) {
      tempoHistogram[roundedTempoForInterval] += intervalHistogram[roundedInterval];
    }
    else {
      tempoHistogram[roundedTempoForInterval] = intervalHistogram[roundedInterval];
    }
  });

  // Now get the assumed maximum
  const sortedTempos = Object.keys(tempoHistogram)
    .map((k) => {
      return { 
        bpm: parseFloat(k), 
        intervals: tempoHistogram[k]
      };
    })
    .sort((a, b) => b.bpm - a.bpm);

  let modeTempo = 0.0;
  let modeIntervals = 0;
  let totalWeightedTempo = 0.0;
  let totalIntervals = 0.0;

  if (process.env.NODE_ENV !== 'production') {
    console.debug(`histogram for BPM detection`, sortedTempos);
  }

  sortedTempos.forEach((tempo) => {
    if (tempo.intervals > modeIntervals) {
      modeTempo = tempo.bpm;
      modeIntervals = tempo.intervals;
    }

    totalWeightedTempo += (tempo.bpm * tempo.intervals);
    totalIntervals += tempo.intervals;
  });

  const averageTempo = (totalWeightedTempo / totalIntervals);

  // Calculate median
  let medianTempo = 0;

  if (totalIntervals > 2 && sortedTempos.length > 1) {
    // Keep advancing through the sorted tempos list until we've hit halfway in the intervals.
    // Essentially if we have:
    // [{bpm: 120, intervals: 2}, {bpm: 125, intervals: 2}, {bpm: 130, intervals: 2}]
    // then we expect our median BPM to be 125.
    // We'd also expect the same result for:
    // [{bpm: 120, intervals: 2}, {bpm: 130, intervals: 2}]
    let medianIntervals = Math.floor(totalIntervals / 2);
    let medianTempoIdx = 0;

    while (medianIntervals > 0 && medianTempoIdx < sortedTempos.length) {
      medianIntervals -= sortedTempos[medianTempoIdx].intervals;
      medianTempoIdx++;
    }

    // If we hit *exactly* zero, average with the next tempo bucket - otherwise, use the current tempo
    if (medianIntervals === 0) {
      medianTempo = (sortedTempos[medianTempoIdx - 1].bpm + sortedTempos[medianTempoIdx].bpm) / 2;
    }
    else {
      medianTempo = sortedTempos[medianTempoIdx - 1].bpm;
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    console.debug(`calculated BPM mode: ${modeTempo}\tmean: ${averageTempo}\tmedian: ${medianTempo}`);
  }

  return averageTempo;
}

export async function analyzeTrack(file: File): Promise<TrackAnalysis> {
  let tags: TagType;

  try {
    tags = await getTrackTags(file);
  }
  catch (error) {
    return Promise.reject(error);
  }

  const overallVolume = await file.arrayBuffer().then((byteBuffer) => getTrackVolume(byteBuffer));

  const subBass = file.arrayBuffer().then((byteBuffer) => getPeaks(byteBuffer, overallVolume, {
    minFrequency: 20,
    maxFrequency: 50,
    expectedMaxPeaksPerMinute: 60,
    initialAbsoluteThreshold: 0.4,
    initialRelativeThreshold: 0.5,
    sustainAbsoluteThreshold: 0.4,
    sustainRelativeThreshold: 0.5
  }));

  const bass = file.arrayBuffer().then((byteBuffer) => getPeaks(byteBuffer, overallVolume, {
    minFrequency: 50,
    maxFrequency: 90,
    expectedMaxPeaksPerMinute: 120,
    initialAbsoluteThreshold: 0.4,
    initialRelativeThreshold: 0.5,
    sustainAbsoluteThreshold: 0.4,
    sustainRelativeThreshold: 0.5
  }));

  const beat = file.arrayBuffer().then((byteBuffer) => getPeaks(byteBuffer, overallVolume, {
    minFrequency: 90,
    maxFrequency: 200,
    expectedMaxPeaksPerMinute: 300,
    initialAbsoluteThreshold: 0.4,
    initialRelativeThreshold: 0.5,
    sustainAbsoluteThreshold: 0.4,
    sustainRelativeThreshold: 0.5
  }));

  const treble = file.arrayBuffer().then((byteBuffer) => getPeaks(byteBuffer, overallVolume, {
    minFrequency: 2048,
    maxFrequency: null,
    expectedMaxPeaksPerMinute: 120,
    initialAbsoluteThreshold: 0.4,
    initialRelativeThreshold: 0.5,
    sustainAbsoluteThreshold: 0.25,
    sustainRelativeThreshold: 0.35
  }));

  return Promise.all([tags, subBass, bass, beat, treble])
    .then((values): TrackAnalysis => {
      const [tagResult, subBassResult, bassResult, beatResult, trebleResult] = values;
      const trackLength = overallVolume.length / ANALYZER_SAMPLE_RATE;
      const keyFromTags = getKeyTagValue(tagResult);

      let detectedBpm = getBpmTagValue(tagResult);

      // Attempt to detect the BPM from the peaks if either:
      // 1) We couldn't find it in tags
      // 2) We're in development (so we can compare results easily)
      if (!detectedBpm) {
        detectedBpm = getBpmFromPeaks(beatResult, trackLength);
      }
      else if (process.env.NODE_ENV !== 'production') {
        let bpmFromPeaks = getBpmFromPeaks(beatResult, trackLength);
        console.debug(`tag BPM: ${detectedBpm}\tcalculated BPM: ${bpmFromPeaks}`);
      }

      const analysis = new TrackAnalysis()
      analysis.title = tagResult.tags.title ?? 'Unknown Title';
      analysis.artist = tagResult.tags.artist ?? 'Unknown Artist';
      analysis.bpm = detectedBpm ?? 120;
      analysis.length = trackLength;
      analysis.key = keyFromTags;
      analysis.subBass = subBassResult;
      analysis.bass = bassResult;
      analysis.beat = beatResult;
      analysis.treble = trebleResult;
      analysis.trackHash = Math.floor(file.lastModified + file.size) + 1;

      return analysis;
    });
}
