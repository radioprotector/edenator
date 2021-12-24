import { RefObject, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';

import { TrackAnalysis } from './TrackAnalysis';
import Peak from './Peak';

function BackgroundManager(props: { audio: RefObject<HTMLAudioElement>, analyser: RefObject<AnalyserNode>, trackAnalysis: TrackAnalysis }): JSX.Element {
  // Load background textures
  const textures = useTexture({
    star_first: 'backgrounds/star-60.png',
    star_second: 'backgrounds/star-80.png',
    star_third: 'backgrounds/star-100.png'
  });

  [textures.star_first, textures.star_second, textures.star_third].forEach((tex) => {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.setScalar(4);
  });

  const firstLayer = useRef<THREE.Mesh>(null!);
  const secondLayer = useRef<THREE.Mesh>(null!);
  const thirdLayer = useRef<THREE.Mesh>(null!);
  
  useFrame(() => {
    let currentTrackTime = 0;

    if (props.audio.current !== null) {
      currentTrackTime = props.audio.current.currentTime;
    }

    firstLayer.current.position.x = 20 * Math.sin(currentTrackTime);
    secondLayer.current.position.x = 40 * Math.sin(-currentTrackTime);
    thirdLayer.current.position.x = 60 * Math.sin(currentTrackTime);
  })

  return (
    <group>
      <mesh
        ref={firstLayer}
        position={[0, 0, -500]}
        scale={[2, 2, 1]}
      >
        <planeGeometry
          args={[2000, 2000]}
        />
        <meshBasicMaterial
          color={0xff66ff}
          map={textures.star_first}
          transparent={true}
          fog={false}
        />
      </mesh>
      <mesh
        ref={secondLayer}
        position={[0, 0, -600]}
        scale={[2, 2, 1]}
      >
        <planeGeometry
          args={[2000, 2000]}
        />
        <meshBasicMaterial
          color={0xffaaff}
          map={textures.star_second}
          transparent={true}
          fog={false}
        />
      </mesh>
      <mesh
        ref={thirdLayer}
        position={[0, 0, -700]}
        scale={[2, 2, 1]}
      >
        <planeGeometry
          args={[2000, 2000]}
        />
        <meshBasicMaterial
          color={0xffccff}
          map={textures.star_third}
          transparent={true}
          fog={false}
        />
      </mesh>
    </group>
  );
}

export default BackgroundManager;