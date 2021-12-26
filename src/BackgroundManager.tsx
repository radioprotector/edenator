import { RefObject, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';

import { TrackAnalysis } from './TrackAnalysis';

const FULL_RADIANS = 2 * Math.PI;

function buildLineRingGeometry(trackAnalysis: TrackAnalysis, innerRadius: number, maxOuterRadius: number, perturbAngle: number): THREE.BufferGeometry {
  const points: THREE.Vector3[] = [];
  const LINE_COUNT = 180;
  const ANGLE_PER_LINE = 360 / LINE_COUNT;
  const extraLength = Math.max(maxOuterRadius - innerRadius, 1);

  for (let pointNum = 0; pointNum < LINE_COUNT; pointNum++) {
    const angle = ((pointNum * ANGLE_PER_LINE) + perturbAngle) * THREE.MathUtils.DEG2RAD;
    const outerRadius = innerRadius + trackAnalysis.getTrackSeededRandomFloat(0.25, extraLength, pointNum * innerRadius);
    const x = Math.cos(angle);
    const y = Math.sin(angle);

    points.push(new THREE.Vector3(x * innerRadius, y * innerRadius, 0));
    points.push(new THREE.Vector3(x * outerRadius, y * outerRadius, 0));
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
    return buildLineRingGeometry(props.trackAnalysis, 100, 120, 0);
  }, [props.trackAnalysis]);

  const secondRingGeometry = useMemo(() => {
    return buildLineRingGeometry(props.trackAnalysis, 125, 145, 15);
  }, [props.trackAnalysis]);

  const thirdRingGeometry = useMemo(() => {
    return buildLineRingGeometry(props.trackAnalysis, 150, 170, 30);
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

    // Rotate the line "rings" and shift the backgrounds over time
    const ringPercentage = (currentTrackTime % ringCycleSeconds) / ringCycleSeconds;
    const ringRotation = Math.sin(ringPercentage * FULL_RADIANS);
    const starPercentage = (currentTrackTime % starCycleSeconds) / starCycleSeconds;
    const starRotation = Math.sin(starPercentage * FULL_RADIANS);

    firstLineRing.current.rotation.set(0, 0, ringRotation);
    secondLineRing.current.rotation.set(0, 0, 0.75 * ringRotation);
    thirdLineRing.current.rotation.set(0, 0, 0.5 * ringRotation);

    firstStarLayer.current.position.x = 50 * starRotation;
    secondStarLayer.current.position.x = 100 * starRotation;
    thirdStarLayer.current.position.x = 150 * starRotation;

    // If we're currently playing, tweak based on the music
    let ringIntensityFactor = 0.0;

    if (currentTrackTime > 0 && props.analyser.current !== null) {
      const frequencies = new Uint8Array(props.analyser.current.frequencyBinCount);
      props.analyser.current.getByteFrequencyData(frequencies);

      if (Number.isFinite(frequencies[15])) {
        ringIntensityFactor = frequencies[15] / 255.0;
      }
    }

    (firstLineRing.current.material as THREE.LineBasicMaterial).opacity = 0.5 + (ringIntensityFactor / 2);
    (secondLineRing.current.material as THREE.LineBasicMaterial).opacity = 0.4 + (ringIntensityFactor / 2);
    (thirdLineRing.current.material as THREE.LineBasicMaterial).opacity = 0.3 + (ringIntensityFactor / 2);
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
            opacity={0.4}
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
            opacity={0.3}
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
