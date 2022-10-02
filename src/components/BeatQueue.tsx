import { RefObject, useEffect } from 'react';
import { Vector3, MathUtils, Mesh, SphereGeometry, MeshPhongMaterial } from 'three';
import { useFrame } from '@react-three/fiber';

import { useStore } from '../store/visualizerStore';
import { BeatTheme } from '../store/themes';
import Peak from '../store/Peak';
import { ComponentDepths } from './ComponentDepths';

/**
 * 360 degrees expressed as radians.
 */
 const FULL_RADIANS = 2 * Math.PI;

 /**
 * The size of the beat queue.
 */
const QUEUE_SIZE = 45;

/**
 * The time, in seconds, for which each item is visible before its {@see Peak.time}.
 */
 const LOOKAHEAD_PERIOD = 1.5;

 /**
  * The time, in seconds, for which each item is visible after its {@see Peak.end}.
  */
 const DECAY_PERIOD = 0.25;

 /**
  * The radius from the center to use for each displayed peak.
  */
 const DISTRIBUTION_RADIUS: number = 5;

function getBasePosition(sideIdx: number, beatTheme: BeatTheme): { x: number, y: number } {
  // Modulo the side index so that we'll always get a value that maps within [0, 360) degree range
  let angle = ((sideIdx % beatTheme.sides) / beatTheme.sides) * FULL_RADIANS;

  // Determine the layer index, map that to the offset array, and further perturb the angle based on that
  if (beatTheme.radiansOffset.length > 1) {
    // The way this works is, given six sides and two "radians offset" entries:
    // Indices 0-5 should apply radiansOffset[0]
    // Indices 6-11 should apply radiansOffset[1]
    // Indices 12-17 should apply radiansOffset[0]
    // and so on
    let layerIndex = Math.floor(sideIdx / beatTheme.sides) % beatTheme.radiansOffset.length;

    angle += beatTheme.radiansOffset[layerIndex];
  }
  else if (beatTheme.radiansOffset.length === 1) {
    // Apply a fixed adjustment
    angle += beatTheme.radiansOffset[0];
  }

  return new Vector3(Math.cos(angle), Math.sin(angle), 0).multiplyScalar(DISTRIBUTION_RADIUS);
}

/**
 * The geometry to use for all beat meshes.
 */
const beatGeometry = new SphereGeometry();

/**
 * The material to use for all beat meshes.
 */
const beatMeshMaterial = new MeshPhongMaterial({ shininess: 0.5 });

/**
 * The ring buffer of available beat meshes.
 */
const availableMeshesRing: Mesh[] = [];

for(let meshIdx = 0; meshIdx < QUEUE_SIZE; meshIdx++) {
  const mesh = new Mesh(beatGeometry, beatMeshMaterial);
  mesh.visible = false;

  availableMeshesRing.push(mesh);
}

function BeatQueue(props: { audio: RefObject<HTMLAudioElement> }): JSX.Element {
  let nextUnrenderedPeakIndex = 0;
  let lastHapticAudioTime = 0;
  let nextAvailableMeshIndex = 0;
  const hapticManager = useStore.getState().hapticManager;
  const trackAnalysis = useStore(state => state.analysis);

  // Because the beat items are cached across multiple renders, start by ensuring that the color and position match the state
  const beatTheme = useStore.getState().theme.beat;

  beatMeshMaterial.color = beatTheme.color;
  for(let meshIdx = 0; meshIdx < QUEUE_SIZE; meshIdx++) {
    const meshPosition = getBasePosition(meshIdx, beatTheme);

    availableMeshesRing[meshIdx].position.setX(meshPosition.x);
    availableMeshesRing[meshIdx].position.setY(meshPosition.y);
  }

  useEffect(() => useStore.subscribe(
    state => state.theme.beat,
    (newBeatTheme) => {
      // Ensure that the beat material reflects the new state
      beatMeshMaterial.color = newBeatTheme.color;

      // Ensure the x/y positions around the center reflect the new state
      for(let meshIdx = 0; meshIdx < QUEUE_SIZE; meshIdx++) {
        const meshPosition = getBasePosition(meshIdx, newBeatTheme);
    
        availableMeshesRing[meshIdx].position.setX(meshPosition.x);
        availableMeshesRing[meshIdx].position.setY(meshPosition.y);
      }
    }),
    []);

  // Ensure we reset the peak indices when analysis changes (or we seeked).
  // We're okay with just blowing away these values and letting useFrame re-calculate when it needs to
  useEffect(() => useStore.subscribe(
    state => [state.analysis, state.audioLastSeeked],
    () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      nextUnrenderedPeakIndex = 0;

      // eslint-disable-next-line react-hooks/exhaustive-deps
      lastHapticAudioTime = 0;
      
      // eslint-disable-next-line react-hooks/exhaustive-deps
      nextAvailableMeshIndex = 0;
    }),
    []);

  // Initially hide all items in the ring buffer - necessary items will be displayed in the next render loop
  for(const ringObj of availableMeshesRing) {
    ringObj.visible = false;

    if ('peak' in ringObj.userData) {
      delete ringObj.userData['peak'];
    }
  }

  useFrame((_state, delta) => {
    if (props.audio.current === null) {
      return;
    }

    const canSendHapticEvents = !props.audio.current.ended && !props.audio.current.paused;
    const audioTime = props.audio.current.currentTime;
    const lastRenderTime = Math.max(audioTime - delta, 0);

    // Determine if we need to fill the ring buffer with any new meshes
    for (let peakIdx = nextUnrenderedPeakIndex; peakIdx < trackAnalysis.beat.length; peakIdx++) {
      const curPeak = trackAnalysis.beat[peakIdx];
      const peakDisplayStart = curPeak.time - LOOKAHEAD_PERIOD;
      const peakDisplayEnd = curPeak.end + DECAY_PERIOD;

      // See if we're already too late for this peak - if so, skip ahead
      if (lastRenderTime > peakDisplayEnd) {
        nextUnrenderedPeakIndex++;
        continue;
      }

      // Now see if we're too early for this peak - if so, exit out
      if (peakDisplayStart > audioTime) {
        break;
      }

      // Now we have a new peak to render. Assign it to the next available mesh
      const meshForPeak = availableMeshesRing[nextAvailableMeshIndex];
      meshForPeak.userData['peak'] = curPeak;
      
      // Switch around to the next mesh in the ring buffer
      nextAvailableMeshIndex = (nextAvailableMeshIndex + 1) % availableMeshesRing.length;

      // Ensure we're rendering the next peak
      nextUnrenderedPeakIndex++;
    }

    // Now update the items in the ring buffer
    for (let meshForPeak of availableMeshesRing) {
      const peakData = meshForPeak.userData['peak'] as Peak;

      if (peakData === null || peakData === undefined) {
        meshForPeak.visible = false;
        continue;
      }

      const peakDisplayStart = peakData.time - LOOKAHEAD_PERIOD;
      const peakDisplayEnd = peakData.end + DECAY_PERIOD;

      // See if we've finished peaking, which means we should hide the mesh
      if (peakDisplayStart > audioTime || peakDisplayEnd < lastRenderTime) {
        meshForPeak.visible = false;
        delete meshForPeak.userData['peak'];
        continue;
      }

      // Make the mesh visible and lerp it to zoom in
      meshForPeak.visible = true;
      meshForPeak.position.z = MathUtils.mapLinear(audioTime, peakDisplayStart, peakDisplayEnd, ComponentDepths.BeatStart, ComponentDepths.BeatEnd);

      // Tweak scaling if we're during the actual beat
      if (audioTime >= peakData.time && audioTime < peakDisplayEnd) {
        // If we can issue haptic feedback for the peak, do so now
        if (hapticManager !== null && canSendHapticEvents && lastHapticAudioTime < peakData.time) {
          hapticManager.playFeedback(peakData);
          lastHapticAudioTime = peakData.end;
        }

        meshForPeak.scale.setScalar(MathUtils.mapLinear(audioTime, peakData.time, peakDisplayEnd, 1.0, 2.0));
      }
      else {
        meshForPeak.scale.setScalar(1);
      }
    }
  });

  return (
    <group>
      {availableMeshesRing.map((mesh, index) => {
        return <primitive
          key={index}
          object={mesh}
        />
      })}
    </group>
  );
}

export default BeatQueue;
