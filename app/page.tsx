"use client";

import { useEffect, useState } from "react";
import type { ComponentType, CSSProperties, PointerEvent as ReactPointerEvent } from "react";

type Product = {
  number: string;
  name: string;
  kind: string;
  line: string;
  description: string;
  image: string;
  accent: string;
  symbol: "curve" | "sliders" | "wave";
};

const products: Product[] = [
  {
    number: "01",
    name: "Spline Pro",
    kind: "CURVE SYSTEM",
    line: "Shape better motion without fighting the graph.",
    description: "A concept tool for faster curve control, cleaner easing, and motion that feels considered from the first pass.",
    image: "https://i.ytimg.com/vi/g3Rj5ZNbvJ4/maxresdefault.jpg",
    accent: "#c8ff19",
    symbol: "curve",
  },
  {
    number: "02",
    name: "Taper Lines",
    kind: "STROKE TOOL",
    line: "Expressive lines that land exactly where you want.",
    description: "A focused line toolkit imagined for smooth tapers, responsive paths, and faster motion experiments inside Fusion.",
    image: "https://i.ytimg.com/vi/5tC-EZAiEoM/maxresdefault.jpg",
    accent: "#b8f70e",
    symbol: "sliders",
  },
  {
    number: "03",
    name: "Flow Deck",
    kind: "MOTION ENGINE",
    line: "Your favorite movement, one gesture away.",
    description: "A fluid easing library concept that turns repeatable motion decisions into a compact, creator-first workflow.",
    image: "https://i.ytimg.com/vi/rFVqcXw9ACU/maxresdefault.jpg",
    accent: "#8e5cff",
    symbol: "wave",
  },
];

function ToolGlyph({ type }: { type: Product["symbol"] }) {
  if (type === "curve") {
    return (
      <div className="glyphCurve" aria-hidden="true">
        <i className="curveLine" />
        <i className="curveDot curveDotA" />
        <i className="curveDot curveDotB" />
        <i className="curveDot curveDotC" />
      </div>
    );
  }

  if (type === "sliders") {
    return (
      <div className="glyphSliders" aria-hidden="true">
        <i><b /></i><i><b /></i><i><b /></i><i><b /></i>
      </div>
    );
  }

  return (
    <div className="glyphWave" aria-hidden="true">
      <i /><i /><i /><i /><i /><i /><i />
    </div>
  );
}

const setTilt = (event: ReactPointerEvent<HTMLElement>) => {
  const node = event.currentTarget;
  const rect = node.getBoundingClientRect();
  const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
  const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
  node.style.setProperty("--rx", `${(0.5 - y) * 10}deg`);
  node.style.setProperty("--ry", `${(x - 0.5) * 12}deg`);
  node.style.setProperty("--mx", `${x * 100}%`);
  node.style.setProperty("--my", `${y * 100}%`);
};

const resetTilt = (event: ReactPointerEvent<HTMLElement>) => {
  event.currentTarget.style.setProperty("--rx", "0deg");
  event.currentTarget.style.setProperty("--ry", "0deg");
};

export default function Home() {
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [ready, setReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [SceneComponent, setSceneComponent] = useState<ComponentType | null>(null);

  useEffect(() => {
    let active = true;
    import("./CinematicScene").then((module) => {
      if (active) setSceneComponent(() => module.default);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 520);
    const reveal = new IntersectionObserver(
      (entries) => entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add("isVisible")),
      { threshold: 0.12 },
    );
    document.querySelectorAll("[data-reveal]").forEach((element) => reveal.observe(element));

    const onPointer = (event: PointerEvent) => {
      document.documentElement.style.setProperty("--pointer-x", `${event.clientX}px`);
      document.documentElement.style.setProperty("--pointer-y", `${event.clientY}px`);
    };
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.clearTimeout(timer);
      reveal.disconnect();
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = activeProduct ? "hidden" : "";
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setActiveProduct(null);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [activeProduct]);

  return (
    <main className={ready ? "site isReady" : "site"}>
      <div className="pointerGlow" aria-hidden="true" />
      <div className="loader" aria-hidden={ready}>
        <div className="loaderMark">REVEACE<span>.</span></div>
        <div className="loaderLine"><i /></div>
      </div>

      <header className={scrolled ? "topbar isScrolled" : "topbar"}>
        <nav className="nav shell" aria-label="Main navigation">
          <a className="brand" href="#top" onClick={() => setMenuOpen(false)}>REVEACE<span>.</span></a>
          <div className={menuOpen ? "navLinks isOpen" : "navLinks"}>
            <a href="#products" onClick={() => setMenuOpen(false)}>Tools</a>
            <a href="#system" onClick={() => setMenuOpen(false)}>The system</a>
            <a href="#about" onClick={() => setMenuOpen(false)}>About</a>
          </div>
          <a className="navCta" href="https://youtube.com/@reveace" target="_blank" rel="noreferrer">Watch the craft <span>↗</span></a>
          <button className="menuButton" type="button" aria-label="Toggle navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}><i /><i /></button>
        </nav>
      </header>

      <section className="hero cinematicHero" id="top">
        <div className="heroNoise" aria-hidden="true" />
        {SceneComponent ? <SceneComponent /> : <div className="cinematicScene cinematicFallback" aria-hidden="true" />}

        <div className="heroInner shell">
          <div className="heroCopy">
            <span className="heroKicker"><i /> Reveace motion lab · DaVinci Resolve</span>
            <h1><span>REVEACE</span></h1>
            <h2><span>Motion tools</span><span>without the friction.</span></h2>
            <p>Professional tools for faster curves, sharper control, and motion that finally feels like yours.</p>
            <div className="heroActions">
              <a className="primaryButton" href="#products">Explore the tools <span>↓</span></a>
              <a className="ghostButton" href="https://youtube.com/@reveace" target="_blank" rel="noreferrer">View on YouTube <span>↗</span></a>
            </div>
          </div>

          <div className="heroFoot">
            <span>SCROLL TO EXPLORE</span>
            <div className="heroMetrics"><span><b>35+</b> tutorials</span><span><b>2.9K</b> creators</span><span><b>03</b> tools incoming</span></div>
          </div>
        </div>
      </section>

      <div className="signalRail" aria-hidden="true">
        <div><span>BUILT FOR FUSION</span><i /> <span>LIQUID CONTROL</span><i /> <span>NO CREATIVE FRICTION</span><i /> <span>BUILT FOR FUSION</span><i /> <span>LIQUID CONTROL</span><i /> <span>NO CREATIVE FRICTION</span><i /></div>
      </div>

      <section className="products shell" id="products">
        <header className="sectionHead" data-reveal>
          <div><span className="eyebrow">01 · THE TOOL COLLECTION</span><h2>Three tools.<br /><em>Infinite flow.</em></h2></div>
          <p>Prototype product visuals built with DaVinci Resolve imagery for now. The system is ready for final product media when it arrives.</p>
        </header>

        <div className="productGrid">
          {products.map((product, index) => (
            <article
              className="productCard"
              key={product.name}
              style={{ "--accent": product.accent, "--delay": `${index * 90}ms` } as CSSProperties}
              onPointerMove={setTilt}
              onPointerLeave={resetTilt}
              data-reveal
            >
              <div className="productFrame">
                <img src={product.image} alt={`${product.name} DaVinci Resolve placeholder visual`} loading="lazy" />
                <div className="productShade" />
                <div className="productLiquid">
                  <div className="productLiquidBack" />
                  <div className="productLiquidCore"><ToolGlyph type={product.symbol} /></div>
                  <div className="productLiquidRim" />
                </div>
                <span className="previewTag">PROTOTYPE / {product.number}</span>
              </div>
              <div className="productType"><span>{product.kind}</span><span>REVEACE LAB</span></div>
              <h3>{product.name}</h3>
              <p>{product.line}</p>
              <button type="button" onClick={() => setActiveProduct(product)}>Enter the concept <span>↗</span></button>
            </article>
          ))}
        </div>
      </section>

      <section className="system shell" id="system">
        <div className="systemCopy" data-reveal>
          <span className="eyebrow">02 · WHY IT FEELS DIFFERENT</span>
          <h2>Serious control.<br /><em>Zero drag.</em></h2>
          <p>Reveace is imagined around the little moments that break flow—awkward curves, repetitive setups, and controls that make simple motion feel technical.</p>
          <div className="systemList">
            <div><span>01</span><b>Fast to understand</b><p>Direct controls. Immediate feedback.</p></div>
            <div><span>02</span><b>Precise by default</b><p>Professional movement without cleanup.</p></div>
            <div><span>03</span><b>Native to Fusion</b><p>Built around the space you already know.</p></div>
          </div>
        </div>

        <div className="motionLab" data-reveal onPointerMove={setTilt} onPointerLeave={resetTilt}>
          <div className="labChrome"><span>REVEACE / MOTION LAB</span><div><i /><i /><i /></div></div>
          <div className="labStage">
            <div className="labGrid" />
            <div className="labCurve"><i /><i /><i /></div>
            <div className="labPlayhead" />
            <div className="labCard"><span>EASING PROFILE</span><b>LIQUID 0.42</b></div>
            <div className="labCube"><ToolGlyph type="curve" /></div>
          </div>
          <div className="labFooter"><span>IN · 00:00:00</span><span>18 FRAMES</span><span>OUT · 00:00:18</span></div>
        </div>
      </section>

      <section className="manifesto" id="about">
        <div className="manifestoRings" aria-hidden="true" />
        <div className="manifestoOrb" aria-hidden="true"><i /></div>
        <div className="shell" data-reveal>
          <span className="eyebrow">03 · THE REVEACE PRINCIPLE</span>
          <h2>Software is the tool.<br /><em>Creativity is the signal.</em></h2>
          <p>Learn the craft. Shape your own movement. Build what nobody has seen before.</p>
          <a className="primaryButton" href="https://youtube.com/@reveace" target="_blank" rel="noreferrer">Enter the channel <span>↗</span></a>
        </div>
      </section>

      <footer className="footer shell">
        <a className="footerBrand" href="#top">REVEACE<span>.</span></a>
        <p>Motion tools for DaVinci Resolve creators.</p>
        <div><a href="https://youtube.com/@reveace" target="_blank" rel="noreferrer">YouTube ↗</a><a href="https://discord.gg/hgcDrxu47k" target="_blank" rel="noreferrer">Discord ↗</a></div>
        <span>© 2026 · STATIC PROTOTYPE</span>
      </footer>

      {activeProduct && (
        <div className="modalBackdrop" role="presentation" onMouseDown={() => setActiveProduct(null)}>
          <section className="productModal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modalClose" type="button" aria-label="Close concept preview" onClick={() => setActiveProduct(null)}>×</button>
            <div className="modalVisual" style={{ "--accent": activeProduct.accent } as CSSProperties}>
              <img src={activeProduct.image} alt="DaVinci Resolve placeholder" />
              <div className="modalShade" />
              <div className="modalCube"><ToolGlyph type={activeProduct.symbol} /></div>
              <span>{activeProduct.number}</span>
            </div>
            <div className="modalCopy">
              <span className="eyebrow">{activeProduct.kind} · CONCEPT ONLY</span>
              <h2 id="modal-title">{activeProduct.name}</h2>
              <h3>{activeProduct.line}</h3>
              <p>{activeProduct.description}</p>
              <div className="modalNote"><i /> Static prototype. Product media and final details can be dropped into this system later.</div>
              <button type="button" onClick={() => setActiveProduct(null)}>Keep exploring <span>↓</span></button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
