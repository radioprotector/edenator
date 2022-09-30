/// <reference path="../../../node_modules/postprocessing/types/postprocessing.d.ts">
import { useRef, useLayoutEffect, RefObject } from 'react'
import * as THREE from 'three';
import { extend, Node, useThree, useFrame } from '@react-three/fiber'
import { EffectComposer, RenderPass, EffectPass, BloomEffect, GodRaysEffect, BlendFunction, KernelSize } from 'postprocessing';
import useBufferSize from './useBufferSize';

type BloomEffectImpl = typeof BloomEffect;
type GodRaysEffectImpl = typeof GodRaysEffect;
type EffectPassImpl = typeof EffectPass;

// Create an effect composer that allows us to hook into WebXR behavior
class CustomEffectComposer extends EffectComposer {

  public bloomEffect: BloomEffectImpl;

  public godRaysEffect: GodRaysEffectImpl;

  public godRaysPass: EffectPassImpl;

  constructor(gl: THREE.WebGLRenderer, camera: THREE.Camera, scene: THREE.Scene, sunMesh: THREE.Mesh) {
    super(gl);

    this.bloomEffect = new BloomEffect({
      intensity: 0.85,
      mipmapBlur: true,
      luminanceThreshold: 0.4,
      luminanceSmoothing: 0.1
    });

    this.godRaysEffect = new GodRaysEffect(camera, sunMesh, {
      blendFunction: BlendFunction.DotScreenEffect,
      samples: 60,
      density: 0.85,
      decay: 0.85,
      weight: 0.4,
      exposure: 0.4,
      clampMax: 1,
      kernelSize: KernelSize.LARGE      
    });

    this.godRaysPass = new EffectPass(camera, this.godRaysEffect);

    this.addPass(new RenderPass(scene, camera));
    this.addPass(new EffectPass(camera, this.bloomEffect));
    this.addPass(this.godRaysPass);
  }
}

// Ensure that this effect composer is available in the VfxManager:
// https://docs.pmnd.rs/react-three-fiber/tutorials/typescript#extend-usage
extend({ CustomEffectComposer });

declare module '@react-three/fiber' {
  interface ThreeElements {
    customEffectComposer: Node<CustomEffectComposer, typeof CustomEffectComposer>
  }
}

function VfxManager(props: { audio: RefObject<HTMLAudioElement>, analyser: RefObject<AnalyserNode>, sunMesh: THREE.Mesh }) {
  const effects = useRef<CustomEffectComposer>(null!);
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera as THREE.PerspectiveCamera);
  const { width, height } = useBufferSize(gl);

  // Resize effects with drawing buffer
  useLayoutEffect(() => void effects.current.setSize(width, height), [width, height]);

  // Overwrite the main render loop
  useFrame(() => {
    // If not in session, render normally
    if (!gl.xr.isPresenting) {
      effects.current.godRaysPass.enabled = true;
      return effects.current.render();
    }

    // Manually handle XR
    gl.xr.enabled = false;
    gl.xr.updateCamera(camera);
    effects.current.godRaysPass.enabled = false;

    // Render stereo cameras
    const { cameras } = gl.xr.getCamera();

    cameras.forEach(({ viewport, matrixWorld, projectionMatrix }) => {
      gl.setViewport(viewport)
      camera.position.setFromMatrixPosition(matrixWorld)
      camera.projectionMatrix.copy(projectionMatrix)
      effects.current.render();
    });

    // Reset
    gl.setViewport(0, 0, width, height);
    gl.xr.updateCamera(camera);
    gl.xr.enabled = true;
  }, 1);

  // In addition to the render loop override, ensure god rays material is up-to-date
  useFrame(() => {
    if (props.audio.current === null || props.audio.current.currentTime <= 0 || props.analyser.current === null || effects.current === null) {
      return;
    }

    const frequencies = new Uint8Array(props.analyser.current.frequencyBinCount);
    props.analyser.current.getByteFrequencyData(frequencies);

    // Pulse the intensity of the god rays based on low-mid frequencies
    // HACK: Party on the GodRaysMaterial and adjust values based on our frequency
    // https://pmndrs.github.io/postprocessing/public/docs/class/src/effects/GodRaysEffect.js~GodRaysEffect.html
    const godRaysMaterial = effects.current.godRaysEffect.godRaysMaterial;
    
    if (Number.isFinite(frequencies[5])) {
      const godRaysScale = frequencies[5] / 255.0;

      godRaysMaterial.uniforms.decay.value = THREE.MathUtils.lerp(0.4, 0.93, godRaysScale);
      godRaysMaterial.uniforms.exposure.value = THREE.MathUtils.lerp(0.4, 0.85, godRaysScale);
    }
    else {
      godRaysMaterial.uniforms.decay.value = 0.4;
      godRaysMaterial.uniforms.exposure.value = 0.4;
    }
  });

  return (
    <customEffectComposer
      ref={effects}
      multisampling={8}
      args={[gl, camera, scene, props.sunMesh]}
    />
  );
}

export default VfxManager;
