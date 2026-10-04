import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { SoundEngine } from './AudioEngine';
import { RotateCcw, Sparkles, QrCode } from 'lucide-react';

interface ThreeHeroCoreProps {
  onExploreEvents: () => void;
  onOpenPass: () => void;
}

type ColorTheme = 'hyperdrive' | 'nebula' | 'electric' | 'cyberpunk';

const THEME_PALETTES = {
  hyperdrive: {
    name: 'Electric Blue & Neon Pink',
    primary: 0x00f0ff,
    secondary: 0xec4899,
    ambient: 0x0d0722,
    core: 0x7c3aed,
    lightA: 0x00f0ff,
    lightB: 0xec4899
  },
  nebula: {
    name: 'Royal Purple & Hot Pink',
    primary: 0xa855f7,
    secondary: 0xff2e93,
    ambient: 0x160728,
    core: 0x9333ea,
    lightA: 0x8b5cf6,
    lightB: 0xf43f5e
  },
  electric: {
    name: 'Electric Blue & Violet',
    primary: 0x00f0ff,
    secondary: 0x8b5cf6,
    ambient: 0x060318,
    core: 0x6366f1,
    lightA: 0x38bdf8,
    lightB: 0xc084fc
  },
  cyberpunk: {
    name: 'Magenta Pink & Cyan Blue',
    primary: 0xec4899,
    secondary: 0x00f0ff,
    ambient: 0x180524,
    core: 0xd946ef,
    lightA: 0xff2e93,
    lightB: 0x00f0ff
  }
};

export const ThreeHeroCore: React.FC<ThreeHeroCoreProps> = ({ onExploreEvents, onOpenPass }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeTheme, setActiveTheme] = useState<ColorTheme>('hyperdrive');
  const [isInteracting, setIsInteracting] = useState(false);

  // References to 3D objects for dynamic theme updating
  const sceneRef = useRef<THREE.Scene | null>(null);
  const coreMeshRef = useRef<THREE.Mesh | null>(null);
  const wireMeshRef = useRef<THREE.Mesh | null>(null);
  const ring1Ref = useRef<THREE.Mesh | null>(null);
  const ring2Ref = useRef<THREE.Mesh | null>(null);
  const ring3Ref = useRef<THREE.Mesh | null>(null);
  const lightARef = useRef<THREE.PointLight | null>(null);
  const lightBRef = useRef<THREE.PointLight | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Scene & Camera setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 7.5;

    // 2. Renderer setup
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    container.replaceChildren(renderer.domElement);

    const palette = THEME_PALETTES[activeTheme];

    // 3. Central Holographic Core
    const coreGroup = new THREE.Group();
    scene.add(coreGroup);

    // Inner glowing crystal
    const coreGeo = new THREE.IcosahedronGeometry(1.4, 0);
    const coreMat = new THREE.MeshPhysicalMaterial({
      color: palette.core,
      emissive: palette.primary,
      emissiveIntensity: 0.35,
      roughness: 0.1,
      metalness: 0.9,
      wireframe: false,
      transparent: true,
      opacity: 0.85
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreGroup.add(coreMesh);
    coreMeshRef.current = coreMesh;

    // Outer wireframe cage
    const wireGeo = new THREE.IcosahedronGeometry(1.85, 1);
    const wireMat = new THREE.MeshBasicMaterial({
      color: palette.primary,
      wireframe: true,
      transparent: true,
      opacity: 0.45
    });
    const wireMesh = new THREE.Mesh(wireGeo, wireMat);
    coreGroup.add(wireMesh);
    wireMeshRef.current = wireMesh;

    // Orbiting Ring 1 (Horizontal tilt)
    const ringGeo1 = new THREE.TorusGeometry(2.4, 0.025, 16, 100);
    const ringMat1 = new THREE.MeshStandardMaterial({
      color: palette.primary,
      emissive: palette.primary,
      emissiveIntensity: 0.4,
      metalness: 0.8,
      roughness: 0.2
    });
    const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
    ring1.rotation.x = Math.PI / 2.8;
    coreGroup.add(ring1);
    ring1Ref.current = ring1;

    // Orbiting Ring 2 (Vertical tilt)
    const ringGeo2 = new THREE.TorusGeometry(2.8, 0.02, 16, 100);
    const ringMat2 = new THREE.MeshStandardMaterial({
      color: palette.secondary,
      emissive: palette.secondary,
      emissiveIntensity: 0.5,
      metalness: 0.9,
      roughness: 0.2
    });
    const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
    ring2.rotation.y = Math.PI / 3.2;
    ring2.rotation.z = Math.PI / 6;
    coreGroup.add(ring2);
    ring2Ref.current = ring2;

    // Orbiting Ring 3 (Outer angled)
    const ringGeo3 = new THREE.TorusGeometry(3.3, 0.015, 16, 120);
    const ringMat3 = new THREE.MeshStandardMaterial({
      color: palette.primary,
      emissive: palette.primary,
      emissiveIntensity: 0.25,
      wireframe: true
    });
    const ring3 = new THREE.Mesh(ringGeo3, ringMat3);
    ring3.rotation.x = -Math.PI / 4;
    coreGroup.add(ring3);
    ring3Ref.current = ring3;

    // Floating satellite prisms (representing engineering departments)
    const satelliteGroup = new THREE.Group();
    coreGroup.add(satelliteGroup);

    const satellites: THREE.Mesh[] = [];
    const satCount = 6;
    for (let i = 0; i < satCount; i++) {
      const satGeo = new THREE.OctahedronGeometry(0.18, 0);
      const satMat = new THREE.MeshStandardMaterial({
        color: i % 2 === 0 ? palette.primary : palette.secondary,
        emissive: i % 2 === 0 ? palette.primary : palette.secondary,
        emissiveIntensity: 0.6,
        roughness: 0.3,
        metalness: 0.8
      });
      const sat = new THREE.Mesh(satGeo, satMat);
      const angle = (i / satCount) * Math.PI * 2;
      sat.position.set(Math.cos(angle) * 3.1, (Math.sin(angle) * 0.8), Math.sin(angle) * 3.1);
      satelliteGroup.add(sat);
      satellites.push(sat);
    }

    // 4. Stardust Particle Cloud
    const particleCount = 750;
    const posArray = new Float32Array(particleCount * 3);
    const scaleArray = new Float32Array(particleCount);

    for (let i = 0; i < particleCount * 3; i += 3) {
      posArray[i] = (Math.random() - 0.5) * 14;
      posArray[i + 1] = (Math.random() - 0.5) * 14;
      posArray[i + 2] = (Math.random() - 0.5) * 14;
      scaleArray[i / 3] = Math.random();
    }

    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    particleGeo.setAttribute('scale', new THREE.BufferAttribute(scaleArray, 1));

    const particleMat = new THREE.PointsMaterial({
      size: 0.035,
      color: palette.primary,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);
    particlesRef.current = particles;

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const lightA = new THREE.PointLight(palette.lightA, 3.5, 20);
    lightA.position.set(4, 4, 4);
    scene.add(lightA);
    lightARef.current = lightA;

    const lightB = new THREE.PointLight(palette.lightB, 3.5, 20);
    lightB.position.set(-4, -3, -2);
    scene.add(lightB);
    lightBRef.current = lightB;

    // 6. Interaction & Parallax handling
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let manualRotX = 0;
    let manualRotY = 0;

    const onPointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

      if (isDragging) {
        const deltaX = e.clientX - prevMouseX;
        const deltaY = e.clientY - prevMouseY;
        manualRotY += deltaX * 0.008;
        manualRotX += deltaY * 0.008;
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;
      } else {
        targetX = x * 0.4;
        targetY = y * 0.4;
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      setIsInteracting(true);
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
      SoundEngine.playClick();
    };

    const onPointerUp = () => {
      isDragging = false;
      setIsInteracting(false);
    };

    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);

    // 7. Resize Observer for fluid responsiveness
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width === 0 || height === 0) return;
        camera.aspect = width / height;
        // Adjust camera distance based on screen width
        if (width < 640) {
          camera.position.z = 8.8;
        } else if (width < 1024) {
          camera.position.z = 7.8;
        } else {
          camera.position.z = 7.2;
        }
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      }
    });
    resizeObserver.observe(container);

    // 8. Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Smooth interpolation for mouse parallax
      mouseX += (targetX - mouseX) * 0.05;
      mouseY += (targetY - mouseY) * 0.05;

      // Base auto rotation + user tilt
      coreGroup.rotation.y = elapsedTime * 0.35 + manualRotY + mouseX;
      coreGroup.rotation.x = Math.sin(elapsedTime * 0.25) * 0.15 + manualRotX + mouseY;

      // Spin rings with independent gyroscopic dynamics
      ring1.rotation.z = elapsedTime * 0.4;
      ring2.rotation.x = elapsedTime * -0.5;
      ring3.rotation.y = elapsedTime * 0.3;

      // Wireframe pulse
      const scalePulse = 1 + Math.sin(elapsedTime * 2) * 0.04;
      wireMesh.scale.set(scalePulse, scalePulse, scalePulse);

      // Rotate satellites in orbit
      satelliteGroup.rotation.y = -elapsedTime * 0.6;
      satellites.forEach((sat, i) => {
        sat.rotation.x += 0.02;
        sat.rotation.y += 0.03;
        // Bob up and down
        sat.position.y = Math.sin(elapsedTime * 2 + i) * 0.4;
      });

      // Orbit point lights
      lightA.position.x = Math.cos(elapsedTime * 0.8) * 5;
      lightA.position.z = Math.sin(elapsedTime * 0.8) * 5;

      lightB.position.x = Math.cos(elapsedTime * 0.8 + Math.PI) * 5;
      lightB.position.z = Math.sin(elapsedTime * 0.8 + Math.PI) * 5;

      // Gently drift particle cloud
      particles.rotation.y = elapsedTime * 0.04;
      particles.rotation.x = Math.sin(elapsedTime * 0.02) * 0.05;

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      resizeObserver.disconnect();
      renderer.dispose();
      coreGeo.dispose();
      wireGeo.dispose();
      ringGeo1.dispose();
      ringGeo2.dispose();
      ringGeo3.dispose();
      particleGeo.dispose();
    };
  }, []);

  // Update 3D materials when theme changes
  useEffect(() => {
    const palette = THEME_PALETTES[activeTheme];
    if (coreMeshRef.current) {
      const mat = coreMeshRef.current.material as THREE.MeshPhysicalMaterial;
      mat.color.setHex(palette.core);
      mat.emissive.setHex(palette.primary);
    }
    if (wireMeshRef.current) {
      const mat = wireMeshRef.current.material as THREE.MeshBasicMaterial;
      mat.color.setHex(palette.primary);
    }
    if (ring1Ref.current) {
      const mat = ring1Ref.current.material as THREE.MeshStandardMaterial;
      mat.color.setHex(palette.primary);
      mat.emissive.setHex(palette.primary);
    }
    if (ring2Ref.current) {
      const mat = ring2Ref.current.material as THREE.MeshStandardMaterial;
      mat.color.setHex(palette.secondary);
      mat.emissive.setHex(palette.secondary);
    }
    if (ring3Ref.current) {
      const mat = ring3Ref.current.material as THREE.MeshStandardMaterial;
      mat.color.setHex(palette.primary);
      mat.emissive.setHex(palette.primary);
    }
    if (lightARef.current) {
      lightARef.current.color.setHex(palette.lightA);
    }
    if (lightBRef.current) {
      lightBRef.current.color.setHex(palette.lightB);
    }
    if (particlesRef.current) {
      const mat = particlesRef.current.material as THREE.PointsMaterial;
      mat.color.setHex(palette.primary);
    }
  }, [activeTheme]);

  const handleThemeChange = (theme: ColorTheme) => {
    setActiveTheme(theme);
    SoundEngine.playWarp();
  };

  return (
    <section id="hero-section" className="relative min-h-[95vh] flex flex-col items-center justify-center overflow-hidden pt-24 pb-16">
      {/* Dynamic 3D WebGL Canvas filling the hero backdrop */}
      <div
        id="three-canvas-container"
        ref={containerRef}
        className="absolute inset-0 z-0 cursor-grab active:cursor-grabbing touch-none select-none"
        title="Click and drag to rotate the Lakshya Core"
      />

      {/* Cyber Grid & Vignette background overlays */}
      <div className="absolute inset-0 bg-cyber-grid opacity-20 pointer-events-none z-1" />
      <div className="absolute inset-0 bg-radial-vignette opacity-75 pointer-events-none z-1" />

      {/* Content placed directly ON the 3D Canvas with increased size */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 text-center pointer-events-none flex flex-col items-center justify-center">
        {/* Edition Badge */}
        <div className="mb-3 pointer-events-auto">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs sm:text-sm md:text-base font-mono font-bold uppercase tracking-widest bg-pink-500/25 text-pink-300 border border-pink-400/60 backdrop-blur-md shadow-xl shadow-pink-500/25">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            2026 EDITION
          </span>
        </div>

        {/* LAKSHYA Title (Increased Size) */}
        <div className="relative mb-3">
          <h1
            id="hero-lakshya-title"
            className="text-6xl sm:text-8xl md:text-9xl lg:text-[10rem] font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-pink-100 to-purple-300 drop-shadow-[0_15px_45px_rgba(168,85,247,0.65)] select-none leading-none"
          >
            LAKSHYA
          </h1>
        </div>

        {/* National Level Technical & Cultural Symposium (Increased Size) */}
        <p className="font-tech text-2xl sm:text-3xl md:text-4xl lg:text-5xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-pink-200 to-purple-300 font-extrabold uppercase drop-shadow-[0_4px_25px_rgba(0,240,255,0.4)] mb-4 max-w-4xl mx-auto select-none">
          National Level Technical & Cultural Symposium
        </p>

        {/* 18 demo events across 10 departments, autonomous robotic arenas, ₹5,00,000+ prize vault, and grand starlight DJ night. */}
        <p className="text-base sm:text-xl md:text-2xl text-slate-200 max-w-4xl mx-auto font-medium leading-relaxed drop-shadow-[0_2px_12px_rgba(0,0,0,0.85)] mb-8 select-none">
          18 featured events across 10 departments, autonomous robotic arenas, ₹5,00,000+ prize vault, and grand valedictory.
        </p>

        {/* Rotation Hint Indicator */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-950/85 border border-purple-900/70 backdrop-blur-md shadow-lg text-xs sm:text-sm font-mono text-slate-300 hover:border-cyan-400/60 transition-colors pointer-events-auto mb-8">
          <RotateCcw className={`w-4 h-4 ${isInteracting ? 'text-pink-400 animate-spin' : 'text-cyan-400'}`} />
          <span>{isInteracting ? 'Rotating 3D Core...' : 'Drag Canvas to Rotate 3D Core'}</span>
        </div>

        {/* Action Buttons (Explore Arenas + Generate Pass) */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto pointer-events-auto mb-8">
          {/* Explore Arenas Button */}
          <button
            id="hero-btn-explore-events"
            onClick={() => {
              SoundEngine.playClick();
              onExploreEvents();
            }}
            onMouseEnter={() => SoundEngine.playHover()}
            className="group relative w-full sm:w-64 px-7 py-4 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-500 text-white font-tech text-base sm:text-lg font-bold tracking-wider uppercase shadow-2xl shadow-pink-600/30 transition-all duration-300 hover:shadow-cyan-400/40 hover:scale-105 active:scale-95 flex items-center justify-center gap-2.5 border border-pink-400/50 cursor-pointer"
          >
            <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform text-cyan-200" />
            <span>Explore Arenas</span>
          </button>

          {/* Generate Pass Button */}
          <button
            id="hero-btn-get-pass"
            onClick={() => {
              SoundEngine.playWarp();
              onOpenPass();
            }}
            onMouseEnter={() => SoundEngine.playHover()}
            className="w-full sm:w-64 px-7 py-4 rounded-xl bg-slate-900/90 text-slate-100 font-tech text-base sm:text-lg font-bold tracking-wider uppercase border border-purple-500/50 backdrop-blur-md transition-all duration-300 hover:border-cyan-400 hover:text-cyan-300 hover:bg-slate-800/90 hover:scale-105 active:scale-95 shadow-2xl flex items-center justify-center gap-2 cursor-pointer"
          >
            <QrCode className="w-5 h-5 text-pink-400" />
            <span>Generate Pass</span>
          </button>
        </div>

        {/* Symposium Key Highlights Strip */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 pointer-events-auto">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-950/80 border border-cyan-500/30 backdrop-blur-md shadow-md">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            <span className="text-xs sm:text-sm font-mono text-slate-400">Prize Vault:</span>
            <span className="font-tech text-sm sm:text-base font-bold text-white">₹5,00,000+</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-950/80 border border-pink-500/30 backdrop-blur-md shadow-md">
            <span className="w-2.5 h-2.5 rounded-full bg-pink-400" />
            <span className="text-xs sm:text-sm font-mono text-slate-400">Delegates:</span>
            <span className="font-tech text-sm sm:text-base font-bold text-white">12,000+</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-950/80 border border-purple-500/30 backdrop-blur-md shadow-md">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
            <span className="text-xs sm:text-sm font-mono text-slate-400">Branches:</span>
            <span className="font-tech text-sm sm:text-base font-bold text-white">9 Departments</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-950/80 border border-emerald-500/30 backdrop-blur-md shadow-md">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="text-xs sm:text-sm font-mono text-slate-400">Duration:</span>
            <span className="font-tech text-sm sm:text-base font-bold text-emerald-300">1-Day Fest</span>
          </div>
        </div>
      </div>
    </section>
  );
};
