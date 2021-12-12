import React, { RefObject, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, Vector3 } from '@react-three/fiber';
import { TrackAnalysis } from './TrackAnalysis';
import Peak from './Peak';

function PeakMonitor(props: { audio: RefObject<HTMLAudioElement>, peaks: Peak[], position: Vector3, children: React.ReactNode[] }) {
  const peakMesh = useRef<THREE.Mesh>(null);
  let lastPeakIndex = 0;

  useEffect(
    () => {
      lastPeakIndex = 0;
    },
    [props.peaks]);

  useFrame((state, delta) => {
    if (props.audio.current === null || peakMesh.current === null) {
      return;
    }

    const audioTime = props.audio.current.currentTime;
    const lastRenderTime = Math.max(audioTime - delta, 0);

    // Find the next peak
    for (let peakIdx = lastPeakIndex; peakIdx < props.peaks.length; peakIdx++) {
      // If we reached the end of the list, stop
      if (peakIdx >= props.peaks.length) {
        break;
      }

      const curPeak = props.peaks[peakIdx];

      // Hide the peak mesh if we passed it
      if (curPeak.time + (curPeak.frames / 4410) < lastRenderTime) {
        peakMesh.current.visible = false;
        lastPeakIndex++;
        continue;
      }

      // If we're supposed to render this peak, do that and exit out
      if (curPeak.time < audioTime) {
        peakMesh.current.visible = true;
        break;
      }
    }
  });

  return (
    <mesh
      ref={peakMesh}
      visible={false}
      position={props.position}
    >
      {props.children}
    </mesh>
  );
}

function SubWatcher(props: { audio: RefObject<HTMLAudioElement>, trackAnalysis: TrackAnalysis }) {
  return (
    <PeakMonitor audio={props.audio} peaks={props.trackAnalysis.subBass} position={[-16, 0, 0]}>
      <boxGeometry args={[2, 2, 2]} />
      <meshNormalMaterial />
    </PeakMonitor>
  );
}

function BassWatcher(props: { audio: RefObject<HTMLAudioElement>, trackAnalysis: TrackAnalysis }) {
  return (
    <PeakMonitor audio={props.audio} peaks={props.trackAnalysis.bass} position={[-8, 0, 0]}>
      <boxGeometry args={[2, 2, 2]} />
      <meshNormalMaterial />
    </PeakMonitor>
  );
}

function TrebleWatcher(props: { audio: RefObject<HTMLAudioElement>, trackAnalysis: TrackAnalysis }) {
  return (
    <PeakMonitor audio={props.audio} peaks={props.trackAnalysis.treble} position={[8, 0, 0]}>
      <boxGeometry args={[2, 2, 2]} />
      <meshNormalMaterial />
    </PeakMonitor>
  );
}

function BeatWatcher(props: { audio: RefObject<HTMLAudioElement>, trackAnalysis: TrackAnalysis }) {
  return (
    <PeakMonitor audio={props.audio} peaks={props.trackAnalysis.beat} position={[0, 0, 0]}>
      <boxGeometry args={[2, 2, 2]} />
      <meshNormalMaterial />
    </PeakMonitor>
  );
}

function Visualizer(props: { audio: RefObject<HTMLAudioElement>, analyser: RefObject<AnalyserNode>, trackAnalysis: TrackAnalysis }) {
  return (
    <Canvas>
      <ambientLight />
      <SubWatcher audio={props.audio} trackAnalysis={props.trackAnalysis} />
      <BassWatcher audio={props.audio} trackAnalysis={props.trackAnalysis} />
      <TrebleWatcher audio={props.audio} trackAnalysis={props.trackAnalysis} />
      <BeatWatcher audio={props.audio} trackAnalysis={props.trackAnalysis} />
    </Canvas>
  );
}

export default Visualizer;