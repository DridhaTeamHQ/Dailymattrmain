import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { createPhone3D } from "./phone3d.js";

gsap.registerPlugin(ScrollTrigger);

/* ---------------------------------------------------------------
 * Lenis smooth scrolling — the page itself scrolls on an eased
 * curve, so the pinned sections, the DOM, and the 3D phone all read
 * ONE smoothed scroll value. Scrubs can then map 1:1 (scrub: true)
 * with no extra lag, which removes the "phone slides against the
 * content" glitch and the stepped mouse-wheel motion.
 * --------------------------------------------------------------- */
/* Native touch scrolling on phones (Lenis only smooths the mouse wheel)
 * — smooth-scroll-controlled touch felt sticky and unnatural. */
const lenis = new Lenis({
  lerp: 0.09,
  smoothWheel: true,
  syncTouch: false,
});
/* scrub maps 1:1 everywhere. Touch scroll positions already update at
 * frame rate, so any scrub lag just makes the phone rubber-band against
 * the natively-scrolling page (the hero jitter). Desktop is smoothed by
 * Lenis before ScrollTrigger ever sees it. */
const SCRUB = true;
lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((t) => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);
/* the mobile URL bar showing/hiding fires a resize that made
 * ScrollTrigger recompute the pin every time — the scroll-up lag.
 * Ignore that resize class entirely. */
ScrollTrigger.config({ ignoreMobileResize: true });

const PHONE_W = 400;
const PHONE_H = 822; // matches both the mockup PNG and the GLB aspect

const flyPhone = document.getElementById("fly-phone");
const fly3d = flyPhone.querySelector(".phone-3d");
const featuresPin = document.getElementById("features-pin");
const dots = [...document.querySelectorAll(".scene-progress .dot")];
let lastDotIdx = -1;

/* ---- adaptive device tiering ----
 * high = desktop → full real-time 3D
 * mid  = capable phone/tablet → optimized 3D (no reflections, low DPR)
 * low  = cheap/old phone → skip WebGL entirely, use the PNG phone */
function perfTier() {
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  if (!coarse && window.innerWidth >= 900) return "high";
  const mem = navigator.deviceMemory || 4;
  const cores = navigator.hardwareConcurrency || 4;
  if (mem <= 4 || cores <= 4) return "low";
  return "mid";
}
const TIER = perfTier();

/* Real 3D phone (three.js). On "low" it is never created — the PNG
 * mockup phone (`#fly-phone`) drives the whole journey instead. A
 * runtime FPS guard can also demote mid→PNG on devices we misjudged. */
const phone3d =
  TIER === "low"
    ? { ready: false, failed: true, demoted: true, apply() {}, resize() {}, setBackPhone() {}, demote() {} }
    : createPhone3D({
        phoneW: PHONE_W,
        phoneH: PHONE_H,
        quality: TIER === "mid" ? "mobile" : "desktop",
        screens: {
          home: "/assets/screen-home.jpg?v=4",
          article: "/assets/screen-article.jpg?v=4",
          qix: "/assets/screen-qix.jpg?v=4",
          trax: "/assets/screen-trax.jpg?v=4",
        },
      });

/* ---- single pose proxy: every scroll tween writes here, and the
 * ticker mirrors it onto whichever phone representation is live.
 * mix/sQ/sT are the screen opacities (article / qix / trax). ---- */
const P = {
  x: 0, y: 0, scale: 1,
  rotZ: 0, rotY: 0, rotX: 0,
  alpha: 1,
  mix: 0, sQ: 0, sT: 0,
};

const flyS = {
  home: flyPhone.querySelector('[data-screen="home"]'),
  article: flyPhone.querySelector('[data-screen="article"]'),
  qix: flyPhone.querySelector('[data-screen="qix"]'),
  trax: flyPhone.querySelector('[data-screen="trax"]'),
};

/* entrance offset — folded into the pose so the intro can drop the
 * phone in without fighting the per-tick applier. On mobile there is no
 * intro, so the phone is visible from the first frame. */
const NO_INTRO = window.innerWidth < 900;
const introOff = NO_INTRO ? { y: 0, a: 1 } : { y: 140, a: 0 };

let use3d = false;
const SCRATCH = { ...P }; // reused every tick — no per-frame allocation
gsap.ticker.add(() => {
  const can3d = phone3d.ready && !phone3d.demoted;
  if (can3d && !use3d) {
    use3d = true;
    // soft handoff: fade the PNG phone out as the 3D canvas takes over
    gsap.to(flyPhone, { autoAlpha: 0, duration: 0.35, ease: "power1.out" });
  } else if (!can3d && use3d) {
    use3d = false; // demoted mid-session → hand back to the PNG phone
  }
  const y = P.y + introOff.y;
  const alpha = P.alpha * introOff.a;
  if (use3d) {
    Object.assign(SCRATCH, P);
    SCRATCH.y = y;
    SCRATCH.alpha = alpha;
    phone3d.apply(SCRATCH, window.scrollY);
  } else {
    gsap.set(flyPhone, {
      x: P.x,
      y,
      scale: P.scale,
      rotation: P.rotZ,
      autoAlpha: alpha,
    });
    gsap.set(fly3d, { rotationY: P.rotY, rotationX: P.rotX });
    flyS.article.style.opacity = P.mix;
    flyS.qix.style.opacity = P.sQ;
    flyS.trax.style.opacity = P.sT;
  }
});

const docRect = (el) => {
  const r = el.getBoundingClientRect();
  return {
    x: r.left + window.scrollX,
    y: r.top + window.scrollY,
    w: r.width,
    h: r.height,
    cx: r.left + window.scrollX + r.width / 2,
    cy: r.top + window.scrollY + r.height / 2,
  };
};

const poseFromRect = (rect, rotation = 0) => ({
  x: rect.cx - PHONE_W / 2,
  y: rect.cy - PHONE_H / 2,
  scale: rect.w / PHONE_W,
  rotZ: rotation,
});

let ctx; // gsap context for clean rebuilds

function build() {
  ctx && ctx.revert();
  ctx = gsap.context(() => {
    const vh = window.innerHeight;
    const vw = window.innerWidth;

    /* ---------- measured geometry (document space) ---------- */
    const heroA = docRect(document.getElementById("anchor-hero"));
    const showA = docRect(document.getElementById("anchor-showcase"));
    const showB = docRect(document.getElementById("anchor-showback"));
    const featTop = docRect(document.getElementById("features")).y;

    // showcase back phone lives in the WebGL scene (doc coords)
    phone3d.setBackPhone({ cx: showB.cx, cy: showB.cy, w: showB.w, rotZ: -30, rotY: 20 });

    /* the phone floats free in the pinned features section — centered,
     * large, no hand (viewport coords, since the phone layer is fixed).
     * On mobile the phone sits in the UPPER half so the copy below it
     * is never covered. Sized by whichever budget is tighter — width OR
     * height — so it fits narrow phones (Fold cover) AND short/wide ones
     * (Fold unfolded) without ever overflowing or looking oversized. */
    const isMobile = vw < 900;
    const hBudget = vh * (isMobile ? 0.44 : 0.7);
    const wBudget = vw * (isMobile ? 0.64 : 0.72);
    const floatScale = Math.min(hBudget / PHONE_H, wBudget / PHONE_W);
    const floatPose = {
      x: vw / 2 - PHONE_W / 2,
      // a touch lower on mobile so the phone top clears the scene markers
      y: vh * (isMobile ? 0.4 : 0.54) - PHONE_H / 2,
      scale: floatScale,
      rotZ: 0,
    };
    const hoverPose = {
      x: floatPose.x,
      y: floatPose.y - vh * 0.1,
      scale: floatScale * 0.93,
      rotZ: 5,
    };

    /* ---------- scroll waypoints ---------- */
    const s1 = Math.max(1, showA.cy - vh * 0.52); // showcase pose reached
    const s2 = Math.max(s1 + 1, featTop - vh * 0.75); // begin final descent
    const s3 = featTop; // pin start
    const s4 = s3 + vh * 0.28; // landing completes just inside the pin
    const sA = Math.min(Math.max(1, heroA.y - vh * 0.3), s1 - 1);

    const poseHero = poseFromRect({ cx: heroA.cx, cy: heroA.cy, w: heroA.w }, 0);
    const poseShow = poseFromRect({ cx: showA.cx, cy: showA.cy, w: showA.w }, 15);

    /* viewport pose at a given scroll position */
    const at = (pose, scroll) => ({ ...pose, y: pose.y - scroll });

    gsap.set(P, { ...at(poseHero, 0), rotY: 0, rotX: 0, alpha: 1, mix: 0, sQ: 0, sT: 0 });

    /* ---------- master flight timeline (hero -> showcase -> hover) ---------- */
    /* ONE timeline owns the phone's position for the whole journey —
     * hero fan → showcase → landing inside the pin. The pinned scene
     * timeline never writes x/y/scale, so nothing fights over the pose
     * (the old dual-writer setup was the source of the scroll glitches). */
    const flight = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: document.body,
        start: 0,
        end: () => s4,
        scrub: SCRUB, // Lenis smooths wheels; touch gets a light scrub pass
      },
    });

    const dA = sA / s4;
    const dB = (s1 - sA) / s4;
    const dC = (s2 - s1) / s4;
    const dD = (s3 - s2) / s4;
    const dE = (s4 - s3) / s4;

    // A: glued to the hero fan while the hero scrolls
    flight.to(P, { y: poseHero.y - sA, duration: dA }, 0);
    // B: glide down + tilt into the showcase, swinging in real 3D
    flight.to(
      P,
      {
        x: poseShow.x,
        y: poseShow.y - s1,
        rotZ: poseShow.rotZ,
        ease: "power2.inOut",
        duration: dB,
      },
      dA
    );
    flight
      .to(P, { rotY: 28, rotX: 6, duration: dB * 0.55, ease: "power2.in" }, dA)
      .to(P, { rotY: 16, rotX: 3, duration: dB * 0.45, ease: "power2.out" }, dA + dB * 0.55);
    flight
      .to(P, { scale: poseShow.scale * 1.07, duration: dB * 0.55, ease: "power1.in" }, dA)
      .to(P, { scale: poseShow.scale, duration: dB * 0.45, ease: "power1.out" }, dA + dB * 0.55);
    // C: parked in the showcase beside the back phone, gliding with it
    flight.to(P, { y: poseShow.y - s2, duration: dC }, dA + dB);

    if (isMobile) {
      /* mobile has no pinned stage: the phone simply rides away with the
       * showcase and fades before the feature blocks arrive */
      flight.to(
        P,
        { y: poseShow.y - s4, ease: "none", duration: dD + dE },
        dA + dB + dC
      );
      flight.to(
        P,
        { alpha: 0, ease: "power1.in", duration: (dD + dE) * 0.6 },
        dA + dB + dC + (dD + dE) * 0.4
      );
      // the flight timeline ends here on mobile — skip the desktop legs
    } else {
    // D: straighten and descend toward the features stage
    flight.to(
      P,
      {
        x: hoverPose.x,
        y: hoverPose.y,
        scale: hoverPose.scale,
        rotZ: hoverPose.rotZ,
        ease: "power2.inOut",
        duration: dD,
      },
      dA + dB + dC
    );
    flight
      .to(P, { rotY: 18, rotX: -4, duration: dD * 0.5, ease: "power2.inOut" }, dA + dB + dC)
      .to(P, { rotY: 6, rotX: 0, duration: dD * 0.5, ease: "power2.out" }, dA + dB + dC + dD * 0.5);
    // the screen turns to the article mid-air
    flight.to(P, { mix: 1, duration: dD * 0.35, ease: "none" }, dA + dB + dC + dD * 0.35);
    // E: settle into the floating pose as the pin takes hold
    flight.to(
      P,
      {
        x: floatPose.x,
        y: floatPose.y,
        scale: floatPose.scale,
        rotZ: 0,
        rotY: 0,
        ease: "power2.out",
        duration: dE,
      },
      dA + dB + dC + dD
    );
    } // end desktop flight legs

    /* ---------- features: pinned scene machine (10 time units) ---------- */
    const rows = gsap.utils.toArray(".row-scene");
    const sides = rows.map((r) => r.querySelector(".side"));
    const sceneWords = rows.map((r) => r.querySelector(".scene-word"));
    const copies = gsap.utils.toArray(".feature-copy");

    /* the pinned story only exists on desktop; on phones the features
     * section is three normal blocks that scroll natively */
    const scenes = isMobile
      ? null
      : gsap.timeline({
          defaults: { ease: "power2.inOut" },
          scrollTrigger: {
            trigger: featuresPin,
            start: "top top",
            end: "+=340%",
            pin: true,
            scrub: SCRUB,
            onUpdate(self) {
              const idx = Math.min(2, Math.floor(self.progress * 2.999));
              if (idx !== lastDotIdx) {
                lastDotIdx = idx;
                dots.forEach((d, i) => d.classList.toggle("on", i === idx));
              }
            },
          },
        });

    if (scenes) {
      /* (the phone's position is owned entirely by the flight timeline;
       * this pinned timeline only choreographs the scenery + screens)
       *
       * Prototype behaviour: the phone stays dead-still in the middle
       * while each scene's content SCROLLS UP past it. Scenes 1 and 2
       * start parked below the viewport and ride up through it. */
      gsap.set(rows, { autoAlpha: 1, y: (i) => (i === 0 ? 0 : vh) });
      gsap.set(copies, { autoAlpha: 1, y: (i) => (i === 0 ? 0 : vh) });

      const swapScene = (pos, from, to, screenProp) => {
        const dur = 1.1;
        // outgoing content scrolls up and away
        scenes.to([rows[from], copies[from]], { y: -vh, ease: "none", duration: dur }, pos);
        // incoming content rides up into place
        scenes.to([rows[to], copies[to]], { y: 0, ease: "none", duration: dur }, pos);
        // the phone's screen changes as the new scene passes its middle
        scenes.to(P, { [screenProp]: 1, duration: 0.45, ease: "none" }, pos + dur * 0.35);
      };

      swapScene(3.0, 0, 1, "sQ");
      swapScene(6.3, 1, 2, "sT");

      /* exit: the phone glides up and fades before the pin releases, so
       * nothing ever lingers over the FAQ */
      scenes.to(P, { alpha: 0, y: floatPose.y - vh * 0.18, scale: floatPose.scale * 0.92, duration: 0.55, ease: "power2.in" }, 9.4);
      scenes.to({}, { duration: 0.05 }, 9.95); // hold to the end
    } else {
      /* mobile: scroll crossfades the three blocks through the sticky
       * stage — opacity/transform only (fully composited, no repaints) */
      const blocks = gsap.utils.toArray(".fm-block");
      gsap.set(blocks, { autoAlpha: (i) => (i === 0 ? 1 : 0), y: 0 });
      const mScenes = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: ".features-mobile",
          start: "top top",
          end: "bottom bottom",
          scrub: SCRUB,
        },
      });
      mScenes.to({}, { duration: 10 }, 0); // 10-unit ruler
      const fadeTo = (pos, from, to) => {
        mScenes.to(blocks[from], { autoAlpha: 0, y: -26, duration: 0.9 }, pos);
        mScenes.fromTo(
          blocks[to],
          { autoAlpha: 0, y: 30 },
          { autoAlpha: 1, y: 0, duration: 0.9, immediateRender: false },
          pos + 0.35
        );
      };
      fadeTo(3.1, 0, 1);
      fadeTo(6.4, 1, 2);
    }

    /* ---------- hero word rotator ---------- */
    const words = document.querySelectorAll(".word-track span").length;
    const rot = gsap.timeline({ repeat: -1 });
    for (let i = 1; i < words; i++) {
      rot.to(".word-track", {
        y: () => -i * document.querySelector(".word-track span").offsetHeight,
        duration: 0.6,
        ease: "power3.inOut",
        delay: 1.6,
      });
    }
    rot.to(".word-track", { y: 0, duration: 0 }); // 5th word is a clone of the 1st

    /* ---------- hero panel goes full-bleed as the dark world takes over.
     * Desktop only: animating background-color/border-radius REPAINTS the
     * whole hero every scrolled frame — a real jank source on phones.
     * Mobile keeps the static rounded-panel look. ---------- */
    if (!isMobile) {
      gsap.to(".hero", {
        backgroundColor: "#0a0a0b",
        scrollTrigger: {
          trigger: "#showcase",
          start: "top bottom",
          end: "top 62%",
          scrub: true,
        },
        ease: "none",
      });
      gsap.to(".hero-inner", {
        borderRadius: 0,
        scrollTrigger: {
          trigger: "#showcase",
          start: "top bottom",
          end: "top 62%",
          scrub: true,
        },
        ease: "none",
      });
    }
    // hero copy drifts up a touch faster than the scroll — gentle depth
    // (desktop only; a scrubbed per-frame parallax isn't worth the cost on phones)
    if (!isMobile) {
      gsap.to([".hero-title", ".hero-sub", ".store-buttons"], {
        y: (i) => -(34 + i * 10),
        autoAlpha: 0.25,
        scrollTrigger: {
          trigger: "#hero",
          start: "top top",
          end: "bottom 45%",
          scrub: true,
        },
        ease: "none",
      });
    }

    /* ---------- nav melts into the dark world, back to light at the FAQ ---------- */
    ScrollTrigger.create({
      trigger: "#hero",
      start: "top+=90 top",
      endTrigger: "#faq",
      end: "top 64px",
      toggleClass: { targets: ".nav", className: "nav-dark" },
    });

    /* ---------- showcase reveals ---------- */
    gsap.from(".showcase-title, .showcase .eyebrow", {
      scrollTrigger: { trigger: "#showcase", start: "top 70%" },
      y: 40,
      autoAlpha: 0,
      stagger: 0.12,
      duration: 0.9,
      ease: "power3.out",
    });
    if (!isMobile) {
      gsap.from(".giant-words", {
        scrollTrigger: {
          trigger: "#showcase",
          start: "top 80%",
          end: "bottom top",
          scrub: 1,
        },
        xPercent: 6,
        ease: "none",
      });
    }

    /* ---------- FAQ + footer reveals ---------- */
    gsap.from(".faq-left > *", {
      scrollTrigger: { trigger: "#faq", start: "top 72%" },
      y: 34,
      autoAlpha: 0,
      stagger: 0.1,
      duration: 0.8,
      ease: "power3.out",
    });
    gsap.from(".accordion details", {
      scrollTrigger: { trigger: "#faq", start: "top 65%" },
      y: 24,
      autoAlpha: 0,
      stagger: 0.07,
      duration: 0.6,
      ease: "power2.out",
    });
    gsap.from(".footer-wordmark", {
      scrollTrigger: { trigger: ".footer", start: "top 65%" },
      yPercent: 35,
      ease: "power2.out",
      duration: 1.1,
    });
  });
}

/* ---------- rebuild on resize (measurements go stale) ---------- */
let resizeT;
let lastW = window.innerWidth;
window.addEventListener("resize", () => {
  if (window.innerWidth === lastW) return; // ignore mobile URL-bar height changes
  clearTimeout(resizeT);
  resizeT = setTimeout(() => {
    lastW = window.innerWidth;
    phone3d.resize();
    build();
    ScrollTrigger.refresh();
  }, 220);
});

/* ---------- nav hides on scroll-down, returns on scroll-up ---------- */
let navHidden = false;
lenis.on("scroll", (e) => {
  const down = e.direction === 1;
  if (down && e.scroll > 320 && !navHidden) {
    navHidden = true;
    gsap.to(".nav", { yPercent: -110, duration: 0.45, ease: "power3.out", overwrite: "auto" });
  } else if ((!down || e.scroll <= 320) && navHidden) {
    navHidden = false;
    gsap.to(".nav", { yPercent: 0, duration: 0.45, ease: "power3.out", overwrite: "auto" });
  }
});

/* ---------- in-page anchors ride the smooth scroll ---------- */
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    const target = document.querySelector(a.getAttribute("href"));
    if (!target) return;
    e.preventDefault();
    lenis.scrollTo(target, { offset: -70, duration: 1.4 });
  });
});

/* ---------- FAQ tabs (visual only) ---------- */
document.querySelectorAll(".faq-tabs .tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".faq-tabs .tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
  });
});

/* one accordion item open at a time */
document.querySelectorAll(".accordion details").forEach((d) => {
  d.addEventListener("toggle", () => {
    if (d.open)
      document.querySelectorAll(".accordion details").forEach((o) => {
        if (o !== d) o.open = false;
      });
  });
});

/* ---------- site entrance (doubles as the loading screen) ---------- */
function assetsSettled(maxWait = 3500) {
  const model = new Promise((res) => {
    const t0 = performance.now();
    const poll = setInterval(() => {
      if (phone3d.ready || phone3d.failed || performance.now() - t0 > maxWait) {
        clearInterval(poll);
        res();
      }
    }, 100);
  });
  const imgs = Promise.all(
    [...document.querySelectorAll(".fan-item img")].map((i) =>
      i.decode ? i.decode().catch(() => {}) : Promise.resolve()
    )
  );
  const cap = new Promise((res) => setTimeout(res, maxWait));
  return Promise.race([Promise.all([model, imgs]), cap]);
}

async function playIntro() {
  const intro = document.getElementById("intro");
  if (!intro) return;
  /* mobile: no intro at all — the site is visible from the first frame.
   * Also skipped for reduced-motion and when arriving mid-page. */
  if (
    NO_INTRO ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    window.scrollY > 40
  ) {
    intro.remove();
    gsap.set(introOff, { y: 0, a: 1 });
    return;
  }
  lenis.stop();
  // logo rises immediately while assets load behind the curtain
  gsap.to(".intro-logo", { y: 0, duration: 0.7, ease: "power4.out", delay: 0.15 });
  gsap.to(".intro-tag", { y: 0, duration: 0.6, ease: "power4.out", delay: 0.38 });

  const minHold = new Promise((res) => setTimeout(res, 1500));
  await Promise.all([assetsSettled(), minHold]);

  // everything heavy is uploaded/decoded — lift the curtain
  const tl = gsap.timeline({
    onComplete: () => {
      lenis.start();
      intro.remove();
    },
  });
  tl.to(".intro-mark", { autoAlpha: 0, y: -26, duration: 0.4, ease: "power2.in" }, 0)
    .to("#intro", { yPercent: -100, duration: 0.85, ease: "power4.inOut" }, 0.22)
    .from(".nav", { yPercent: -110, duration: 0.7, ease: "power3.out" }, 0.42)
    .from(
      [".hero-title", ".hero-sub", ".store-buttons"],
      { y: 46, autoAlpha: 0, stagger: 0.1, duration: 0.85, ease: "power3.out" },
      0.52
    )
    .from(
      ".fan-item",
      { y: 110, autoAlpha: 0, stagger: 0.07, duration: 0.9, ease: "power3.out" },
      0.67
    )
    .to(introOff, { y: 0, a: 1, duration: 1.05, ease: "power3.out" }, 0.77);
}

/* build after fonts are ready so measurements are stable */
const ready = document.fonts ? document.fonts.ready : Promise.resolve();
ready.then(() => {
  build();
  ScrollTrigger.refresh();
  playIntro();
  // headless/pre-rendered contexts can report a 0-size viewport at load;
  // rebuild once a real viewport shows up
  if (!window.innerWidth || !window.innerHeight) {
    const poll = setInterval(() => {
      if (window.innerWidth && window.innerHeight) {
        clearInterval(poll);
        lastW = window.innerWidth;
        phone3d.resize();
        build();
        ScrollTrigger.refresh();
      }
    }, 250);
  }
});
