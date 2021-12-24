import { RefObject, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';

import { generateNumericArray } from './Utils';
import { TrackAnalysis } from './TrackAnalysis';
import Peak from './Peak';

function TrebleQueue(props: { audio: RefObject<HTMLAudioElement>, audioLastSeeked: number, trackAnalysis: TrackAnalysis }): JSX.Element {
  let nextUnrenderedPeakIndex = 0;
  let nextAvailableSpriteIndex = 0;
  const availableSpritesRing = useRef<THREE.Sprite[]>([]);
  const QUEUE_SIZE = 20;
  const LOOKAHEAD_PERIOD = 0.1;
  const DECAY_PERIOD = 1;
  const PEAK_DEPTH_START = -200;
  const PEAK_DEPTH_END = 10;

  const textures = useTexture({
    corona: 'textures/corona.png',
    ring: 'textures/ring.png',
    extendring: 'textures/extendring.png',
    wavering: 'textures/wavering.png'
  });

  // Generate available sprites for use in a ring buffer
  const availableSpriteElements = 
    generateNumericArray(QUEUE_SIZE).map((index) => {
      return <sprite
        ref={(mesh: THREE.Sprite) => availableSpritesRing.current[index] = mesh}
        visible={false}
        scale={[15, 15, 1]}
        key={index}
      >
        <spriteMaterial
          color={0xffaaff}
          map={textures.wavering}
          depthWrite={false}
          transparent={true}
          blending={THREE.CustomBlending}
          blendEquation={THREE.AddEquation}
          blendSrc={THREE.SrcAlphaFactor}
          blendDst={THREE.OneMinusSrcColorFactor}
        />
      </sprite>
    });

  // Reset the peak indices when we seek
  useEffect(
    () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      nextUnrenderedPeakIndex = 0;
      // eslint-disable-next-line react-hooks/exhaustive-deps
      nextAvailableSpriteIndex = 0;
    },
    [props.trackAnalysis, props.trackAnalysis.treble, props.audioLastSeeked]);

  useFrame((state, delta) => {
    if (props.audio.current === null || availableSpritesRing.current === null) {
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

      // Now we have a new peak to render. Assign it to the next available sprite
      const spriteForPeak = availableSpritesRing.current[nextAvailableSpriteIndex];
      spriteForPeak.userData['peak'] = curPeak;

      // Randomize the position of the sprite
      const angle = props.trackAnalysis.getTrackSeededRandomInt(0, 359, curPeak.time) * THREE.MathUtils.DEG2RAD;
      const radius = props.trackAnalysis.getTrackSeededRandomInt(12, 20, curPeak.time);
      
      spriteForPeak.position.x = Math.cos(angle) * radius;
      spriteForPeak.position.y = Math.sin(angle) * radius;
      
      // Switch around to the next sprite in the ring buffer
      nextAvailableSpriteIndex = (nextAvailableSpriteIndex + 1) % availableSpritesRing.current.length;

      // Ensure we're rendering the next peak
      nextUnrenderedPeakIndex++;
    }

    // Now update the items in the ring buffer
    for (let spriteForPeak of availableSpritesRing.current)
    {
      const peakData = spriteForPeak.userData['peak'] as Peak;

      if (peakData === null || peakData === undefined) {
        spriteForPeak.visible = false;
        continue;
      }

      const peakDisplayStart = peakData.time - LOOKAHEAD_PERIOD;
      const peakDisplayEnd = peakData.end + DECAY_PERIOD;

      // See if we've finished peaking, which means we should hide the sprite
      if (peakDisplayStart > audioTime || peakDisplayEnd < lastRenderTime) {
        spriteForPeak.visible = false;
        delete spriteForPeak.userData['peak'];
        continue;
      }

      // Make the sprite visible and lerp it to zoom in
      spriteForPeak.visible = true;
      spriteForPeak.position.z = THREE.MathUtils.mapLinear(audioTime, peakDisplayStart, peakDisplayEnd, PEAK_DEPTH_START, PEAK_DEPTH_END);

      // Fade the opacity if we're in the lookahead/decay period
      if (audioTime < peakData.time) {
        spriteForPeak.material.opacity = THREE.MathUtils.mapLinear(audioTime, peakDisplayStart, peakData.time, 0, 1);
      }
      else if (audioTime > peakData.end) {
        spriteForPeak.material.opacity = THREE.MathUtils.mapLinear(audioTime, peakData.end, peakDisplayEnd, 1, 0);
      }
      else {
        spriteForPeak.material.opacity = 1;
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
