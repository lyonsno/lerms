import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assertHillParticleBrowserWitness } from './hill-particle-browser-witness-contract.mjs';

const revision = '355572977cdfdb7c27958994ede61ec967ac4623';
const supportRoute = 'lerms/hill-of-hills/gpu-moving-support-contact-v0';
const ownershipRoute = 'lerms/hill-of-hills/same-device-particle-ownership-v0';

function candidateReceipt() {
  const support = {
    route: supportRoute,
    terrainEpoch: 12,
    supportEpoch: 13,
    remapEpoch: 1,
    stale: false,
    fallbackRoute: null,
    hostReadbackVisibility: false
  };
  return {
    url: 'http://127.0.0.1:4197/?watershedParticles=1&watershedParticleCount=2400',
    screenshots: { particleOnlyBytes: 20_000 },
    particleObservation: {
      authority: 'browser_screenshot_pixel_readback',
      observedPixelCount: 8_000,
      blank: false
    },
    post: {
      portableOpticalProvider: { epochs: { terrain: 12, support: 13 } },
      particleOverlay: {
        requested: {
          enabled: true,
          kaminosRevision: revision,
          supportRoute,
          particleCount: 2_400
        },
        effective: {
          status: 'active',
          kaminosRevision: revision,
          supportRoute,
          fallbackRoute: null,
          defaultSubstitution: false
        },
        sourceAuthority: 'operator_smoke_fixture_not_live_hand',
        ownershipMount: {
          status: 'mounted',
          route: { requested: ownershipRoute, effective: ownershipRoute, fallback: null },
          kaminosRevision: { requested: revision, effective: revision },
          mode: { defaultSubstitution: false },
          ownership: {
            deviceIdentity: 'same_solver_and_renderer_device',
            bufferIdentity: 'exact_solver_material_tracer_buffer',
            capacity: 2_400
          },
          supportContact: {
            route: supportRoute,
            terrainEpoch: 12,
            supportEpoch: 13,
            remapEpoch: 1,
            stale: false,
            fallbackRoute: null
          }
        },
        support,
        solver: {
          available: true,
          solver_backend: 'webgpu_compute',
          render_backend: 'webgpu_direct_render',
          supportContactRoute: supportRoute,
          supportContact: {
            ...support,
            deviceMatchesSolver: true
          },
          liveInlets: { sourceLifecycle: 'dormant_pool_progressive_gpu_release' },
          diagnostics: {
            readbackMode: 'explicit_sparse_gpu_diagnostics_v0',
            activeParticleCount: 960,
            dormantParticleCount: 1_440,
            particleOwnership: {
              populationAccountingValid: true,
              accountingValid: true
            }
          }
        }
      }
    }
  };
}

assert.doesNotThrow(() => assertHillParticleBrowserWitness(candidateReceipt()));

for (const [label, mutate, expected] of [
  ['default substitution', receipt => {
    receipt.post.particleOverlay.effective.defaultSubstitution = true;
  }, /stale, substituted/],
  ['stale support', receipt => {
    receipt.post.particleOverlay.support.stale = true;
  }, /stale support/],
  ['pre-remap ownership receipt', receipt => {
    receipt.post.particleOverlay.ownershipMount.supportContact.remapEpoch = 0;
  }, /same-device ownership/],
  ['allocation inferred as active', receipt => {
    receipt.post.particleOverlay.solver.diagnostics = null;
  }, /active and dormant GPU/],
  ['partial population accounting', receipt => {
    receipt.post.particleOverlay.solver.diagnostics.dormantParticleCount = 1_000;
  }, /active and dormant GPU/],
  ['blank particle canvas', receipt => {
    receipt.particleObservation.observedPixelCount = 0;
    receipt.particleObservation.blank = true;
  }, /nonblank isolated/]
]) {
  const receipt = candidateReceipt();
  mutate(receipt);
  assert.throws(
    () => assertHillParticleBrowserWitness(receipt),
    expected,
    label
  );
}

console.log('hill particle browser witness contracts: ok');

const browserWitnessSource = readFileSync(
  new URL('./watershed-portable-optical-provider-browser-witness.mjs', import.meta.url),
  'utf8'
);
assert.match(
  browserWitnessSource,
  /catch \(error\)[\s\S]*lastTrustworthyEvidence[\s\S]*runId.*failure-receipt\.json/,
  'browser failures after launch must preserve a run-specific terminal receipt'
);
assert.match(
  browserWitnessSource,
  /exceptionDetails[\s\S]*particle diagnostics/,
  'particle diagnostics must preserve the browser exception instead of replacing it'
);
assert.match(
  browserWitnessSource,
  /Log\.entryAdded[\s\S]*browser-log-/,
  'browser witness must capture source-level CDP compiler log events'
);
assert.match(
  browserWitnessSource,
  /command\('Log\.enable'\)/,
  'browser witness must enable the CDP Log domain before runtime exercise'
);
assert.match(
  browserWitnessSource,
  /catch \(error\)[\s\S]*browserEvents[\s\S]*runId.*failure-receipt\.json/,
  'browser failure receipts must preserve accumulated compiler log events'
);
