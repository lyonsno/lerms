import {
  hillTopographicContourAmount,
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
const quietPhase = hillOverlayStrokeStyle('phaseDitch', 1, { topologyLineStrength: 0.18 });
const mutedPhase = hillOverlayStrokeStyle('phaseDitch', 1, { topologyLineStrength: 0 });
const contourStrong = hillOverlayStrokeStyle('topographicContour', 1, { topographicContourStrength: 1 });
const contourMuted = hillOverlayStrokeStyle('topographicContour', 1, { topographicContourStrength: 0 });

assert(trailSoft.alpha < 0.28, 'weak trail strokes stay visually quiet');
assert(trailStrong.alpha <= 0.42, 'strong trail strokes are softer than old debug hatch marks');
assert(trailStrong.lineWidth <= 3.8, 'strong trail strokes stay narrow enough to read as worn paths');
assert(trailStrong.lineWidth > trailSoft.lineWidth, 'trail width still scales with local strength');
assert(trailStrong.strokeStyle.includes(String(trailStrong.alpha.toFixed(3))), 'trail rgba style includes computed alpha');

assert(phaseStrong.alpha <= 0.46, 'phase ditch overlay is capped below old heavy debug alpha');
assert(phaseStrong.lineWidth <= 6.1, 'phase ditch overlay is capped below old heavy debug width');
assert(ditchStrong.alpha <= 0.38, 'ditch-potential overlay is quiet enough to sit under terrain');
assert(ditchStrong.lineWidth <= 3.9, 'ditch-potential overlay stays thinner than the prior dark bars');
assert(quietPhase.alpha < phaseStrong.alpha * 0.55, 'topology line strength can make proof strokes visibly subordinate');
assert(quietPhase.lineWidth < phaseStrong.lineWidth, 'topology line strength narrows proof strokes as well as fading them');
assert(mutedPhase.alpha === 0, 'topology line strength can fully hide proof strokes without disabling topology motion');

assert(contourStrong.alpha > 0.12, 'topographic contour strokes are visible when enabled');
assert(contourStrong.alpha < phaseStrong.alpha, 'topographic contour strokes stay softer than topology proof strokes');
assert(contourStrong.lineWidth <= 1.8, 'topographic contours read as fine height bands instead of debug bars');
assert(contourMuted.alpha === 0, 'topographic contour strength can fully hide contours');
assert(contourStrong.strokeStyle.includes(String(contourStrong.alpha.toFixed(3))), 'contour rgba style includes computed alpha');

assert(hillTopographicContourAmount(1.2, 0.6, 0.045) === 1, 'contour amount peaks on exact height bands');
assert(hillTopographicContourAmount(1.23, 0.6, 0.045) > 0, 'contour amount has a small drawable shoulder near height bands');
assert(hillTopographicContourAmount(1.32, 0.6, 0.045) === 0, 'contour amount falls away between height bands');

assert(!shouldBreakHillTrailStroke(3, 0.9, 12), 'short strong trail runs stay continuous');
assert(shouldBreakHillTrailStroke(10, 0.24, 12), 'long weak trail runs break into softer worn marks');
assert(shouldBreakHillTrailStroke(13, 0.9, 12), 'very long strong trail runs still get a visual breathing gap');

console.log('hill of hills overlay style contracts ok');
