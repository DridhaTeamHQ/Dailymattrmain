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
