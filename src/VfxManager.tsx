import { RefObject, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, GodRays, ColorDepth } from '@react-three/postprocessing';
import { GodRaysEffect, ColorDepthEffect, BlendFunction, Resizer, KernelSize } from 'postprocessing';

function VfxManager(props: { audio: RefObject<HTMLAudioElement>, analyser: RefObject<AnalyserNode>, sunMesh: THREE.Mesh }): JSX.Element {
  const godRaysEffect = useRef<typeof GodRaysEffect>(null!);
  const colorDepthEffect = useRef<typeof ColorDepthEffect>(null!);
  
  useFrame((state, delta) => {
    if (props.audio.current === null || props.audio.current.currentTime <= 0 || props.analyser.current === null || godRaysEffect.current === null) {
      return;
    }

    const frequencies = new Uint8Array(props.analyser.current.frequencyBinCount);
    props.analyser.current.getByteFrequencyData(frequencies);

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
    </EffectComposer>
  )
}

export default VfxManager;
