import React, { RefObject, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { TrackAnalysis } from './TrackAnalysis';
import Peak from './Peak';

function getBasePosition(sideIdx: number, totalSides: number, scale: number): THREE.Vector3 {
  const angle = (sideIdx / totalSides) * 2 * Math.PI;

  return new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0).multiplyScalar(scale);
}

function PeakQueue(props: { audio: RefObject<HTMLAudioElement>, peaks: Peak[] }) {
  let nextUnrenderedPeakIndex = 0;
  let nextAvailableMeshIndex = 0;
  const availableMeshesRing = useRef<THREE.Mesh[]>([]);
  const SIDES = 6;
  const RADIUS = 5;
  const LOOKAHEAD_PERIOD = 2.0;
  const PEAK_DEPTH_START = -100;
  const PEAK_DEPTH_END = 15;

  // Ensure we reset the next peak index when analysis changes
  useEffect(
    () => {
      nextUnrenderedPeakIndex = 0;
      nextAvailableMeshIndex = 0;
    },
    [props.peaks]);

  useFrame((state, delta) => {
    if (props.audio.current === null || availableMeshesRing.current === null) {
      return;
    }

    const audioTime = props.audio.current.currentTime;
    const lastRenderTime = Math.max(audioTime - delta, 0);

    // Determine if we need to fill the ring buffer with any new meshes
    for (let peakIdx = nextUnrenderedPeakIndex; peakIdx < props.peaks.length; peakIdx++) {
      // If we reached the end of the list, stop
      if (peakIdx >= props.peaks.length) {
        break;
      }

      const curPeak = props.peaks[peakIdx];
      const nextPeakStart = curPeak.time - LOOKAHEAD_PERIOD;

      // See if we're already too late for this peak - if so, skip ahead
      if (lastRenderTime > curPeak.end) {
        nextUnrenderedPeakIndex++;
        continue;
      }

      // Now see if we're too early for this peak - if so, exit out
      if (nextPeakStart > audioTime) {
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

      const startRenderTime = Math.max(peakData.time - LOOKAHEAD_PERIOD, 0);
      const endRenderTime = peakData.end + 1.0;

      // See if we've finished peaking, which means we should hide the mesh
      if (startRenderTime > audioTime || endRenderTime < lastRenderTime) {
        meshForPeak.visible = false;
        continue;
      }

      // Make the mesh visible and lerp it to zoom in
      meshForPeak.visible = true;
      meshForPeak.position.z = THREE.MathUtils.lerp(PEAK_DEPTH_START, PEAK_DEPTH_END, (audioTime - startRenderTime) / (endRenderTime - startRenderTime));
    }    
  });

  return (
    <group>
      <mesh
        ref={(mesh: THREE.Mesh) => availableMeshesRing.current[0] = mesh}
        visible={false}
        position={getBasePosition(0, SIDES, RADIUS)}
      >
        <boxGeometry args={[2, 2, 2]} />
        <meshNormalMaterial />
      </mesh>
      <mesh
        ref={(mesh: THREE.Mesh) => availableMeshesRing.current[1] = mesh}
        visible={false}
        position={getBasePosition(1, SIDES, RADIUS)}
      >
        <boxGeometry args={[2, 2, 2]} />
        <meshNormalMaterial />
      </mesh>
      <mesh
        ref={(mesh: THREE.Mesh) => availableMeshesRing.current[2] = mesh}
        visible={false}
        position={getBasePosition(2, SIDES, RADIUS)}
      >
        <boxGeometry args={[2, 2, 2]} />
        <meshNormalMaterial />
      </mesh>
      <mesh
        ref={(mesh: THREE.Mesh) => availableMeshesRing.current[3] = mesh}
        visible={false}
        position={getBasePosition(3, SIDES, RADIUS)}
      >
        <boxGeometry args={[2, 2, 2]} />
        <meshNormalMaterial />
      </mesh>
      <mesh
        ref={(mesh: THREE.Mesh) => availableMeshesRing.current[4] = mesh}
        visible={false}
        position={getBasePosition(4, SIDES, RADIUS)}
      >
        <boxGeometry args={[2, 2, 2]} />
        <meshNormalMaterial />
      </mesh>
      <mesh
        ref={(mesh: THREE.Mesh) => availableMeshesRing.current[5] = mesh}
        visible={false}
        position={getBasePosition(5, SIDES, RADIUS)}
      >
        <boxGeometry args={[2, 2, 2]} />
        <meshNormalMaterial />
      </mesh>
    </group>
  )
}

function Visualizer(props: { audio: RefObject<HTMLAudioElement>, analyser: RefObject<AnalyserNode>, trackAnalysis: TrackAnalysis }) {
  return (
    <Canvas camera={{position: [0, 0, 15]}}>
      <ambientLight />
      <PeakQueue audio={props.audio} peaks={props.trackAnalysis.beat} />
      {/* 
        These are just to help visualize positioned elements relative to the camera.
          o Red - x
          o Green - y
          o Blue - z
        Negative values use a box, positive values use a sphere.
      */}
      {/* <mesh position={[0, 0, -100]}>
        <boxGeometry args={[2, 2, 2]} />
        <meshBasicMaterial color={0x0000ff} />
      </mesh>
      <mesh position={[0, 0, 100]}>
        <sphereGeometry />
        <meshBasicMaterial color={0x0000ff} />
      </mesh>
      <mesh position={[0, -10, 0]}>
        <boxGeometry args={[2, 2, 2]} />
        <meshBasicMaterial color={0x00ff00} />
      </mesh>
      <mesh position={[0, 10, 0]}>
        <sphereGeometry />
        <meshBasicMaterial color={0x00ff00} />
      </mesh>
      <mesh position={[-10, 0, 0]}>
        <boxGeometry args={[2, 2, 2]} />
        <meshBasicMaterial color={0xff0000} />
      </mesh>
      <mesh position={[10, 0, 0]}>
        <sphereGeometry />
        <meshBasicMaterial color={0xff0000} />
      </mesh> */}
    </Canvas>
  );
}

export default Visualizer;