import { RefObject, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { useFrame, useLoader } from '@react-three/fiber';

import { useStore } from '../store/visualizerStore';
import { TrackAnalysis } from '../store/TrackAnalysis';
import { SceneryKey, SceneryMap, getSceneryModelUrls, SCENERY_RADIUS, SCENERY_HORIZ_OFFSET, SCENERY_VERT_OFFSET } from '../store/scenery';
import Lull from '../store/Lull';

import { generateNumericArray } from '../utils';
import { ComponentDepths } from './ComponentDepths';

/**
 * The size of the scenery queue.
 */
const QUEUE_SIZE = 10;

/**
 * A material to use for scenery, using the main beat theme color.
 */
const beatColorMaterial = new THREE.MeshStandardMaterial({ fog: true });

/**
 * A material to use for scenery, using the bass panel theme color.
 */
const bassColorMaterial = new THREE.MeshStandardMaterial({ fog: true });

/**
 * A material to use for scenery, using the star flash theme color.
 */
 const starFlashColorMaterial = new THREE.MeshStandardMaterial({ fog: true });

/**
 * A wireframe material to use for scenery, using the frequency line theme color.
 */
const frequencyWireframeMaterial = new THREE.MeshBasicMaterial({ wireframe: true });

const ALL_MATERIALS = [
  beatColorMaterial,
  bassColorMaterial,
  starFlashColorMaterial,
  frequencyWireframeMaterial
];

type GLTFModelToGeometryMap = { [meshName: string]: THREE.BufferGeometry };

// function findMesh(item: THREE.Object3D): THREE.Mesh | null {
//   // Scan self
//   if (item.type === 'Mesh') {
//     return item as THREE.Mesh;
//   }

//   // Then scan children
//   for(const child of item.children) {
//     if (child !== null && child.type === 'Mesh') {
//       return child as THREE.Mesh
//     }
//   }

//   // Then recurse children
//   for(const child of item.children) {
//     if (child !== null) {
//       let childResult = findMesh(child);

//       if (childResult !== null) {
//         return childResult;
//       }
//     }
//   }

//   // Fall back to null
//   return null;
// }

function assignMaterialsToMesh(mesh: THREE.Mesh, isModelMesh: boolean, lull: Lull, trackAnalysis: TrackAnalysis): void {
  // If this is for a model, or we only have one group, we want to use only one material for the entire mesh
  if (isModelMesh || mesh.geometry.groups.length <= 1) {
    // Randomly assign one of the materials.
    // When getting a random value, use the end to get different seeding results than what we have for geometry.
    const materialIndex = trackAnalysis.getTrackSeededRandomInt(0, ALL_MATERIALS.length - 1, lull.end);
    mesh.material = ALL_MATERIALS[materialIndex];
  }
  else {
    // We have multiple groups for a primitive. Get materials for even/odd groups
    const evenMaterialIndex = trackAnalysis.getTrackSeededRandomInt(0, ALL_MATERIALS.length - 1, lull.end);
    const oddMaterialIndex = trackAnalysis.getTrackSeededRandomInt(0, ALL_MATERIALS.length - 1, lull.end + 1);

    mesh.material = [];
  
    for (let groupIndex = 0; groupIndex < mesh.geometry.groups.length; groupIndex++) {
      if (groupIndex % 2 === 0) {
        mesh.material[groupIndex] = ALL_MATERIALS[evenMaterialIndex];
      }
      else {
        mesh.material[groupIndex] = ALL_MATERIALS[oddMaterialIndex];
      } 
    }
  }
}

function initializeSceneryMeshForLull(mesh: THREE.Mesh, lullIdx: number, lull: Lull, trackAnalysis: TrackAnalysis, eligibleScenery: SceneryKey[], modelGeometryMap: GLTFModelToGeometryMap): void {
  mesh.userData['lull'] = lull;

  // Use different seeds for the scenery/position so that all types of scenery can end up either on the left or right
  const sceneryRandomSeed = lull.time;
  const positionSeed = lull.time + lullIdx;

  // Randomize the scenery to use for the mesh
  const sceneryIndex = trackAnalysis.getTrackSeededRandomInt(0, eligibleScenery.length - 1, sceneryRandomSeed);
  const scenery = SceneryMap[eligibleScenery[sceneryIndex]];
  let isModelMesh;
  
  // Determine if this is using a primitive or a model
  if (scenery.primitive) {
    mesh.geometry = scenery.primitive;
    isModelMesh = false;
  }
  else if (scenery.modelName) {
    // Look up the model of the geometry by name
    const modelGeometry = modelGeometryMap[scenery.modelName];

    if (!modelGeometry) {
      console.error('Scenery model does not have geometry!', { key: eligibleScenery[sceneryIndex], scenery });
      return;
    }

    mesh.geometry = modelGeometry;
    isModelMesh = true;
  }
  else {
    console.error('Scenery does not have either a primitive or model path!', { key: eligibleScenery[sceneryIndex], scenery });
    return;
  }

  // See if we have geometry-specific translation to apply
  let geometryXOffset = 0;
  let geometryYOffset = 0;

  if (scenery.translate) {
    geometryXOffset = scenery.translate.x;
    geometryYOffset = scenery.translate.y;
  }

  // Randomize whether it's on the left or right and apply the geometry-specific offset in the same direction
  if (trackAnalysis.getTrackSeededRandomInt(0, 1, positionSeed) === 0) {
    mesh.position.x = SCENERY_HORIZ_OFFSET + geometryXOffset;
  }
  else {
    mesh.position.x = -SCENERY_HORIZ_OFFSET - geometryXOffset;
  }

  // Reset the vertical offset and apply the geometry-specific offset
  mesh.position.y = SCENERY_VERT_OFFSET + geometryYOffset;

  // Normalize the scale of the mesh
  mesh.scale.set(1, 1, 1);

  // Assign materials for each face of the mesh (where appropriate)
  assignMaterialsToMesh(mesh, isModelMesh, lull, trackAnalysis);
}

function SceneryQueue(props: { audio: RefObject<HTMLAudioElement>, analyser: RefObject<AnalyserNode> }): JSX.Element {
  let nextUnrenderedLullIndex = 0;
  let lastHapticAudioTime = 0;
  let nextAvailableMeshIndex = 0;

  const availableSceneryMeshesRing = useRef<THREE.Mesh[]>([]);
  const trackAnalysis = useStore(state => state.analysis);
  const hapticManager = useStore().hapticManager;
  const eligibleSceneryItems = useStore().theme.scenery.availableItems;

  // Ensure all eligible scenery models are loaded
  const eligibleSceneryModelUrls = getSceneryModelUrls(eligibleSceneryItems);
  const sceneryModels = useLoader(GLTFLoader, eligibleSceneryModelUrls);
  const sceneryMeshMap: GLTFModelToGeometryMap = {};

  if (sceneryModels) {
    for(const sceneryModel of sceneryModels) {
      // Map to the equivalent mesh
      const sceneryMesh = sceneryModel.scene.children[0] as THREE.Mesh;

      if (sceneryModel.scene.children.length === 1 && sceneryMesh.type === 'Mesh') {
        // Bake in scaling for the geometry if this has not yet been performed
        if (!sceneryMesh.geometry.userData.hasScaled) {
          sceneryMesh.geometry.scale(SCENERY_RADIUS, SCENERY_RADIUS, SCENERY_RADIUS);
          sceneryMesh.geometry.userData.hasScaled = true;
        }

        sceneryMeshMap[sceneryMesh.name] = sceneryMesh.geometry;
      }
      else if (process.env.NODE_ENV !== 'production') {
        console.error('unexpected scenery structure', sceneryModel.scene);
      }
    }
  }

  // Make the lookahead period variable based on measure lengths
  const lookaheadPeriod = useMemo(() => {
    return trackAnalysis.secondsPerMeasure;
  }, [trackAnalysis]);

  // Generate available sprites for use in a ring buffer
  const availableMeshElements = 
    generateNumericArray(QUEUE_SIZE).map((index) => {
      return <mesh
        key={index}
        visible={false}
        ref={(m: THREE.Mesh) => availableSceneryMeshesRing.current[index] = m}
        position={[SCENERY_HORIZ_OFFSET, SCENERY_VERT_OFFSET, ComponentDepths.SceneryStart]}
      />
    });

  // Because the scenery material is cached across multiple renders, just ensure the color reflects the state.
  beatColorMaterial.color = useStore().theme.beat.color;
  bassColorMaterial.color = useStore().theme.bass.panelColor;
  starFlashColorMaterial.color = useStore().theme.background.starFlashColor;
  frequencyWireframeMaterial.color = useStore().theme.frequencyGrid.lineColor;

  useEffect(() => useStore.subscribe(
    state => state.theme.beat.color,
    (newColor) => {
      beatColorMaterial.color = newColor;
    }),
    []);

  useEffect(() => useStore.subscribe(
    state => state.theme.bass.panelColor,
    (newColor) => {
      bassColorMaterial.color = newColor;
    }),
    []);

  useEffect(() => useStore.subscribe(
    state => state.theme.background.starFlashColor,
    (newColor) => {
      starFlashColorMaterial.color = newColor;
    }),
    []);  

  useEffect(() => useStore.subscribe(
    state => state.theme.frequencyGrid.lineColor,
    (newColor) => {
      frequencyWireframeMaterial.color = newColor;
    }),
    []);

  // Reset the lull indices when we seek or change tracks
  useEffect(() => useStore.subscribe(
    state => [state.analysis, state.audioLastSeeked],
    () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      nextUnrenderedLullIndex = 0;
      // eslint-disable-next-line react-hooks/exhaustive-deps
      lastHapticAudioTime = 0;
      // eslint-disable-next-line react-hooks/exhaustive-deps
      nextAvailableMeshIndex = 0;
    }),
    []);

  useFrame((_state, delta) => {
    if (props.audio.current === null) {
      return;
    }

    const canSendHapticEvents = !props.audio.current.ended && !props.audio.current.paused;
    const audioTime = props.audio.current.currentTime;
    const lastRenderTime = Math.max(audioTime - delta, 0);

    // Determine if we need to fill the ring buffer with any new meshes
    for (let lullIdx = nextUnrenderedLullIndex; lullIdx < trackAnalysis.lulls.length; lullIdx++) {
      const curLull = trackAnalysis.lulls[lullIdx];
      const lullDisplayStart = curLull.time - lookaheadPeriod;
      const lullDisplayEnd = curLull.time + curLull.duration;

      // See if we're already too late for this lull - if so, skip ahead
      if (lastRenderTime > lullDisplayEnd) {
        nextUnrenderedLullIndex++;
        continue;
      }

      // Now see if we're too early for this lull - if so, exit out
      if (lullDisplayStart > audioTime) {
        break;
      }

      // Now we have a new lull to render. Initialize the next mesh in the ring
      const meshForLull = availableSceneryMeshesRing.current[nextAvailableMeshIndex];
      initializeSceneryMeshForLull(meshForLull, lullIdx, curLull, trackAnalysis, eligibleSceneryItems, sceneryMeshMap);
      
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
        verticalScalingFactor = (frequencies[7] / 255.0) / 3;
      }

      if (Number.isFinite(frequencies[23])) {
        widthAndDepthScalingFactor = (frequencies[23] / 255.0) / 10;
      }
    }

    // Now update the items in the ring buffer
    for (let itemIdx = 0; itemIdx < availableSceneryMeshesRing.current.length; itemIdx++) {
      const meshForLull = availableSceneryMeshesRing.current[itemIdx];
      const lullData = meshForLull.userData['lull'] as Lull;

      if (lullData === null || lullData === undefined) {
        meshForLull.visible = false;
        continue;
      }

      const lullDisplayStart = lullData.time - lookaheadPeriod;
      const lullDisplayEnd = lullData.time + lullData.duration;

      // See if we've finished displaying
      if (lullDisplayStart > audioTime || lullDisplayEnd < lastRenderTime) {
        meshForLull.visible = false;
        delete meshForLull.userData['lull'];
        continue;
      }

      // Make the mesh visible and lerp it to zoom in
      meshForLull.visible = true;
      meshForLull.position.z = THREE.MathUtils.mapLinear(audioTime, lullDisplayStart, lullDisplayEnd, ComponentDepths.SceneryStart, ComponentDepths.SceneryEnd);

      // If we're in the lookahead period, scale the geometry in so it doesn't pop quite so aggressively.
      // Otherwise, scale based on audio data.
      if (audioTime < lullData.time) {
        const fadeInScale = THREE.MathUtils.smoothstep(THREE.MathUtils.mapLinear(audioTime, lullDisplayStart, lullData.time, 0, 1), 0, 1);
        meshForLull.scale.set(1, fadeInScale, 1);
      }
      else {
        // We are in the period where the lull has officially started.
        // If we can issue haptic feedback for the lull, do so now.
        if (hapticManager !== null && canSendHapticEvents && lastHapticAudioTime < lullData.time) {
          hapticManager.playLullFeedback(lullData);
          lastHapticAudioTime = lullData.end;
        }

        // When scaling based on audio values, apply easing factors in either direction to minimize suddenness
        const easedDownXScale = meshForLull.scale.x * 0.995;
        const easedDownYScale = meshForLull.scale.y * 0.995;
        const easedDownZScale = meshForLull.scale.z * 0.995;
        const easedUpXScale = meshForLull.scale.x * 1.0025;
        const easedUpYScale = meshForLull.scale.y * 1.0025;
        const easedUpZScale = meshForLull.scale.z * 1.0025;

        meshForLull.scale.set(
          Math.max(easedDownXScale, Math.min(easedUpXScale, 1.0 + widthAndDepthScalingFactor)),
          Math.max(easedDownYScale, Math.min(easedUpYScale, 1.0 + verticalScalingFactor)),
          Math.max(easedDownZScale, Math.min(easedUpZScale, 1.0 + widthAndDepthScalingFactor)));
      }
    }
  });

  return (
    <group>
      {availableMeshElements}
    </group>
  );
}

export default SceneryQueue;
