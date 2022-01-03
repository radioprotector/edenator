import { RefObject, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

import { useStore } from '../store/visualizerStore';
import { generateNumericArray } from '../utils';
import Lull from '../store/Lull';

const BASE_RADIUS = 150;
const NO_TRANSLATION = new THREE.Vector3(0, 0, 0);

/**
 * The collection of geometries that can be used for scenery and the translation to use for it.
 */
const SCENERY_GEOMETRIES: [THREE.BufferGeometry, THREE.Vector3][] = [
  [
    new THREE.ConeGeometry(BASE_RADIUS, BASE_RADIUS * 3, undefined, undefined, true),
    NO_TRANSLATION
  ],
  [
    // The top half of a sphere - make sure we move it down so it's flush
    new THREE.SphereGeometry(BASE_RADIUS, undefined, undefined, undefined, undefined, 0, Math.PI / 2),
    new THREE.Vector3(0, -BASE_RADIUS/2, 0)
  ],
  [
    new THREE.BoxGeometry(BASE_RADIUS, BASE_RADIUS * 5, BASE_RADIUS),
    NO_TRANSLATION
  ],
  [
    // The top half of a torus - move it down like the sphere and rotate it so it's parallel to the walls
    new THREE.TorusGeometry(BASE_RADIUS, BASE_RADIUS / 2, undefined, undefined, Math.PI).rotateY(Math.PI / 2),
    new THREE.Vector3(0, -BASE_RADIUS/1.5, 0)
  ],
  [
    new THREE.CylinderGeometry(BASE_RADIUS, BASE_RADIUS, BASE_RADIUS * 5, undefined, undefined, true),
    NO_TRANSLATION
  ]
];

/**
 * A material to use for scenery.
 */
const sceneryMaterial = new THREE.MeshStandardMaterial({ fog: true });

/**
 * An alternate (differently-colored) material to use for scenery.
 */
const sceneryAlternateMaterial = new THREE.MeshStandardMaterial({ fog: true });

/**
 * A wireframe material to use for scenery.
 */
const sceneryWireframeMaterial = new THREE.MeshBasicMaterial({ wireframe: true });

function SceneryQueue(props: { audio: RefObject<HTMLAudioElement>, analyser: RefObject<AnalyserNode> }): JSX.Element {
  let nextUnrenderedLullIndex = 0;
  let nextAvailableMeshIndex = 0;
  const availableSceneryMeshesRing = useRef<THREE.Mesh[]>([]);
  const QUEUE_SIZE = 20;
  const SCENERY_DEPTH_START = -1000;
  const SCENERY_DEPTH_END = 0;
  const HORIZ_OFFSET = BASE_RADIUS * 2;
  const VERT_OFFSET = -10;

  const trackAnalysis = useStore(state => state.analysis);

  // Make the lookahead and decay periods variable based on measure lengths
  const lookaheadPeriod = useMemo(() => {
    return trackAnalysis.secondsPerMeasure * 2;
  }, [trackAnalysis]);

  const decayPeriod = useMemo(() => {
    return trackAnalysis.secondsPerMeasure * 0.25;
  }, [trackAnalysis])

  // Generate available sprites for use in a ring buffer
  const availableMeshElements = 
    generateNumericArray(QUEUE_SIZE).map((index) => {
      return <mesh
        key={index}
        visible={false}
        ref={(m: THREE.Mesh) => availableSceneryMeshesRing.current[index] = m}
        position={[HORIZ_OFFSET, VERT_OFFSET, SCENERY_DEPTH_START]}
        material={sceneryMaterial}
      />
    });

  // Because the scenery material is cached across multiple renders, just ensure the color reflects the state.
  sceneryMaterial.color = useStore().theme.beat.color;
  sceneryAlternateMaterial.color = useStore().theme.bass.panelColor;
  sceneryWireframeMaterial.color = useStore().theme.frequencyGrid.lineColor;

  useEffect(() => useStore.subscribe(
    state => state.theme.beat.color,
    (newColor) => {
      sceneryMaterial.color = newColor;
    }),
    []);

  useEffect(() => useStore.subscribe(
    state => state.theme.bass.panelColor,
    (newColor) => {
      sceneryAlternateMaterial.color = newColor;
    }),
    []);

  useEffect(() => useStore.subscribe(
    state => state.theme.frequencyGrid.lineColor,
    (newColor) => {
      sceneryWireframeMaterial.color = newColor;
    }),
    []);

  // Reset the lull indices when we seek or change tracks
  useEffect(() => useStore.subscribe(
    state => [state.analysis, state.audioLastSeeked],
    () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      nextUnrenderedLullIndex = 0;
      // eslint-disable-next-line react-hooks/exhaustive-deps
      nextAvailableMeshIndex = 0;
    }),
    []);

  useFrame((_state, delta) => {
    if (props.audio.current === null) {
      return;
    }

    const audioTime = props.audio.current.currentTime;
    const lastRenderTime = Math.max(audioTime - delta, 0);

    // Determine if we need to fill the ring buffer with any new meshes
    for (let lullIdx = nextUnrenderedLullIndex; lullIdx < trackAnalysis.lulls.length; lullIdx++) {
      const curLull = trackAnalysis.lulls[lullIdx];
      const lullDisplayStart = curLull.time - lookaheadPeriod;
      const lullDisplayEnd = curLull.time + curLull.duration + decayPeriod;

      // See if we're already too late for this lull - if so, skip ahead
      if (lastRenderTime > lullDisplayEnd) {
        nextUnrenderedLullIndex++;
        continue;
      }

      // Now see if we're too early for this lull - if so, exit out
      if (lullDisplayStart > audioTime) {
        break;
      }

      // Now we have a new lull to render. Attach the data.
      const meshForLull = availableSceneryMeshesRing.current[nextAvailableMeshIndex];
      meshForLull.userData['lull'] = curLull;

      // Randomize the geometry to use for the mesh
      const geometryIndex = trackAnalysis.getTrackSeededRandomInt(0, SCENERY_GEOMETRIES.length - 1, curLull.time);
      meshForLull.geometry = SCENERY_GEOMETRIES[geometryIndex][0];

      // Pull geometry-specific translation information
      const geometryPosition = SCENERY_GEOMETRIES[geometryIndex][1];

      // Randomize whether it's on the left or right and apply the geometry-specific offset in the same direction
      if (trackAnalysis.getTrackSeededRandomInt(0, 1, curLull.time) === 0) {
        meshForLull.position.x = HORIZ_OFFSET + geometryPosition.x;
      }
      else {
        meshForLull.position.x = -HORIZ_OFFSET - geometryPosition.x;
      }

      // Similarly randomize which material is being used - use a different seed
      switch (trackAnalysis.getTrackSeededRandomInt(0, 2, curLull.time + curLull.duration)) {
        case 0:
          meshForLull.material = sceneryMaterial;
          break;

        case 1:
          meshForLull.material = sceneryAlternateMaterial;
          break;

        case 2:
          meshForLull.material = sceneryWireframeMaterial;
          break;
      }

      // Reset the vertical offset and apply the geometry-specific offset
      meshForLull.position.y = VERT_OFFSET + geometryPosition.y;
      
      // Switch around to the next item in the ring buffer
      nextAvailableMeshIndex = (nextAvailableMeshIndex + 1) % availableSceneryMeshesRing.current.length;

      // Ensure we're rendering the next lull
      nextUnrenderedLullIndex++;
    }

    // Calculate audio-based scaling factors
    let verticalScalingFactor = 0.0;
    let widthAndDepthScalingFactor = 0.0;

    if (props.audio.current.currentTime > 0 && props.analyser.current != null) {
      const frequencies = new Uint8Array(props.analyser.current.frequencyBinCount);
      props.analyser.current.getByteFrequencyData(frequencies);

      if (Number.isFinite(frequencies[7])) {
        verticalScalingFactor = (frequencies[7] / 255.0) / 2;
      }

      if (Number.isFinite(frequencies[23])) {
        widthAndDepthScalingFactor = (frequencies[23] / 255.0) / 10;
      }
    }

    // Now update the items in the ring buffer
    for (let itemIdx = 0; itemIdx < availableSceneryMeshesRing.current.length; itemIdx++)
    {
      const meshForLull = availableSceneryMeshesRing.current[itemIdx];
      const lullData = meshForLull.userData['lull'] as Lull;

      if (lullData === null || lullData === undefined) {
        meshForLull.visible = false;
        continue;
      }

      const lullDisplayStart = lullData.time - lookaheadPeriod;
      const lullDisplayEnd = lullData.time + lullData.duration + decayPeriod;

      // See if we've finished displaying
      if (lullDisplayStart > audioTime || lullDisplayEnd < lastRenderTime) {
        meshForLull.visible = false;
        delete meshForLull.userData['lull'];
        continue;
      }

      // Make the mesh visible and lerp it to zoom in
      meshForLull.visible = true;
      meshForLull.position.z = THREE.MathUtils.mapLinear(audioTime, lullDisplayStart, lullDisplayEnd, SCENERY_DEPTH_START, SCENERY_DEPTH_END);

      // Scale the mesh based on audio data, but apply easing factors in either direction to minimize suddenness
      const easedDownXScale = meshForLull.scale.x * 0.995;
      const easedDownYScale = meshForLull.scale.y * 0.995;
      const easedDownZScale = meshForLull.scale.z * 0.995;
      const easedUpXScale = meshForLull.scale.x * 1.005;
      const easedUpYScale = meshForLull.scale.y * 1.005;
      const easedUpZScale = meshForLull.scale.z * 1.005;

      meshForLull.scale.set(
        Math.max(easedDownXScale, Math.min(easedUpXScale, 1.0 + widthAndDepthScalingFactor)),
        Math.max(easedDownYScale, Math.min(easedUpYScale, 1.0 + verticalScalingFactor)),
        Math.max(easedDownZScale, Math.min(easedUpZScale, 1.0 + widthAndDepthScalingFactor)));
    }
  });

  return (
    <group>
      {availableMeshElements}
    </group>
  );
}

export default SceneryQueue;
