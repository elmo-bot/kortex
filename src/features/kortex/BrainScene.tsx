/* eslint-disable react-hooks/refs, react-hooks/immutability, react/no-unknown-property -- The render loop intentionally mutates Three.js objects outside React. */
import { Component, ErrorInfo, PropsWithChildren, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, PanResponder, StyleSheet, Text, View } from 'react-native';
import { Canvas, useFrame, useLoader } from '@react-three/fiber/native';
import * as Device from 'expo-device';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { colors, type } from '@/design/tokens';
import { haptics } from '@/design/haptics';
import brainModel from '../../../assets/models/kortex-brain.glb';
import brainModelLow from '../../../assets/models/kortex-brain-low.glb';

export type BrainState = 'idle' | 'listening' | 'understanding' | 'connecting' | 'complete';
interface MotionInput { yaw: number; pitch: number; vx: number; vy: number; dragging: boolean; lastDx: number; lastDy: number }

const energyByState: Record<BrainState, number> = { idle: .2, listening: .48, understanding: .78, connecting: .96, complete: .52 };

function BrainModel({ state, amplitude, reducedMotion, motion }: { state: BrainState; amplitude: number; reducedMotion: boolean; motion: React.MutableRefObject<MotionInput> }) {
  const selectedAsset = reducedMotion || (Device.deviceYearClass !== null && Device.deviceYearClass < 2021) ? brainModelLow : brainModel;
  const { scene } = useLoader(GLTFLoader, selectedAsset as unknown as string) as unknown as { scene: THREE.Group };
  const group = useRef<THREE.Group>(null);
  const stateAge = useRef(0);
  const previousState = useRef(state);
  const prepared = useMemo(() => {
    const clone = scene.clone(true);
    const materials: THREE.MeshStandardMaterial[] = [];
    clone.traverse(child => {
      if (!(child instanceof THREE.Mesh)) return;
      const original = Array.isArray(child.material) ? child.material[0] : child.material;
      const material = new THREE.MeshStandardMaterial({
        color: original?.name === 'Particle_2' ? '#315E70' : '#73CFE5', emissive: '#1E91B1', emissiveIntensity: .2,
        metalness: .16, roughness: .44, transparent: true, opacity: .94, depthWrite: true,
      });
      child.material = material; materials.push(material);
    });
    return { object: clone, materials };
  }, [scene]);

  useFrame(({ clock }, delta) => {
    if (!group.current) return;
    const safeDelta = Math.min(delta, 1 / 24);
    const time = clock.getElapsedTime();
    if (previousState.current !== state) { previousState.current = state; stateAge.current = 0; }
    else stateAge.current += safeDelta;

    if (!reducedMotion) {
      if (!motion.current.dragging) {
        motion.current.yaw += motion.current.vx * safeDelta;
        motion.current.pitch += motion.current.vy * safeDelta;
        const damping = Math.exp(-5.4 * safeDelta);
        motion.current.vx *= damping; motion.current.vy *= damping;
        motion.current.pitch += (-.08 - motion.current.pitch) * Math.min(1, safeDelta * 1.8);
      }
      const driftYaw = Math.sin(time * .16) * .035 + Math.sin(time * .071) * .018;
      const driftPitch = Math.sin(time * .21) * .012;
      group.current.rotation.set(motion.current.pitch + driftPitch, motion.current.yaw + driftYaw, Math.sin(time * .11) * .008);
      const voice = state === 'listening' ? amplitude : 0;
      const breathing = Math.sin(time * (state === 'listening' ? 2.2 : .68)) * (.005 + voice * .012);
      const resolvedPulse = state === 'complete' ? Math.sin(Math.min(1, stateAge.current / .48) * Math.PI) * .025 : 0;
      group.current.scale.setScalar(.027 * (1 + breathing + resolvedPulse));
    } else group.current.scale.setScalar(.027);

    const baseEnergy = energyByState[state] + (state === 'listening' ? amplitude * .58 : 0);
    prepared.materials.forEach((material, index) => {
      const association = (state === 'understanding' || state === 'connecting') ? ((Math.sin(time * 2.1 + index * 2.8) + 1) * .22) : 0;
      const target = baseEnergy + association;
      material.emissiveIntensity = THREE.MathUtils.damp(material.emissiveIntensity, target, 4.8, safeDelta);
    });
  });
  return <group ref={group} rotation={[-.08, 0, 0]}><primitive object={prepared.object} />{state === 'connecting' ? <ConnectionSignals /> : null}</group>;
}

function ConnectionSignals() {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { if (group.current) group.current.rotation.z = Math.sin(clock.getElapsedTime() * .7) * .08; });
  return <group ref={group} scale={38}>
    {[[-1.3, .7, .3], [1.2, .5, .2], [.2, -1.1, .5]].map((position, index) => <mesh key={index} position={position as [number, number, number]}><sphereGeometry args={[.034, 10, 10]} /><meshBasicMaterial transparent opacity={.8} color={index === 2 ? '#E9C987' : '#A6ECFA'} /></mesh>)}
  </group>;
}

function LightRig({ state, amplitude }: { state: BrainState; amplitude: number }) {
  const key = useRef<THREE.PointLight>(null);
  const fill = useRef<THREE.PointLight>(null);
  useFrame((_, delta) => {
    const target = 5.2 + energyByState[state] * 2.5 + amplitude * 2.2;
    if (key.current) key.current.intensity = THREE.MathUtils.damp(key.current.intensity, target, 4, delta);
    if (fill.current) fill.current.intensity = THREE.MathUtils.damp(fill.current.intensity, 2.5 + energyByState[state], 4, delta);
  });
  return <><ambientLight intensity={.3} /><pointLight ref={key} position={[3, 3, 4]} color="#BFEFFC" intensity={5} /><pointLight ref={fill} position={[-3, -2, 2]} color="#1F7896" intensity={2.5} /></>;
}

function FrameBudgetMonitor() {
  const elapsed = useRef(0); const frames = useRef(0);
  useFrame((_, delta) => {
    if (!__DEV__) return;
    elapsed.current += delta; frames.current += 1;
    if (elapsed.current >= 3) {
      const fps = frames.current / elapsed.current;
      (globalThis as typeof globalThis & { __KORTEX_3D_FPS__?: number }).__KORTEX_3D_FPS__ = Math.round(fps);
      elapsed.current = 0; frames.current = 0;
    }
  });
  return null;
}

class BrainBoundary extends Component<PropsWithChildren<{ fallback: React.ReactNode }>, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(_error: Error, _info: ErrorInfo) {}
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export function BrainScene({ state, amplitude = 0, onTap, height = 344 }: { state: BrainState; amplitude?: number; onTap?: () => void; height?: number }) {
  const [reducedMotion, setReducedMotion] = useState(false);
  const motion = useRef<MotionInput>({ yaw: 0, pitch: -.08, vx: 0, vy: 0, dragging: false, lastDx: 0, lastDy: 0 });
  useEffect(() => { void AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion); const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion); return () => subscription.remove(); }, []);
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) + Math.abs(gesture.dy) > 3,
    onPanResponderGrant: () => { motion.current.dragging = true; motion.current.lastDx = 0; motion.current.lastDy = 0; motion.current.vx = 0; motion.current.vy = 0; },
    onPanResponderMove: (_, gesture) => {
      const dx = gesture.dx - motion.current.lastDx; const dy = gesture.dy - motion.current.lastDy;
      motion.current.yaw += dx * .006; motion.current.pitch = THREE.MathUtils.clamp(motion.current.pitch + dy * .0045, -.55, .4);
      motion.current.lastDx = gesture.dx; motion.current.lastDy = gesture.dy;
    },
    onPanResponderRelease: (_, gesture) => {
      motion.current.dragging = false; motion.current.vx = THREE.MathUtils.clamp(gesture.vx * .72, -2.2, 2.2); motion.current.vy = THREE.MathUtils.clamp(gesture.vy * .42, -1.2, 1.2);
      if (Math.abs(gesture.dx) + Math.abs(gesture.dy) < 7) { haptics.wake(); onTap?.(); }
    },
    onPanResponderTerminate: () => { motion.current.dragging = false; },
  }), [onTap]);
  const fallback = <View style={styles.loading}><View style={styles.staticBrain}><View style={styles.staticCore} /></View><Text style={styles.loadingText}>KORTEX</Text></View>;
  const stateLabel = state === 'idle' ? 'Ready' : state.charAt(0).toUpperCase() + state.slice(1);
  return <View style={[styles.container, { height }]} {...pan.panHandlers} accessibilityLabel={`Kortex brain. ${stateLabel}. Drag to explore or tap to capture.`} accessibilityRole="button">
    <BrainBoundary fallback={fallback}><Canvas frameloop={reducedMotion ? 'demand' : 'always'} camera={{ position: [0, 0, 4.4], fov: 38 }} gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}>
      <LightRig state={state} amplitude={amplitude} />
      <Suspense fallback={null}><BrainModel state={state} amplitude={amplitude} reducedMotion={reducedMotion} motion={motion} /></Suspense>
      <FrameBudgetMonitor />
    </Canvas></BrainBoundary>
    <View pointerEvents="none" style={styles.state}><View style={[styles.dot, state !== 'idle' && styles.dotActive]} /><Text style={styles.stateText}>{stateLabel.toUpperCase()}</Text></View>
  </View>;
}

const styles = StyleSheet.create({
  container: { overflow: 'hidden' }, loading: { position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' },
  staticBrain: { width: 150, height: 120, borderRadius: 60, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.lineStrong, alignItems: 'center', justifyContent: 'center' },
  staticCore: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(126,221,244,.1)', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.cyan },
  loadingText: { ...type.metadata, color: colors.textFaint, marginTop: 14, letterSpacing: 2 },
  state: { position: 'absolute', bottom: 7, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 7 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.textFaint }, dotActive: { backgroundColor: colors.cyan, shadowColor: colors.cyan, shadowOpacity: 1, shadowRadius: 7 }, stateText: { ...type.metadata, color: colors.textMuted },
});
