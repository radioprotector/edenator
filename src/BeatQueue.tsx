import { RefObject, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

import { generateNumericArray } from './Utils';
import { TrackAnalysis } from './TrackAnalysis';
import Peak from './Peak';

function getBasePosition(sideIdx: number, totalSides: number, scale: number): THREE.Vector3 {
  // Modulo the side index so that we'll always get a value that maps within [0, 360) degree range
  let angle = ((sideIdx % totalSides) / totalSides) * 2 * Math.PI;

  // For alternating sets, further perturb the angle
  if (Math.ceil(sideIdx / totalSides) % 2 === 0) {
    angle += Math.PI / totalSides;
  } 

  return new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0).multiplyScalar(scale);
}

function BeatQueue(props: { audio: RefObject<HTMLAudioElement>, audioLastSeeked: number, trackAnalysis: TrackAnalysis }): JSX.Element {
  let nextUnrenderedPeakIndex = 0;
  let nextAvailableMeshIndex = 0;
  const availableMeshesRing = useRef<THREE.Mesh[]>([]);
  const SIDES = 6;
  const RADIUS = 5;
  const LOOKAHEAD_PERIOD = 1.5;
  const DECAY_PERIOD = 0.25;
  const PEAK_DEPTH_START = -200;
  const PEAK_DEPTH_END = -10;
  const BASE_COLOR = new THREE.Color(0x770077);

  // Generate available meshes for use in a ring buffer
  const availableMeshElements = 
    generateNumericArray(SIDES * 6).map((sideNumber) => {
      return <mesh
        ref={(mesh: THREE.Mesh) => availableMeshesRing.current[sideNumber] = mesh}
        visible={false}
        position={getBasePosition(sideNumber, SIDES, RADIUS)}
        key={sideNumber}
      >
        <sphereGeometry />
        <meshPhongMaterial color={BASE_COLOR} />
      </mesh>
    });

  // Ensure we reset the next peak index when analysis changes (or we seeked).
  // We're okay with just blowing away these values and letting useFrame re-calculate when it needs to
  useEffect(
    () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      nextUnrenderedPeakIndex = 0;
      // eslint-disable-next-line react-hooks/exhaustive-deps
      nextAvailableMeshIndex = 0;
    },
    [props.trackAnalysis, props.trackAnalysis.beat, props.audioLastSeeked]);

  useFrame((state, delta) => {
    if (props.audio.current === null || availableMeshesRing.current === null) {
      return;
    }

    const audioTime = props.audio.current.currentTime;
    const lastRenderTime = Math.max(audioTime - delta, 0);

    // Determine if we need to fill the ring buffer with any new meshes
    for (let peakIdx = nextUnrenderedPeakIndex; peakIdx < props.trackAnalysis.beat.length; peakIdx++) {
      const curPeak = props.trackAnalysis.beat[peakIdx];
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
    for (let meshForPeak of availableMeshesRing.current)
    {
      const peakData = meshForPeak.userData['peak'] as Peak;

      if (peakData === null || peakData === undefined) {
        meshForPeak.visible = false;
        continue;
      }

      const peakDisplayStart = peakData.time - LOOKAHEAD_PERIOD;
      const peakEmissiveStart = peakDisplayStart + (LOOKAHEAD_PERIOD * 0.5);
      const peakDisplayEnd = peakData.end + DECAY_PERIOD;

      // See if we've finished peaking, which means we should hide the mesh
      if (peakDisplayStart > audioTime || peakDisplayEnd < lastRenderTime) {
        meshForPeak.visible = false;
        continue;
      }

      // Make the mesh visible and lerp it to zoom in
      meshForPeak.visible = true;
      meshForPeak.position.z = THREE.MathUtils.mapLinear(audioTime, peakDisplayStart, peakDisplayEnd, PEAK_DEPTH_START, PEAK_DEPTH_END);

      // Tweak shininess and scaling if we're during the actual beat
      const material = (meshForPeak.material as THREE.MeshPhongMaterial);

      // Scale shininess between the emission start and the end of the peak
      if (audioTime >= peakEmissiveStart && audioTime < peakData.end) {
        material.shininess = THREE.MathUtils.mapLinear(audioTime, peakEmissiveStart, peakData.end, 0.5, 1.0);
      }
      else if (audioTime >= peakData.end) {
        material.shininess = THREE.MathUtils.mapLinear(audioTime, peakData.end, peakDisplayEnd, 1, 0.5);
      }
      else {
        material.shininess = 0.5;
      }

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
