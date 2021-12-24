import { RefObject, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';

import { generateNumericArray } from './Utils';
import { TrackAnalysis } from './TrackAnalysis';
import Peak from './Peak';

function TrebleQueue(props: { audio: RefObject<HTMLAudioElement>, audioLastSeeked: number, trackAnalysis: TrackAnalysis }): JSX.Element {
  let nextUnrenderedPeakIndex = 0;
  let nextAvailableGroupIndex = 0;
  const availableTrebleGroupsRing = useRef<THREE.Group[]>([]);
  const QUEUE_SIZE = 20;
  const LOOKAHEAD_PERIOD = 0.1;
  const DECAY_PERIOD = 0.5;
  const PEAK_DEPTH_START = -200;
  const PEAK_DEPTH_END = 10;
  const BASE_LIGHT_INTENSITY = 20;
  const BASE_LIGHT_DISTANCE = 20;

  const textures = useTexture({
    corona: 'textures/corona.png',
    ring: 'textures/ring.png',
    extendring: 'textures/extendring.png',
    wavering: 'textures/wavering.png'
  });

  // Generate available sprites for use in a ring buffer
  const availableSpriteElements = 
    generateNumericArray(QUEUE_SIZE).map((index) => {
      return <group
        key={index}
        visible={false}
        ref={(grp: THREE.Group) => availableTrebleGroupsRing.current[index] = grp}
      >
        {/* XXX: Don't change the order/contents without updating the useEffect that looks at the group's children */}
        <sprite
          scale={[15, 15, 1]}
        >
          <spriteMaterial
            color={0xffaaff}
            map={textures.extendring}
            depthWrite={false}
            transparent={true}
            blending={THREE.CustomBlending}
            blendEquation={THREE.AddEquation}
            blendSrc={THREE.SrcAlphaFactor}
            blendDst={THREE.OneMinusSrcColorFactor}
          />
        </sprite>
        <pointLight
          color={0xffffff}
          castShadow={false}
          distance={BASE_LIGHT_DISTANCE}
        />
      </group>
    });

  // Reset the peak indices when we seek
  useEffect(
    () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      nextUnrenderedPeakIndex = 0;
      // eslint-disable-next-line react-hooks/exhaustive-deps
      nextAvailableGroupIndex = 0;
    },
    [props.trackAnalysis, props.trackAnalysis.treble, props.audioLastSeeked]);

  useFrame((state, delta) => {
    if (props.audio.current === null || availableTrebleGroupsRing.current === null) {
      return;
    }

    const audioTime = props.audio.current.currentTime;
    const lastRenderTime = Math.max(audioTime - delta, 0);

    // Determine if we need to fill the ring buffer with any new meshes
    for (let peakIdx = nextUnrenderedPeakIndex; peakIdx < props.trackAnalysis.treble.length; peakIdx++) {
      const curPeak = props.trackAnalysis.treble[peakIdx];
      const peakDisplayStart = curPeak.time - LOOKAHEAD_PERIOD;
      const peakDisplayEnd = curPeak.end + DECAY_PERIOD;

      // See if we're already too late for this peak - if so, skip ahead
      if (lastRenderTime > peakDisplayEnd) {
        nextUnrenderedPeakIndex++;
        continue;
      }

      // Now see if we're too early for this peak - if so, exit out
      if (peakDisplayStart > audioTime) {
        break;
      }

      // Now we have a new peak to render. Assign it to the next available group/sprite
      const groupForPeak = availableTrebleGroupsRing.current[nextAvailableGroupIndex];
      groupForPeak.userData['peak'] = curPeak;

      // Randomize the position of the group
      const angle = props.trackAnalysis.getTrackSeededRandomInt(0, 359, curPeak.time) * THREE.MathUtils.DEG2RAD;
      const radius = props.trackAnalysis.getTrackSeededRandomInt(12, 20, curPeak.time);
      
      groupForPeak.position.x = Math.cos(angle) * radius;
      groupForPeak.position.y = Math.sin(angle) * radius;
      
      // Switch around to the next sprite in the ring buffer
      nextAvailableGroupIndex = (nextAvailableGroupIndex + 1) % availableTrebleGroupsRing.current.length;

      // Ensure we're rendering the next peak
      nextUnrenderedPeakIndex++;
    }

    // Now update the items in the ring buffer
    for (let itemIdx = 0; itemIdx < availableTrebleGroupsRing.current.length; itemIdx++)
    {
      const groupForPeak = availableTrebleGroupsRing.current[itemIdx];
      const peakData = groupForPeak.userData['peak'] as Peak;

      if (peakData === null || peakData === undefined) {
        groupForPeak.visible = false;
        continue;
      }

      const peakDisplayStart = peakData.time - LOOKAHEAD_PERIOD;
      const peakDisplayEnd = peakData.end + DECAY_PERIOD;

      // See if we've finished peaking, which means we should hide the entire group
      if (peakDisplayStart > audioTime || peakDisplayEnd < lastRenderTime) {
        groupForPeak.visible = false;
        delete groupForPeak.userData['peak'];
        continue;
      }

      // Make the group visible and lerp it to zoom in
      groupForPeak.visible = true;
      groupForPeak.position.z = THREE.MathUtils.mapLinear(audioTime, peakDisplayStart, peakDisplayEnd, PEAK_DEPTH_START, PEAK_DEPTH_END);

      // Fade the sprite opacity if we're in the lookahead/decay period
      const spriteForPeak = groupForPeak.children[0] as THREE.Sprite;
      const lightForPeak = groupForPeak.children[1] as THREE.PointLight;

      if (audioTime < peakData.time) {
        const scale = THREE.MathUtils.mapLinear(audioTime, peakDisplayStart, peakData.time, 0, 1);

        spriteForPeak.material.opacity = scale;
        lightForPeak.intensity = BASE_LIGHT_INTENSITY * scale;
      }
      else if (audioTime > peakData.end) {
        const scale = THREE.MathUtils.mapLinear(audioTime, peakData.end, peakDisplayEnd, 1, 0);

        spriteForPeak.material.opacity = scale;
        lightForPeak.intensity = BASE_LIGHT_INTENSITY * scale;
      }
      else {
        spriteForPeak.material.opacity = 1;
        lightForPeak.intensity = BASE_LIGHT_INTENSITY;
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
