import { RefObject, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';

import { useStore } from './visualizerStore';

import BassTunnel from './BassTunnel';
import BeatQueue from './BeatQueue';
import FrequencyGrid from './FrequencyGrid';
import TrebleQueue from './TrebleQueue';
import BackgroundManager from './BackgroundManager';
import VfxManager from './VfxManager';

function Visualizer(props: { audio: RefObject<HTMLAudioElement>, analyser: RefObject<AnalyserNode> }): JSX.Element {
  // Create the sun mesh ahead of time so that we don't have to muck around with refs when passing it to the VFX manager
  const sunMesh = useMemo(
    () => {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(5), 
        new THREE.MeshBasicMaterial({
          // eslint-disable-next-line react-hooks/exhaustive-deps
          color: useStore.getState().theme.background.sunColor, 
          transparent: true, 
          fog: false
        })
      );
      
      mesh.frustumCulled = false;
      mesh.position.set(0, 0, -200);
      return mesh;
    }, 
    []);

  // Ensure that the sun's color is updated in response to theme changes
  useEffect(() => useStore.subscribe(
    (state) => state.theme.background.sunColor,
    (newSunColor) => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      (sunMesh.material as THREE.MeshBasicMaterial).color = newSunColor;
    }),
    []);

  return (
    <Canvas camera={{position: [0, 0, 15]}}>
      <ambientLight intensity={0.1} />
      <directionalLight position={[0, 0, 20]} />
      <primitive object={sunMesh} />
      <BassTunnel audio={props.audio} />
      <BeatQueue audio={props.audio} />
      <FrequencyGrid audio={props.audio} analyser={props.analyser} />
      <TrebleQueue audio={props.audio} />
      <BackgroundManager audio={props.audio} analyser={props.analyser} />
      <VfxManager audio={props.audio} analyser={props.analyser} sunMesh={sunMesh} />
    </Canvas>
  );
}

export default Visualizer;