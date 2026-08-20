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
    emissiveIntensity: 6.4,
    roughness: 0.16,
    metalness: 0.02,
    toneMapped: false,
  });

function addCurveGlyph(parent: THREE.Group) {
  const material = neonMaterial(0xc8ff19);
  const path = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.42, -0.28, 0.315),
    new THREE.Vector3(-0.2, -0.25, 0.325),
    new THREE.Vector3(0.02, 0.015, 0.33),
    new THREE.Vector3(0.2, 0.27, 0.325),
    new THREE.Vector3(0.42, 0.3, 0.315),
  ]);
  const tube = new THREE.Mesh(new THREE.TubeGeometry(path, 42, 0.021, 8, false), material);
  parent.add(tube);

  [-0.47, 0, 0.48].forEach((x, index) => {
    const dot = new THREE.Mesh(new THREE.SphereGeometry(index === 1 ? 0.045 : 0.055, 18, 18), material);
    dot.position.set(x * 0.89, index === 0 ? -0.28 : index === 1 ? 0.045 : 0.3, 0.325);
    parent.add(dot);
  });
}

function addSliderGlyph(parent: THREE.Group) {
  const material = neonMaterial(0xc8ff19);
  const railMaterial = new THREE.MeshStandardMaterial({ color: 0x718214, emissive: 0x344100, emissiveIntensity: 1.4, roughness: 0.24, metalness: 0.04 });
  const widths = [0.78, 0.7, 0.82, 0.62];
  const knobs = [0.22, -0.18, 0.28, 0.03];

  widths.forEach((width, index) => {
    const y = 0.34 - index * 0.23;
    const rail = new THREE.Mesh(new RoundedBoxGeometry(width, 0.048, 0.035, 4, 0.022), railMaterial);
    rail.position.set(-0.04 + (width - 0.72) * 0.08, y, 0.305);
    parent.add(rail);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 16), material);
    knob.position.set(knobs[index], y, 0.33);
    parent.add(knob);
  });
}

function addWaveGlyph(parent: THREE.Group) {
  const material = neonMaterial(0xc8ff19);
  const heights = [0.2, 0.42, 0.68, 0.9, 0.68, 0.42, 0.2];
  heights.forEach((height, index) => {
    const bar = new THREE.Mesh(new RoundedBoxGeometry(0.052, height * 0.72, 0.035, 4, 0.024), material);
    bar.position.set((index - 3) * 0.125, 0, 0.32);
    parent.add(bar);
  });
}

function makeGlassObject(kind: "curve" | "sliders" | "wave", accent: number) {
  const group = new THREE.Group();
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x1d2710,
    transmission: 1,
    thickness: 0.9,
    ior: 1.42,
    roughness: 0.035,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.025,
    attenuationColor: new THREE.Color(accent),
    attenuationDistance: 1.35,
    specularIntensity: 1,
    specularColor: new THREE.Color(0xf5ffe1),
    transparent: true,
    opacity: 0.82,
  });
  const geometry = new RoundedBoxGeometry(1.2, 1.2, 0.48, 12, 0.22);
  const body = new THREE.Mesh(geometry, glass);
  body.castShadow = true;
  group.add(body);

  const inner = new THREE.Mesh(
    new RoundedBoxGeometry(0.99, 0.99, 0.18, 10, 0.16),
    new THREE.MeshPhysicalMaterial({
      color: 0x080b07,
      transmission: 0.38,
      thickness: 0.22,
      roughness: 0.16,
      clearcoat: 1,
      opacity: 0.76,
      transparent: true,
    }),
  );
  inner.position.z = 0.08;
  group.add(inner);

  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry, 18),
    new THREE.LineBasicMaterial({ color: 0xeaffb4, transparent: true, opacity: 0.72, blending: THREE.AdditiveBlending }),
  );
  edges.scale.setScalar(1.006);
  group.add(edges);

  const statusDot = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 12), neonMaterial(accent));
  statusDot.position.set(-0.43, 0.43, 0.32);
  group.add(statusDot);

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
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.className = "cinematicCanvas";
    host.prepend(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x020303, 0.032);
    const camera = new THREE.PerspectiveCamera(39, 1, 0.1, 80);
    camera.position.set(0, 1.7, 9.5);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const environment = pmrem.fromScene(room, 0.035).texture;
    scene.environment = environment;

    const hemisphere = new THREE.HemisphereLight(0xf1f5e9, 0x010202, 0.68);
    scene.add(hemisphere);
    const key = new THREE.DirectionalLight(0xffffff, 4.6);
    key.position.set(-4.5, 7.5, 5.2);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xaec7ff, 3.4);
    rim.position.set(7, 3.5, -4);
    scene.add(rim);
    const limeLight = new THREE.PointLight(0xbfff00, 38, 12, 1.7);
    limeLight.position.set(2.7, 2.2, 2.5);
    scene.add(limeLight);
    const purpleLight = new THREE.PointLight(0x704cff, 14, 8, 1.8);
    purpleLight.position.set(5.1, 0.1, 2.2);
    scene.add(purpleLight);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(32, 22),
      new THREE.MeshPhysicalMaterial({ color: 0x020303, roughness: 0.48, metalness: 0.58, clearcoat: 0.32, clearcoatRoughness: 0.24, transparent: true, opacity: 0.42 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.43;
    floor.receiveShadow = true;
    scene.add(floor);

    const laptop = new THREE.Group();
    scene.add(laptop);
    const introMetalColor = new THREE.Color(0x898d92);
    const finalMetalColor = new THREE.Color(0x50545a);
    const introEdgeColor = new THREE.Color(0xe2e5e8);
    const finalEdgeColor = new THREE.Color(0x969ba2);
    const metal = new THREE.MeshPhysicalMaterial({ color: finalMetalColor.clone(), metalness: 1, roughness: 0.2, clearcoat: 0.34, clearcoatRoughness: 0.13 });
    const edgeMetal = new THREE.MeshPhysicalMaterial({ color: finalEdgeColor.clone(), metalness: 1, roughness: 0.13, clearcoat: 0.46, clearcoatRoughness: 0.09 });
    const darkMetal = new THREE.MeshPhysicalMaterial({ color: 0x24272a, metalness: 0.92, roughness: 0.25, clearcoat: 0.28 });
    const black = new THREE.MeshStandardMaterial({ color: 0x030405, metalness: 0.32, roughness: 0.32 });

    const base = new THREE.Mesh(new RoundedBoxGeometry(6.4, 0.23, 4.05, 10, 0.13), metal);
    base.position.y = -0.55;
    base.castShadow = true;
    base.receiveShadow = true;
    laptop.add(base);
    const baseEdge = new THREE.Mesh(new RoundedBoxGeometry(6.27, 0.04, 3.93, 10, 0.11), edgeMetal);
    baseEdge.position.y = -0.414;
    laptop.add(baseEdge);
    const underside = new THREE.Mesh(new RoundedBoxGeometry(6.18, 0.08, 3.86, 8, 0.11), darkMetal);
    underside.position.y = -0.65;
    laptop.add(underside);

    const keyboardBed = new THREE.Mesh(new RoundedBoxGeometry(5.35, 0.045, 2.02, 6, 0.1), black);
    keyboardBed.position.set(0, -0.398, -0.62);
    laptop.add(keyboardBed);
    const keyGeometry = new RoundedBoxGeometry(0.34, 0.035, 0.23, 3, 0.035);
    const keyMaterial = new THREE.MeshPhysicalMaterial({ color: 0x050607, roughness: 0.2, metalness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.18 });
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

    const trackpadGeometry = new RoundedBoxGeometry(2.55, 0.022, 1.15, 8, 0.1);
    const trackpad = new THREE.Mesh(trackpadGeometry, new THREE.MeshPhysicalMaterial({ color: 0x62666b, metalness: 0.96, roughness: 0.2, clearcoat: 0.42 }));
    trackpad.position.set(0, -0.39, 1.15);
    laptop.add(trackpad);
    const trackpadEdge = new THREE.LineSegments(new THREE.EdgesGeometry(trackpadGeometry, 22), new THREE.LineBasicMaterial({ color: 0xc8cdd2, transparent: true, opacity: 0.34 }));
    trackpadEdge.position.copy(trackpad.position);
    laptop.add(trackpadEdge);

    const speakerGeometry = new THREE.CircleGeometry(0.018, 8);
    const speakerMaterial = new THREE.MeshBasicMaterial({ color: 0x050607, side: THREE.DoubleSide });
    const speakers = new THREE.InstancedMesh(speakerGeometry, speakerMaterial, 72);
    const speakerMatrix = new THREE.Matrix4();
    const speakerQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
    const speakerScale = new THREE.Vector3(1, 1, 1);
    let speakerIndex = 0;
    [-2.72, 2.72].forEach((x) => {
      for (let row = 0; row < 6; row += 1) {
        for (let column = 0; column < 6; column += 1) {
          speakerMatrix.compose(new THREE.Vector3(x + (column - 2.5) * 0.065, -0.352, -1.22 + row * 0.17), speakerQuaternion, speakerScale);
          speakers.setMatrixAt(speakerIndex, speakerMatrix);
          speakerIndex += 1;
        }
      }
    });
    laptop.add(speakers);

    const portMaterial = new THREE.MeshBasicMaterial({ color: 0x020303 });
    const addPort = (x: number, z: number, width: number) => {
      const port = new THREE.Mesh(new RoundedBoxGeometry(0.025, 0.055, width, 4, 0.018), portMaterial);
      port.position.set(x, -0.535, z);
      laptop.add(port);
    };
    addPort(-3.202, -0.68, 0.36);
    addPort(-3.202, -0.14, 0.24);
    addPort(3.202, -0.76, 0.28);

    const openingNotch = new THREE.Mesh(new RoundedBoxGeometry(0.82, 0.018, 0.05, 5, 0.018), darkMetal);
    openingNotch.position.set(0, -0.425, 2.015);
    laptop.add(openingNotch);

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
    const lidShell = new THREE.Mesh(new RoundedBoxGeometry(6.34, 3.82, 0.18, 10, 0.17), metal);
    lidShell.position.y = 1.91;
    lidShell.castShadow = true;
    lid.add(lidShell);
    const lidInset = new THREE.Mesh(new RoundedBoxGeometry(6.17, 3.65, 0.055, 10, 0.14), darkMetal);
    lidInset.position.set(0, 1.91, 0.105);
    lid.add(lidInset);
    const bezel = new THREE.Mesh(new RoundedBoxGeometry(6.04, 3.51, 0.055, 10, 0.12), black);
    bezel.position.set(0, 1.91, 0.105);
    lid.add(bezel);

    const screenTexture = makeScreenTexture(renderer);
    const screenMaterial = new THREE.MeshBasicMaterial({ map: screenTexture, color: 0xffffff, toneMapped: false, transparent: true, opacity: 0.035 });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(5.78, 3.25), screenMaterial);
    screen.position.set(0, 1.91, 0.142);
    lid.add(screen);
    const screenGlow = new THREE.Mesh(new THREE.PlaneGeometry(6.05, 3.5), new THREE.MeshBasicMaterial({ color: 0xbaff12, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    screenGlow.position.set(0, 1.91, 0.15);
    lid.add(screenGlow);
    const screenGlass = new THREE.Mesh(new THREE.PlaneGeometry(5.8, 3.27), new THREE.MeshBasicMaterial({ color: 0xbfff8a, transparent: true, opacity: 0.035, blending: THREE.AdditiveBlending, depthWrite: false }));
    screenGlass.position.set(0, 1.91, 0.154);
    lid.add(screenGlass);
    const cameraDot = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 12), new THREE.MeshBasicMaterial({ color: 0x151718 }));
    cameraDot.position.set(0, 3.69, 0.152);
    lid.add(cameraDot);

    const cubeKinds = ["curve", "sliders", "wave"] as const;
    const cubeAccents = [0xc8ff19, 0xb7f50f, 0xddff71];
    const cubes = cubeKinds.map((kind, index) => {
      const group = makeGlassObject(kind, cubeAccents[index]);
      group.scale.setScalar(0.001);
      scene.add(group);
      return group;
    });

    const ribbonMaterial = new THREE.MeshBasicMaterial({ color: 0xc8ff19, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    const ribbons: THREE.Mesh[] = [];
    for (let index = 0; index < 3; index += 1) {
      const ribbonPath = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.15, -1.14 - index * 0.09, -0.9 + index * 0.14),
        new THREE.Vector3(2.15, -1.02 + index * 0.08, 0.15),
        new THREE.Vector3(3.85, -0.58 + index * 0.11, 0.48),
        new THREE.Vector3(6.25, 0.18 + index * 0.28, -0.35),
      ]);
      const ribbon = new THREE.Mesh(new THREE.TubeGeometry(ribbonPath, 96, 0.009 + index * 0.003, 6, false), ribbonMaterial.clone());
      scene.add(ribbon);
      ribbons.push(ribbon);
    }

    const particlesGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(210 * 3);
    for (let index = 0; index < 210; index += 1) {
      const seed = index * 9.73;
      particlePositions[index * 3] = 0.4 + Math.abs(Math.sin(seed * 1.7)) * 5.7;
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
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(height, 1);
      camera.fov = width < 760 ? 52 : 39;
      camera.updateProjectionMatrix();
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);

    // Start only after the site is ready and the brand loader has fully cleared.
    let sequenceStart = reduceMotion ? performance.now() - 7600 : 0;
    let frame = 0;
    let stopped = false;
    let portalTriggered = false;
    let revealTriggered = false;
    const render = (now: number) => {
      if (stopped) return;
      if (!sequenceStart && host.closest(".site")?.classList.contains("isReady")) sequenceStart = now + 680;
      const time = sequenceStart ? (now - sequenceStart) / 1000 : -1;
      const isMobile = host.clientWidth < 760;
      const applePull = easeInOut((time - 0.04) / 0.92);
      const portal = easeInOut((time - 1.3) / 0.64);
      const reframe = easeInOut((time - 1.6) / 1.62);
      const opening = easeInOut((time - 1.54) / 1.72);
      const reveal = easeOut((time - 2.86) / 1.18);
      const floatTime = Math.max(0, time - 3.9);

      if (!portalTriggered && time > 1.28) {
        portalTriggered = true;
        host.classList.add("isPortal");
      }
      if (!revealTriggered && time > 3.86) {
        revealTriggered = true;
        host.classList.add("isRevealed");
      }

      pointer.lerp(pointerTarget, 0.045);
      laptop.position.set(
        THREE.MathUtils.lerp(0, isMobile ? 0 : 1.68, reframe),
        THREE.MathUtils.lerp(isMobile ? -0.72 : -0.34, isMobile ? -1.55 : -0.86, reframe),
        THREE.MathUtils.lerp(0.05, 0, reframe),
      );
      const laptopScale = THREE.MathUtils.lerp(isMobile ? 0.9 : 1.14, isMobile ? 0.48 : 0.66, reframe);
      laptop.scale.setScalar(laptopScale);
      laptop.rotation.y = THREE.MathUtils.lerp(0.02, -0.09, reframe) + pointer.x * 0.028 * reframe;
      laptop.rotation.x = THREE.MathUtils.lerp(-0.84, 0, reframe) + pointer.y * -0.014 * reframe;
      lid.rotation.x = THREE.MathUtils.lerp(0.72, -0.14, opening);
      const power = easeOut((time - 1.62) / 0.82);
      screenMaterial.opacity = 0.035 + power * 0.965;
      screenGlow.material.opacity = Math.sin(portal * Math.PI) * 0.82 + power * 0.075;
      key.intensity = THREE.MathUtils.lerp(7.2, 4.6, reframe);
      rim.intensity = THREE.MathUtils.lerp(6.8, 3.4, reframe);
      hemisphere.intensity = THREE.MathUtils.lerp(0.28, 0.68, reframe);
      limeLight.intensity = Math.sin(portal * Math.PI) * 122 + power * 28;
      purpleLight.intensity = reveal * 9;
      metal.color.lerpColors(introMetalColor, finalMetalColor, reframe);
      edgeMetal.color.lerpColors(introEdgeColor, finalEdgeColor, reframe);
      floor.material.opacity = 0.08 + reframe * 0.2;

      const desktopTargets = [
        new THREE.Vector3(4.12, 2.56, 0.24),
        new THREE.Vector3(4.12, 1.28, 0.56),
        new THREE.Vector3(4.12, -0.02, 0.92),
      ];
      const mobileTargets = [
        new THREE.Vector3(-1.25, -0.12, 1.1),
        new THREE.Vector3(1.25, -0.05, 0.72),
        new THREE.Vector3(0, -1.38, 1.5),
      ];
      const targets = isMobile ? mobileTargets : desktopTargets;
      const origin = new THREE.Vector3(isMobile ? 0 : 2.05, isMobile ? -0.18 : 0.52, 0.05);
      cubes.forEach((cube, index) => {
        const delayedReveal = easeOut((time - 3.5 - index * 0.16) / 1.28);
        cube.position.lerpVectors(origin, targets[index], delayedReveal);
        const scale = delayedReveal * (isMobile ? 0.64 : 0.78);
        cube.scale.setScalar(scale);
        cube.rotation.x = 0.08 + Math.sin(floatTime * 0.46) * 0.018 + pointer.y * 0.05;
        cube.rotation.y = -0.18 + Math.sin(floatTime * 0.36) * 0.022 + pointer.x * 0.06;
        cube.rotation.z = (index - 1) * 0.045;
        cube.position.y += Math.sin(floatTime * 0.58) * 0.035 * reveal;
      });

      const cameraStart = isMobile ? new THREE.Vector3(4.5, 0.08, 1.18) : new THREE.Vector3(5.05, 0.02, 1.05);
      const cameraV = isMobile ? new THREE.Vector3(12.4, 0.62, 2.02) : new THREE.Vector3(16.4, 0.82, 2.38);
      const cameraFinal = new THREE.Vector3(pointer.x * 0.2 * reframe, 1.7 - pointer.y * 0.1 * reframe, isMobile ? 9.15 : 9.5);
      const introCamera = cameraStart.clone().lerp(cameraV, applePull);
      camera.position.copy(introCamera.lerp(cameraFinal, reframe));
      const introLook = new THREE.Vector3(0, -0.22, -0.52);
      const vLook = new THREE.Vector3(0, -0.6, -0.2);
      const finalLook = new THREE.Vector3(isMobile ? 0 : 0.82, isMobile ? -0.12 : 0.3, 0);
      const currentLook = introLook.lerp(vLook, applePull).lerp(finalLook, reframe);
      camera.lookAt(currentLook);
      const introFov = THREE.MathUtils.lerp(isMobile ? 31 : 27, isMobile ? 39 : 34, applePull);
      camera.fov = THREE.MathUtils.lerp(introFov, isMobile ? 52 : 39, reframe);
      camera.updateProjectionMatrix();
      ribbons.forEach((ribbon, index) => {
        (ribbon.material as THREE.MeshBasicMaterial).opacity = reveal * (0.18 - index * 0.035);
      });
      (particles.material as THREE.PointsMaterial).opacity = 0.035 + reveal * 0.46;
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
      <div className="cinematicPortalFlash" />
      <div className="cinematicBadge"><i /> REALTIME PHYSICAL GLASS</div>
    </div>
  );
}
