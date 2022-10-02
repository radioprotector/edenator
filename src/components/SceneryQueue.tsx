import { RefObject, Suspense, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { useFrame, useLoader } from '@react-three/fiber';

import { useStore } from '../store/visualizerStore';
import { TrackAnalysis } from '../store/TrackAnalysis';
import { SceneryKey, SceneryMap, getSceneryModelUrls, SCENERY_HORIZ_OFFSET, SCENERY_VERT_OFFSET } from '../store/scenery';
import Lull from '../store/Lull';

import { ComponentDepths } from './ComponentDepths';

/**
 * Maps GLTF-loaded model names to their equivalent scenes.
 */
type GLTFModelToSceneMap = { [modelName: string]: THREE.Group };

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

/**
 * An array of all available materials to randomly select from.
 */
const ALL_MATERIALS = [
  beatColorMaterial,
  bassColorMaterial,
  starFlashColorMaterial,
  frequencyWireframeMaterial
];

/**
 * The ring buffer of available scenery objects.
 * These are added to the scene and rendered in to represent scenery when needed,
 * at which time they will contain either a primitive mesh (tracked in {@see sceneryPrimitiveMeshesRing})
 * or a model scene (tracked in {@see sceneryModelScenesRing}) as a sole child.
 */
const availableSceneryObjectsRing: THREE.Object3D[] = [];

/**
 * The ring buffer of mesh objects to wrap primitive geometries.
 * Model-based scenery is wrapped in a scene instead and tracked in {@see sceneryModelScenesRing}.
 */
const sceneryPrimitiveMeshesRing: THREE.Mesh[] = [];

/**
 * The ring buffer of scene objects to wrap models.
 * Primitive-based scenery is wrapped in a mesh instead and tracked in {@see sceneryPrimitiveMeshesRing}.
 */
const sceneryModelScenesRing: THREE.Scene[] = [];

for(let meshIdx = 0; meshIdx < QUEUE_SIZE; meshIdx++) {
  // Create the ring object
  const ringObject = new THREE.Object3D();
  ringObject.visible = false;
  ringObject.position.set(SCENERY_HORIZ_OFFSET, SCENERY_VERT_OFFSET, ComponentDepths.SceneryStart);

  availableSceneryObjectsRing.push(ringObject);

  // Create mesh and scene objects at the same index
  sceneryPrimitiveMeshesRing.push(new THREE.Mesh());
  sceneryModelScenesRing.push(new THREE.Scene());
}

function getRandomMaterial(lull: Lull, trackAnalysis: TrackAnalysis): THREE.Material {
  // When getting a random value, use the *end* of the lull to get different seeding results than what we have for geometry.
  const materialIndex = trackAnalysis.getTrackSeededRandomInt(0, ALL_MATERIALS.length - 1, lull.end);
  return ALL_MATERIALS[materialIndex];
}

function assignMaterialsToMesh(primitiveMesh: THREE.Mesh, lull: Lull, trackAnalysis: TrackAnalysis): void {
  // If we only have one group, we want to use only one material for the entire mesh
  if (primitiveMesh.geometry.groups.length <= 1) {
    // Randomly assign one of the materials.
    primitiveMesh.material = getRandomMaterial(lull, trackAnalysis);
  }
  else {
    // We have multiple groups for a primitive. Get materials for even/odd groups
    const evenMaterialIndex = trackAnalysis.getTrackSeededRandomInt(0, ALL_MATERIALS.length - 1, lull.end);
    const oddMaterialIndex = trackAnalysis.getTrackSeededRandomInt(0, ALL_MATERIALS.length - 1, lull.end + 1);

    primitiveMesh.material = [];
  
    for (let groupIndex = 0; groupIndex < primitiveMesh.geometry.groups.length; groupIndex++) {
      if (groupIndex % 2 === 0) {
        primitiveMesh.material[groupIndex] = ALL_MATERIALS[evenMaterialIndex];
      }
      else {
        primitiveMesh.material[groupIndex] = ALL_MATERIALS[oddMaterialIndex];
      } 
    }
  }
}

function initializeSceneryObjectLull(ringIdx: number, lullIdx: number, lull: Lull, trackAnalysis: TrackAnalysis, eligibleScenery: readonly SceneryKey[], modelSceneMap: GLTFModelToSceneMap): void {
  // Get the object from the ring buffer
  const ringObj = availableSceneryObjectsRing[ringIdx];

  // Associate the lull and clear any children it may currently have.
  ringObj.userData['lull'] = lull;
  ringObj.clear();

  // Use different seeds for the scenery/position so that all types of scenery can end up either on the left or right
  const sceneryRandomSeed = lull.time;
  const positionSeed = lull.time + lullIdx;

  // Randomize the scenery to use for the object
  const sceneryIndex = trackAnalysis.getTrackSeededRandomInt(0, eligibleScenery.length - 1, sceneryRandomSeed);
  const scenery = SceneryMap[eligibleScenery[sceneryIndex]];

  // Determine if this is using a primitive or a model
  if (scenery.primitive) {
    // This is using a primitive. Pull the corresponding mesh from the ring index.
    const ringPrimitiveMesh = sceneryPrimitiveMeshesRing[ringIdx];

    // Update the mesh's geometry and material
    ringPrimitiveMesh.geometry = scenery.primitive;
    assignMaterialsToMesh(ringPrimitiveMesh, lull, trackAnalysis);

    // Apply scaling to the mesh if needed.
    // This is distinct from the *ring object* scale, which is lerped during the animation process
    if (scenery.scale) {
      ringPrimitiveMesh.scale.copy(scenery.scale);
    }
    else {
      ringPrimitiveMesh.scale.set(1, 1, 1);
    }

    // Apply rotation to the scene if needed
    if (scenery.rotate) {
      ringPrimitiveMesh.rotation.copy(scenery.rotate);
    }
    else {
      ringPrimitiveMesh.rotation.set(0, 0, 0);
    }

    // Add that mesh as a child of the ring object.
    ringObj.add(ringPrimitiveMesh);
  }
  else if (scenery.modelName) {
    // This is using a scene. Pull the corresponding scene from the ring index.
    const ringModelScene = sceneryModelScenesRing[ringIdx];

    // Look up the scene to use for the specified model name.
    const gltfScene = modelSceneMap[scenery.modelName];

    if (!gltfScene) {
      console.error('Scenery model does not have geometry!', { key: eligibleScenery[sceneryIndex], scenery });
      return;
    }

    // Copy the GLTF scene to the scene in the ring buffer
    ringModelScene.clear();
    for(const gltfChild of gltfScene.children) {
      ringModelScene.add(gltfChild.clone(true));
    }

    // Apply scaling to the scene if needed.
    // This is distinct from the *ring object* scale, which is lerped during the animation process
    if (scenery.scale) {
      ringModelScene.scale.copy(scenery.scale);
    }
    else {
      ringModelScene.scale.set(1, 1, 1);
    }

    // Apply rotation to the scene if needed
    if (scenery.rotate) {
      ringModelScene.rotation.copy(scenery.rotate);
    }
    else {
      ringModelScene.rotation.set(0, 0, 0);
    }

    // Assign a random material.
    // Ensure that we are handling this across scene boundaries by traversing the object: https://github.com/mrdoob/three.js/issues/18342
    const overrideMaterial = getRandomMaterial(lull, trackAnalysis);

    ringModelScene.traverse((obj) => {
      if (obj.type === 'Scene') {
        (obj as THREE.Scene).overrideMaterial = overrideMaterial;
      }
      else if (obj.type === 'Mesh') {
        (obj as THREE.Mesh).material = overrideMaterial;
      }
    });

    // Add this scene as a child of the ring object
    ringObj.add(ringModelScene);
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
    ringObj.position.x = SCENERY_HORIZ_OFFSET + geometryXOffset;
  }
  else {
    ringObj.position.x = -SCENERY_HORIZ_OFFSET - geometryXOffset;
  }

  // Reset the vertical offset and apply the geometry-specific offset
  ringObj.position.y = SCENERY_VERT_OFFSET + geometryYOffset;

  // Normalize the scale of the ring object
  ringObj.scale.set(1, 1, 1);
}

function SceneryQueue(props: { audio: RefObject<HTMLAudioElement>, analyser: RefObject<AnalyserNode> }): JSX.Element {
  let nextUnrenderedLullIndex = 0;
  let lastHapticAudioTime = 0;
  let nextAvailableMeshIndex = 0;

  const trackAnalysis = useStore(state => state.analysis);
  const hapticManager = useStore().hapticManager;
  const eligibleSceneryItems = useStore().theme.scenery.availableItems;

  // Ensure all eligible scenery models are loaded
  const eligibleSceneryModelUrls = getSceneryModelUrls(eligibleSceneryItems);
  const sceneryMeshMap: GLTFModelToSceneMap = {};
  
  useLoader(GLTFLoader, eligibleSceneryModelUrls).forEach((modelScene, index) => {
    // HACK: Because the model loading results don't actually give us information about the file name of whatever produced the scene,
    // we're backfilling this by mapping the index of the result to the collection of URLs.
    const modelUrl = eligibleSceneryModelUrls[index];
    let modelFileName =  modelUrl.substring(modelUrl.lastIndexOf('/') + 1);

    // Trim the ending ".glb"
    modelFileName = modelFileName.substring(0, modelFileName.lastIndexOf('.'));

    // Erase all custom materials and overwrite with the wireframe material for now
    modelScene.scene.traverse((obj) => {
      if (obj.type === 'Mesh') {
        (obj as THREE.Mesh).material = frequencyWireframeMaterial;
      }
    });

    // Add this to the map
    sceneryMeshMap[modelFileName] = modelScene.scene;
  });

  // Make the lookahead period variable based on measure lengths
  const lookaheadPeriod = useMemo(() => {
    return trackAnalysis.secondsPerMeasure;
  }, [trackAnalysis]);

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

      // Hide all items in the ring - necessary ones will be displayed in the next render loop
      for(const ringObj of availableSceneryObjectsRing) {
        ringObj.visible = false;
      }
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

      // Now we have a new lull to render. Initialize the scenery object
      initializeSceneryObjectLull(nextAvailableMeshIndex, lullIdx, curLull, trackAnalysis, eligibleSceneryItems, sceneryMeshMap);
      
      // Switch around to the next item in the ring buffer
      nextAvailableMeshIndex = (nextAvailableMeshIndex + 1) % availableSceneryObjectsRing.length;

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
    for (let itemIdx = 0; itemIdx < availableSceneryObjectsRing.length; itemIdx++) {
      const objForLull = availableSceneryObjectsRing[itemIdx];
      const lullData = objForLull.userData['lull'] as Lull;

      if (lullData === null || lullData === undefined) {
        objForLull.visible = false;
        continue;
      }

      const lullDisplayStart = lullData.time - lookaheadPeriod;
      const lullDisplayEnd = lullData.time + lullData.duration;

      // See if we've finished displaying
      if (lullDisplayStart > audioTime || lullDisplayEnd < lastRenderTime) {
        objForLull.visible = false;
        delete objForLull.userData['lull'];
        continue;
      }

      // Make the mesh visible and lerp it to zoom in
      objForLull.visible = true;
      objForLull.position.z = THREE.MathUtils.mapLinear(audioTime, lullDisplayStart, lullDisplayEnd, ComponentDepths.SceneryStart, ComponentDepths.SceneryEnd);

      // If we're in the lookahead period, scale the geometry in so it doesn't pop quite so aggressively.
      // Otherwise, scale based on audio data.
      if (audioTime < lullData.time) {
        const fadeInScale = THREE.MathUtils.smoothstep(THREE.MathUtils.mapLinear(audioTime, lullDisplayStart, lullData.time, 0, 1), 0, 1);
        objForLull.scale.set(1, fadeInScale, 1);
      }
      else {
        // We are in the period where the lull has officially started.
        // If we can issue haptic feedback for the lull, do so now.
        if (hapticManager !== null && canSendHapticEvents && lastHapticAudioTime < lullData.time) {
          hapticManager.playLullFeedback(lullData);
          lastHapticAudioTime = lullData.end;
        }

        // When scaling based on audio values, apply easing factors in either direction to minimize suddenness
        const easedDownXScale = objForLull.scale.x * 0.995;
        const easedDownYScale = objForLull.scale.y * 0.995;
        const easedDownZScale = objForLull.scale.z * 0.995;
        const easedUpXScale = objForLull.scale.x * 1.0025;
        const easedUpYScale = objForLull.scale.y * 1.0025;
        const easedUpZScale = objForLull.scale.z * 1.0025;

        objForLull.scale.set(
          Math.max(easedDownXScale, Math.min(easedUpXScale, 1.0 + widthAndDepthScalingFactor)),
          Math.max(easedDownYScale, Math.min(easedUpYScale, 1.0 + verticalScalingFactor)),
          Math.max(easedDownZScale, Math.min(easedUpZScale, 1.0 + widthAndDepthScalingFactor)));
      }
    }
  });

  return (
    <Suspense fallback={null}>
      <group>
        {availableSceneryObjectsRing.map((obj, index) => {
          return <primitive
            key={index}
            object={obj}
          />
        })}
      </group>
    </Suspense>
  );
}

export default SceneryQueue;
