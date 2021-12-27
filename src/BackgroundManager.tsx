import { RefObject, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';

import { TrackAnalysis } from './TrackAnalysis';
import { useStore } from './visualizerStore';

const FULL_RADIANS = 2 * Math.PI;

function buildLineRingGeometry(trackAnalysis: TrackAnalysis, innerRadius: number, maxOuterRadius: number, perturbAngle: number): THREE.BufferGeometry {
  const points: THREE.Vector3[] = [];
  const LINE_COUNT = 120;
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

function BackgroundManager(props: { audio: RefObject<HTMLAudioElement>, analyser: RefObject<AnalyserNode> }): JSX.Element {
  // Load background textures
  const textures = useTexture({
    star_first: 'backgrounds/star-60.png',
    star_first_flash: 'backgrounds/star-60-flash.png',
    star_second: 'backgrounds/star-80.png',
    star_second_flash: 'backgrounds/star-80-flash.png',
    star_third: 'backgrounds/star-100.png',
    star_third_flash: 'backgrounds/star-100-flash.png'
  });

  [
    textures.star_first, 
    textures.star_first_flash,
    textures.star_second,
    textures.star_second_flash,
    textures.star_third,
    textures.star_third_flash
  ].forEach((tex) => {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.setScalar(4);
  });

  const trackAnalysis = useStore(state => state.analysis);
  const backgroundTheme = useStore(state => state.theme.background); 

  // Set up the geometry for the line "rings"
  const firstRingGeometry = useMemo(() => {
    return buildLineRingGeometry(trackAnalysis, 100, 120, 0);
  }, [trackAnalysis]);

  const secondRingGeometry = useMemo(() => {
    return buildLineRingGeometry(trackAnalysis, 125, 145, 15);
  }, [trackAnalysis]);

  const thirdRingGeometry = useMemo(() => {
    return buildLineRingGeometry(trackAnalysis, 150, 170, 30);
  }, [trackAnalysis]);

  // Determine motion amounts based on the BPM
  const ringCycleSeconds = useMemo(() => {
    return trackAnalysis.secondsPerMeasure * 8;
  }, [trackAnalysis]);

  const starCycleSeconds = useMemo(() => {
    return trackAnalysis.secondsPerMeasure * 16;
  }, [trackAnalysis]);

  const firstStarLayer = useRef<THREE.Mesh>(null!);
  const secondStarLayer = useRef<THREE.Mesh>(null!);
  const thirdStarLayer = useRef<THREE.Mesh>(null!);
  const firstStarFlashLayer = useRef<THREE.Mesh>(null!);
  const secondStarFlashLayer = useRef<THREE.Mesh>(null!);
  const thirdStarFlashLayer = useRef<THREE.Mesh>(null!);
  const ringGroup = useRef<THREE.Group>(null!);
  const firstLineRing = useRef<THREE.LineSegments>(null!);
  const secondLineRing = useRef<THREE.LineSegments>(null!);
  const thirdLineRing = useRef<THREE.LineSegments>(null!);
  
  useFrame(() => {
    // Hide the ring group when we don't have a track analysis
    ringGroup.current.visible = !trackAnalysis.isEmpty;

    let currentTrackTime = 0;
    let currentTrackDuration = 0;

    if (props.audio.current !== null) {
      currentTrackTime = props.audio.current.currentTime;
      currentTrackDuration = props.audio.current.duration;
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
    firstStarFlashLayer.current.position.x = 50 * starRotation;
    secondStarLayer.current.position.x = 100 * starRotation;
    secondStarFlashLayer.current.position.x = 100 * starRotation;
    thirdStarLayer.current.position.x = 150 * starRotation;
    thirdStarFlashLayer.current.position.x = 150 * starRotation;

    // If we're currently playing, tweak based on the music
    let ringOpacityFactor = 0.0;
    let ringScaleFactor = 0.0;
    let starFlashOpacityFactor = 0.0;

    if (currentTrackTime > 0 && props.analyser.current !== null) {
      const frequencies = new Uint8Array(props.analyser.current.frequencyBinCount);
      props.analyser.current.getByteFrequencyData(frequencies);

      if (Number.isFinite(frequencies[15])) {
        // Let this contribute to at most half of the opacity
        ringOpacityFactor = (frequencies[15] / 255.0) / 2;
      }

      if (Number.isFinite(frequencies[7])) {
        // Let this contribute to at most a 25% increase in scale
        ringScaleFactor = (frequencies[7] / 255.0) / 4;
      }

      if (Number.isFinite(frequencies[47])) {
        // Make the star glows visible as appropriate
        starFlashOpacityFactor = (frequencies[47] / 255.0);
      }
    }

    (firstLineRing.current.material as THREE.Material).opacity = 0.5 + ringOpacityFactor;
    (secondLineRing.current.material as THREE.Material).opacity = 0.4 + ringOpacityFactor;
    (thirdLineRing.current.material as THREE.Material).opacity = 0.3 + ringOpacityFactor;

    (firstStarFlashLayer.current.material as THREE.Material).opacity = starFlashOpacityFactor;
    (secondStarFlashLayer.current.material as THREE.Material).opacity = starFlashOpacityFactor;
    (thirdStarFlashLayer.current.material as THREE.Material).opacity = starFlashOpacityFactor;

    // If we are just coming off of an increase in scale, we want to ease back to the standard 1.0
    const ringDampenedScale = firstLineRing.current.scale.x * 0.9;
    const newRingScale = Math.max(1.0 + ringScaleFactor, ringDampenedScale);

    firstLineRing.current.scale.x = firstLineRing.current.scale.y = newRingScale;
    secondLineRing.current.scale.x = secondLineRing.current.scale.y = newRingScale;
    thirdLineRing.current.scale.x = thirdLineRing.current.scale.y = newRingScale;

    // Scale down all of the rings as we get closer to the end of the track
    if (Number.isFinite(currentTrackDuration) && currentTrackDuration > 0) {
      const ringGroupScale = THREE.MathUtils.mapLinear(currentTrackTime, 0, currentTrackDuration, 0.5, 1.5);
      ringGroup.current.scale.x = ringGroup.current.scale.y = ringGroupScale;
    }
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
            color={backgroundTheme.burstLineColor}
            transparent={true}
            opacity={0.5}
            fog={false}
            precision={'lowp'}
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
            color={backgroundTheme.burstLineColor}
            transparent={true}
            opacity={0.4}
            fog={false}
            precision={'lowp'}
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
            color={backgroundTheme.burstLineColor}
            transparent={true}
            opacity={0.3}
            fog={false}
            precision={'lowp'}
          />
        </lineSegments>
      </group>
      <group>
      <mesh
          ref={firstStarFlashLayer}
          position={[0, 0, -499]}
          scale={[2, 2, 1]}
        >
          <planeGeometry
            args={[2000, 2000]}
          />
          <meshBasicMaterial
            color={backgroundTheme.starFlashColor}
            map={textures.star_first_flash}
            transparent={true}
            opacity={0.0}
            fog={false}
            precision={'lowp'}
          />
        </mesh>
        <mesh
          ref={firstStarLayer}
          position={[0, 0, -500]}
          scale={[2, 2, 1]}
        >
          <planeGeometry
            args={[2000, 2000]}
          />
          <meshBasicMaterial
            color={backgroundTheme.starColor}
            map={textures.star_first}
            transparent={true}
            opacity={0.5}
            fog={false}
            precision={'lowp'}
          />
        </mesh>

        <mesh
          ref={secondStarFlashLayer}
          position={[0, 0, -599]}
          scale={[2, 2, 1]}
        >
          <planeGeometry
            args={[2000, 2000]}
          />
          <meshBasicMaterial
            color={backgroundTheme.starFlashColor}
            map={textures.star_second_flash}
            transparent={true}
            opacity={0.0}
            fog={false}
            precision={'lowp'}
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
            color={backgroundTheme.starColor}
            map={textures.star_second}
            transparent={true}
            opacity={0.5}
            fog={false}
            precision={'lowp'}
          />
        </mesh>

        <mesh
          ref={thirdStarFlashLayer}
          position={[0, 0, -699]}
          scale={[2, 2, 1]}
        >
          <planeGeometry
            args={[2000, 2000]}
          />
          <meshBasicMaterial
            color={backgroundTheme.starFlashColor}
            map={textures.star_third_flash}
            transparent={true}
            opacity={0.0}
            fog={false}
            precision={'lowp'}
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
            color={backgroundTheme.starColor}
            map={textures.star_third}
            transparent={true}
            opacity={0.5}
            fog={false}
            precision={'lowp'}
          />
        </mesh>
      </group>
    </group>
  );
}

export default BackgroundManager;
