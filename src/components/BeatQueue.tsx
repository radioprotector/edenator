import { RefObject, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

import { useStore } from '../store/visualizerStore';
import { generateNumericArray } from '../utils';
import Peak from '../store/Peak';
import { ComponentDepths } from './ComponentDepths';

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

function getBasePosition(sideIdx: number, totalSides: number, scale: number): THREE.Vector3 {
  // Modulo the side index so that we'll always get a value that maps within [0, 360) degree range
  let angle = ((sideIdx % totalSides) / totalSides) * 2 * Math.PI;

  // For alternating sets, further perturb the angle
  if (Math.ceil(sideIdx / totalSides) % 2 === 0) {
    angle += Math.PI / totalSides;
  } 

  return new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0).multiplyScalar(scale);
}

/**
 * The geometry to use for all beat meshes.
 */
const beatGeometry = new THREE.SphereGeometry();

/**
 * The material to use for all beat meshes.
 */
const beatMeshMaterial = new THREE.MeshPhongMaterial({ shininess: 0.5 });

function BeatQueue(props: { audio: RefObject<HTMLAudioElement> }): JSX.Element {
  let nextUnrenderedPeakIndex = 0;
  let nextAvailableMeshIndex = 0;
  const availableMeshesRing = useRef<THREE.Mesh[]>([]);
  const SIDES = 6;

  const trackAnalysis = useStore(state => state.analysis);

  // Because the beat material is cached across multiple renders, just ensure the color reflects the state.
  beatMeshMaterial.color = useStore().theme.beat.color;

  useEffect(() => useStore.subscribe(
    state => state.theme.beat.color,
    (newBeatColor) => {
      beatMeshMaterial.color = newBeatColor;
    }),
    []);

  // Generate available meshes for use in a ring buffer
  const availableMeshElements = 
    generateNumericArray(SIDES * 6).map((sideNumber) => {
      return <mesh
        key={sideNumber}
        ref={(mesh: THREE.Mesh) => availableMeshesRing.current[sideNumber] = mesh}
        visible={false}
        position={getBasePosition(sideNumber, SIDES, DISTRIBUTION_RADIUS)}
        geometry={beatGeometry}
        material={beatMeshMaterial}
      />
    });

  // Ensure we reset the next peak index when analysis changes (or we seeked).
  // We're okay with just blowing away these values and letting useFrame re-calculate when it needs to
  useEffect(() => useStore.subscribe(
    state => [state.analysis, state.audioLastSeeked],
    () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      nextUnrenderedPeakIndex = 0;
      
      // eslint-disable-next-line react-hooks/exhaustive-deps
      nextAvailableMeshIndex = 0;
    }),
    []);

  useFrame((_state, delta) => {
    if (props.audio.current === null) {
      return;
    }

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
      const meshForPeak = availableMeshesRing.current[nextAvailableMeshIndex];
      meshForPeak.userData['peak'] = curPeak;
      
      // Switch around to the next mesh in the ring buffer
      nextAvailableMeshIndex = (nextAvailableMeshIndex + 1) % availableMeshesRing.current.length;

      // Ensure we're rendering the next peak
      nextUnrenderedPeakIndex++;
    }

    // Now update the items in the ring buffer
    for (let meshForPeak of availableMeshesRing.current) {
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
      meshForPeak.position.z = THREE.MathUtils.mapLinear(audioTime, peakDisplayStart, peakDisplayEnd, ComponentDepths.BeatStart, ComponentDepths.BeatEnd);

      // Tweak scaling if we're during the actual beat
      if (audioTime >= peakData.time && audioTime < peakDisplayEnd) {
        meshForPeak.scale.setScalar(THREE.MathUtils.mapLinear(audioTime, peakData.time, peakDisplayEnd, 1.0, 2.0));
      }
      else {
        meshForPeak.scale.setScalar(1);
      }
    }
  });

  return (
    <group>
      {availableMeshElements}
    </group>
  );
}

export default BeatQueue;
