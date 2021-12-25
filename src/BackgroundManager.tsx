import { RefObject, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';

import { TrackAnalysis } from './TrackAnalysis';

function buildLineRingGeometry(trackAnalysis: TrackAnalysis, innerRadius: number, maxOuterRadius: number, perturbAngle: number): THREE.BufferGeometry {
  const points: THREE.Vector3[] = [];
  const extraLength = Math.max(maxOuterRadius - innerRadius, 1);
  const ringSeed = innerRadius / Math.LOG2E;

  for (let pointNum = 0; pointNum < 150; pointNum++) {
    const angle = (trackAnalysis.getTrackSeededRandomInt(0, 359, pointNum * ringSeed) + perturbAngle) * THREE.MathUtils.DEG2RAD;
    const length = trackAnalysis.getTrackSeededRandomFloat(0.5, extraLength, pointNum * ringSeed);
    const x = Math.cos(angle);
    const y = Math.sin(angle);

    points.push(new THREE.Vector3(x * innerRadius, y * innerRadius, 0));
    points.push(new THREE.Vector3(x * (innerRadius + length), y * (innerRadius + length), 0));
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setFromPoints(points);
  return geometry; 
}


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

  // Set up the geometry for the line "rings"
  const firstRingGeometry = useMemo(() => {
    return buildLineRingGeometry(props.trackAnalysis, 75, 95, 0);
  }, [props.trackAnalysis]);

  const secondRingGeometry = useMemo(() => {
    return buildLineRingGeometry(props.trackAnalysis, 105, 125, 15);
  }, [props.trackAnalysis]);

  const thirdRingGeometry = useMemo(() => {
    return buildLineRingGeometry(props.trackAnalysis, 135, 155, 30);
  }, [props.trackAnalysis]);

  // Determine motion amounts based on the BPM
  const ringCycleSeconds = useMemo(() => {
    return props.trackAnalysis.secondsPerMeasure * 8;
  }, [props.trackAnalysis]);

  const starCycleSeconds = useMemo(() => {
    return props.trackAnalysis.secondsPerMeasure * 16;
  }, [props.trackAnalysis]);

  const firstStarLayer = useRef<THREE.Mesh>(null!);
  const secondStarLayer = useRef<THREE.Mesh>(null!);
  const thirdStarLayer = useRef<THREE.Mesh>(null!);
  const ringGroup = useRef<THREE.Group>(null!);
  const firstLineRing = useRef<THREE.LineSegments>(null!);
  const secondLineRing = useRef<THREE.LineSegments>(null!);
  const thirdLineRing = useRef<THREE.LineSegments>(null!);
  
  useFrame(() => {
    // Hide the ring group when we don't have a track analysis
    ringGroup.current.visible = !props.trackAnalysis.isEmpty;

    let currentTrackTime = 0;

    if (props.audio.current !== null) {
      currentTrackTime = props.audio.current.currentTime;
    }

    const ringPercentage = (currentTrackTime % ringCycleSeconds) / ringCycleSeconds;
    const starPercentage = (currentTrackTime % starCycleSeconds) / starCycleSeconds;

    firstLineRing.current.rotation.set(0, 0, Math.sin(ringPercentage * Math.PI * 2));
    secondLineRing.current.rotation.set(0, 0, 0.75 * Math.sin(ringPercentage * Math.PI * 2));
    thirdLineRing.current.rotation.set(0, 0, 0.5 * Math.sin(ringPercentage * Math.PI * 2));

    firstStarLayer.current.position.x = 50 * Math.sin(starPercentage * Math.PI * 2);
    secondStarLayer.current.position.x = 100 * Math.sin(starPercentage * Math.PI * 2);
    thirdStarLayer.current.position.x = 150 * Math.sin(starPercentage * Math.PI * 2);
  })

  return (
    <group>
      <group ref={ringGroup}>
        <lineSegments
          ref={firstLineRing}
          position={[0, 0, -250]}
        >
          <primitive
            object={firstRingGeometry}
            attach='geometry'
          />
          <lineBasicMaterial
            color={0xffffaa}
            transparent={true}
            opacity={0.5}
            fog={false}
          />
        </lineSegments>
        <lineSegments
          ref={secondLineRing}
          position={[0, 0, -250]}
        >
          <primitive
            object={secondRingGeometry}
            attach='geometry'
          />
          <lineBasicMaterial
            color={0xffffaa}
            transparent={true}
            opacity={0.35}
            fog={false}
          />
        </lineSegments>
        <lineSegments
          ref={thirdLineRing}
          position={[0, 0, -250]}
        >
          <primitive
            object={thirdRingGeometry}
            attach='geometry' 
          />
          <lineBasicMaterial
            color={0xffffaa}
            transparent={true}
            opacity={0.2}
            fog={false}
          />
        </lineSegments>
      </group>
      <mesh
        ref={firstStarLayer}
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
        ref={secondStarLayer}
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
        ref={thirdStarLayer}
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
