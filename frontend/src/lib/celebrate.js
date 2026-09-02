const PALETTE = ["#8e2b3a", "#a98a4b", "#16233b", "#f2f6f1", "#bfccc1"];

/**
 * Confetti in the page's own colours, loaded on demand so the 2.5 KB library never
 * touches the first paint. Honours prefers-reduced-motion via canvas-confetti's own
 * flag, which degrades to a single static burst.
 */
export async function celebrate() {
  const { default: confetti } = await import("canvas-confetti");

  const common = { colors: PALETTE, disableForReducedMotion: true, scalar: 0.9 };

  confetti({ ...common, particleCount: 90, spread: 80, startVelocity: 45, origin: { y: 0.6 } });

  const sides = [
    { angle: 60, origin: { x: 0, y: 0.7 } },
    { angle: 120, origin: { x: 1, y: 0.7 } },
  ];
  sides.forEach((side, index) => {
    setTimeout(() => {
      confetti({ ...common, ...side, particleCount: 60, spread: 65, startVelocity: 50 });
    }, 220 + index * 160);
  });

  setTimeout(() => {
    confetti({ ...common, particleCount: 70, spread: 110, startVelocity: 35, origin: { y: 0.4 } });
  }, 750);
}
