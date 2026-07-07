/* Pre-rendered phone player (mobile) — the "Apple technique".
 *
 * The 3D flight was baked offline (see phone3d.js `capture`) into:
 *   - phone-seq.webp  : sprite sheet of the rotation swing (motion frames)
 *   - phone-pose-a.webp / phone-pose-b.webp : hi-res resting poses
 *
 * At runtime this is pure compositor work: one canvas blit when the
 * frame index changes, plus transform/opacity on the wrapper. No
 * three.js, no lighting, no per-frame GPU scene — this is why the
 * pros' 3D scroll sites stay smooth on any phone.
 *
 * Exposes the same interface main.js uses for the live renderer. */

const BOX_W = 640; // capture box in phone-space CSS px (see capture())
const BOX_H = 940;

export function createPhoneSeq({ phoneW, phoneH, meta, sheetUrl, poseAUrl, poseBUrl }) {
  const state = {
    ready: false,
    failed: false,
    demoted: false,
    canvas: null,
    apply,
    resize() {},
    setBackPhone() {},
    demote() {},
    dispose,
  };

  /* stage: [cnv (motion frames)] + [cnvA, cnvB (hi-res rest poses)],
   * each painted once at init; runtime only toggles opacity between
   * them and transforms the stage */
  const stage = document.createElement("div");
  stage.className = "seq-stage";
  const cnv = document.createElement("canvas");
  const cnvA = document.createElement("canvas");
  const cnvB = document.createElement("canvas");
  cnv.width = meta.fw;
  cnv.height = meta.fh;
  const ctx = cnv.getContext("2d");
  stage.append(cnv, cnvA, cnvB);
  state.canvas = stage;

  let sheet = null; // ImageBitmap of the sprite sheet

  /* HTMLImageElement.decode() can stall in throttled/background tabs,
   * so decode via fetch + createImageBitmap instead */
  const loadBitmap = (url) =>
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(url + " " + r.status);
        return r.blob();
      })
      .then((b) => createImageBitmap(b));

  Promise.all([loadBitmap(sheetUrl), loadBitmap(poseAUrl), loadBitmap(poseBUrl)])
    .then(([sheetBmp, aBmp, bBmp]) => {
      sheet = sheetBmp;
      for (const [c, bmp] of [[cnvA, aBmp], [cnvB, bBmp]]) {
        c.width = bmp.width;
        c.height = bmp.height;
        c.getContext("2d").drawImage(bmp, 0, 0);
        bmp.close && bmp.close();
      }
      document.body.appendChild(stage);
      state.ready = true;
    })
    .catch(() => {
      state.failed = true; // main.js falls back to the PNG phone
    });

  let lastFrame = -1;
  let lastMode = "";
  let lastKey = "";

  function drawFrame(i) {
    if (i === lastFrame || !sheet) return;
    lastFrame = i;
    const sx = (i % meta.cols) * meta.fw;
    const sy = Math.floor(i / meta.cols) * meta.fh;
    ctx.clearRect(0, 0, meta.fw, meta.fh);
    ctx.drawImage(sheet, sx, sy, meta.fw, meta.fh, 0, 0, meta.fw, meta.fh);
  }

  function setMode(mode) {
    if (mode === lastMode) return;
    lastMode = mode;
    cnv.style.opacity = mode === "seq" ? "1" : "0";
    cnvA.style.opacity = mode === "a" ? "1" : "0";
    cnvB.style.opacity = mode === "b" ? "1" : "0";
  }

  /* pose: same object the live renderer receives; `prog` (0..1) selects
   * the baked rotation frame, x/y/scale/alpha place and fade the stage */
  function apply(p) {
    if (!state.ready) return;
    const prog = Math.min(1, Math.max(0, p.prog || 0));
    const key =
      (p.x | 0) + "," + (p.y | 0) + "," + p.scale.toFixed(4) + "," +
      prog.toFixed(4) + "," + p.alpha.toFixed(3);
    if (key === lastKey) return;
    lastKey = key;

    if (p.alpha <= 0.01) {
      stage.style.visibility = "hidden";
      return;
    }
    stage.style.visibility = "visible";
    stage.style.opacity = p.alpha;

    // rest poses get the hi-res stills; motion gets the sheet
    if (prog <= 0.01) setMode("a");
    else if (prog >= 0.99) setMode("b");
    else {
      setMode("seq");
      drawFrame(Math.round(prog * (meta.frames - 1)));
    }

    /* place: the stage's intrinsic size is the capture box in phone-space
     * units (640×940), so scaling by pose.scale makes the phone body in
     * the artwork exactly 400·scale CSS px — identical to the live 3D */
    const k = p.scale;
    const cx = p.x + phoneW / 2;
    const cy = p.y + phoneH / 2;
    stage.style.transform =
      "translate3d(" + (cx - (BOX_W * k) / 2) + "px," + (cy - (BOX_H * k) / 2) + "px,0) scale(" + k + ")";
  }

  function dispose() {
    stage.remove();
  }

  return state;
}

/* -------------------------------------------------------------------
 * Desktop player — the full journey, baked:
 *   prog 0        hero rest        → still A (upright, home screen)
 *   prog 0 → 1    swing 1 (leg B)  → sheet 1 frames
 *   prog 1        showcase rest    → still B (tilted, home screen)
 *   prog 1 → 2    swing 2 (D + E)  → sheet 2 frames (article fades in)
 *   prog 2        pinned features  → stills C/Q/T stacked; the screen
 *                 swaps are just opacity on the qix/trax stills (sQ/sT)
 * Plus one static baked still for the showcase back phone, positioned
 * in document space so it scrolls natively with the section.
 * ------------------------------------------------------------------- */
export function createPhoneSeqDesktop({ phoneW, phoneH, meta, urls }) {
  const state = {
    ready: false,
    failed: false,
    demoted: false,
    canvas: null,
    apply,
    resize() {},
    setBackPhone,
    demote() {},
    dispose,
  };

  const stage = document.createElement("div");
  stage.className = "seq-stage";
  const layer = () => {
    const c = document.createElement("canvas");
    stage.appendChild(c);
    return c;
  };
  const cnv1 = layer(); // swing 1 motion frames
  const cnv2 = layer(); // swing 2 motion frames
  cnv1.width = cnv2.width = meta.fw;
  cnv1.height = cnv2.height = meta.fh;
  const ctx1 = cnv1.getContext("2d");
  const ctx2 = cnv2.getContext("2d");
  const L = { s1: cnv1, s2: cnv2, a: layer(), b: layer(), c: layer(), q: layer(), t: layer() };
  state.canvas = stage;

  const backCnv = document.createElement("canvas");
  backCnv.className = "seq-back";

  let sheet1 = null, sheet2 = null;
  let extrasReady = false;
  let backCfg = null;

  const loadBitmap = (url) =>
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(url + " " + r.status);
        return r.blob();
      })
      .then((b) => createImageBitmap(b));
  const paint = (c, bmp) => {
    c.width = bmp.width;
    c.height = bmp.height;
    c.getContext("2d").drawImage(bmp, 0, 0);
    bmp.close && bmp.close();
  };

  /* core (hero still + swing 1 + showcase still) gates `ready` so the
   * intro curtain lifts onto a working phone; everything past the
   * showcase loads behind the hero — nobody scrolls there that fast */
  Promise.all([loadBitmap(urls.a), loadBitmap(urls.seq1), loadBitmap(urls.b)])
    .then(([aB, s1, bB]) => {
      paint(L.a, aB);
      paint(L.b, bB);
      sheet1 = s1;
      document.body.appendChild(stage);
      state.ready = true;
      return Promise.all([
        loadBitmap(urls.seq2),
        loadBitmap(urls.c),
        loadBitmap(urls.q),
        loadBitmap(urls.t),
        loadBitmap(urls.back),
      ]).then(([s2, cB, qB, tB, bkB]) => {
        sheet2 = s2;
        paint(L.c, cB);
        paint(L.q, qB);
        paint(L.t, tB);
        paint(backCnv, bkB);
        extrasReady = true;
        placeBack();
        lastKey = ""; // repaint with the full asset set
      });
    })
    .catch(() => {
      if (!state.ready) state.failed = true; // → PNG phone fallback
    });

  let lastF1 = -1, lastF2 = -1, lastKey = "";

  function drawFrame(ctx, sheet, i) {
    ctx.clearRect(0, 0, meta.fw, meta.fh);
    ctx.drawImage(
      sheet,
      (i % meta.cols) * meta.fw, Math.floor(i / meta.cols) * meta.fh, meta.fw, meta.fh,
      0, 0, meta.fw, meta.fh
    );
  }

  function setOps(map) {
    for (const k in L) {
      const v = map[k] || 0;
      if (L[k].__op !== v) {
        L[k].__op = v;
        L[k].style.opacity = v;
      }
    }
  }

  function apply(p) {
    if (!state.ready) return;
    const prog = Math.min(2, Math.max(0, p.prog || 0));
    const key =
      (p.x | 0) + "," + (p.y | 0) + "," + p.scale.toFixed(4) + "," +
      prog.toFixed(4) + "," + p.alpha.toFixed(3) + "," +
      p.sQ.toFixed(3) + "," + p.sT.toFixed(3);
    if (key === lastKey) return;
    lastKey = key;

    if (p.alpha <= 0.01) {
      stage.style.visibility = "hidden";
      return;
    }
    stage.style.visibility = "visible";
    stage.style.opacity = p.alpha;

    if (prog <= 0.01) setOps({ a: 1 });
    else if (prog < 0.99) {
      const f = Math.round(prog * (meta.frames - 1));
      if (f !== lastF1 && sheet1) { lastF1 = f; drawFrame(ctx1, sheet1, f); }
      setOps({ s1: 1 });
    } else if (prog <= 1.01 || !extrasReady) setOps({ b: 1 });
    else if (prog < 1.99) {
      const f = Math.round((prog - 1) * (meta.frames - 1));
      if (f !== lastF2 && sheet2) { lastF2 = f; drawFrame(ctx2, sheet2, f); }
      setOps({ s2: 1 });
    } else setOps({ c: 1, q: p.sQ, t: p.sT });

    const k = p.scale;
    const cx = p.x + phoneW / 2;
    const cy = p.y + phoneH / 2;
    stage.style.transform =
      "translate3d(" + (cx - (BOX_W * k) / 2) + "px," + (cy - (BOX_H * k) / 2) + "px,0) scale(" + k + ")";
  }

  /* back: doc-space center + width of the showcase back phone (same
   * contract as the live renderer's setBackPhone) */
  function setBackPhone(cfg) {
    backCfg = cfg || null;
    placeBack();
  }

  function placeBack() {
    if (!backCfg || !extrasReady) {
      backCnv.remove();
      return;
    }
    if (!backCnv.parentNode) document.body.appendChild(backCnv);
    const s = backCfg.w / phoneW;
    const w = meta.backBox.w * s;
    const h = meta.backBox.h * s;
    backCnv.style.width = w + "px";
    backCnv.style.height = h + "px";
    backCnv.style.left = backCfg.cx - w / 2 + "px";
    backCnv.style.top = backCfg.cy - h / 2 + "px";
  }

  function dispose() {
    stage.remove();
    backCnv.remove();
  }

  return state;
}
