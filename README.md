# Edenator

Edenator is a browser-based music visualizer, implemented using the following libraries:

- [React](https://reactjs.org/)
- [three.js](https://threejs.org/) and corresponding helper libraries:
  - [react-three-fiber](https://docs.pmnd.rs/react-three-fiber/getting-started/introduction)
  - [drei](https://docs.pmnd.rs/drei/introduction)
  - [react-postprocessing](https://docs.pmnd.rs/react-postprocessing/introduction)
- [zustand](https://docs.pmnd.rs/zustand/introduction)
- [styled-components](https://styled-components.com/)
- [jsmediatags](https://github.com/aadsm/jsmediatags)

This project is written in TypeScript and makes use of [the Hooks API](https://reactjs.org/docs/hooks-intro.html). All primary components use the [functional component style](https://reactjs.org/docs/components-and-props.html#function-and-class-components). It was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

The Zustand-based store is primarily used to keep track of the current song being played and the theme in use for the visualization.

## Visualizing Songs

The overall `App` component is responsible for application scaffolding, file and theme selection, and audio playback.

The `Visualizer` component is responsible for configuring the [Canvas](https://docs.pmnd.rs/react-three-fiber/api/canvas) that contains all other visualization elements. These child components include:

- `BackgroundManager` displays horizon and starfield backgrounds and "rings" around the central sun. The intensity of these visuals are scaled by the currently-playing audio.
- `BassTunnel` displays "trench walls" that are scrolled (and randomized) as the song progresses to provide a sense of motion and scaled as **bass/sub-bass peaks** are encountered.
- `BeatQueue` provides a visual representation of the **beat peaks** in the song.
- `FrequencyGrid` provides a visual representation of the currently-playing audio and provides a sense of motion.
- `TrebleQueue` provides a visual representation of the **treble peaks** in the song, using transparent sprites and lighting.
- `VfxManager` defines post-processing effects, the intensity of which are controlled by the currently-playing audio.

### Common Techniques

The following processes are common in these visualizations:

- Scanning a collection of peaks and assigning Three.js meshes and objects to them as they are being encountered in the song
- Cycling an effect over a set number of song measures, using a multiple of `TrackAnalysis.secondsPerMeasure` to determine the time period
- Scaling the intensity of effects based on [the currently-playing frequency data](https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/getByteFrequencyData)

### Theming

The `Theme` interface describes relevant information for theming a track visualization. There are numerous color-based themes, most of which have been generated using a handful of "seed" colors provided to the `generateThemeForColor` helper method.

When a theme is selected, it is tracked in the Zustand store and components will pull the relevant information from that centralized store.

For HTML elements that are influenced by the theme, we use the following approach:

- Define HTML-related styles as a part of the style interface.
- Define and use CSS variables in the main stylesheet.
- Use the `AppStyles` component to generate a `<style>` definition that overrides these variable values based on the current theme.

The `AppStyles` component is also responsible for dynamically updating the page's `<meta name="theme-color">` tag and application icon based on the theme.

## Song Analysis

While the [Web Audio API's AnalyserNode](https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode) can be used to provide many real-time visualizations, it does not allow for "looking ahead" into the progression of the song. As a result, to have a beat approaching from afar (before it has been played) and only encountering the camera while it is being played requires analysis of the track ahead of time.

As a result, when a song is selected, it goes through an analysis process which includes:

- Parsing metadata tags to determine the artist, title, BPM (if available), and key (if available)
- Determining the overall track volume throughout the song
- Identifying peaks in various frequency ranges that exceed specified absolute and relative (to the overall track volume) thresholds

This process ultimately produces a `TrackAnalysis` object which is used throughout the visualization system.

### Keying

When a key is detected, values are normalized to [Open Key Notation](https://www.beatunes.com/en/open-key-notation.html) whenever possible. These values are mapped to specific color themes when available.

No automated key detection is currently supported. When no key has been provided, the song is assigned a random color theme.

### Peak and BPM Detection

While peak detection will use absolute and relative thresholds for detection, the analyzer will attempt to determine a cutoff point if there are more peaks identified than expected. This is determined by a maximum number of expected peaks per minute, multiplying that by the song duration, and attempting to dynamically trim the quietest peaks to achieve that target number. Peaks are detected in the following ranges:

| Range        | Min Hz  | Max Hz  | Peaks/Min  |
|--------------|---------|---------|------------|
| Sub-bass     |      20 |      50 |         60 |
| Bass         |      50 |      90 |        120 |
| Beat         |      90 |     200 |        300 |
| Treble       |    2048 |     n/a |        120 |

In the event a BPM value was not found in the tags, the system will attempt to determine one based on the **Beat** peaks detected above. Automatic detection will tend to produce results in the 90-180 BPM range, and to date appears to be slightly higher than the "normal" BPM of a song. This may be due to the fact that the beat range's parameters are somewhat more oriented towards a visually appealing display rather than pure BPM detection.

### Track Hashing and Randomness

Instances of `TrackAnalysis` contain a `trackHash` field, which is a simple hash to try and uniquely identify a particular file. This is used by the `getTrackRandomInt`, `getTrackSeededRandomInt`, and `getTrackSeededRandomFloat` methods to get "random" results that are ultimately predictable based on the track hash. The goal is to have presentation elements display in a randomized fashion that is ultimately _deterministic for the file_, so that repeated visualizations of the song will display as cohesively as possible.
