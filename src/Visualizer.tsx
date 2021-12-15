import { RefObject, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, Object3DNode, useFrame } from '@react-three/fiber';
import { Bloom, EffectComposer, GodRays } from '@react-three/postprocessing';
import { BlendFunction, Resizer, KernelSize } from 'postprocessing';

import { TrackAnalysis } from './TrackAnalysis';
import Peak from './Peak';
import { LineBasicMaterial } from 'three';

// HACK: Work around namespace issue (THREE.Line is not in the typings, and <line> is interpreted as an SVG line element)
// https://github.com/pmndrs/react-three-fiber/issues/172
// https://github.com/pmndrs/react-three-fiber/issues/1152
declare type LineProps = Object3DNode<THREE.Line, typeof THREE.Line>;

declare global {
  namespace JSX {
    interface IntrinsicElements {
      threeLine: LineProps
    }
  }
}


function generateNumericArray(total: number) {
  return Array.from(Array(total).keys());
}

function getBasePosition(sideIdx: number, totalSides: number, scale: number): THREE.Vector3 {
  // Modulo the side index so that we'll always get a value that maps within [0, 360) degree range
  let angle = ((sideIdx % totalSides) / totalSides) * 2 * Math.PI;

  // For alternating sets, further perturb the angle
  if (Math.ceil(sideIdx / totalSides) % 2 === 0) {
    angle += Math.PI / totalSides;
  } 

  return new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0).multiplyScalar(scale);
}

function PeakQueue(props: { audio: RefObject<HTMLAudioElement>, peaks: Peak[] }) {
  let nextUnrenderedPeakIndex = 0;
  let nextAvailableMeshIndex = 0;
  const availableMeshesRing = useRef<THREE.Mesh[]>([]);
  const SIDES = 6;
  const RADIUS = 5;
  const LOOKAHEAD_PERIOD = 1.5;
  const PEAK_DEPTH_START = -200;
  const PEAK_DEPTH_END = -10;
  const BASE_COLOR = new THREE.Color(0x770077);

  // Generate available meshes for use in a ring buffer
  const availableMeshElements = 
    generateNumericArray(SIDES * 6).map((sideNumber) => {
      return <mesh
        ref={(mesh: THREE.Mesh) => availableMeshesRing.current[sideNumber] = mesh}
        visible={false}
        position={getBasePosition(sideNumber, SIDES, RADIUS)}
        key={sideNumber}
      >
        <sphereGeometry />
        <meshPhongMaterial color={BASE_COLOR} />
      </mesh>
    });

  // Ensure we reset the next peak index when analysis changes
  useEffect(
    () => {
      nextUnrenderedPeakIndex = 0;
      nextAvailableMeshIndex = 0;
    },
    [props.peaks]);

  useFrame((state, delta) => {
    if (props.audio.current === null || availableMeshesRing.current === null) {
      return;
    }

    const audioTime = props.audio.current.currentTime;
    const lastRenderTime = Math.max(audioTime - delta, 0);

    // Determine if we need to fill the ring buffer with any new meshes
    for (let peakIdx = nextUnrenderedPeakIndex; peakIdx < props.peaks.length; peakIdx++) {
      // If we reached the end of the list, stop
      if (peakIdx >= props.peaks.length) {
        break;
      }

      const curPeak = props.peaks[peakIdx];
      const nextPeakStart = curPeak.time - LOOKAHEAD_PERIOD;

      // See if we're already too late for this peak - if so, skip ahead
      if (lastRenderTime > curPeak.end) {
        nextUnrenderedPeakIndex++;
        continue;
      }

      // Now see if we're too early for this peak - if so, exit out
      if (nextPeakStart > audioTime) {
        break;
      }

      // Now we have a new peak to render. Assign it to the next available mesh
      const meshForPeak = availableMeshesRing.current[nextAvailableMeshIndex];
      meshForPeak.userData['peak'] = curPeak;
      
      // Switch around to the next mesh in the ring buffer
      nextAvailableMeshIndex = (nextAvailableMeshIndex + 1) % availableMeshesRing.current.length;

      // Ensure we're rendering the next peak
      nextUnrenderedPeakIndex++;
    }

    // Now update the items in the ring buffer
    for (let meshForPeak of availableMeshesRing.current)
    {
      const peakData = meshForPeak.userData['peak'] as Peak;

      if (peakData === null || peakData === undefined) {
        meshForPeak.visible = false;
        continue;
      }

      const startRenderTime = Math.max(peakData.time - LOOKAHEAD_PERIOD, 0);
      const startEmissiveTime = startRenderTime + ((peakData.time - startRenderTime) * 0.5);
      const endRenderTime = peakData.end + 0.25;

      // See if we've finished peaking, which means we should hide the mesh
      if (startRenderTime > audioTime || endRenderTime < lastRenderTime) {
        meshForPeak.visible = false;
        continue;
      }

      // Make the mesh visible and lerp it to zoom in
      meshForPeak.visible = true;
      meshForPeak.position.z = THREE.MathUtils.lerp(PEAK_DEPTH_START, PEAK_DEPTH_END, (audioTime - startRenderTime) / (endRenderTime - startRenderTime));

      // Tweak properties if we're during the actual beat
      const material = (meshForPeak.material as THREE.MeshPhongMaterial);

      if (audioTime >= startEmissiveTime && audioTime < peakData.end) {
        material.shininess = THREE.MathUtils.mapLinear(audioTime, startEmissiveTime, peakData.end, 0.5, 1.0);
      }
      else {
        material.shininess = 0.5;
      }

      if (audioTime >= peakData.time && audioTime < endRenderTime) {
        meshForPeak.scale.setScalar(THREE.MathUtils.mapLinear(audioTime, peakData.time, endRenderTime, 1.0, 2.0));
      }
      else {
        meshForPeak.scale.setScalar(1);
      }
    }
  });

  return (
    <group>
      {availableMeshElements}
    </group>
  )
}

function FrequencyGrid(props: { analyser: RefObject<AnalyserNode> }) {
  // We're using two extra "buckets" to anchor it at the beginning
  const BUCKETS = 64;
  const HORIZONTAL_SCALE = 0.5;
  const VERTICAL_SCALE = 5.0;
  // const line = useRef<THREE.Line>(null!);

  // Construct the set of points
  const pointSet = useMemo(() => {
    const points: THREE.Vector3[] = [];

    // Insert four special points at the beginning to anchor it
    points.push(new THREE.Vector3(BUCKETS * -1 * HORIZONTAL_SCALE, 0, 0));
    points.push(new THREE.Vector3(BUCKETS * -0.875 * HORIZONTAL_SCALE, 0, 0));
    points.push(new THREE.Vector3(BUCKETS * -0.75 * HORIZONTAL_SCALE, 0, 0));
    points.push(new THREE.Vector3(BUCKETS * -0.625 * HORIZONTAL_SCALE, 0, 0));

    for(let i = 0; i < BUCKETS; i++) {
      points.push(new THREE.Vector3((i - (BUCKETS / 2)) * HORIZONTAL_SCALE, 0, 0));
    }

    // Similarly, insert four anchors at the end
    points.push(new THREE.Vector3(BUCKETS * 0.625 * HORIZONTAL_SCALE, 0, 0));
    points.push(new THREE.Vector3(BUCKETS * 0.75 * HORIZONTAL_SCALE, 0, 0));
    points.push(new THREE.Vector3(BUCKETS * 0.875 * HORIZONTAL_SCALE, 0, 0));
    points.push(new THREE.Vector3(BUCKETS * HORIZONTAL_SCALE, 0, 0));

    return points;
  }, []);

  // Construct the geometry from those points
  const frequencyGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setFromPoints(pointSet);
    return geometry;
  }, [pointSet]);

  // Construct multiple lines from the geometry
  const frontLine = useMemo(() => {
    return new THREE.Line(frequencyGeometry, new LineBasicMaterial({color: 0xaa00aa}));
  }, [frequencyGeometry]);

  const secondLine = useMemo(() => {
    return new THREE.Line(frequencyGeometry, new LineBasicMaterial({color: 0x550055}));
  }, [frequencyGeometry]);

  const thirdLine = useMemo(() => {
    return new THREE.Line(frequencyGeometry, new LineBasicMaterial({color: 0x220022}));
  }, [frequencyGeometry]);

  useFrame((state, delta) => {
    if (props.analyser.current === null) {
      return;
    }

    const frequencies = new Uint8Array(props.analyser.current.frequencyBinCount);
    props.analyser.current.getByteFrequencyData(frequencies);

    // Skip over the four anchor points at the beginning and the four anchor points at the end
    for(let i = 4; i < frequencies.length && i < pointSet.length - 4; i++) {
      pointSet[i].y = (frequencies[i] / 255.0) * VERTICAL_SCALE;
    }

    // Use the anchor points to scale down the edge exponentially
    const firstFrequency = (frequencies[0] / 255.0) * VERTICAL_SCALE;
    const lastFrequency = (frequencies[frequencies.length - 1] / 255.0) * VERTICAL_SCALE;

    pointSet[3].y = firstFrequency * 0.75;
    pointSet[2].y = firstFrequency * 0.5625;
    pointSet[1].y = firstFrequency * 0.42;

    pointSet[BUCKETS].y = lastFrequency * 0.75;
    pointSet[BUCKETS+1].y = lastFrequency * 0.5625;
    pointSet[BUCKETS+2].y = lastFrequency * 0.42;

    frontLine.geometry.setFromPoints(pointSet);
    frontLine.geometry.computeBoundingBox();

    secondLine.geometry.setFromPoints(pointSet);
    secondLine.geometry.computeBoundingBox();

    thirdLine.geometry.setFromPoints(pointSet);
    thirdLine.geometry.computeBoundingBox();
  });

  return (
    <group>
      <primitive 
        object={frontLine} 
        position={[0, -10, -10]} 
        scale={[0.5, 1.0, 1.0]} 
      />
      <primitive 
        object={secondLine} 
        position={[0, -10, -30]} 
        scale={[0.45, 1.0, 1.0]} 
      />
      <primitive 
        object={thirdLine} 
        position={[0, -10, -50]} 
        scale={[0.4, 1.0, 1.0]} 
      />
    </group>
  );
}

function Visualizer(props: { audio: RefObject<HTMLAudioElement>, analyser: RefObject<AnalyserNode>, trackAnalysis: TrackAnalysis }) {
  const sunMesh = useRef<THREE.Mesh>(null!);
  // const godRaysEffect = useRef<typeof GodRays>(null!);

  return (
    <Canvas camera={{position: [0, 0, 15]}}>
      <ambientLight intensity={0.1} />
      <directionalLight position={[0, 0, 20]} />
      <mesh 
        ref={sunMesh}
        frustumCulled={false}
        position={[0, 0, -200]}
      >
        <sphereGeometry args={[5]} />
        <meshBasicMaterial color={0xffcc55} transparent={true} fog={false} />
      </mesh>
      <PeakQueue audio={props.audio} peaks={props.trackAnalysis.beat} />
      <FrequencyGrid analyser={props.analyser} />
      {/* 
        These are just to help visualize positioned elements relative to the camera.
          o Red - x
          o Green - y
          o Blue - z
        Negative values use a box, positive values use a sphere.
      */}
      {/* <mesh position={[0, 0, -100]}>
        <boxGeometry args={[2, 2, 2]} />
        <meshBasicMaterial color={0x0000ff} />
      </mesh>
      <mesh position={[0, 0, 100]}>
        <sphereGeometry />
        <meshBasicMaterial color={0x0000ff} />
      </mesh>
      <mesh position={[0, -10, 0]}>
        <boxGeometry args={[2, 2, 2]} />
        <meshBasicMaterial color={0x00ff00} />
      </mesh>
      <mesh position={[0, 10, 0]}>
        <sphereGeometry />
        <meshBasicMaterial color={0x00ff00} />
      </mesh>
      <mesh position={[-10, 0, 0]}>
        <boxGeometry args={[2, 2, 2]} />
        <meshBasicMaterial color={0xff0000} />
      </mesh>
      <mesh position={[10, 0, 0]}>
        <sphereGeometry />
        <meshBasicMaterial color={0xff0000} />
      </mesh> */}
      <EffectComposer>
        <Bloom
          intensity={0.5}
          width={Resizer.AUTO_SIZE}
          height={Resizer.AUTO_SIZE}
          kernelSize={KernelSize.LARGE}
          luminanceThreshold={0.5}
          luminanceSmoothing={0.025}
        />
        {sunMesh.current && 
          <GodRays 
            sun={sunMesh.current}
            blendFunction={BlendFunction.Screen}
            samples={60}
            density={0.96}
            decay={0.9}
            weight={0.4}
            exposure={0.6}
            clampMax={1}
            width={Resizer.AUTO_SIZE}
            height={Resizer.AUTO_SIZE}
            kernelSize={KernelSize.SMALL}
          />}
      </EffectComposer>
    </Canvas>
  );
}

export default Visualizer;