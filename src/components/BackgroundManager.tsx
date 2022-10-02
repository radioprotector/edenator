import { RefObject, useMemo, useRef } from 'react';
import { Vector3, MathUtils, Mesh, Group, LineSegments, BufferGeometry, PlaneGeometry, Material, RepeatWrapping } from 'three';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';

import { useStore } from '../store/visualizerStore';
import { ComponentDepths } from './ComponentDepths';

/**
 * 360 degrees expressed as radians.
 */
const FULL_RADIANS = 2 * Math.PI;

function buildLineRingGeometry(innerRadius: number, maxOuterRadius: number, perturbAngle: number): BufferGeometry {
  const points: Vector3[] = [];
  const LINE_COUNT = 120;
  const ANGLE_PER_LINE = 360 / LINE_COUNT;
  // Assign a symmetric-ish curve to scale extra lengths by. LINE_COUNT should be divisible by this.
  const EXTRA_LENGTH_VALUES = [0.0809, 0.1618, 0.3236, 0.5, 0.6764, 0.8382, 0.8382, 0.6764, 0.5, 0.3236, 0.1618, 0.0809];
  const EXTRA_LENGTH_BUCKETS = EXTRA_LENGTH_VALUES.length;
  const extraLength = Math.max(maxOuterRadius - innerRadius, 1);

  for (let pointNum = 0; pointNum < LINE_COUNT; pointNum++) {
    const angle = ((pointNum * ANGLE_PER_LINE) + perturbAngle) * MathUtils.DEG2RAD;
    const outerRadius = innerRadius + (extraLength * EXTRA_LENGTH_VALUES[pointNum % EXTRA_LENGTH_BUCKETS]);
    const x = Math.cos(angle);
    const y = Math.sin(angle);

    points.push(new Vector3(x * innerRadius, y * innerRadius, 0));
    points.push(new Vector3(x * outerRadius, y * outerRadius, 0));
  }

  const geometry = new BufferGeometry();
  geometry.setFromPoints(points);
  return geometry; 
}

/**
 * A geometry that is intended to act as a backdrop for the entire scene.
 */
const backdropGeometry = new PlaneGeometry(4096, 4096);

function BackgroundManager(props: { audio: RefObject<HTMLAudioElement>, analyser: RefObject<AnalyserNode> }): JSX.Element {
  // Load background textures
  const textures = useTexture({
    star_first: process.env.PUBLIC_URL + '/backgrounds/star-01.png',
    star_first_glow: process.env.PUBLIC_URL + '/backgrounds/star-01-glow.png',
    star_second: process.env.PUBLIC_URL + '/backgrounds/star-02.png',
    star_second_glow: process.env.PUBLIC_URL + '/backgrounds/star-02-glow.png',
    star_third: process.env.PUBLIC_URL + '/backgrounds/star-03.png',
    star_third_glow: process.env.PUBLIC_URL + '/backgrounds/star-03-glow.png',
    horizon: process.env.PUBLIC_URL + '/backgrounds/horizon.png'
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
    tex.wrapS = tex.wrapT = RepeatWrapping;
    tex.repeat.setScalar(4);
  });

  // For the horizon, we just want to repeat the pixels when available
  textures.horizon.wrapS = textures.horizon.wrapT = RepeatWrapping;

  const trackAnalysis = useStore(state => state.analysis);
  const backgroundTheme = useStore(state => state.theme.background); 

  // Set up the geometry for the line "rings"
  const firstRingGeometry = useMemo(() => {
    return buildLineRingGeometry(300, 390, 0);
  }, []);

  const secondRingGeometry = useMemo(() => {
    return buildLineRingGeometry(400, 490, 15);
  }, []);

  const thirdRingGeometry = useMemo(() => {
    return buildLineRingGeometry(500, 590, 30);
  }, []);

  // Determine motion amounts based on the BPM
  const ringCycleSeconds = useMemo(() => {
    return trackAnalysis.secondsPerMeasure * 8;
  }, [trackAnalysis]);

  const starCycleSeconds = useMemo(() => {
    return trackAnalysis.secondsPerMeasure * 16;
  }, [trackAnalysis]);

  const horizonLayer = useRef<Mesh>(null!);
  const firstStarLayer = useRef<Mesh>(null!);
  const firstStarGlowLayer = useRef<Mesh>(null!);
  const secondStarLayer = useRef<Mesh>(null!);
  const secondStarGlowLayer = useRef<Mesh>(null!);
  const thirdStarLayer = useRef<Mesh>(null!);
  const thirdStarGlowLayer = useRef<Mesh>(null!);
  const ringGroup = useRef<Group>(null!);
  const firstLineRing = useRef<LineSegments>(null!);
  const secondLineRing = useRef<LineSegments>(null!);
  const thirdLineRing = useRef<LineSegments>(null!);
  
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

    // Rotate the line "rings" over time, each of which gets a different scale
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
        starGlowFactor = (frequencies[53] / 255.0) / 5;
      }
    }

    // Scale the rings opacity
    (firstLineRing.current.material as Material).opacity = 0.5 + ringOpacityFactor;
    (secondLineRing.current.material as Material).opacity = 0.4 + ringOpacityFactor;
    (thirdLineRing.current.material as Material).opacity = 0.3 + ringOpacityFactor;

    // Ease horizon flashes back down to 0.0, but cut off items that are asymptotically approaching 0 opacity
    let horizonDampenedOpacity = (horizonLayer.current.material as Material).opacity * 0.95;

    if (horizonDampenedOpacity <= 0.01) {
      horizonDampenedOpacity = 0;
    }

    (horizonLayer.current.material as Material).opacity = Math.max(horizonOpacityFactor, horizonDampenedOpacity);

    // Similarly scale the star "glow" layers
    let starGlowDampenedOpacity = (firstStarGlowLayer.current.material as Material).opacity * 0.95;

    if (starGlowDampenedOpacity <= 0.01) {
      starGlowDampenedOpacity = 0;
    }

    const newStarGlowOpacity = Math.max(starGlowFactor, starGlowDampenedOpacity);

    (firstStarGlowLayer.current.material as Material).opacity = newStarGlowOpacity;
    (secondStarGlowLayer.current.material as Material).opacity = newStarGlowOpacity;
    (thirdStarGlowLayer.current.material as Material).opacity = newStarGlowOpacity;

    // Scale the rings based on our frequency-driven factor
    // If we are just coming off of an increase in scale, we want to ease back to the standard 1.0
    const ringDampenedScale = firstLineRing.current.scale.x * 0.9;
    const newRingScale = Math.max(1.0 + ringScaleFactor, ringDampenedScale);

    firstLineRing.current.scale.x = firstLineRing.current.scale.y = newRingScale;
    secondLineRing.current.scale.x = secondLineRing.current.scale.y = newRingScale;
    thirdLineRing.current.scale.x = thirdLineRing.current.scale.y = newRingScale;

    // Make the rings appear closer as we get closer to the end of the track
    if (Number.isFinite(currentTrackDuration) && currentTrackDuration > 0) {
      const ringGroupScale = MathUtils.mapLinear(currentTrackTime, 0, currentTrackDuration, 1, 2.5);
      ringGroup.current.scale.x = ringGroup.current.scale.y = ringGroupScale;
    }
  })

  return (
    <group>
      <mesh
        ref={horizonLayer}
        frustumCulled={false}
        position={[0, 0, ComponentDepths.SunFlash]}
        scale={[8, 0.5, 1]}
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
          position={[0, 0, ComponentDepths.SunRing]}
          geometry={firstRingGeometry}
        >
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
          position={[0, 0, ComponentDepths.SunRing]}
          geometry={secondRingGeometry}
        >
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
          position={[0, 0, ComponentDepths.SunRing]}
          geometry={thirdRingGeometry}
        >
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
          position={[0, 0, ComponentDepths.StarsLayer1 + 1]}
          scale={[2, 2, 1]}
          frustumCulled={false}
          geometry={backdropGeometry}
        >
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
          position={[0, 0, ComponentDepths.StarsLayer1]}
          scale={[2, 2, 1]}
          frustumCulled={false}
          geometry={backdropGeometry}
        >
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
          position={[0, 0, ComponentDepths.StarsLayer2 + 1]}
          scale={[2, 2, 1]}
          frustumCulled={false}
          geometry={backdropGeometry}
        >
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
          position={[0, 0, ComponentDepths.StarsLayer2]}
          scale={[2, 2, 1]}
          frustumCulled={false}
          geometry={backdropGeometry}
        >
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
          position={[0, 0, ComponentDepths.StarsLayer3 + 1]}
          scale={[2, 2, 1]}
          frustumCulled={false}
          geometry={backdropGeometry}
        >
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
          position={[0, 0, ComponentDepths.StarsLayer3]}
          scale={[2, 2, 1]}
          frustumCulled={false}
          geometry={backdropGeometry}
        >
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
