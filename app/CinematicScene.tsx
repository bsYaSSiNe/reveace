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
  canvas.width = 1920;
  canvas.height = 1080;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.scale(1.5, 1.5);

  const roundRect = (x: number, y: number, width: number, height: number, radius: number) => {
    const r = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + width, y, x + width, y + height, r);
    context.arcTo(x + width, y + height, x, y + height, r);
    context.arcTo(x, y + height, x, y, r);
    context.arcTo(x, y, x + width, y, r);
    context.closePath();
  };

  const background = context.createRadialGradient(965, 250, 0, 965, 250, 760);
  background.addColorStop(0, "#1b2a05");
  background.addColorStop(0.34, "#0a0f05");
  background.addColorStop(1, "#020303");
  context.fillStyle = background;
  context.fillRect(0, 0, 1280, 720);

  const horizon = context.createLinearGradient(0, 0, 1280, 720);
  horizon.addColorStop(0, "rgba(200,255,25,.08)");
  horizon.addColorStop(0.5, "rgba(200,255,25,0)");
  horizon.addColorStop(1, "rgba(142,92,255,.09)");
  context.fillStyle = horizon;
  context.fillRect(0, 0, 1280, 720);

  roundRect(42, 32, 1196, 64, 18);
  context.fillStyle = "rgba(255,255,255,.045)";
  context.fill();
  context.strokeStyle = "rgba(255,255,255,.12)";
  context.lineWidth = 1;
  context.stroke();

  context.fillStyle = "#f6f7f3";
  context.font = "900 27px Arial, sans-serif";
  context.letterSpacing = "-1px";
  context.fillText("REVEACE", 70, 74);
  context.fillStyle = "#c8ff19";
  context.fillText(".", 193, 74);
  context.fillStyle = "rgba(255,255,255,.55)";
  context.font = "700 13px Arial, sans-serif";
  context.letterSpacing = "2px";
  context.fillText("SHOP", 710, 72);
  context.fillText("TOOLS", 792, 72);
  context.fillText("JOURNAL", 880, 72);
  roundRect(1015, 47, 198, 35, 18);
  context.fillStyle = "rgba(200,255,25,.12)";
  context.fill();
  context.strokeStyle = "rgba(200,255,25,.42)";
  context.stroke();
  context.fillStyle = "#dfff7b";
  context.font = "800 11px Arial, sans-serif";
  context.letterSpacing = "1.5px";
  context.fillText("DAVINCI RESOLVE", 1040, 69);

  context.fillStyle = "#c8ff19";
  context.font = "800 13px Arial, sans-serif";
  context.letterSpacing = "3px";
  context.fillText("REVEACE / CREATOR STORE", 64, 156);
  context.fillStyle = "#ffffff";
  context.font = "900 76px Arial, sans-serif";
  context.letterSpacing = "-4px";
  context.fillText("THE DAVINCI", 60, 235);
  context.fillText("MOTION SHOP.", 60, 307);
  context.fillStyle = "rgba(255,255,255,.56)";
  context.font = "500 18px Arial, sans-serif";
  context.letterSpacing = "0px";
  context.fillText("High-end Fusion tools for creators who refuse friction.", 64, 350);
  roundRect(64, 383, 236, 48, 24);
  context.fillStyle = "#c8ff19";
  context.fill();
  context.fillStyle = "#071000";
  context.font = "900 13px Arial, sans-serif";
  context.letterSpacing = ".5px";
  context.fillText("VIEW THE COLLECTION  →", 84, 413);

  roundRect(755, 126, 468, 304, 28);
  context.fillStyle = "rgba(6,9,5,.7)";
  context.fill();
  context.strokeStyle = "rgba(210,255,107,.3)";
  context.lineWidth = 1.5;
  context.stroke();
  const cardGlow = context.createRadialGradient(1020, 250, 0, 1020, 250, 235);
  cardGlow.addColorStop(0, "rgba(200,255,25,.15)");
  cardGlow.addColorStop(1, "rgba(200,255,25,0)");
  context.fillStyle = cardGlow;
  context.fill();
  context.fillStyle = "rgba(255,255,255,.45)";
  context.font = "800 11px Arial, sans-serif";
  context.letterSpacing = "2.4px";
  context.fillText("FEATURED TOOL / 01", 786, 160);
  context.strokeStyle = "#c8ff19";
  context.shadowColor = "#c8ff19";
  context.shadowBlur = 16;
  context.lineWidth = 7;
  context.lineCap = "round";
  context.beginPath();
  context.moveTo(810, 292);
  context.bezierCurveTo(865, 320, 905, 195, 1008, 222);
  context.stroke();
  [810, 905, 1008].forEach((x, index) => {
    context.beginPath();
    context.fillStyle = "#c8ff19";
    context.arc(x, index === 0 ? 292 : index === 1 ? 253 : 222, 9, 0, Math.PI * 2);
    context.fill();
  });
  context.shadowBlur = 0;
  context.fillStyle = "#fff";
  context.font = "900 36px Arial, sans-serif";
  context.letterSpacing = "-1px";
  context.fillText("SPLINE PRO", 786, 373);
  context.fillStyle = "rgba(255,255,255,.42)";
  context.font = "700 12px Arial, sans-serif";
  context.letterSpacing = "2px";
  context.fillText("CURVE SYSTEM / COMING SOON", 788, 400);

  const cards = [
    { x: 42, number: "01", name: "SPLINE PRO", type: "CURVES", accent: "#c8ff19" },
    { x: 447, number: "02", name: "TAPER LINES", type: "STROKES", accent: "#b7f50f" },
    { x: 852, number: "03", name: "FLOW DECK", type: "MOTION", accent: "#a98aff" },
  ];
  cards.forEach((card, index) => {
    roundRect(card.x, 486, 386, 218, 24);
    context.fillStyle = index === 2 ? "rgba(18,13,31,.62)" : "rgba(255,255,255,.035)";
    context.fill();
    context.strokeStyle = index === 2 ? "rgba(169,138,255,.3)" : "rgba(255,255,255,.12)";
    context.stroke();
    context.fillStyle = "rgba(255,255,255,.38)";
    context.font = "800 11px Arial, sans-serif";
    context.letterSpacing = "2px";
    context.fillText(`${card.number} / ${card.type}`, card.x + 24, 520);
    context.fillStyle = card.accent;
    context.font = "900 28px Arial, sans-serif";
    context.letterSpacing = "-1px";
    context.fillText(card.name, card.x + 24, 666);
    context.strokeStyle = card.accent;
    context.fillStyle = card.accent;
    context.shadowColor = card.accent;
    context.shadowBlur = 11;
    if (index === 0) {
      context.lineWidth = 4;
      context.beginPath();
      context.moveTo(card.x + 40, 605);
      context.bezierCurveTo(card.x + 104, 628, card.x + 128, 548, card.x + 220, 568);
      context.stroke();
    } else if (index === 1) {
      [0, 1, 2, 3].forEach((line) => {
        context.fillRect(card.x + 42, 555 + line * 20, 180 - line * 18, 5);
        context.beginPath();
        context.arc(card.x + 95 + line * 28, 557.5 + line * 20, 8, 0, Math.PI * 2);
        context.fill();
      });
    } else {
      [34, 58, 88, 112, 82, 54, 30].forEach((height, bar) => {
        roundRect(card.x + 44 + bar * 28, 580 - height / 2, 11, height, 5);
        context.fill();
      });
    }
    context.shadowBlur = 0;
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

export default function CinematicScene() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance", stencil: false });
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
    scene.environmentIntensity = 1.18;

    const hemisphere = new THREE.HemisphereLight(0xf1f5e9, 0x010202, 0.68);
    scene.add(hemisphere);
    const introKeyColor = new THREE.Color(0xffffff);
    const finalKeyColor = new THREE.Color(0xf4ffe0);
    const introRimColor = new THREE.Color(0xaec7ff);
    const finalRimColor = new THREE.Color(0xc8ff19);
    const introFogColor = new THREE.Color(0x000000);
    const finalFogColor = new THREE.Color(0x020303);
    const key = new THREE.DirectionalLight(0xffffff, 4.6);
    key.position.set(-4.5, 7.5, 5.2);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 22;
    key.shadow.bias = -0.00035;
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
    const studioPanel = new THREE.RectAreaLight(0xffffff, 7.5, 5.8, 3.2);
    studioPanel.position.set(-4.6, 5.5, 5.8);
    studioPanel.lookAt(0, -0.2, 0);
    scene.add(studioPanel);
    const edgeStrip = new THREE.RectAreaLight(0xbfd4ff, 10, 1.1, 6.8);
    edgeStrip.position.set(5.4, 2.4, 3.4);
    edgeStrip.lookAt(0.6, 0.2, -0.4);
    scene.add(edgeStrip);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(32, 22),
      new THREE.MeshPhysicalMaterial({ color: 0x020303, roughness: 0.48, metalness: 0.58, clearcoat: 0.32, clearcoatRoughness: 0.24, transparent: true, opacity: 0.42 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.43;
    floor.receiveShadow = true;
    scene.add(floor);
    const shadowCanvas = document.createElement("canvas");
    shadowCanvas.width = 512;
    shadowCanvas.height = 256;
    const shadowContext = shadowCanvas.getContext("2d");
    if (shadowContext) {
      const shadowGradient = shadowContext.createRadialGradient(256, 128, 8, 256, 128, 238);
      shadowGradient.addColorStop(0, "rgba(0,0,0,.82)");
      shadowGradient.addColorStop(0.5, "rgba(0,0,0,.42)");
      shadowGradient.addColorStop(1, "rgba(0,0,0,0)");
      shadowContext.fillStyle = shadowGradient;
      shadowContext.fillRect(0, 0, 512, 256);
    }
    const contactShadowTexture = new THREE.CanvasTexture(shadowCanvas);
    const contactShadowMaterial = new THREE.MeshBasicMaterial({ map: contactShadowTexture, transparent: true, opacity: 0.12, depthWrite: false });
    const contactShadow = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 4.8), contactShadowMaterial);
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.set(0, -1.414, 0.2);
    scene.add(contactShadow);

    const laptop = new THREE.Group();
    scene.add(laptop);
    const introMetalColor = new THREE.Color(0x898d92);
    const finalMetalColor = new THREE.Color(0x50545a);
    const introEdgeColor = new THREE.Color(0xe2e5e8);
    const finalEdgeColor = new THREE.Color(0x969ba2);
    const metal = new THREE.MeshPhysicalMaterial({ color: finalMetalColor.clone(), metalness: 1, roughness: 0.17, clearcoat: 0.46, clearcoatRoughness: 0.11, anisotropy: 0.24, anisotropyRotation: Math.PI / 2 });
    const edgeMetal = new THREE.MeshPhysicalMaterial({ color: finalEdgeColor.clone(), metalness: 1, roughness: 0.085, clearcoat: 0.68, clearcoatRoughness: 0.055, anisotropy: 0.38 });
    const deckMetal = new THREE.MeshPhysicalMaterial({ color: 0x73787e, metalness: 1, roughness: 0.19, clearcoat: 0.38, clearcoatRoughness: 0.12, anisotropy: 0.2 });
    const darkMetal = new THREE.MeshPhysicalMaterial({ color: 0x1c1f22, metalness: 0.96, roughness: 0.22, clearcoat: 0.34, clearcoatRoughness: 0.12 });
    const black = new THREE.MeshPhysicalMaterial({ color: 0x020304, metalness: 0.46, roughness: 0.24, clearcoat: 0.48, clearcoatRoughness: 0.16 });

    const base = new THREE.Mesh(new RoundedBoxGeometry(6.42, 0.2, 4.08, 12, 0.14), metal);
    base.position.y = -0.57;
    base.castShadow = true;
    base.receiveShadow = true;
    laptop.add(base);
    const upperDeck = new THREE.Mesh(new RoundedBoxGeometry(6.3, 0.095, 3.97, 12, 0.12), deckMetal);
    upperDeck.position.y = -0.425;
    upperDeck.castShadow = true;
    laptop.add(upperDeck);
    const baseEdge = new THREE.Mesh(new RoundedBoxGeometry(6.32, 0.028, 3.99, 12, 0.11), edgeMetal);
    baseEdge.position.y = -0.369;
    laptop.add(baseEdge);
    const frontChamfer = new THREE.Mesh(new RoundedBoxGeometry(5.92, 0.025, 0.13, 8, 0.035), edgeMetal);
    frontChamfer.position.set(0, -0.46, 1.995);
    laptop.add(frontChamfer);
    const underside = new THREE.Mesh(new RoundedBoxGeometry(6.2, 0.07, 3.88, 10, 0.12), darkMetal);
    underside.position.y = -0.685;
    laptop.add(underside);
    const footMaterial = new THREE.MeshStandardMaterial({ color: 0x101214, metalness: 0.3, roughness: 0.58 });
    [[-2.62, -1.52], [2.62, -1.52], [-2.62, 1.5], [2.62, 1.5]].forEach(([x, z]) => {
      const foot = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.035, 0.12, 4, 0.035), footMaterial);
      foot.position.set(x, -0.73, z);
      laptop.add(foot);
    });

    const keyboardBed = new THREE.Mesh(new RoundedBoxGeometry(5.3, 0.038, 1.91, 8, 0.09), darkMetal);
    keyboardBed.position.set(0, -0.335, -0.68);
    laptop.add(keyboardBed);
    const keyMaterial = new THREE.MeshPhysicalMaterial({ color: 0x010203, roughness: 0.4, metalness: 0.16, clearcoat: 0.28, clearcoatRoughness: 0.24 });
    const keyLegendMaterial = new THREE.MeshBasicMaterial({ color: 0xaeb3b4, transparent: true, opacity: 0.3, toneMapped: false });
    const addKey = (x: number, z: number, width = 0.31, legendWidth = 0.07) => {
      const key = new THREE.Mesh(new RoundedBoxGeometry(width, 0.036, 0.235, 4, 0.032), keyMaterial);
      key.position.set(x, -0.292, z);
      key.castShadow = true;
      laptop.add(key);
      const legend = new THREE.Mesh(new RoundedBoxGeometry(Math.min(legendWidth, width * 0.42), 0.004, 0.018, 2, 0.006), keyLegendMaterial);
      legend.position.set(x, -0.271, z);
      laptop.add(legend);
    };
    const keyRows = [
      { count: 14, z: -1.43, offset: 0 },
      { count: 14, z: -1.12, offset: 0 },
      { count: 13, z: -0.81, offset: 0.16 },
      { count: 13, z: -0.5, offset: 0.16 },
    ];
    keyRows.forEach(({ count, z, offset }) => {
      for (let column = 0; column < count; column += 1) addKey(-2.3 + offset + column * 0.35, z);
    });
    addKey(-2.22, -0.19, 0.48, 0.11);
    addKey(-1.78, -0.19, 0.34);
    addKey(-1.42, -0.19, 0.34);
    addKey(0, -0.19, 2.22, 0.38);
    addKey(1.42, -0.19, 0.34);
    addKey(1.78, -0.19, 0.34);
    addKey(2.22, -0.19, 0.48, 0.11);

    const trackpadGeometry = new RoundedBoxGeometry(2.62, 0.018, 1.2, 10, 0.115);
    const trackpad = new THREE.Mesh(trackpadGeometry, new THREE.MeshPhysicalMaterial({ color: 0x686d73, metalness: 0.98, roughness: 0.16, clearcoat: 0.52, clearcoatRoughness: 0.1 }));
    trackpad.position.set(0, -0.359, 1.14);
    laptop.add(trackpad);
    const trackpadEdge = new THREE.LineSegments(new THREE.EdgesGeometry(trackpadGeometry, 24), new THREE.LineBasicMaterial({ color: 0xe7ebee, transparent: true, opacity: 0.42 }));
    trackpadEdge.position.copy(trackpad.position);
    laptop.add(trackpadEdge);

    const speakerGeometry = new THREE.CircleGeometry(0.014, 8);
    const speakerMaterial = new THREE.MeshBasicMaterial({ color: 0x050607, side: THREE.DoubleSide });
    const speakers = new THREE.InstancedMesh(speakerGeometry, speakerMaterial, 168);
    const speakerMatrix = new THREE.Matrix4();
    const speakerQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
    const speakerScale = new THREE.Vector3(1, 1, 1);
    let speakerIndex = 0;
    [-2.72, 2.72].forEach((x) => {
      for (let row = 0; row < 7; row += 1) {
        for (let column = 0; column < 12; column += 1) {
          speakerMatrix.compose(new THREE.Vector3(x + (column - 5.5) * 0.043, -0.365, -1.33 + row * 0.19), speakerQuaternion, speakerScale);
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
    openingNotch.position.set(0, -0.354, 2.015);
    laptop.add(openingNotch);

    const hingeMaterial = new THREE.MeshStandardMaterial({ color: 0x161719, metalness: 0.9, roughness: 0.18 });
    [-2.35, 2.35].forEach((x) => {
      const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.95, 28), hingeMaterial);
      hinge.rotation.z = Math.PI / 2;
      hinge.position.set(x, -0.43, -1.88);
      laptop.add(hinge);
    });
    const hingeSpine = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 3.78, 32), darkMetal);
    hingeSpine.rotation.z = Math.PI / 2;
    hingeSpine.position.set(0, -0.43, -1.9);
    laptop.add(hingeSpine);
    const hingeGlowMaterial = new THREE.MeshBasicMaterial({ color: 0xc8ff19, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    const hingeGlow = new THREE.Mesh(new RoundedBoxGeometry(4.55, 0.035, 0.065, 6, 0.02), hingeGlowMaterial);
    hingeGlow.position.set(0, -0.405, -1.84);
    hingeGlow.scale.x = 0.12;
    laptop.add(hingeGlow);
    const hingeLight = new THREE.PointLight(0xc8ff19, 0, 7, 2);
    hingeLight.position.set(0, -0.22, -1.72);
    laptop.add(hingeLight);

    const lid = new THREE.Group();
    lid.position.set(0, -0.44, -1.92);
    laptop.add(lid);
    const lidShellGeometry = new RoundedBoxGeometry(6.34, 3.82, 0.145, 14, 0.165);
    const lidShell = new THREE.Mesh(lidShellGeometry, metal);
    lidShell.position.y = 1.91;
    lidShell.castShadow = true;
    lid.add(lidShell);
    const lidEdge = new THREE.LineSegments(new THREE.EdgesGeometry(lidShellGeometry, 28), new THREE.LineBasicMaterial({ color: 0xf0f3f5, transparent: true, opacity: 0.2 }));
    lidEdge.position.copy(lidShell.position);
    lidEdge.scale.setScalar(1.0015);
    lid.add(lidEdge);
    const lidInset = new THREE.Mesh(new RoundedBoxGeometry(6.18, 3.66, 0.045, 12, 0.145), darkMetal);
    lidInset.position.set(0, 1.91, 0.086);
    lid.add(lidInset);
    const bezel = new THREE.Mesh(new RoundedBoxGeometry(6.04, 3.51, 0.045, 12, 0.12), black);
    bezel.position.set(0, 1.91, 0.113);
    lid.add(bezel);
    const bezelEdge = new THREE.LineSegments(new THREE.EdgesGeometry(bezel.geometry, 26), new THREE.LineBasicMaterial({ color: 0x70777d, transparent: true, opacity: 0.16 }));
    bezelEdge.position.copy(bezel.position);
    lid.add(bezelEdge);

    const screenTexture = makeScreenTexture(renderer);
    const screenMaterial = new THREE.MeshBasicMaterial({ map: screenTexture, color: 0xffffff, toneMapped: false, transparent: true, opacity: 0.035 });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(5.78, 3.25), screenMaterial);
    screen.position.set(0, 1.91, 0.143);
    lid.add(screen);
    const screenGlow = new THREE.Mesh(new THREE.PlaneGeometry(6.05, 3.5), new THREE.MeshBasicMaterial({ color: 0xbaff12, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    screenGlow.position.set(0, 1.91, 0.15);
    lid.add(screenGlow);
    const screenGlassMaterial = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0.02, roughness: 0.055, transmission: 0.08, thickness: 0.025, ior: 1.48, clearcoat: 1, clearcoatRoughness: 0.045, transparent: true, opacity: 0.025, depthWrite: false });
    const screenGlass = new THREE.Mesh(new THREE.PlaneGeometry(5.8, 3.27), screenGlassMaterial);
    screenGlass.position.set(0, 1.91, 0.158);
    lid.add(screenGlass);
    const reflectionCanvas = document.createElement("canvas");
    reflectionCanvas.width = 768;
    reflectionCanvas.height = 512;
    const reflectionContext = reflectionCanvas.getContext("2d");
    if (reflectionContext) {
      const reflectionGradient = reflectionContext.createLinearGradient(0, 0, 768, 512);
      reflectionGradient.addColorStop(0, "rgba(255,255,255,.33)");
      reflectionGradient.addColorStop(0.22, "rgba(255,255,255,.08)");
      reflectionGradient.addColorStop(0.46, "rgba(255,255,255,0)");
      reflectionGradient.addColorStop(1, "rgba(255,255,255,0)");
      reflectionContext.fillStyle = reflectionGradient;
      reflectionContext.fillRect(0, 0, 768, 512);
    }
    const reflectionTexture = new THREE.CanvasTexture(reflectionCanvas);
    reflectionTexture.colorSpace = THREE.SRGBColorSpace;
    const screenReflection = new THREE.Mesh(new THREE.PlaneGeometry(5.76, 3.23), new THREE.MeshBasicMaterial({ map: reflectionTexture, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    screenReflection.position.set(0, 1.91, 0.162);
    lid.add(screenReflection);
    const cameraRing = new THREE.Mesh(new THREE.RingGeometry(0.022, 0.04, 24), new THREE.MeshBasicMaterial({ color: 0x303438, side: THREE.DoubleSide }));
    cameraRing.position.set(0, 3.688, 0.163);
    lid.add(cameraRing);
    const cameraDot = new THREE.Mesh(new THREE.SphereGeometry(0.021, 16, 16), new THREE.MeshBasicMaterial({ color: 0x020304 }));
    cameraDot.position.set(0, 3.688, 0.166);
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
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.25));
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
      const lightBlend = easeInOut((time - 1.24) / 1.82);
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
      const power = easeOut((time - 2.12) / 0.9);
      const portalPulse = Math.sin(portal * Math.PI);
      screenMaterial.opacity = 0.012 + power * 0.988;
      screenGlow.material.opacity = portalPulse * 0.48 + power * 0.028;
      screenGlassMaterial.opacity = 0.006 + power * 0.032;
      (screenReflection.material as THREE.MeshBasicMaterial).opacity = 0.012 + power * 0.07;
      hingeGlowMaterial.opacity = portalPulse * 0.82 + power * 0.012;
      hingeGlow.scale.x = 0.12 + easeOut(portal) * 0.88;
      hingeLight.intensity = portalPulse * 72 + power;
      key.intensity = THREE.MathUtils.lerp(7.2, 4.6, reframe);
      rim.intensity = THREE.MathUtils.lerp(6.8, 3.4, reframe);
      hemisphere.intensity = THREE.MathUtils.lerp(0.28, 0.68, reframe);
      studioPanel.intensity = THREE.MathUtils.lerp(9.2, 7.5, reframe);
      edgeStrip.intensity = THREE.MathUtils.lerp(13.5, 10, reframe);
      key.color.lerpColors(introKeyColor, finalKeyColor, lightBlend);
      rim.color.lerpColors(introRimColor, finalRimColor, lightBlend);
      scene.fog?.color.lerpColors(introFogColor, finalFogColor, lightBlend);
      renderer.toneMappingExposure = 0.92 + portalPulse * 0.14 + lightBlend * 0.16;
      limeLight.intensity = portalPulse * 94 + power * 18;
      purpleLight.intensity = reveal * 9;
      metal.color.lerpColors(introMetalColor, finalMetalColor, reframe);
      edgeMetal.color.lerpColors(introEdgeColor, finalEdgeColor, reframe);
      floor.material.opacity = 0.08 + reframe * 0.2;
      contactShadow.position.x = THREE.MathUtils.lerp(0, isMobile ? 0 : 1.68, reframe);
      contactShadow.scale.setScalar(THREE.MathUtils.lerp(0.72, isMobile ? 0.66 : 1, reframe));
      contactShadowMaterial.opacity = 0.09 + reframe * 0.27;

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
