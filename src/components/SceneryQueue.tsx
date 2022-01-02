import { RefObject, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

import { useStore } from '../store/visualizerStore';
import { generateNumericArray } from '../utils';
import Lull from '../store/Lull';

const EMPTY_VECTOR = new THREE.Vector3(0, 0, 0);
const NO_ROTATION = new THREE.Quaternion();
const NO_SCALE = new THREE.Vector3().setScalar(1);

/**
 * The collection of geometries that can be used for scenery.
 */
const SCENERY_GEOMETRIES: THREE.BufferGeometry[] = [
  new THREE.ConeGeometry(15, 30),
  new THREE.SphereGeometry(15, undefined, undefined, undefined, undefined, 0, Math.PI / 2),
  new THREE.LatheGeometry(
    [new THREE.Vector2(0.25, 0.5), new THREE.Vector2(0.5, 0.7), new THREE.Vector2(0.75, 0.9)]
  ),
  new THREE.BoxGeometry(20, 20, 20)
];

/**
 * The transformations to apply to the respective scenery geometries.
 */
const SCENERY_TRANSFORMS: THREE.Matrix4[] = [
  new THREE.Matrix4().compose(new THREE.Vector3(0, 0, 0), NO_ROTATION, NO_SCALE),
  new THREE.Matrix4().compose(new THREE.Vector3(10, -20, 0), NO_ROTATION, NO_SCALE),
  new THREE.Matrix4().compose(new THREE.Vector3(0, 20, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI, 0, 0)), new THREE.Vector3(25, 50, 25)),
  new THREE.Matrix4().compose(new THREE.Vector3(0, -10, 0), NO_ROTATION, NO_SCALE)
];

/**
 * The material to use for all scenery.
 */
const sceneryMaterial = new THREE.MeshPhongMaterial({ shininess: 1.0 });

function SceneryQueue(props: { audio: RefObject<HTMLAudioElement> }): JSX.Element {
  let nextUnrenderedLullIndex = 0;
  let nextAvailableMeshIndex = 0;
  const availableSceneryMeshesRing = useRef<THREE.Mesh[]>([]);
  const QUEUE_SIZE = 20;
  const SCENERY_DEPTH_START = -300;
  const SCENERY_DEPTH_END = 10;
  const HORIZ_OFFSET = 50;
  const VERT_OFFSET = 0;

  const trackAnalysis = useStore(state => state.analysis);

  // Make the lookahead and decay periods variable based on measure lengths
  const lookaheadPeriod = useMemo(() => {
    return trackAnalysis.secondsPerMeasure * 3;
  }, [trackAnalysis]);

  const decayPeriod = useMemo(() => {
    return trackAnalysis.secondsPerMeasure * 0.5;
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
  sceneryMaterial.color = useStore().theme.frequencyGrid.lineColor;

  useEffect(() => useStore.subscribe(
    state => state.theme.frequencyGrid.lineColor,
    (newLineColor) => {
      sceneryMaterial.color = newLineColor;
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
      meshForLull.geometry = SCENERY_GEOMETRIES[geometryIndex];

      // Pull geometry-specific translation information
      const geometryPosition = new THREE.Vector3();
      const geometryRotation = new THREE.Quaternion();
      const geometryScale = new THREE.Vector3();
      SCENERY_TRANSFORMS[geometryIndex].decompose(geometryPosition, geometryRotation, geometryScale);

      // Randomize whether it's on the left or right and apply the geometry-specific offset in the same direction
      if (trackAnalysis.getTrackSeededRandomInt(0, 1, curLull.time) === 0) {
        meshForLull.position.x = HORIZ_OFFSET + geometryPosition.x;
      }
      else {
        meshForLull.position.x = -HORIZ_OFFSET - geometryPosition.x;
      }

      // Reset the vertical offset and apply the geometry-specific offset
      meshForLull.position.y = VERT_OFFSET + geometryPosition.y;

      // Copy over the scale and rotation wholesale
      meshForLull.scale.copy(geometryScale);
      meshForLull.rotation.setFromQuaternion(geometryRotation);
      
      // Switch around to the next item in the ring buffer
      nextAvailableMeshIndex = (nextAvailableMeshIndex + 1) % availableSceneryMeshesRing.current.length;

      // Ensure we're rendering the next lull
      nextUnrenderedLullIndex++;
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
    }
  });

  return (
    <group>
      {availableMeshElements}
    </group>
  );
}

export default SceneryQueue;
