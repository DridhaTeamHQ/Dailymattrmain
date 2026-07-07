/* Real 3D phone (three.js) — renders the downloaded iPhone GLB in a
 * fixed transparent canvas that replaces the PNG flying phone.
 *
 * Coordinate contract with main.js: the perspective camera is placed so
 * that the z=0 plane maps 1 world unit = 1 CSS pixel, with (0,0) at the
 * viewport's top-left (y negated). main.js keeps tweening the same pose
 * values it used for the CSS phone; `apply(pose)` maps them onto the
 * model each frame. */

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const PERSPECTIVE = 1400; // matches the CSS `perspective: 1500px` feel

export function createPhone3D({ phoneW, phoneH, screens, quality }) {
  /* "mobile" quality: no environment reflections, cheap Standard
   * materials lit by two lights, low DPR, no antialias, single phone
   * instance. Roughly a quarter of the per-frame GPU cost. */
  const MOBILE = quality === "mobile";

  const state = {
    ready: false,
    failed: false,
    demoted: false, // flipped by the FPS guard → main.js falls back to PNG
    canvas: null,
    resize,
    apply,
    setBackPhone,
    demote,
    dispose,
  };

  if (!window.WebGLRenderingContext) {
    state.failed = true;
    return state;
  }

  /* the renderer, environment map, and shader compile are the expensive
   * steps (each can stall the main thread 100-300ms). They are DEFERRED
   * and staggered across animation frames inside the GLB load callback,
   * so the intro logo animation never shares a frame with a big stall.
   * Construction here stays feather-light: only network fetches begin. */
  let renderer = null;
  let scene, camera, phone, backPhone, screenB, backScreenMat;
  let dirty = true;
  let pose = null;
  let back = null; // { cx, cy (doc coords), w, rotZ, rotY }
  let canvasHidden = false;

  /* sharp but not wasteful: 1.7 on phones is visually indistinguishable
   * from 2 at this size (1.1 was the blurry mistake) yet shades ~28%
   * fewer pixels every frame; desktop keeps 2 */
  const dprCap = () => (MOBILE ? 1.7 : 2);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(30, 1, 10, 6000);

  let screenAspect = 0.47; // refined from the mesh's bounding box on load
  let uvBox = { uMin: 0, uMax: 1, vMin: 0, vMax: 1 }; // actual UV window of the screen mesh
  const texLoader = new THREE.TextureLoader();
  /* cover-crop each screenshot so it fills the screen mesh without
   * stretching. The mesh's UVs may only span part of the 0..1 texture
   * space, so the crop is mapped into the measured UV window. */
  const coverCrop = (t) => {
    if (!t.image || !screenAspect) return;
    const imgA = t.image.width / t.image.height;
    // cover-crop factors in normalized screen space
    let cropRx = 1, cropOx = 0, cropRy = 1, cropOy = 0;
    if (imgA > screenAspect) {
      cropRx = screenAspect / imgA;
      cropOx = (1 - cropRx) / 2;
    } else {
      cropRy = imgA / screenAspect;
      cropOy = (1 - cropRy) / 2;
    }
    // remap so uv=uMin samples the crop start and uv=uMax the crop end
    const uSpan = uvBox.uMax - uvBox.uMin || 1;
    const vSpan = uvBox.vMax - uvBox.vMin || 1;
    const rx = cropRx / uSpan;
    const ry = cropRy / vSpan;
    t.repeat.set(rx, ry);
    t.offset.set(cropOx - uvBox.uMin * rx, cropOy - uvBox.vMin * ry);
    t.needsUpdate = true;
  };
  const allTex = [];
  const loadTex = (url) => {
    const t = texLoader.load(url, () => {
      coverCrop(t);
      if (renderer) renderer.initTexture(t); // upload off the visible path
      dirty = true;
    });
    t.colorSpace = THREE.SRGBColorSpace;
    t.flipY = false; // glTF UV convention
    allTex.push(t);
    return t;
  };
  const texHome = loadTex(screens.home);
  const texArticle = loadTex(screens.article);
  const texQix = loadTex(screens.qix);
  const texTrax = loadTex(screens.trax);
  let matArticle, matQix, matTrax;

  const gltfLoader = new GLTFLoader();
  gltfLoader.setMeshoptDecoder(MeshoptDecoder);
  gltfLoader.load(
    "/assets/iphone.glb",
    async (gltf) => {
      /* yield to the next paint so the intro animation gets frames
       * between the heavy steps — with a timeout fallback so throttled
       * or background tabs still finish initializing */
      const nextFrame = () =>
        new Promise((r) => {
          const t = setTimeout(r, 90);
          requestAnimationFrame(() => {
            clearTimeout(t);
            r();
          });
        });
      const model = gltf.scene;

      // normalize: center the model and scale it so its height equals
      // the site's phone height in px (1 world unit = 1 px at z=0)
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      model.position.sub(center);
      const s = phoneH / size.y;

      phone = new THREE.Group();
      const inner = new THREE.Group();
      inner.scale.setScalar(s);
      inner.rotation.y = Math.PI; // model's screen faces -Z; turn it to the camera
      inner.add(model);
      phone.add(inner);
      scene.add(phone);

      // find the screen mesh (material "17ProMax_Screen") and put the
      // home screen on it; a clone above it crossfades to the article
      let screenMesh = null;
      model.traverse((o) => {
        if (o.isMesh && o.material && /screen/i.test(o.material.name || "")) screenMesh = o;
      });
      if (screenMesh) {
        screenMesh.userData.isScreen = true;
        screenMesh.geometry.computeBoundingBox();
        const sb = screenMesh.geometry.boundingBox;
        const sbw = sb.max.x - sb.min.x;
        const sbh = sb.max.y - sb.min.y;
        if (sbw > 0 && sbh > 0) screenAspect = sbw / sbh;
        // measure the actual UV window the screen mesh samples
        const uvAttr = screenMesh.geometry.attributes.uv;
        if (uvAttr) {
          let uMin = Infinity, uMax = -Infinity, vMin = Infinity, vMax = -Infinity;
          for (let i = 0; i < uvAttr.count; i++) {
            const u = uvAttr.getX(i), v = uvAttr.getY(i);
            if (u < uMin) uMin = u;
            if (u > uMax) uMax = u;
            if (v < vMin) vMin = v;
            if (v > vMax) vMax = v;
          }
          uvBox = { uMin, uMax, vMin, vMax };
        }
        allTex.forEach(coverCrop);
        // debug handle for tuning texture mapping from the console
        window.__dm3d = {
          screenAspect,
          uvBox,
          tex: () => allTex.map((t) => ({ r: [t.repeat.x, t.repeat.y], o: [t.offset.x, t.offset.y], img: t.image && [t.image.width, t.image.height] })),
        };
        screenMesh.material = new THREE.MeshBasicMaterial({
          map: texHome,
          toneMapped: false,
        });
        // stacked overlay copies of the screen mesh, one per app view;
        // their opacities crossfade under scroll control
        const overlay = (tex, order) => {
          const m = screenMesh.clone();
          m.userData = {};
          m.material = new THREE.MeshBasicMaterial({
            map: tex,
            transparent: true,
            opacity: 0,
            toneMapped: false,
            polygonOffset: true,
            polygonOffsetFactor: -order,
            polygonOffsetUnits: -order,
          });
          m.renderOrder = order;
          screenMesh.parent.add(m);
          return m.material;
        };
        matArticle = overlay(texArticle, 2);
        matQix = overlay(texQix, 3);
        matTrax = overlay(texTrax, 4);
      }
      // cover glass: hidden entirely on mobile (one fewer overdraw layer),
      // softened to a faint sheen on desktop
      model.traverse((o) => {
        if (o.isMesh && o.material && /glass/i.test(o.material.name || "")) {
          if (MOBILE) {
            o.visible = false;
          } else {
            o.material.transparent = true;
            o.material.opacity = 0.06;
            o.material.transmission = 0;
            o.material.depthWrite = false;
          }
        }
      });

      /* flatten the Dynamic Island (camera, lens, sensor housing) to a
       * clean matte-black pill — the detailed hardware fights the flat
       * screenshot underneath. Any smallish mesh sitting top-center on
       * the front face is part of the island. */
      const mBox = new THREE.Box3().setFromObject(model);
      const mSize = mBox.getSize(new THREE.Vector3());
      const mCx = (mBox.min.x + mBox.max.x) / 2;
      const islandBlack = new THREE.MeshBasicMaterial({ color: 0x050507, toneMapped: false });
      model.traverse((o) => {
        if (!o.isMesh || o.userData.isScreen) return;
        if (o.material && /glass|screen/i.test(o.material.name || "")) return;
        const b = new THREE.Box3().setFromObject(o);
        const bw = b.max.x - b.min.x;
        const isTop = b.min.y > mBox.max.y - mSize.y * 0.1;
        const isCentered = Math.abs((b.min.x + b.max.x) / 2 - mCx) < mSize.x * 0.25;
        const isSmall = bw < mSize.x * 0.55;
        const isFront = b.max.z > mBox.max.z - mSize.z * 0.55;
        if (isTop && isCentered && isSmall && isFront) o.material = islandBlack;
      });

      /* mobile: swap the model's expensive PBR (clearcoat/transmission/
       * envmap) for cheap Standard materials lit by two lights — no
       * per-pixel environment sampling, no physical shader branches */
      if (MOBILE) {
        model.traverse((o) => {
          if (!o.isMesh || !o.visible || o.userData.isScreen) return;
          const m = o.material;
          if (!m || m.isMeshBasicMaterial) return; // screen + island already basic
          if (m.isMeshStandardMaterial || m.isMeshPhysicalMaterial) {
            o.material = new THREE.MeshStandardMaterial({
              color: m.color ? m.color.clone() : new THREE.Color(0xffffff),
              map: m.map || null,
              metalness: m.metalness != null ? m.metalness : 0.55,
              roughness: m.roughness != null ? m.roughness : 0.45,
              normalMap: m.normalMap || null,
              envMapIntensity: 0,
            });
            m.dispose && m.dispose();
          }
        });
        const hemi = new THREE.HemisphereLight(0xffffff, 0x2a2a33, 1.15);
        const dir = new THREE.DirectionalLight(0xffffff, 1.1);
        dir.position.set(0.4, 1, 1.3);
        scene.add(hemi, dir);
      }

      // static second phone for the showcase — desktop only (skips a
      // full extra model draw on mobile)
      if (!MOBILE) {
        backPhone = phone.clone(true);
        backPhone.traverse((o) => {
          if (o.isMesh && o.userData.isScreen) {
            backScreenMat = new THREE.MeshBasicMaterial({ map: texArticle, toneMapped: false });
            o.material = backScreenMat;
          }
          if (o.isMesh && o.material && o.material.transparent && o.material.opacity === 0)
            o.visible = false; // drop the crossfade clone in the copy
        });
        backPhone.visible = false;
        scene.add(backPhone);
      }

      /* ---- staggered GPU warm-up: one heavy step per frame so the
       * intro logo animation keeps getting frames in between ---- */
      await nextFrame();
      try {
        renderer = new THREE.WebGLRenderer({
          alpha: true,
          antialias: !MOBILE, // AA is ~30-40% fragment overhead — off on mobile
          stencil: false, // unused — saves memory bandwidth on mobile GPUs
          powerPreference: "high-performance",
        });
      } catch (e) {
        state.failed = true;
        return;
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, dprCap()));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;
      state.canvas = renderer.domElement;
      state.canvas.className = "gl-stage";
      sizeCamera();

      await nextFrame();
      if (!MOBILE) {
        // image-based lighting — desktop only; mobile uses the cheap lights
        const pmrem = new THREE.PMREMGenerator(renderer);
        scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
        pmrem.dispose();
      }

      await nextFrame();
      // full anisotropic filtering keeps the screen texture crisp
      const maxAniso = renderer.capabilities.getMaxAnisotropy();
      allTex.forEach((t) => {
        t.anisotropy = maxAniso;
        t.needsUpdate = true;
        if (t.image) renderer.initTexture(t);
      });
      renderer.compile(scene, camera);

      await nextFrame();
      /* one hidden warm render uploads every remaining buffer while the
       * curtain still covers the page */
      phone.visible = true;
      if (backPhone) backPhone.visible = true;
      renderer.render(scene, camera);
      if (backPhone) backPhone.visible = false;

      state.ready = true;
      lastKey = "";
      dirty = true;
      document.body.appendChild(state.canvas);
    },
    undefined,
    (err) => {
      console.warn("phone3d: GLB failed to load, falling back to PNG", err);
      state.failed = true;
    }
  );

  function sizeCamera() {
    if (!renderer) return;
    const vw = window.innerWidth || 1;
    const vh = window.innerHeight || 1;
    renderer.setSize(vw, vh);
    camera.aspect = vw / vh;
    camera.fov = (2 * Math.atan(vh / 2 / PERSPECTIVE) * 180) / Math.PI;
    camera.position.set(vw / 2, -vh / 2, PERSPECTIVE);
    camera.lookAt(vw / 2, -vh / 2, 0);
    camera.updateProjectionMatrix();
    dirty = true;
  }

  function resize() {
    if (!renderer) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, dprCap()));
    sizeCamera();
    lastKey = ""; // force a fresh render at the new size
  }

  const D2R = Math.PI / 180;

  /* pose: { x, y, scale, rotZ, rotY, rotX, alpha, mix } in CSS pixels/degrees
   * (x,y = top-left of the phone box, like the CSS version) */
  let lastKey = "";
  function apply(p, scrollY) {
    pose = p;
    if (!state.ready) return;

    /* only re-render when something actually changed — idle frames cost
     * nothing instead of redrawing the full canvas at 60fps */
    const key =
      (p.x | 0) + "," + (p.y | 0) + "," + p.scale.toFixed(4) + "," +
      p.rotZ.toFixed(2) + "," + p.rotY.toFixed(2) + "," + p.rotX.toFixed(2) + "," +
      p.alpha.toFixed(3) + "," + p.mix.toFixed(3) + "," +
      p.sQ.toFixed(3) + "," + p.sT.toFixed(3) + "," + (scrollY | 0);
    if (key === lastKey) return;
    lastKey = key;

    phone.visible = p.alpha > 0.01;

    /* when nothing is drawn (FAQ/footer), remove the canvas layer from
     * compositing entirely — a full-viewport transparent canvas otherwise
     * costs a full-screen blend every browser frame */
    const anyVisible = phone.visible || (back && backPhone && backPhone.visible);
    const wantHidden = !anyVisible;
    if (wantHidden !== canvasHidden) {
      canvasHidden = wantHidden;
      state.canvas.style.visibility = wantHidden ? "hidden" : "visible";
    }
    if (phone.visible) {
      phone.position.set(p.x + (phoneW / 2) * 1, -(p.y + phoneH / 2), 0);
      phone.scale.setScalar(p.scale);
      phone.rotation.set(p.rotX * D2R, -p.rotY * D2R, -p.rotZ * D2R);
      if (matArticle) {
        matArticle.opacity = p.mix;
        matQix.opacity = p.sQ;
        matTrax.opacity = p.sT;
      }
    }

    if (back && backPhone) {
      const vy = back.cy - scrollY; // viewport y of the back phone center
      backPhone.visible = vy > -600 && vy < window.innerHeight + 600;
      if (backPhone.visible) {
        /* deep enough behind that the tilted phones can never
         * interpenetrate; scale + position are perspective-compensated
         * so the screen-space placement stays identical */
        const BACK_Z = 150;
        const k = (PERSPECTIVE + BACK_Z) / PERSPECTIVE;
        const vw = window.innerWidth || 1;
        const vh = window.innerHeight || 1;
        backPhone.position.set(
          vw / 2 + (back.cx - vw / 2) * k,
          -vh / 2 + (vh / 2 - vy) * k,
          -BACK_Z
        );
        backPhone.scale.setScalar(back.scale * k);
        backPhone.rotation.set(0, -back.rotY * D2R, -back.rotZ * D2R);
      }
    }
    dirty = true;
  }

  /* back: doc-space center + width of the showcase back phone */
  function setBackPhone(cfg) {
    back = cfg ? { ...cfg, scale: cfg.w / phoneW } : null;
    dirty = true;
  }

  function render() {
    if (dirty && state.ready && !state.demoted) {
      renderer.render(scene, camera);
      dirty = false;
    }
    raf = requestAnimationFrame(render);
  }
  let raf = requestAnimationFrame(render);

  /* the FPS guard calls this when a device can't sustain the 3D render;
   * the canvas is torn down and main.js falls back to the PNG phone */
  function demote() {
    if (state.demoted) return;
    state.demoted = true;
    cancelAnimationFrame(raf);
    if (state.canvas) state.canvas.remove();
    if (renderer) renderer.dispose();
  }

  function dispose() {
    cancelAnimationFrame(raf);
    if (renderer) renderer.dispose();
    if (state.canvas) state.canvas.remove();
  }

  /* ---- offline capture: bake the mobile flight's rotation swing into
   * a sprite sheet + two hi-res end poses. Dev-only (?capture=1); the
   * output is saved to public/assets and shipped instead of three.js
   * on phones. The rotation curves mirror the flight timeline's leg B. */
  state.capture = async function capture({ frames = 40, cols = 8 } = {}) {
    if (!state.ready) throw new Error("capture: model not ready");
    const curve = (p) => {
      // matches flight leg B: rotY 0→28 (power2.in) then 28→16 (power2.out)
      const inP = Math.min(p / 0.55, 1);
      const outP = Math.max((p - 0.55) / 0.45, 0);
      const eIn = inP * inP;
      const eOut = 1 - (1 - outP) * (1 - outP);
      return {
        rotY: p < 0.55 ? 28 * eIn : 28 + (16 - 28) * eOut,
        rotX: p < 0.55 ? 6 * eIn : 6 + (3 - 6) * eOut,
        rotZ: 15 * (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2),
      };
    };
    const vw = window.innerWidth, vh = window.innerHeight;
    // force 2x regardless of the capturing display so assets are sharp
    const prevDpr = renderer.getPixelRatio();
    renderer.setPixelRatio(2);
    renderer.setSize(vw, vh);
    const dpr = 2;
    const shot = (sc, targetW, targetH) => {
      // phone centered in a box of (640·sc × 940·sc) CSS px
      const boxW = 640 * sc, boxH = 940 * sc;
      const sx = (vw / 2 - boxW / 2) * dpr, sy = (vh / 2 - boxH / 2) * dpr;
      return { boxW, boxH, sx, sy, sw: boxW * dpr, sh: boxH * dpr, targetW, targetH };
    };
    const renderPose = (p, sc) => {
      const r = curve(p);
      apply({
        x: vw / 2 - phoneW / 2, y: vh / 2 - phoneH / 2, scale: sc,
        rotZ: r.rotZ, rotY: r.rotY, rotX: r.rotX,
        alpha: 1, mix: 0, sQ: 0, sT: 0,
      }, 0);
      renderer.render(scene, camera);
    };
    // sheet: 40 motion frames at 460×676
    const scM = 0.36, fw = Math.round(640 * scM * dpr), fh = Math.round(940 * scM * dpr);
    const rows = Math.ceil(frames / cols);
    const sheet = document.createElement("canvas");
    sheet.width = fw * cols; sheet.height = fh * rows;
    const sctx = sheet.getContext("2d");
    const gM = shot(scM, fw, fh);
    for (let i = 0; i < frames; i++) {
      renderPose(i / (frames - 1), scM);
      sctx.drawImage(state.canvas, gM.sx, gM.sy, gM.sw, gM.sh,
        (i % cols) * fw, Math.floor(i / cols) * fh, fw, fh);
      await new Promise((r) => setTimeout(r, 0));
    }
    // hi-res end poses at 2× for the resting states
    const scE = 0.72;
    const endShot = (p) => {
      renderPose(p, scE);
      const g = shot(scE);
      const c = document.createElement("canvas");
      c.width = g.sw; c.height = g.sh;
      c.getContext("2d").drawImage(state.canvas, g.sx, g.sy, g.sw, g.sh, 0, 0, g.sw, g.sh);
      return c.toDataURL("image/webp", 0.92);
    };
    const startImg = endShot(0);
    const endImg = endShot(1);
    renderer.setPixelRatio(prevDpr);
    renderer.setSize(vw, vh);
    lastKey = ""; // let the normal loop repaint whatever pose is current
    return {
      meta: { frames, cols, rows, fw, fh },
      sheet: sheet.toDataURL("image/webp", 0.9),
      startImg,
      endImg,
    };
  };

  /* ---- desktop bake: the ENTIRE desktop phone journey ----
   * sheet1 = flight leg B (hero fan → showcase tilt, home screen)
   * sheet2 = flight legs D+E (showcase → upright float; the screen turns
   *          to the article mid-air, mirroring the live tweens exactly)
   * stills = hero / showcase / article / qix / trax rest poses at high
   *          res, plus the static showcase back phone in its live pose.
   * The pinned features section never rotates the phone, so its screen
   * swaps need no frames at all — runtime stacks the article/qix/trax
   * stills and crossfades their opacity. */
  state.captureDesktop = async function captureDesktop({ frames = 32, cols = 8 } = {}) {
    if (!state.ready) throw new Error("capture: model not ready");
    const io = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
    const out = (x) => 1 - (1 - x) * (1 - x);
    const clamp01 = (x) => Math.min(1, Math.max(0, x));
    // flight leg B — same curve the mobile bake uses
    const curveB = (p) => {
      const eIn = Math.min(p / 0.55, 1) ** 2;
      const eOut = out(Math.max((p - 0.55) / 0.45, 0));
      return {
        rotY: p < 0.55 ? 28 * eIn : 28 - 12 * eOut,
        rotX: p < 0.55 ? 6 * eIn : 6 - 3 * eOut,
        rotZ: 15 * io(p),
        mix: 0,
      };
    };
    /* flight legs D+E on one clock. The D:E scroll split is
     * vh-proportional (0.75vh : 0.28vh), so it's identical on every
     * desktop viewport and safe to bake. */
    const uD = 0.75 / 1.03;
    const curveDE = (u) => {
      if (u < uD) {
        const t = u / uD;
        const a = io(Math.min(t * 2, 1)); // first half: power2.inOut
        const b = out(Math.max(t * 2 - 1, 0)); // second half: power2.out
        return {
          rotY: t < 0.5 ? 16 + 2 * a : 18 - 12 * b,
          rotX: t < 0.5 ? 3 - 7 * a : -4 + 4 * b,
          rotZ: 15 - 10 * io(t),
          mix: clamp01((t - 0.35) / 0.35),
        };
      }
      const t = (u - uD) / (1 - uD);
      return { rotY: 6 - 6 * out(t), rotX: 0, rotZ: 5 - 5 * out(t), mix: 1 };
    };

    const vw = window.innerWidth, vh = window.innerHeight;
    const prevDpr = renderer.getPixelRatio();
    const savedBack = back; // keep the showcase back phone out of every shot
    back = null;
    if (backPhone) backPhone.visible = false;
    const setPR = (pr) => { renderer.setPixelRatio(pr); renderer.setSize(vw, vh); };
    const show = (r, sc, screens = {}) => {
      apply({
        x: vw / 2 - phoneW / 2, y: vh / 2 - phoneH / 2, scale: sc,
        rotZ: r.rotZ || 0, rotY: r.rotY || 0, rotX: r.rotX || 0,
        alpha: 1, mix: screens.mix || 0, sQ: screens.sQ || 0, sT: screens.sT || 0,
      }, 0);
      renderer.render(scene, camera);
    };
    // crop the canvas around a phone-space box centered on the phone
    const grab = (boxW, boxH, sc, pr) => {
      const bw = boxW * sc, bh = boxH * sc; // CSS px
      const c = document.createElement("canvas");
      c.width = Math.round(bw * pr); c.height = Math.round(bh * pr);
      c.getContext("2d").drawImage(
        state.canvas,
        (vw / 2 - bw / 2) * pr, (vh / 2 - bh / 2) * pr, bw * pr, bh * pr,
        0, 0, c.width, c.height
      );
      return c;
    };

    // motion sheets — soft-during-motion is invisible; rest poses are stills
    const scM = 0.55, prM = 2;
    const fw = Math.round(640 * scM * prM), fh = Math.round(940 * scM * prM);
    const rows = Math.ceil(frames / cols);
    const bakeSheet = async (curve) => {
      setPR(prM);
      const sheet = document.createElement("canvas");
      sheet.width = fw * cols; sheet.height = fh * rows;
      const sctx = sheet.getContext("2d");
      /* no per-frame yield: hidden tabs clamp timers to ≥1s, and the
       * bake is an offline batch job anyway */
      for (let i = 0; i < frames; i++) {
        const r = curve(i / (frames - 1));
        show(r, scM, { mix: r.mix });
        sctx.drawImage(grab(640, 940, scM, prM), (i % cols) * fw, Math.floor(i / cols) * fh);
      }
      return sheet.toDataURL("image/webp", 0.82);
    };
    const sheet1 = await bakeSheet(curveB);
    const sheet2 = await bakeSheet(curveDE);

    // rest stills: phone ~1000 device px wide — sharp even on 5K displays
    const scS = 0.5, prS = 5;
    setPR(prS);
    const still = (r, screens) => {
      show(r, scS, screens);
      return grab(640, 940, scS, prS).toDataURL("image/webp", 0.92);
    };
    const stillA = still(curveB(0), {});
    const stillB = still(curveB(1), {});
    const upright = { rotY: 0, rotX: 0, rotZ: 0 };
    const stillC = still(upright, { mix: 1 });
    const stillQ = still(upright, { mix: 1, sQ: 1 });
    const stillT = still(upright, { mix: 1, sQ: 1, sT: 1 });

    /* showcase back phone in its exact live pose (article screen, rotZ
     * −30 → a wider box so the rotated body is never clipped) */
    const backBox = { w: 800, h: 980 };
    const scBk = 0.475, prBk = 4;
    setPR(prBk);
    show({ rotY: 20, rotX: 0, rotZ: -30 }, scBk, { mix: 1 });
    const stillBack = grab(backBox.w, backBox.h, scBk, prBk).toDataURL("image/webp", 0.92);

    setPR(prevDpr);
    back = savedBack;
    lastKey = "";
    return {
      meta: { frames, cols, rows, fw, fh, backBox },
      sheet1, sheet2, stillA, stillB, stillC, stillQ, stillT, stillBack,
    };
  };

  return state;
}
