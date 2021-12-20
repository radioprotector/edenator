import { RefObject, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, GodRays, ColorDepth, Noise } from '@react-three/postprocessing';
import { GodRaysEffect, ColorDepthEffect, NoiseEffect, BlendFunction, Resizer, KernelSize } from 'postprocessing';

import { TrackAnalysis } from './TrackAnalysis';
import Peak from './Peak';

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

function PeakQueue(props: { audio: RefObject<HTMLAudioElement>, audioLastSeeked: number, peaks: Peak[] }) {
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

  // Ensure we reset the next peak index when analysis changes (or we seeked).
  // We're okay with just blowing away these values and letting useFrame re-calculate when it needs to
  useEffect(
    () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      nextUnrenderedPeakIndex = 0;
      // eslint-disable-next-line react-hooks/exhaustive-deps
      nextAvailableMeshIndex = 0;
    },
    [props.peaks, props.audioLastSeeked]);

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

function FrequencyGrid(props: { audio: RefObject<HTMLAudioElement>, analyser: RefObject<AnalyserNode>, trackAnalysis: TrackAnalysis }) {
  // Track how many rows we have, where the first row starts, depth-wise, and the spacing between each row  
  const FREQUENCY_ROWS: number = 10;
  const STARTING_DEPTH: number = -10;
  const DEPTH_SPACING: number = -20;

  // XXX: LINE_BUCKETS should be equal to analyzer.frequencyBinCount
  const LINE_BUCKETS = 64;
  const BUCKET_WIDTH = 0.5;
  const BUCKET_HEIGHT = 5.0;

  // On either end, we want a set number of points to ease down the minimum/maximum frequencies to 0
  // and avoid sharp cliffs
  const ANCHOR_POINTS = 8;

  // Construct the set of points to use for each line
  const pointSet = useMemo(() => {
    const points: THREE.Vector3[] = [];

    // Start by adding anchor points on the left-hand side and use a different scale just for the anchors
    // Ideally we want something like
    // |--25% anchors--|----50% points----|--25% anchors--|
    const anchorIncrement = (LINE_BUCKETS * BUCKET_WIDTH) / (4 * ANCHOR_POINTS);
    let currentX = -(anchorIncrement * ANCHOR_POINTS) - (LINE_BUCKETS * BUCKET_WIDTH / 2);

    for (let i = 0; i < ANCHOR_POINTS; i++) {
      points.push(new THREE.Vector3(currentX, 0, 0));
      currentX += anchorIncrement;
    }

    // Now start distributing the "normal" points around zero
    for(let i = 0; i < LINE_BUCKETS; i++) {
      points.push(new THREE.Vector3(currentX, 0, 0));
      currentX += BUCKET_WIDTH;
    }

    // Add the ending anchors
    for (let i = 0; i < ANCHOR_POINTS; i++) {
      points.push(new THREE.Vector3(currentX, 0, 0));
      currentX += anchorIncrement;
    }    

    return points;
  }, []);

  // Construct the geometry from those points
  const frequencyGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setFromPoints(pointSet);
    return geometry;
  }, [pointSet]);

  // Construct multiple lines from the geometry
  const rowLines = useRef<THREE.Line[]>([]);
  const rowElements = useMemo(() => {
    const lineMaterial = new THREE.LineBasicMaterial({color: 0xaa00aa});

    return generateNumericArray(FREQUENCY_ROWS).map((rowIndex) => {
      const line = new THREE.Line(frequencyGeometry, lineMaterial);
      line.position.set(0, -10, STARTING_DEPTH + (DEPTH_SPACING * rowIndex));
      line.scale.set(0.6, THREE.MathUtils.mapLinear(rowIndex, 0, FREQUENCY_ROWS - 1, 1.0, 0.1), 1.0);

      // Ensure the line is stored in a mesh
      rowLines.current[rowIndex] = line;

      // Convert the line to the equivalent JSX element
      return <primitive 
        object={line}
        key={rowIndex}
      />
    })
    }, [frequencyGeometry, STARTING_DEPTH, DEPTH_SPACING, FREQUENCY_ROWS]);

  useFrame((state, delta) => {
    if (props.analyser.current === null || props.audio.current === null) {
      return;
    }

    const frequencies = new Uint8Array(props.analyser.current.frequencyBinCount);
    props.analyser.current.getByteFrequencyData(frequencies);

    // Skip over the four anchor points at the beginning and the four anchor points at the end
    for(let i = 0; i < frequencies.length; i++) {
      // Ensure that we're skipping over the anchors when accessing points, so that
      // frequencies[0] will correspond with pointSet[ANCHOR_POINTS]
      pointSet[i + ANCHOR_POINTS].y = (frequencies[i] / 255.0) * BUCKET_HEIGHT;
    }

    // Use the anchor points to scale down the edges
    let leftmostFrequency = (frequencies[0] / 255.0) * BUCKET_HEIGHT;
    let rightmostFrequency = (frequencies[frequencies.length - 1] / 255.0) * BUCKET_HEIGHT;

    // Move outward on the lefthand side (but don't touch the bucket at 0)
    for(let i = ANCHOR_POINTS - 1; i > 0; i--) {
      leftmostFrequency = leftmostFrequency / 1.618;
      pointSet[i].y = leftmostFrequency;
    }

    // Move outward on the righthand side (but again skip over the last bucket)
    for (let i = LINE_BUCKETS + ANCHOR_POINTS; i < pointSet.length - 1; i++) {
      rightmostFrequency = rightmostFrequency / 1.618;
      pointSet[i].y = rightmostFrequency;
    }

    // Calculate how much of the measure, by percentage has elapsed by now
    let measurePercentage = 0;
    const secondsPerMeasure = props.trackAnalysis.secondsPerMeasure;

    if (props.audio.current.currentTime > 0) {
      measurePercentage = (props.audio.current.currentTime % secondsPerMeasure) / secondsPerMeasure;
    }

    // Update all of the rows
    for(let rowIndex = 0; rowIndex < rowLines.current.length; rowIndex++) {
      // Apply the point set to all line rows
      const lineRow = rowLines.current[rowIndex];
      const baseDepth = STARTING_DEPTH + (DEPTH_SPACING * rowIndex);

      lineRow.geometry.setFromPoints(pointSet);
      lineRow.geometry.computeBoundingBox();

      // Move forward the Z by the row spacing * the % of the measure completed.
      // This ensures that each row will approach the previous row's starting point,
      // but will snap back to the starting point once the new measure starts
      if (props.audio.current.currentTime > 0) {
        lineRow.position.z = baseDepth - (DEPTH_SPACING * measurePercentage);
      }
      else {
        lineRow.position.z = baseDepth;
      }
    }
  });

  return (
    <group>
      {rowElements}
    </group>
  );
}

function BassTunnel(props: { audio: RefObject<HTMLAudioElement>, analyser: RefObject<AnalyserNode>, trackAnalysis: TrackAnalysis }) {
  const SEGMENTS_PER_SIDE = 10;
  const SEGMENT_DEPTH = 10;
  const SEGMENT_WIDTH = 2;
  const SEGMENT_HEIGHT = 10;
  const START_DEPTH = -10;
  const HORIZ_OFFSET = 10;
  const lineColor = new THREE.Color(0x8f074b);
  const fillerColor = new THREE.Color(0x850707);

  // When we normally try to display a standard box geometry using wireframes,
  // it will display each side using two triangles. We want pure lines,
  // so we'll use a set of lines (with appropriate scaling) to approximate quads.
  const boxLineGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();

    geometry.setFromPoints([
      // Right line, front face
      new THREE.Vector3(0.5, -0.5, 0.5),
      new THREE.Vector3(0.5, 0.5, 0.5),

      // Top line, front face
      new THREE.Vector3(0.5, 0.5, 0.5),
      new THREE.Vector3(-0.5, 0.5, 0.5),

      // Left line, front face
      new THREE.Vector3(-0.5, 0.5, 0.5),
      new THREE.Vector3(-0.5, -0.5, 0.5),

      // Bottom line, front face
      new THREE.Vector3(-0.5, -0.5, 0.5),
      new THREE.Vector3(0.5, -0.5, 0.5),

      // Top-left faces connector
      new THREE.Vector3(-0.5, 0.5, 0.5),
      new THREE.Vector3(-0.5, 0.5, -0.5),

      // Bottom-left faces connector
      new THREE.Vector3(-0.5, -0.5, 0.5),
      new THREE.Vector3(-0.5, -0.5, -0.5),

      // Top-right faces connector
      new THREE.Vector3(0.5, 0.5, 0.5),
      new THREE.Vector3(0.5, 0.5, -0.5),

      // Bottom-right faces connector
      new THREE.Vector3(0.5, -0.5, 0.5),
      new THREE.Vector3(0.5, -0.5, -0.5),

      // Right line, back face
      new THREE.Vector3(0.5, -0.5, -0.5),
      new THREE.Vector3(0.5, 0.5, -0.5),

      // Top line, back face
      new THREE.Vector3(0.5, 0.5, -0.5),
      new THREE.Vector3(-0.5, 0.5, -0.5),

      // Left line, back face
      new THREE.Vector3(-0.5, 0.5, -0.5),
      new THREE.Vector3(-0.5, -0.5, -0.5),

      // Bottom line, back face
      new THREE.Vector3(-0.5, -0.5, -0.5),
      new THREE.Vector3(0.5, -0.5, -0.5),
    ]);

    return geometry;
  }, []);

  // Store references to each tunnel segment group and its constituent elements (box/plane)
  const tunnelSegments = useRef<THREE.Group[]>([]);
  const tunnelSegmentBoxes = useRef<THREE.LineSegments[]>([]);
  const tunnelSegmentPlanes = useRef<THREE.Mesh[]>([]);
  const tunnelSegmentElements = useMemo(() =>
    generateNumericArray(SEGMENTS_PER_SIDE * 2).map((segmentNum) => {
      // The first half of the segments will be on the left side, the other will be on the right side
      let horizSegment = HORIZ_OFFSET;
      let isSegmentVisible = true;

      if (segmentNum < SEGMENTS_PER_SIDE) {
        horizSegment = -HORIZ_OFFSET;
      }

      // Randomly determine how this segment might appear based on the song - use the segment index as a fake "time"
      const segmentDisplayMode = props.trackAnalysis.getTrackTimeRandomInt(0, 6, segmentNum);

      // Because we want to customize a lot of the properties on the plane mesh based on this mesh, generate it ahead of time
      const planeForSegment = new THREE.Mesh(new THREE.PlaneGeometry(), new THREE.MeshBasicMaterial({ color: fillerColor, side: THREE.DoubleSide }));
      tunnelSegmentPlanes.current[segmentNum] = planeForSegment;
      planeForSegment.visible = true;

      switch(segmentDisplayMode) {
        // 0 - entire segment hidden
        case 0:
          isSegmentVisible = false;
          planeForSegment.visible = false;
          break;

        // 1 - plane visible on the left of the box
        case 1:
          planeForSegment.scale.set(SEGMENT_DEPTH, SEGMENT_HEIGHT, 1);
          planeForSegment.position.set(-SEGMENT_WIDTH / 2, 0, 0);
          planeForSegment.rotateY(Math.PI / 2);
          break;

        // 2 - plane visible on the right of the box
        case 2:
          planeForSegment.scale.set(SEGMENT_DEPTH, SEGMENT_HEIGHT, 1);
          planeForSegment.position.set(SEGMENT_WIDTH / 2, 0, 0);
          planeForSegment.rotateY(Math.PI / 2);
          break;

        // 3 - plane visible on the front of the box         
        case 3:
          planeForSegment.scale.set(SEGMENT_WIDTH, SEGMENT_HEIGHT, 1);
          planeForSegment.position.set(0, 0, SEGMENT_DEPTH / 2);
          planeForSegment.rotation.set(0, 0, 0);
          break;

        // 4 - plane visible on the top of the box
        case 4:
          planeForSegment.scale.set(SEGMENT_WIDTH, SEGMENT_DEPTH, 1);
          planeForSegment.position.set(0, SEGMENT_HEIGHT / 2, 0);
          planeForSegment.rotateX(Math.PI / 2);
          break;

        // 5 - plane visible on the bottom of the box
        case 5:
          planeForSegment.scale.set(SEGMENT_WIDTH, SEGMENT_DEPTH, 1);
          planeForSegment.position.set(0, -SEGMENT_HEIGHT / 2, 0);
          planeForSegment.rotateX(Math.PI / 2);
          break;

        // 6 - plane is hidden
        case 6:
          planeForSegment.visible = false;
          break;
      }

      return <group
        ref={(grp: THREE.Group) => tunnelSegments.current[segmentNum] = grp}
        position={[horizSegment, 0, START_DEPTH - (SEGMENT_DEPTH * (segmentNum % SEGMENTS_PER_SIDE))]}
        visible={isSegmentVisible}
        key={segmentNum}
      >
        <lineSegments
          ref={(seg: THREE.LineSegments) => tunnelSegmentBoxes.current[segmentNum] = seg}
          scale={[SEGMENT_WIDTH, SEGMENT_HEIGHT, SEGMENT_DEPTH]}
        >
          <primitive object={boxLineGeometry} attach='geometry' />
          <lineBasicMaterial color={lineColor} />
        </lineSegments>   
        <primitive object={planeForSegment} />
      </group>
    }),
    [props.trackAnalysis, boxLineGeometry, lineColor, fillerColor]);

  return (
    <group>
      {tunnelSegmentElements}
    </group>
  );
}

function VfxManager(props: { audio: RefObject<HTMLAudioElement>, analyser: RefObject<AnalyserNode>, sunMesh: THREE.Mesh }) {
  const godRaysEffect = useRef<typeof GodRaysEffect>(null!);
  const colorDepthEffect = useRef<typeof ColorDepthEffect>(null!);
  const noiseEffect = useRef<typeof NoiseEffect>(null!);
  
  useFrame((state, delta) => {
    if (props.audio.current === null || props.audio.current.currentTime <= 0 || props.analyser.current === null || godRaysEffect.current === null) {
      return;
    }

    const frequencies = new Uint8Array(props.analyser.current.frequencyBinCount);
    props.analyser.current.getByteFrequencyData(frequencies);

    // Adjust the intensity of the noise based on low frequencies
    if (Number.isFinite(frequencies[0])) {
      noiseEffect.current.blendMode.opacity.value = THREE.MathUtils.lerp(0.0, 0.03, frequencies[0] / 255.0);
    }
    else {
      noiseEffect.current.blendMode.opacity.value = 0.0;
    }

    // Pulse the intensity of the god rays based on low-mid frequencies
    // HACK: Party on the GodRaysMaterial and adjust values based on our frequency
    // https://vanruesc.github.io/postprocessing/public/docs/file/src/effects/GodRaysEffect.js.html
    const godRaysMaterial = godRaysEffect.current.godRaysPass.getFullscreenMaterial();
    
    if (Number.isFinite(frequencies[5])) {
      const godRaysScale = frequencies[5] / 255.0;

      godRaysMaterial.uniforms.decay.value = THREE.MathUtils.lerp(0.4, 0.93, godRaysScale);
      godRaysMaterial.uniforms.exposure.value = THREE.MathUtils.lerp(0.4, 0.85, godRaysScale);
    }
    else {
      godRaysMaterial.uniforms.decay.value = 0.4;
      godRaysMaterial.uniforms.exposure.value = 0.4;
    }

    // Scale the intensity of the color "bitcrush" based on the upper frequency ranges
    let upperFrequenciesSize = Math.ceil(frequencies.length / 4);
    let upperFrequencyAverage = 0.0;

    for (let frequencyBinIndex = frequencies.length - upperFrequenciesSize; frequencyBinIndex < frequencies.length; frequencyBinIndex++) {
      if (Number.isFinite(frequencies[frequencyBinIndex])) {
        upperFrequencyAverage += frequencies[frequencyBinIndex];
      }
    }

    colorDepthEffect.current.blendMode.opacity.value = THREE.MathUtils.lerp(0.0, 0.5, upperFrequencyAverage / (upperFrequenciesSize * 255.0));
  });

  return (
    <EffectComposer>
      <Bloom
        intensity={1}
        width={Resizer.AUTO_SIZE}
        height={Resizer.AUTO_SIZE}
        kernelSize={KernelSize.MEDIUM}
        luminanceThreshold={0.4}
        luminanceSmoothing={0.1}
      />
      <GodRays
        ref={godRaysEffect}
        sun={props.sunMesh}
        blur={10}
        blendFunction={BlendFunction.Screen}
        samples={60}
        density={0.85}
        decay={0.85}
        weight={0.4}
        exposure={0.9}
        clampMax={1}
        width={Resizer.AUTO_SIZE}
        height={Resizer.AUTO_SIZE}
        kernelSize={KernelSize.MEDIUM}
      />
      <ColorDepth
        ref={colorDepthEffect}
        bits={4}
        opacity={0.0}
      />
      <Noise
        ref={noiseEffect}
        opacity={0.0}
      />
    </EffectComposer>
  )
}

function Visualizer(props: { audio: RefObject<HTMLAudioElement>, analyser: RefObject<AnalyserNode>, trackAnalysis: TrackAnalysis, audioLastSeeked: number }) {
  // Create the sun mesh ahead of time so that we don't have to muck around with refs when passing it to the VFX manager
  const sunMesh = useMemo(() => {
    let mesh = new THREE.Mesh(new THREE.SphereGeometry(5), new THREE.MeshBasicMaterial({color: 0xffcc55, transparent: true, fog: false}));
    mesh.frustumCulled = false;
    mesh.position.set(0, 0, -200);
    return mesh;
  }, []);

  return (
    <Canvas camera={{position: [0, 0, 15]}}>
      <ambientLight intensity={0.1} />
      <directionalLight position={[0, 0, 20]} />
      <primitive object={sunMesh} />
      <BassTunnel audio={props.audio} analyser={props.analyser} trackAnalysis={props.trackAnalysis} />
      <PeakQueue audio={props.audio} peaks={props.trackAnalysis.beat} audioLastSeeked={props.audioLastSeeked} />
      <FrequencyGrid audio={props.audio} analyser={props.analyser} trackAnalysis={props.trackAnalysis} />
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
      <VfxManager audio={props.audio} analyser={props.analyser} sunMesh={sunMesh} />
    </Canvas>
  );
}

export default Visualizer;