import '@testing-library/jest-dom/vitest';

if (!Element.prototype.animate) {
  Element.prototype.animate = () => ({
    cancel: () => {},
    finish: () => {},
  } as Animation);
}
