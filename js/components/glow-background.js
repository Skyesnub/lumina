// Ambient background wash: a few soft, slowly-drifting blurred orbs tinted
// by the current theme hue. Performance-critical technique: shadowBlur (or
// CSS filter:blur on an animated element) is expensive per-frame, especially
// at high devicePixelRatio. Instead each orb color is pre-rendered ONCE to
// an offscreen sprite canvas with the blur baked in, then every frame just
// drawImage()-stamps that sprite at a new position — cheap regardless of
// screen density.

export function mountGlowBackground(canvas) {
  const ctx = canvas.getContext('2d');
  let sprites = [];
  let orbs = [];
  let raf = null;

  function hue() {
    return getComputedStyle(document.body).getPropertyValue('--theme-hue').trim() || '226';
  }

  function buildSprite(radius, hueValue, offset, alpha) {
    const size = radius * 2;
    const off = document.createElement('canvas');
    off.width = size;
    off.height = size;
    const octx = off.getContext('2d');
    const grad = octx.createRadialGradient(radius, radius, 0, radius, radius, radius);
    grad.addColorStop(0, `hsla(${Number(hueValue) + offset}, 75%, 62%, ${alpha})`);
    grad.addColorStop(1, `hsla(${Number(hueValue) + offset}, 75%, 62%, 0)`);
    octx.fillStyle = grad;
    octx.fillRect(0, 0, size, size);
    return off;
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    rebuildSprites(w, h);
  }

  function rebuildSprites(w, h) {
    const h0 = hue();
    const isDark = document.body.classList.contains('dark-mode');
    const alpha = isDark ? 0.28 : 0.16;
    const specs = [
      { radius: Math.max(w, h) * 0.32, offset: 0 },
      { radius: Math.max(w, h) * 0.26, offset: 28 },
      { radius: Math.max(w, h) * 0.24, offset: -24 },
    ];
    sprites = specs.map(s => ({ img: buildSprite(s.radius, h0, s.offset, alpha), radius: s.radius }));

    if (orbs.length === 0) {
      orbs = sprites.map((s, i) => ({
        x: w * (0.2 + i * 0.3),
        y: h * (0.15 + i * 0.25),
        vx: 0.06 + i * 0.02,
        vy: 0.04 + i * 0.015,
        spriteIndex: i,
      }));
    }
  }

  function frame() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    ctx.clearRect(0, 0, w, h);
    for (const orb of orbs) {
      orb.x += orb.vx;
      orb.y += orb.vy;
      const sprite = sprites[orb.spriteIndex];
      if (!sprite) continue;
      if (orb.x > w + sprite.radius) orb.x = -sprite.radius;
      if (orb.x < -sprite.radius) orb.x = w + sprite.radius;
      if (orb.y > h + sprite.radius) orb.y = -sprite.radius;
      if (orb.y < -sprite.radius) orb.y = h + sprite.radius;
      ctx.drawImage(sprite.img, orb.x - sprite.radius, orb.y - sprite.radius);
    }
    raf = requestAnimationFrame(frame);
  }

  const ro = new ResizeObserver(resize);
  ro.observe(document.body);
  resize();
  raf = requestAnimationFrame(frame);

  // Re-bake sprites when the theme hue or light/dark mode changes, since
  // the sprite colors are baked in rather than read live.
  const observer = new MutationObserver(() => rebuildSprites(canvas.clientWidth, canvas.clientHeight));
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
  observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    observer.disconnect();
  };
}
