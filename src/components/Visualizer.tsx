import { RefObject, useEffect } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { XR } from '@react-three/xr';

import { useStore } from '../store/visualizerStore';
import { ComponentDepths } from './ComponentDepths';

import BassTunnel from './BassTunnel';
import BeatQueue from './BeatQueue';
import FrequencyGrid from './FrequencyGrid';
import TrebleQueue from './TrebleQueue';
import SceneryQueue from './SceneryQueue';
import BackgroundManager from './BackgroundManager';
import VfxManager from './VfxManager';

/**
 * The material to use for the sun.
 */
const sunMaterial = new THREE.MeshBasicMaterial({ transparent: true });

/**
 * The mesh to use for the sun.
 * Used to simplify ref-passing for the VFX manager.
 */
const sunMesh = new THREE.Mesh(new THREE.SphereGeometry(35), sunMaterial);
sunMesh.frustumCulled = false;
sunMesh.position.set(0, 0, ComponentDepths.Sun);

function Visualizer(props: { audio: RefObject<HTMLAudioElement>, analyser: RefObject<AnalyserNode> }): JSX.Element {
  // Ensure that the sun's color is updated in response to theme changes
  sunMaterial.color = useStore.getState().theme.background.sunColor;

  useEffect(() => useStore.subscribe(
    (state) => state.theme.background.sunColor,
    (newSunColor) => {
      sunMaterial.color = newSunColor;
    }),
    []);

  return (
    <Canvas
      camera={{position: [0, 0, ComponentDepths.CameraPosition], far: ComponentDepths.CameraFrustrumFar}}
      gl={{ physicallyCorrectLights: true }}>
      <XR
        referenceSpace="viewer"
      >
        <ambientLight intensity={0.1} />
        <directionalLight position={[0, 0, ComponentDepths.LightPosition]} />
        <primitive object={sunMesh} />
        <BassTunnel audio={props.audio} />
        <BeatQueue audio={props.audio} />
        <FrequencyGrid audio={props.audio} analyser={props.analyser} />
        <TrebleQueue audio={props.audio} />
        <SceneryQueue audio={props.audio} analyser={props.analyser} />
        <BackgroundManager audio={props.audio} analyser={props.analyser} />
        <VfxManager audio={props.audio} analyser={props.analyser} sunMesh={sunMesh} />
      </XR>
    </Canvas>
  );
}

export default Visualizer;