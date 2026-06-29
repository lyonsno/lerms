import {
  hillOverlayStrokeStyle,
  shouldBreakHillTrailStroke
} from '../src/terrain/hill-of-hills-overlay-style.js';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const trailSoft = hillOverlayStrokeStyle('trail', 0.28);
const trailStrong = hillOverlayStrokeStyle('trail', 1);
const phaseStrong = hillOverlayStrokeStyle('phaseDitch', 1);
const ditchStrong = hillOverlayStrokeStyle('ditch', 1);

assert(trailSoft.alpha < 0.28, 'weak trail strokes stay visually quiet');
assert(trailStrong.alpha <= 0.42, 'strong trail strokes are softer than old debug hatch marks');
assert(trailStrong.lineWidth <= 3.8, 'strong trail strokes stay narrow enough to read as worn paths');
assert(trailStrong.lineWidth > trailSoft.lineWidth, 'trail width still scales with local strength');
assert(trailStrong.strokeStyle.includes(String(trailStrong.alpha.toFixed(3))), 'trail rgba style includes computed alpha');

assert(phaseStrong.alpha <= 0.46, 'phase ditch overlay is capped below old heavy debug alpha');
assert(phaseStrong.lineWidth <= 6.1, 'phase ditch overlay is capped below old heavy debug width');
assert(ditchStrong.alpha <= 0.38, 'ditch-potential overlay is quiet enough to sit under terrain');
assert(ditchStrong.lineWidth <= 3.9, 'ditch-potential overlay stays thinner than the prior dark bars');

assert(!shouldBreakHillTrailStroke(3, 0.9, 12), 'short strong trail runs stay continuous');
assert(shouldBreakHillTrailStroke(10, 0.24, 12), 'long weak trail runs break into softer worn marks');
assert(shouldBreakHillTrailStroke(13, 0.9, 12), 'very long strong trail runs still get a visual breathing gap');

console.log('hill of hills overlay style contracts ok');
