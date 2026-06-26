import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export type Fit = { x: number; y: number; scale: number };

/**
 * useAnchorFit — keep an R3F object sized + centered on a DOM box.
 *
 * Measures the `anchorSelector` element, unprojects its center to the z=0 plane,
 * and computes a uniform `scale` that fills ~95% of the box height (clamped),
 * given the object's `outerDiameter`. Returns a mutable ref with the *base*
 * transform `{ x, y, scale }` — read it per frame and compose it with whatever
 * motion you like (parallax, an overall-scale multiplier, tilt). The hook owns
 * its own measurement frame, so callers never thread the camera/size back out.
 *
 * Re-measures only when dirty — mount, window resize / orientation, the webfont
 * swap, or an `outerDiameter` change — never per scroll frame. (The canvas
 * scrolls with the page on the compositor, so the anchor's offset within it is
 * scroll-invariant.)
 */
export function useAnchorFit(anchorSelector: string, outerDiameter: number) {
  const fitRef = useRef<Fit>({ x: 0, y: 0, scale: 0.5 });
  const needsFitRef = useRef(true);
  const anchorRef = useRef<HTMLElement | null>(null);
  const scratchVec = useRef(new THREE.Vector3());
  const scratchDir = useRef(new THREE.Vector3());

  // Dirty only on genuine layout changes — never a plain scroll. (svh units mean
  // the mobile address-bar 'resize' measures the same; the webfont swap reflows
  // the hero once.)
  useEffect(() => {
    const markDirty = () => {
      needsFitRef.current = true;
    };
    window.addEventListener('resize', markDirty);
    window.addEventListener('orientationchange', markDirty);
    if (document.fonts?.ready) document.fonts.ready.then(markDirty).catch(() => {});
    return () => {
      window.removeEventListener('resize', markDirty);
      window.removeEventListener('orientationchange', markDirty);
    };
  }, []);

  // Re-fit when the geometry size changes (e.g. tuner edits).
  useEffect(() => {
    needsFitRef.current = true;
  }, [outerDiameter]);

  useFrame((state) => {
    if (!needsFitRef.current) return;
    let anchor = anchorRef.current;
    if (!anchor || !document.body.contains(anchor)) {
      anchor = document.querySelector<HTMLElement>(anchorSelector);
      anchorRef.current = anchor;
    }
    if (!anchor) return;

    const camera = state.camera as THREE.PerspectiveCamera;
    const vw = Math.max(state.size.width, 1);
    const vh = Math.max(state.size.height, 1);
    const visibleHeight =
      2 * Math.abs(camera.position.z) * Math.tan(((camera.fov * Math.PI) / 180) / 2);
    const rect = anchor.getBoundingClientRect();
    const canvasRect = state.gl.domElement.getBoundingClientRect();
    const centerX = rect.left - canvasRect.left + rect.width / 2;
    const centerY = rect.top - canvasRect.top + rect.height / 2;
    const ndcX = (centerX / vw) * 2 - 1;
    const ndcY = -(centerY / vh) * 2 + 1;
    scratchVec.current.set(ndcX, ndcY, 0.5).unproject(camera);
    scratchDir.current.copy(scratchVec.current).sub(camera.position).normalize();
    const t = (0 - camera.position.z) / scratchDir.current.z;
    fitRef.current.x = camera.position.x + scratchDir.current.x * t;
    fitRef.current.y = camera.position.y + scratchDir.current.y * t;
    const bandWorldHeight = (rect.height / vh) * visibleHeight;
    fitRef.current.scale = Math.max(0.15, Math.min((bandWorldHeight * 0.95) / outerDiameter, 1.1));
    needsFitRef.current = false;
  });

  return fitRef;
}
