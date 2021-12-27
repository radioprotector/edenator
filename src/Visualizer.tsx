import { RefObject, useMemo } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';

import { TrackAnalysis } from './TrackAnalysis';
import BassTunnel from './BassTunnel';
import BeatQueue from './BeatQueue';
import FrequencyGrid from './FrequencyGrid';
import TrebleQueue from './TrebleQueue';
import BackgroundManager from './BackgroundManager';
import VfxManager from './VfxManager';

function Visualizer(props: { audio: RefObject<HTMLAudioElement>, analyser: RefObject<AnalyserNode>, trackAnalysis: TrackAnalysis, audioLastSeeked: number }): JSX.Element {
  // Create the sun mesh ahead of time so that we don't have to muck around with refs when passing it to the VFX manager
  const sunMesh = useMemo(() => {
      let mesh = new THREE.Mesh(new THREE.SphereGeometry(5), new THREE.MeshBasicMaterial({color: 0xffcc55, transparent: true, fog: false}));
      mesh.frustumCulled = false;
      mesh.position.set(0, 0, -200);
      return mesh;
    }, 
    []);

  return (
    <Canvas camera={{position: [0, 0, 15]}}>
      <ambientLight intensity={0.1} />
      <directionalLight position={[0, 0, 20]} />
      <primitive object={sunMesh} />
      <BassTunnel audio={props.audio} trackAnalysis={props.trackAnalysis} audioLastSeeked={props.audioLastSeeked} />
      <BeatQueue audio={props.audio} trackAnalysis={props.trackAnalysis} audioLastSeeked={props.audioLastSeeked} />
      <FrequencyGrid audio={props.audio} analyser={props.analyser} trackAnalysis={props.trackAnalysis} />
      <TrebleQueue audio={props.audio} trackAnalysis={props.trackAnalysis} audioLastSeeked={props.audioLastSeeked} />
      <BackgroundManager audio={props.audio} analyser={props.analyser} trackAnalysis={props.trackAnalysis} />
      <VfxManager audio={props.audio} analyser={props.analyser} sunMesh={sunMesh} />
    </Canvas>
  );
}

export default Visualizer;