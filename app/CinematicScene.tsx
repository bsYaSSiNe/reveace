"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const easeOut = (value: number) => 1 - Math.pow(1 - clamp(value), 3);
const easeInOut = (value: number) => {
  const t = clamp(value);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

const neonMaterial = (color: number) =>
  new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 4.2,
    roughness: 0.22,
    metalness: 0.08,
    toneMapped: false,
  });

function addCurveGlyph(parent: THREE.Group) {
  const material = neonMaterial(0xc8ff19);
  const path = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.47, -0.35, 0.58),
    new THREE.Vector3(-0.22, -0.3, 0.61),
    new THREE.Vector3(0.04, 0.03, 0.62),
    new THREE.Vector3(0.23, 0.32, 0.61),
    new THREE.Vector3(0.48, 0.37, 0.58),
  ]);
  const tube = new THREE.Mesh(new THREE.TubeGeometry(path, 42, 0.024, 8, false), material);
  parent.add(tube);

  [-0.47, 0, 0.48].forEach((x, index) => {
    const dot = new THREE.Mesh(new THREE.SphereGeometry(index === 1 ? 0.045 : 0.055, 18, 18), material);
    dot.position.set(x, index === 0 ? -0.35 : index === 1 ? 0.08 : 0.37, 0.61);
    parent.add(dot);
  });
}

function addSliderGlyph(parent: THREE.Group) {
  const material = neonMaterial(0xc8ff19);
  const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x66710d, roughness: 0.3, metalness: 0.22 });
  const widths = [0.88, 0.68, 0.92, 0.58];
  const knobs = [0.24, -0.17, 0.31, 0.05];

  widths.forEach((width, index) => {
    const y = 0.34 - index * 0.23;
    const rail = new THREE.Mesh(new RoundedBoxGeometry(width, 0.07, 0.055, 4, 0.028), index === 1 ? darkMaterial : material);
    rail.position.set(-0.08 + (width - 0.75) * 0.12, y, 0.61);
    parent.add(rail);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 16), material);
    knob.position.set(knobs[index], y, 0.66);
    parent.add(knob);
  });
}

function addWaveGlyph(parent: THREE.Group) {
  const material = neonMaterial(0xc8ff19);
  const heights = [0.22, 0.48, 0.76, 1, 0.72, 0.43, 0.2];
  heights.forEach((height, index) => {
    const bar = new THREE.Mesh(new RoundedBoxGeometry(0.065, height * 0.72, 0.055, 4, 0.028), material);
    bar.position.set((index - 3) * 0.14, 0, 0.62);
    parent.add(bar);
  });
}

function makeGlassObject(kind: "curve" | "sliders" | "wave", accent: number) {
  const group = new THREE.Group();
  const glass = new THREE.MeshPhysicalMaterial({
    color: accent,
    transmission: 1,
    thickness: 1.35,
    ior: 1.47,
    roughness: 0.055,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    attenuationColor: new THREE.Color(accent),
    attenuationDistance: 2.15,
    specularIntensity: 1,
    specularColor: new THREE.Color(0xf5ffe1),
    transparent: true,
    opacity: 0.94,
  });
  const geometry = new RoundedBoxGeometry(1.25, 1.25, 0.55, 10, 0.23);
  const body = new THREE.Mesh(geometry, glass);
  body.castShadow = true;
  group.add(body);

  const inner = new THREE.Mesh(
    new RoundedBoxGeometry(1.05, 1.05, 0.44, 8, 0.18),
    new THREE.MeshPhysicalMaterial({
      color: 0x0d1207,
      transmission: 0.78,
      thickness: 0.62,
      roughness: 0.11,
      clearcoat: 1,
      opacity: 0.66,
      transparent: true,
    }),
  );
  group.add(inner);

  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry, 18),
    new THREE.LineBasicMaterial({ color: 0xe7ffad, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending }),
  );
  edges.scale.setScalar(1.006);
  group.add(edges);

  if (kind === "curve") addCurveGlyph(group);
  if (kind === "sliders") addSliderGlyph(group);
  if (kind === "wave") addWaveGlyph(group);
  return group;
}

function makeScreenTexture(renderer: THREE.WebGLRenderer) {
  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 760;
  const context = canvas.getContext("2d");
  if (!context) return null;

  const background = context.createRadialGradient(890, 280, 0, 890, 280, 700);
  background.addColorStop(0, "#172400");
  background.addColorStop(0.42, "#080b05");
  background.addColorStop(1, "#010202");
  context.fillStyle = background;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.lineCap = "round";
  for (let index = 0; index < 4; index += 1) {
    context.beginPath();
    context.strokeStyle = `rgba(200,255,25,${0.5 - index * 0.09})`;
    context.lineWidth = index === 0 ? 5 : 2;
    context.shadowColor = "#c8ff19";
    context.shadowBlur = 18;
    context.moveTo(520, 650 + index * 18);
    context.bezierCurveTo(730, 490 - index * 20, 870, 565 + index * 10, 1300, 300 - index * 35);
    context.stroke();
  }
  context.shadowBlur = 0;

  context.fillStyle = "#c8ff19";
  context.font = "900 108px Arial, sans-serif";
  context.letterSpacing = "-5px";
  context.fillText("REVEACE", 76, 194);
  context.fillStyle = "#ffffff";
  context.font = "700 39px Arial, sans-serif";
  context.letterSpacing = "-1px";
  context.fillText("MOTION TOOLS", 82, 257);
  context.fillText("WITHOUT THE FRICTION.", 82, 304);
  context.fillStyle = "rgba(255,255,255,.5)";
  context.font = "500 15px Arial, sans-serif";
  context.letterSpacing = "3px";
  context.fillText("FUSION / CURVES / CREATIVE FLOW", 84, 360);

  context.strokeStyle = "rgba(200,255,25,.45)";
  context.lineWidth = 2;
  context.beginPath();
  context.arc(1025, 175, 78, 0, Math.PI * 2);
  context.stroke();
  context.beginPath();
  context.moveTo(955, 200);
  context.bezierCurveTo(995, 225, 1010, 120, 1090, 145);
  context.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

export default function CinematicScene() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.className = "cinematicCanvas";
    host.prepend(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x030404, 0.045);
    const camera = new THREE.PerspectiveCamera(39, 1, 0.1, 80);
    camera.position.set(0, 1.7, 9.5);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const environment = pmrem.fromScene(room, 0.035).texture;
    scene.environment = environment;

    scene.add(new THREE.HemisphereLight(0xd8ff99, 0x09030f, 1.3));
    const key = new THREE.DirectionalLight(0xf4ffe0, 4.2);
    key.position.set(-4, 7, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    scene.add(key);
    const limeLight = new THREE.PointLight(0xc8ff19, 38, 12, 1.7);
    limeLight.position.set(2.7, 2.2, 2.5);
    scene.add(limeLight);
    const purpleLight = new THREE.PointLight(0x7c46ff, 25, 9, 1.8);
    purpleLight.position.set(4.2, 0.2, 3.2);
    scene.add(purpleLight);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(32, 22),
      new THREE.MeshPhysicalMaterial({ color: 0x060707, roughness: 0.24, metalness: 0.58, clearcoat: 0.7, transparent: true, opacity: 0.86 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.43;
    floor.receiveShadow = true;
    scene.add(floor);

    const laptop = new THREE.Group();
    scene.add(laptop);
    const metal = new THREE.MeshPhysicalMaterial({ color: 0x393b3e, metalness: 0.92, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.12 });
    const edgeMetal = new THREE.MeshPhysicalMaterial({ color: 0x777b7d, metalness: 1, roughness: 0.13, clearcoat: 1 });
    const black = new THREE.MeshStandardMaterial({ color: 0x070809, metalness: 0.38, roughness: 0.45 });

    const base = new THREE.Mesh(new RoundedBoxGeometry(6.4, 0.2, 4.05, 8, 0.13), metal);
    base.position.y = -0.55;
    base.castShadow = true;
    base.receiveShadow = true;
    laptop.add(base);
    const baseEdge = new THREE.Mesh(new RoundedBoxGeometry(6.23, 0.045, 3.9, 8, 0.11), edgeMetal);
    baseEdge.position.y = -0.435;
    laptop.add(baseEdge);

    const keyboardBed = new THREE.Mesh(new RoundedBoxGeometry(5.35, 0.045, 2.02, 6, 0.1), black);
    keyboardBed.position.set(0, -0.398, -0.62);
    laptop.add(keyboardBed);
    const keyGeometry = new RoundedBoxGeometry(0.34, 0.035, 0.23, 3, 0.035);
    const keyMaterial = new THREE.MeshStandardMaterial({ color: 0x0c0d0e, roughness: 0.32, metalness: 0.3 });
    const keys = new THREE.InstancedMesh(keyGeometry, keyMaterial, 65);
    const keyMatrix = new THREE.Matrix4();
    let keyIndex = 0;
    for (let row = 0; row < 5; row += 1) {
      for (let column = 0; column < 13; column += 1) {
        keyMatrix.makeTranslation(-2.17 + column * 0.36, -0.36, -1.34 + row * 0.34);
        keys.setMatrixAt(keyIndex, keyMatrix);
        keyIndex += 1;
      }
    }
    laptop.add(keys);

    const trackpad = new THREE.Mesh(new RoundedBoxGeometry(2.55, 0.025, 1.15, 6, 0.1), new THREE.MeshPhysicalMaterial({ color: 0x424548, metalness: 0.76, roughness: 0.25, clearcoat: 1 }));
    trackpad.position.set(0, -0.39, 1.15);
    laptop.add(trackpad);

    const hingeMaterial = new THREE.MeshStandardMaterial({ color: 0x161719, metalness: 0.9, roughness: 0.18 });
    [-2.35, 2.35].forEach((x) => {
      const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.95, 28), hingeMaterial);
      hinge.rotation.z = Math.PI / 2;
      hinge.position.set(x, -0.43, -1.88);
      laptop.add(hinge);
    });

    const lid = new THREE.Group();
    lid.position.set(0, -0.44, -1.92);
    laptop.add(lid);
    const lidShell = new THREE.Mesh(new RoundedBoxGeometry(6.34, 3.82, 0.16, 8, 0.17), metal);
    lidShell.position.y = 1.91;
    lidShell.castShadow = true;
    lid.add(lidShell);
    const bezel = new THREE.Mesh(new RoundedBoxGeometry(6.07, 3.55, 0.06, 8, 0.13), black);
    bezel.position.set(0, 1.91, 0.105);
    lid.add(bezel);

    const screenTexture = makeScreenTexture(renderer);
    const screenMaterial = new THREE.MeshBasicMaterial({ map: screenTexture, color: 0xffffff, toneMapped: false });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(5.78, 3.25), screenMaterial);
    screen.position.set(0, 1.91, 0.142);
    lid.add(screen);
    const screenGlow = new THREE.Mesh(new THREE.PlaneGeometry(6.05, 3.5), new THREE.MeshBasicMaterial({ color: 0xbaff12, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    screenGlow.position.set(0, 1.91, 0.15);
    lid.add(screenGlow);
    const cameraDot = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 12), new THREE.MeshBasicMaterial({ color: 0x151718 }));
    cameraDot.position.set(0, 3.69, 0.152);
    lid.add(cameraDot);

    const cubeKinds = ["curve", "sliders", "wave"] as const;
    const cubes = cubeKinds.map((kind, index) => {
      const group = makeGlassObject(kind, index === 2 ? 0x8e5cff : 0xc8ff19);
      group.scale.setScalar(0.001);
      scene.add(group);
      return group;
    });

    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(0.44, 64, 64),
      new THREE.MeshPhysicalMaterial({
        color: 0x7440ff,
        transmission: 1,
        thickness: 1.1,
        ior: 1.52,
        roughness: 0.035,
        clearcoat: 1,
        clearcoatRoughness: 0.02,
        attenuationColor: new THREE.Color(0x9e72ff),
        attenuationDistance: 1.2,
      }),
    );
    orb.scale.setScalar(0.001);
    orb.castShadow = true;
    scene.add(orb);

    const ribbonMaterial = new THREE.MeshBasicMaterial({ color: 0xc8ff19, transparent: true, opacity: 0.34, blending: THREE.AdditiveBlending, depthWrite: false });
    for (let index = 0; index < 3; index += 1) {
      const ribbonPath = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-5, -1.1 - index * 0.18, -1 + index * 0.2),
        new THREE.Vector3(-1, -1.2 + index * 0.12, 0.3),
        new THREE.Vector3(2.1, -0.65 + index * 0.16, 0.8),
        new THREE.Vector3(6.2, 0.35 + index * 0.4, -0.4),
      ]);
      const ribbon = new THREE.Mesh(new THREE.TubeGeometry(ribbonPath, 96, 0.012 + index * 0.004, 6, false), ribbonMaterial.clone());
      scene.add(ribbon);
    }

    const particlesGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(210 * 3);
    for (let index = 0; index < 210; index += 1) {
      const seed = index * 9.73;
      particlePositions[index * 3] = Math.sin(seed * 1.7) * 6.5;
      particlePositions[index * 3 + 1] = -1.1 + Math.abs(Math.cos(seed * 0.63)) * 3.8;
      particlePositions[index * 3 + 2] = -2 + Math.sin(seed * 0.91) * 3.2;
    }
    particlesGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    const particles = new THREE.Points(particlesGeometry, new THREE.PointsMaterial({ color: 0xc8ff19, size: 0.025, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
    scene.add(particles);

    const pointer = new THREE.Vector2();
    const pointerTarget = new THREE.Vector2();
    const onPointer = (event: PointerEvent) => {
      pointerTarget.set(event.clientX / window.innerWidth - 0.5, event.clientY / window.innerHeight - 0.5);
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    const resize = () => {
      const width = host.clientWidth;
      const height = host.clientHeight;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(height, 1);
      camera.fov = width < 760 ? 52 : 39;
      camera.updateProjectionMatrix();
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);

    const clockStart = performance.now() - (reduceMotion ? 6000 : 0);
    let frame = 0;
    let stopped = false;
    const render = (now: number) => {
      if (stopped) return;
      const time = (now - clockStart) / 1000;
      const isMobile = host.clientWidth < 760;
      const entrance = easeOut(time / 1.15);
      const opening = easeInOut((time - 0.7) / 2.15);
      const settle = easeInOut((time - 2.45) / 1.7);
      const reveal = easeOut((time - 2.2) / 1.7);
      const floatTime = Math.max(0, time - 3.4);

      pointer.lerp(pointerTarget, 0.045);
      laptop.position.set(
        THREE.MathUtils.lerp(0, isMobile ? 0 : 1.55, settle),
        THREE.MathUtils.lerp(-3.1, isMobile ? -1.52 : -0.78, entrance),
        THREE.MathUtils.lerp(0.3, 0, settle),
      );
      const laptopScale = THREE.MathUtils.lerp(isMobile ? 0.42 : 0.62, isMobile ? 0.49 : 0.7, entrance);
      laptop.scale.setScalar(laptopScale);
      laptop.rotation.y = THREE.MathUtils.lerp(0, -0.09, settle) + pointer.x * 0.035;
      laptop.rotation.x = pointer.y * -0.018;
      lid.rotation.x = THREE.MathUtils.lerp(1.47, -0.14, opening);
      screenGlow.material.opacity = clamp((time - 1.2) / 1.2) * 0.08;

      const desktopTargets = [
        new THREE.Vector3(0.35, 2.45, 0.55),
        new THREE.Vector3(3.55, 2.05, 0.15),
        new THREE.Vector3(2.0, 0.62, 1.28),
      ];
      const mobileTargets = [
        new THREE.Vector3(-1.25, -0.12, 1.1),
        new THREE.Vector3(1.25, -0.05, 0.72),
        new THREE.Vector3(0, -1.38, 1.5),
      ];
      const targets = isMobile ? mobileTargets : desktopTargets;
      const origin = new THREE.Vector3(isMobile ? 0 : 1.55, isMobile ? -0.15 : 0.35, 0.05);
      cubes.forEach((cube, index) => {
        const delayedReveal = easeOut((time - 2.2 - index * 0.18) / 1.45);
        cube.position.lerpVectors(origin, targets[index], delayedReveal);
        const scale = delayedReveal * (isMobile ? 0.7 : index === 1 ? 0.9 : 1.02);
        cube.scale.setScalar(scale);
        cube.rotation.x = 0.16 + index * 0.18 + Math.sin(floatTime * 0.55 + index) * 0.07 + pointer.y * 0.11;
        cube.rotation.y = -0.3 + index * 0.42 + Math.sin(floatTime * 0.42 + index * 1.7) * 0.1 + pointer.x * 0.16;
        cube.rotation.z = (index - 1) * 0.14 + Math.sin(floatTime * 0.7 + index) * 0.05;
        cube.position.y += Math.sin(floatTime * 0.75 + index * 1.8) * 0.08 * reveal;
      });

      const orbTarget = isMobile ? new THREE.Vector3(1.18, -1.34, 1.55) : new THREE.Vector3(3.62, 0.28, 1.52);
      orb.position.lerpVectors(origin, orbTarget, reveal);
      orb.position.y += Math.sin(floatTime * 0.9) * 0.08 * reveal;
      orb.scale.setScalar(reveal * (isMobile ? 0.62 : 1));

      camera.position.x = pointer.x * 0.22;
      camera.position.y = 1.7 - pointer.y * 0.12;
      camera.lookAt(isMobile ? 0 : 0.5, isMobile ? -0.1 : 0.35, 0);
      particles.rotation.y = time * 0.018;
      renderer.render(scene, camera);
      frame = window.requestAnimationFrame(render);
    };
    frame = window.requestAnimationFrame(render);

    return () => {
      stopped = true;
      window.cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onPointer);
      resizeObserver.disconnect();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments || object instanceof THREE.Points) {
          object.geometry?.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => {
            if (material instanceof THREE.MeshBasicMaterial && material.map) material.map.dispose();
            material.dispose();
          });
        }
      });
      screenTexture?.dispose();
      environment.dispose();
      room.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div className="cinematicScene" ref={hostRef} aria-hidden="true">
      <div className="cinematicVignette" />
      <div className="cinematicBadge"><i /> REALTIME PHYSICAL GLASS</div>
    </div>
  );
}
