import { RefObject, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';

import { TrackAnalysis } from './TrackAnalysis';
import { useStore } from './visualizerStore';

const FULL_RADIANS = 2 * Math.PI;

function buildLineRingGeometry(innerRadius: number, maxOuterRadius: number, perturbAngle: number): THREE.BufferGeometry {
  const points: THREE.Vector3[] = [];
  const LINE_COUNT = 120;
  const ANGLE_PER_LINE = 360 / LINE_COUNT;
  const extraLength = Math.max(maxOuterRadius - innerRadius, 1);

  for (let pointNum = 0; pointNum < LINE_COUNT; pointNum++) {
    const angle = ((pointNum * ANGLE_PER_LINE) + perturbAngle) * THREE.MathUtils.DEG2RAD;
    const outerRadius = innerRadius + (((Math.sin(pointNum * innerRadius) + 1) * extraLength) / 2);
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
    star_first: 'backgrounds/star-01.png',
    star_first_glow: 'backgrounds/star-01-glow.png',
    star_second: 'backgrounds/star-02.png',
    star_second_glow: 'backgrounds/star-02-glow.png',
    star_third: 'backgrounds/star-03.png',
    star_third_glow: 'backgrounds/star-03-glow.png',
    horizon: 'backgrounds/horizon.png'
  });

  // The star textures should repeat 4 times
  [
    textures.star_first,
    textures.star_first_glow,
    textures.star_second,
    textures.star_second_glow,
    textures.star_third,
    textures.star_third_glow
  ].forEach((tex) => {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.setScalar(4);
  });

  // For the horizon, we just want to repeat the pixels when available
  textures.horizon.wrapS = textures.horizon.wrapT = THREE.RepeatWrapping;

  const trackAnalysis = useStore(state => state.analysis);
  const backgroundTheme = useStore(state => state.theme.background); 

  // Set up the geometry for the line "rings"
  const firstRingGeometry = useMemo(() => {
    return buildLineRingGeometry(100, 120, 0);
  }, []);

  const secondRingGeometry = useMemo(() => {
    return buildLineRingGeometry(125, 145, 15);
  }, []);

  const thirdRingGeometry = useMemo(() => {
    return buildLineRingGeometry(150, 170, 30);
  }, []);

  // Determine motion amounts based on the BPM
  const ringCycleSeconds = useMemo(() => {
    return trackAnalysis.secondsPerMeasure * 8;
  }, [trackAnalysis]);

  const starCycleSeconds = useMemo(() => {
    return trackAnalysis.secondsPerMeasure * 16;
  }, [trackAnalysis]);

  const horizonLayer = useRef<THREE.Mesh>(null!);
  const firstStarLayer = useRef<THREE.Mesh>(null!);
  const firstStarGlowLayer = useRef<THREE.Mesh>(null!);
  const secondStarLayer = useRef<THREE.Mesh>(null!);
  const secondStarGlowLayer = useRef<THREE.Mesh>(null!);
  const thirdStarLayer = useRef<THREE.Mesh>(null!);
  const thirdStarGlowLayer = useRef<THREE.Mesh>(null!);
  const ringGroup = useRef<THREE.Group>(null!);
  const firstLineRing = useRef<THREE.LineSegments>(null!);
  const secondLineRing = useRef<THREE.LineSegments>(null!);
  const thirdLineRing = useRef<THREE.LineSegments>(null!);
  
  useFrame((state) => {
    state.scene.background = backgroundTheme.fillColor;

    // Hide the ring group when we don't have a track analysis
    ringGroup.current.visible = !trackAnalysis.isEmpty;

    let currentTrackTime = 0;
    let currentTrackDuration = 0;

    if (props.audio.current !== null) {
      currentTrackTime = props.audio.current.currentTime;
      currentTrackDuration = props.audio.current.duration;
    }

    // Rotate the line "rings" over time
    const ringPercentage = (currentTrackTime % ringCycleSeconds) / ringCycleSeconds;
    const ringRotation = Math.sin(ringPercentage * FULL_RADIANS);

    firstLineRing.current.rotation.set(0, 0, ringRotation);
    secondLineRing.current.rotation.set(0, 0, 0.75 * ringRotation);
    thirdLineRing.current.rotation.set(0, 0, 0.5 * ringRotation);

    // Shift the star backgrounds over time
    const starPercentage = (currentTrackTime % starCycleSeconds) / starCycleSeconds;
    const starRotation = Math.sin(starPercentage * FULL_RADIANS);

    firstStarLayer.current.position.x = 50 * starRotation;
    firstStarGlowLayer.current.position.x = 50 * starRotation;
    secondStarLayer.current.position.x = 60 * starRotation;
    secondStarGlowLayer.current.position.x = 60 * starRotation;
    thirdStarLayer.current.position.x = 70 * starRotation;
    thirdStarGlowLayer.current.position.x = 70 * starRotation;

    // If we're currently playing, tweak based on the music
    let ringOpacityFactor = 0.0;
    let ringScaleFactor = 0.0;
    let horizonOpacityFactor = 0.0;
    let starGlowFactor = 0.0;

    if (currentTrackTime > 0 && props.analyser.current !== null) {
      const frequencies = new Uint8Array(props.analyser.current.frequencyBinCount);
      props.analyser.current.getByteFrequencyData(frequencies);

      if (Number.isFinite(frequencies[15])) {
        ringOpacityFactor = (frequencies[15] / 255.0) / 2;
      }

      if (Number.isFinite(frequencies[7])) {
        ringScaleFactor = (frequencies[7] / 255.0) / 4;
      }

      if (Number.isFinite(frequencies[31])) {
        horizonOpacityFactor = (frequencies[31] / 255.0) / 3;
      }

      if (Number.isFinite(frequencies[53])) {
        starGlowFactor = (frequencies[53] / 255.0) / 6;
      }
    }

    // Scale the rings opacity
    (firstLineRing.current.material as THREE.Material).opacity = 0.5 + ringOpacityFactor;
    (secondLineRing.current.material as THREE.Material).opacity = 0.4 + ringOpacityFactor;
    (thirdLineRing.current.material as THREE.Material).opacity = 0.3 + ringOpacityFactor;

    // Ease horizon flashes back down to 0.0, but cut off items that are asymptotically approaching 0 opacity
    let horizonDampenedOpacity = (horizonLayer.current.material as THREE.Material).opacity * 0.95;

    if (horizonDampenedOpacity <= 0.01) {
      horizonDampenedOpacity = 0;
    }

    (horizonLayer.current.material as THREE.Material).opacity = Math.max(horizonOpacityFactor, horizonDampenedOpacity);

    // Similarly scale the star "glow" layers
    let starGlowDampenedOpacity = (firstStarGlowLayer.current.material as THREE.Material).opacity * 0.95;

    if (starGlowDampenedOpacity <= 0.01) {
      starGlowDampenedOpacity = 0;
    }

    const newStarGlowOpacity = Math.max(starGlowFactor, starGlowDampenedOpacity);

    (firstStarGlowLayer.current.material as THREE.Material).opacity = newStarGlowOpacity;
    (secondStarGlowLayer.current.material as THREE.Material).opacity = newStarGlowOpacity;
    (thirdStarGlowLayer.current.material as THREE.Material).opacity = newStarGlowOpacity;

    // Scale the rings based on our frequency-0driven factor
    // If we are just coming off of an increase in scale, we want to ease back to the standard 1.0
    const ringDampenedScale = firstLineRing.current.scale.x * 0.9;
    const newRingScale = Math.max(1.0 + ringScaleFactor, ringDampenedScale);

    firstLineRing.current.scale.x = firstLineRing.current.scale.y = newRingScale;
    secondLineRing.current.scale.x = secondLineRing.current.scale.y = newRingScale;
    thirdLineRing.current.scale.x = thirdLineRing.current.scale.y = newRingScale;

    // Make the rings appear closer as we get closer to the end of the track
    if (Number.isFinite(currentTrackDuration) && currentTrackDuration > 0) {
      const ringGroupScale = THREE.MathUtils.mapLinear(currentTrackTime, 0, currentTrackDuration, 0.5, 1.5);
      ringGroup.current.scale.x = ringGroup.current.scale.y = ringGroupScale;
    }
  })

  return (
    <group>
      <mesh
        ref={horizonLayer}
        frustumCulled={false}
        position={[0, 0, -300]}
        scale={[8, 0.125, 1]}
      >
        <planeGeometry
          args={[1024, 512]}
        />
        <meshBasicMaterial
          color={backgroundTheme.starFlashColor}
          map={textures.horizon}
          transparent={true}
          opacity={0.0}
          fog={false}
          depthWrite={false}
          precision={'mediump'}
        />
       </mesh>
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
          ref={firstStarGlowLayer}
          position={[0, 0, -599]}
          scale={[2, 2, 1]}
          frustumCulled={false}
        >
          <planeGeometry
            args={[2048, 2048]}
          />
          <meshBasicMaterial
            color={backgroundTheme.starFlashColor}
            map={textures.star_first_glow}
            transparent={true}
            opacity={0.0}
            fog={false}
            depthWrite={false}
            precision={'lowp'}
          />
        </mesh>
        <mesh
          ref={firstStarLayer}
          position={[0, 0, -600]}
          scale={[2, 2, 1]}
          frustumCulled={false}
        >
          <planeGeometry
            args={[2048, 2048]}
          />
          <meshBasicMaterial
            color={backgroundTheme.starColor}
            map={textures.star_first}
            transparent={true}
            fog={false}
            depthWrite={false}
            precision={'lowp'}
          />
        </mesh>

        <mesh
          ref={secondStarGlowLayer}
          position={[0, 0, -699]}
          scale={[2, 2, 1]}
          frustumCulled={false}
        >
          <planeGeometry
            args={[2048, 2048]}
          />
          <meshBasicMaterial
            color={backgroundTheme.starFlashColor}
            map={textures.star_second_glow}
            transparent={true}
            opacity={0.0}
            fog={false}
            depthWrite={false}
            precision={'lowp'}
          />
        </mesh>
        <mesh
          ref={secondStarLayer}
          position={[0, 0, -700]}
          scale={[2, 2, 1]}
          frustumCulled={false}
        >
          <planeGeometry
            args={[2048, 2048]}
          />
          <meshBasicMaterial
            color={backgroundTheme.starColor}
            map={textures.star_second}
            transparent={true}
            fog={false}
            depthWrite={false}
            precision={'lowp'}
          />
        </mesh>

        <mesh
          ref={thirdStarGlowLayer}
          position={[0, 0, -799]}
          scale={[2, 2, 1]}
          frustumCulled={false}
        >
          <planeGeometry
            args={[2048, 2048]}
          />
          <meshBasicMaterial
            color={backgroundTheme.starFlashColor}
            map={textures.star_third_glow}
            transparent={true}
            opacity={0.0}
            fog={false}
            depthWrite={false}
            precision={'lowp'}
          />
        </mesh>
        <mesh
          ref={thirdStarLayer}
          position={[0, 0, -800]}
          scale={[2, 2, 1]}
          frustumCulled={false}
        >
          <planeGeometry
            args={[2048, 2048]}
          />
          <meshBasicMaterial
            color={backgroundTheme.starColor}
            map={textures.star_third}
            transparent={true}
            fog={false}
            depthWrite={false}
            precision={'lowp'}
          />
        </mesh>
      </group>
    </group>
  );
}

export default BackgroundManager;
