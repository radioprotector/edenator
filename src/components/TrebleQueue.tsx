import { RefObject, useEffect, useRef } from 'react';
import { MathUtils, Group, Sprite, CustomBlending, AddEquation, SrcAlphaFactor, OneFactor } from 'three';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';

import { useStore } from '../store/visualizerStore';
import Peak from '../store/Peak';
import { generateNumericArray } from '../utils';
import { ComponentDepths } from './ComponentDepths';

/**
 * The size of the treble queue.
 */
const QUEUE_SIZE = 20;

/**
 * The time, in seconds, for which each item is visible before its {@see Peak.time}.
 */
const LOOKAHEAD_PERIOD = 0.1;

/**
 * The time, in seconds, for which each item is visible after its {@see Peak.end}.
 */
const DECAY_PERIOD = 0.5;

// /**
//  * The intensity of each light.
//  */
// const BASE_LIGHT_INTENSITY = 20;

/**
 * The distance over which each light attenuates.
 */
const BASE_LIGHT_DISTANCE = 20;

/**
 * The minimum radius from the center to use for each displayed peak.
 */
const MIN_DISTRIBUTION_RADIUS = 12;

/**
 * The maximum radius from the center to use for each displayed peak.
 */
const MAX_DISTRIBUTION_RADIUS = 20;

function TrebleQueue(props: { audio: RefObject<HTMLAudioElement> }): JSX.Element {
  const nextUnrenderedPeakIndex = useRef<number>(0);
  const nextAvailableGroupIndex = useRef<number>(0);
  const availableTrebleGroupsRing = useRef<Group[]>([]);
  const trackAnalysis = useStore(state => state.analysis);
  const trebleTheme = useStore(state => state.theme.treble);
  const spriteTexture = useTexture(trebleTheme.spriteTexture);

  // Generate available sprites for use in a ring buffer
  const availableSpriteElements = 
    generateNumericArray(QUEUE_SIZE).map((index) => {
      return <group
        key={index}
        visible={false}
        ref={(grp: Group) => availableTrebleGroupsRing.current[index] = grp}
      >
        {/* XXX: Don't change the order/contents without updating the useEffect that looks at the group's children */}
        <sprite
          scale={[15, 15, 1]}
        >
          <spriteMaterial
            color={trebleTheme.spriteColor}
            map={spriteTexture}
            depthWrite={false}
            transparent={true}
            blending={CustomBlending}
            blendEquation={AddEquation}
            blendSrc={SrcAlphaFactor}
            blendDst={OneFactor}
          />
        </sprite>
        {/* Disable the point light for now */}
        <pointLight
          visible={false}
          color={trebleTheme.lightColor}
          castShadow={false}
          distance={BASE_LIGHT_DISTANCE}
        />
      </group>
    });

  // Reset the peak indices when we seek or change tracks
  useEffect(() => useStore.subscribe(
    state => [state.analysis, state.audioLastSeeked],
    () => {
      if (process.env.NODE_ENV !== 'production') {
        console.debug(`TrebleQueue indices reset`);
      }

      nextUnrenderedPeakIndex.current = 0;
      nextAvailableGroupIndex.current = 0;
    }),
    []);

  useFrame((_state, delta) => {
    if (props.audio.current === null) {
      return;
    }

    const audioTime = props.audio.current.currentTime;
    const lastRenderTime = Math.max(audioTime - delta, 0);

    // Determine if we need to fill the ring buffer with any new meshes
    for (let peakIdx = nextUnrenderedPeakIndex.current; peakIdx < trackAnalysis.treble.length; peakIdx++) {
      const curPeak = trackAnalysis.treble[peakIdx];
      const peakDisplayStart = curPeak.time - LOOKAHEAD_PERIOD;
      const peakDisplayEnd = curPeak.end + DECAY_PERIOD;

      // See if we're already too late for this peak - if so, skip ahead
      if (lastRenderTime > peakDisplayEnd) {
        nextUnrenderedPeakIndex.current += 1;
        continue;
      }

      // Now see if we're too early for this peak - if so, exit out
      if (peakDisplayStart > audioTime) {
        break;
      }

      // Now we have a new peak to render. Assign it to the next available group/sprite
      const groupForPeak = availableTrebleGroupsRing.current[nextAvailableGroupIndex.current];
      groupForPeak.userData['peak'] = curPeak;
      groupForPeak.userData['peakIdx'] = peakIdx;

      // Randomize the position of the group
      const angle = trackAnalysis.getTrackSeededRandomInt(0, 359, curPeak.time) * MathUtils.DEG2RAD;
      const radius = trackAnalysis.getTrackSeededRandomInt(MIN_DISTRIBUTION_RADIUS, MAX_DISTRIBUTION_RADIUS, curPeak.time);
      
      groupForPeak.position.x = Math.cos(angle) * radius;
      groupForPeak.position.y = Math.sin(angle) * radius;
      
      // Switch around to the next sprite in the ring buffer
      nextAvailableGroupIndex.current = (nextAvailableGroupIndex.current + 1) % availableTrebleGroupsRing.current.length;

      // Ensure we're rendering the next peak
      nextUnrenderedPeakIndex.current += 1;
    }

    // Now update the items in the ring buffer
    const renderedPeakIndices = new Set<number>();

    for (let itemIdx = 0; itemIdx < availableTrebleGroupsRing.current.length; itemIdx++) {
      const groupForPeak = availableTrebleGroupsRing.current[itemIdx];
      const peakData = groupForPeak.userData['peak'] as Peak;
      const peakIdx = groupForPeak.userData['peakIdx'] as number;

      if (peakData === null || peakData === undefined) {
        groupForPeak.visible = false;
        continue;
      }

      // Ensure we haven't already rendered this peak in the animation pass
      if (renderedPeakIndices.has(peakIdx)) {
        groupForPeak.visible = false;
        delete groupForPeak.userData['peak'];
        delete groupForPeak.userData['peakIdx'];
        continue;
      }

      renderedPeakIndices.add(peakIdx);

      const peakDisplayStart = peakData.time - LOOKAHEAD_PERIOD;
      const peakDisplayEnd = peakData.end + DECAY_PERIOD;

      // See if we've finished peaking, which means we should hide the entire group.
      if (peakDisplayStart > audioTime || peakDisplayEnd < lastRenderTime) {
        groupForPeak.visible = false;
        delete groupForPeak.userData['peak'];
        delete groupForPeak.userData['peakIdx'];
        continue;
      }

      // Make the group visible and lerp it to zoom in
      groupForPeak.visible = true;
      groupForPeak.position.z = MathUtils.mapLinear(audioTime, peakDisplayStart, peakDisplayEnd, ComponentDepths.TrebleStart, ComponentDepths.TrebleEnd);

      // Fade the sprite opacity if we're in the lookahead/decay period
      const spriteForPeak = groupForPeak.children[0] as Sprite;
      // const lightForPeak = groupForPeak.children[1] as PointLight;

      if (audioTime < peakData.time) {
        const scale = MathUtils.mapLinear(audioTime, peakDisplayStart, peakData.time, 0, 1);

        spriteForPeak.material.opacity = scale;
        // lightForPeak.intensity = BASE_LIGHT_INTENSITY * scale;
      }
      else if (audioTime > peakData.end) {
        const scale = MathUtils.mapLinear(audioTime, peakData.end, peakDisplayEnd, 1, 0);

        spriteForPeak.material.opacity = scale;
        // lightForPeak.intensity = BASE_LIGHT_INTENSITY * scale;
      }
      else {
        spriteForPeak.material.opacity = 1;
        // lightForPeak.intensity = BASE_LIGHT_INTENSITY;
      }
    }
  });

  return (
    <group>
      {availableSpriteElements}
    </group>
  );
}

export default TrebleQueue;
