import React, { RefObject, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { TrackAnalysis } from './TrackAnalysis';
import Peak from './Peak';

function getBasePosition(sideIdx: number, totalSides: number, scale: number): THREE.Vector3 {
  const angle = (sideIdx / totalSides) * 2 * Math.PI;

  return new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0).multiplyScalar(scale);
}

// class PeakMeshAssignment
// {
//   public mesh: RefObject<THREE.Mesh> = useRef<THREE.Mesh>(null);

//   public peak: Peak | null = null;

//   public index: number = -1;
// }

// function PeakMesh(props: { audio: RefObject<HTMLAudioElement>, peak: Peak | null, basePosition: THREE.Vector3 }) {
//   const LOOKAHEAD_PERIOD = 2.0;
//   const mesh = useRef<THREE.Mesh>(null);

//   useFrame((state, delta) => {
//     if (props.audio.current === null || mesh.current === null || props.peak === null) {
//       return;
//     }

//     const audioTime = props.audio.current.currentTime;
//     const lastRenderTime = Math.max(audioTime - delta, 0);

//     // See if we've finished peaking, which means we should hide the mesh
//     if (props.peak.end < lastRenderTime) {
//       mesh.current.visible = false;
//       return;
//     }
//     else if (props.peak.time + LOOKAHEAD_PERIOD > audioTime) {
//       mesh.current.visible = false;
//       return;
//     }

//     // Make the mesh visible and lerp it to zoom in
//     mesh.current.visible = true;
//     mesh.current.position.x = props.basePosition.x;
//     mesh.current.position.y = props.basePosition.y;
//     mesh.current.position.z = THREE.MathUtils.lerp(1000, 0, audioTime / props.peak.end);
//   });

//   return (
//     <mesh
//       ref={mesh}
//       visible={false}
//     >
//       <boxGeometry args={[2, 2, 2]} />
//       <meshNormalMaterial />
//     </mesh>
//   );
// }

function PeakQueue(props: { audio: RefObject<HTMLAudioElement>, peaks: Peak[] }) {
  let nextUnrenderedPeakIndex = 0;
  let nextAvailableMeshIndex = 0;
  const availableMeshesRing = useRef<THREE.Mesh[]>([]);
  const SIDES = 6;
  const RADIUS = 5;
  const LOOKAHEAD_PERIOD = 2.0;
  const PEAK_DEPTH_START = -100;
  const PEAK_DEPTH_END = 15;

  // Ensure the available meshes buffer is cleaned up
  // useEffect(
  //   () => {
  //     nextAvailableMeshIndex = 0;
  //     availableMeshesRing.current.splice(0, availableMeshesRing.current.length - SIDES);
  //   });

  // Ensure we reset the next peak index when analysis changes
  useEffect(
    () => {
      nextUnrenderedPeakIndex = 0;
      nextAvailableMeshIndex = 0;
    },
    [props.peaks]);

  // We will show peaks using a polygonal pattern
  // const sideRefs = useRef<PeakMesh[]>([]);
  // const sideQueue = 
  //   Array.from(Array(SIDES), (_, sideIdx) => getBasePosition(sideIdx, SIDES, 10))
  //   .map((basePosition, index) => {
  //     return <PeakMesh key={index} ref={(el: Peak => sideRefs.current.push(el)} audio={props.audio} basePosition={basePosition} peak={null} />
  //   });
  // return sideQueue;

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

// function PeakMonitor(props: { audio: RefObject<HTMLAudioElement>, peaks: Peak[], position: Vector3, children: React.ReactNode[] }) {
//   const peakMesh = useRef<THREE.Mesh>(null);
//   let lastPeakIndex = 0;

//   useEffect(
//     () => {
//       lastPeakIndex = 0;
//     },
//     [props.peaks]);

//   useFrame((state, delta) => {
//     if (props.audio.current === null || peakMesh.current === null) {
//       return;
//     }

//     const audioTime = props.audio.current.currentTime;
//     const lastRenderTime = Math.max(audioTime - delta, 0);

//     // Find the next peak
//     for (let peakIdx = lastPeakIndex; peakIdx < props.peaks.length; peakIdx++) {
//       // If we reached the end of the list, stop
//       if (peakIdx >= props.peaks.length) {
//         break;
//       }

//       const curPeak = props.peaks[peakIdx];

//       // Hide the peak mesh if we passed it
//       if (curPeak.time + (curPeak.frames / 4410) < lastRenderTime) {
//         peakMesh.current.visible = false;
//         lastPeakIndex++;
//         continue;
//       }

//       // If we're supposed to render this peak, do that and exit out
//       if (curPeak.time < audioTime) {
//         peakMesh.current.visible = true;
//         break;
//       }
//     }
//   });

//   return (
//     <mesh
//       ref={peakMesh}
//       visible={false}
//       position={props.position}
//     >
//       {props.children}
//     </mesh>
//   );
// }

// function SubWatcher(props: { audio: RefObject<HTMLAudioElement>, trackAnalysis: TrackAnalysis }) {
//   return (
//     <PeakMonitor audio={props.audio} peaks={props.trackAnalysis.subBass} position={[-16, 0, 0]}>
//       <boxGeometry args={[2, 2, 2]} />
//       <meshNormalMaterial />
//     </PeakMonitor>
//   );
// }

// function BassWatcher(props: { audio: RefObject<HTMLAudioElement>, trackAnalysis: TrackAnalysis }) {
//   return (
//     <PeakMonitor audio={props.audio} peaks={props.trackAnalysis.bass} position={[-8, 0, 0]}>
//       <boxGeometry args={[2, 2, 2]} />
//       <meshNormalMaterial />
//     </PeakMonitor>
//   );
// }

// function TrebleWatcher(props: { audio: RefObject<HTMLAudioElement>, trackAnalysis: TrackAnalysis }) {
//   return (
//     <PeakMonitor audio={props.audio} peaks={props.trackAnalysis.treble} position={[8, 0, 0]}>
//       <boxGeometry args={[2, 2, 2]} />
//       <meshNormalMaterial />
//     </PeakMonitor>
//   );
// }

// function BeatWatcher(props: { audio: RefObject<HTMLAudioElement>, trackAnalysis: TrackAnalysis }) {
//   return (
//     <PeakMonitor audio={props.audio} peaks={props.trackAnalysis.beat} position={[0, 0, 0]}>
//       <boxGeometry args={[2, 2, 2]} />
//       <meshNormalMaterial />
//     </PeakMonitor>
//   );
// }

function Visualizer(props: { audio: RefObject<HTMLAudioElement>, analyser: RefObject<AnalyserNode>, trackAnalysis: TrackAnalysis }) {
  return (
    <Canvas camera={{position: [0, 0, 15]}}>
      <ambientLight />
      <PeakQueue audio={props.audio} peaks={props.trackAnalysis.beat} />
      {/* <SubWatcher audio={props.audio} trackAnalysis={props.trackAnalysis} />
      <BassWatcher audio={props.audio} trackAnalysis={props.trackAnalysis} />
      <TrebleWatcher audio={props.audio} trackAnalysis={props.trackAnalysis} />
      <BeatWatcher audio={props.audio} trackAnalysis={props.trackAnalysis} /> */}
      <mesh position={[0, 0, -100]}>
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
      </mesh>
    </Canvas>
  );
}

export default Visualizer;