# Daily Mattr — marketing site

Scroll-driven marketing site for the Daily Mattr / Shortly app, built from the Figma design. A real 3D iPhone (three.js) flies through the hero, tilts into the "More than news" showcase, and holds the center of a pinned features section while Articles / Qix / Trax content scrolls past it.

## Stack
- [Vite](https://vitejs.dev/) — dev server & build
- [GSAP](https://gsap.com/) + ScrollTrigger — scroll choreography
- [three.js](https://threejs.org/) — the 3D phone (`public/assets/iphone.glb`)

## Develop
```bash
npm install
npm run dev      # http://localhost:5199
```

## Build
```bash
npm run build    # outputs to dist/
npm run preview  # preview the production build
```

## Support Email
The `/support/` form posts to `/api/support` and sends mail through Resend.
Set these environment variables in Vercel before deploying:

```bash
RESEND_API_KEY=re_xxxxxxxxx
SUPPORT_TO_EMAIL=support@dailymattr.com
SUPPORT_FROM_EMAIL=DailyMattr Support <support@dailymattr.com>
```

Replace `re_xxxxxxxxx` with the real API key in Vercel, not in source code.
`SUPPORT_FROM_EMAIL` must use a sender/domain verified in Resend.

## Structure
- `index.html` — page markup (hero, showcase, features, FAQ, footer)
- `src/main.js` — GSAP timeline; a single pose proxy drives the phone hero → showcase → features
- `src/phone3d.js` — three.js renderer for the GLB; app screenshots are mapped onto the screen mesh, with a PNG-mockup fallback if WebGL/GLB fails
- `src/style.css` — all styling and design tokens
- `public/assets/` — 3D model, app screenshots, icons

## Credits
3D iPhone model sourced from Sketchfab — verify its license before production use.
