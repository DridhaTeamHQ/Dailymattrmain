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
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const PERSPECTIVE = 1400; // matches the CSS `perspective: 1500px` feel

export function createPhone3D({ phoneW, phoneH, screens }) {
  const state = {
    ready: false,
    failed: false,
    canvas: null,
    resize,
    apply,
    setBackPhone,
    dispose,
  };

  if (!window.WebGLRenderingContext) {
    state.failed = true;
    return state;
  }

  let renderer, scene, camera, phone, backPhone, screenB, backScreenMat;
  let dirty = true;
  let pose = null;
  let back = null; // { cx, cy (doc coords), w, rotZ, rotY }

  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  } catch (e) {
    state.failed = true;
    return state;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  state.canvas = renderer.domElement;
  state.canvas.className = "gl-stage";

  scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  camera = new THREE.PerspectiveCamera(30, 1, 10, 6000);
  sizeCamera();

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
      renderer.initTexture(t); // upload to the GPU now, not on first visible frame
      dirty = true;
    });
    t.colorSpace = THREE.SRGBColorSpace;
    t.flipY = false; // glTF UV convention
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    allTex.push(t);
    return t;
  };
  const texHome = loadTex(screens.home);
  const texArticle = loadTex(screens.article);
  const texQix = loadTex(screens.qix);
  const texTrax = loadTex(screens.trax);
  let matArticle, matQix, matTrax;

  new GLTFLoader().load(
    "/assets/iphone.glb",
    (gltf) => {
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
      // soften the cover glass so it doesn't milk out the screen
      model.traverse((o) => {
        if (o.isMesh && o.material && /glass/i.test(o.material.name || "")) {
          o.material.transparent = true;
          o.material.opacity = 0.06;
          o.material.transmission = 0;
          o.material.depthWrite = false;
        }
      });

      // static second phone for the showcase (article screen, tilted)
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

      /* pre-warm: compile shaders and upload buffers while the intro
       * curtain still covers the page, so the first visible frame is
       * free of GPU hitches */
      phone.visible = true;
      backPhone.visible = true;
      renderer.compile(scene, camera);
      renderer.render(scene, camera);
      backPhone.visible = false;

      state.ready = true;
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
    sizeCamera();
  }

  const D2R = Math.PI / 180;

  /* pose: { x, y, scale, rotZ, rotY, rotX, alpha, mix } in CSS pixels/degrees
   * (x,y = top-left of the phone box, like the CSS version) */
  function apply(p, scrollY) {
    pose = p;
    if (!state.ready) return;

    phone.visible = p.alpha > 0.01;
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
        backPhone.position.set(back.cx, -vy, -40);
        backPhone.scale.setScalar(back.scale);
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
    if (dirty && state.ready) {
      renderer.render(scene, camera);
      dirty = false;
    }
    raf = requestAnimationFrame(render);
  }
  let raf = requestAnimationFrame(render);

  function dispose() {
    cancelAnimationFrame(raf);
    renderer.dispose();
    state.canvas.remove();
  }

  return state;
}
