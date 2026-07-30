# Canonical Hill GPU viewer evidence

Question: Does the actual Hill of Hills debug viewer—not the isolated GPU assay—present GPU-resident causal terrain and the exact indexed Lerm in one visible canvas, preserve actor/support/presentation identity, retain producer history after departure, and remain pixel-stable at a frozen generation?

Result: Yes in `run_004`. The canonical viewer presents the familiar Hill camera and controls, imports the exact `719024` Lerm from one retained offscreen actor surface, advances terrain through compact producer events on WebGPU, and retains the resulting path after the actor departs. The frozen 1100 ms generation produced zero changed pixels across four repeat captures. The same-generation actor/no-actor differential contains 855 changed pixels inside the projected actor-root evidence region. External browser-capture decoding found 339,486 terrain pixels and 74,625 changed terrain pixels between the early control and post-departure generation. No uncaptured GPU validation error was present.

Route:

- repo: `/Users/noahlyons/dev/lerms`
- worktree: `/private/tmp/lerms-hill-gpu-causal-state-0728`
- branch: `cc/hill-gpu-causal-state-0728`
- implementation base before this uncommitted evidence run: `12d40554b076ef6b29d70cdf3fba67ab977199f0`
- command: `node tests/hill-of-hills-gpu-canonical-viewer-browser-witness.mjs --url http://127.0.0.1:4193/ --output-root artifacts/hill-gpu-canonical-viewer/run_004`
- requested viewer: `lerms/hill-of-hills/primary-viewer-gpu-resident-v0`
- effective terrain: `lerms/hill-of-hills/gpu-resident-causal-state-v0`
- actor: `lerms/lerm-horde/primary-viewer-actor-frame-v0`
- backend/device: WebGPU, Apple, Metal 3
- fallback/stale: `none` / `fresh`
- viewport: 1600 x 1000 CSS pixels at device scale 1
- source times: episode A 1100 ms; episode B 4300 ms; departure 6622 ms
- recorded: 2026-07-30T16:16:52Z

Images:

- `run_004/actor-present.png`: exact Lerm visible during episode A on the current GPU-presented Hill generation.
- `run_004/same-generation-actor-hidden.png`: same source time and terrain generation with only the actor visual withheld; this is the pixel-differential control.
- `run_004/second-episode.png`: fresh episode B actor over terrain carrying episode A history.
- `run_004/after-departure.png`: actor absent while GPU-resident terrain pressure remains.
- `run_004/phase-strip.png`: episode A, episode B, and post-departure frames from the actual canonical viewer.
- `run_004/receipt.json`: route, device, presentation/support identity, transfer, pixel, and frozen-generation receipts.

Run history:

- `run_001` is an important false-closure artifact. Its first harness version reported actor pixels from unrelated changing diagnostic text while the external actor texture was actually rejected by WebGPU because it lacked `RenderAttachment` usage. Visual inspection caught the lie. Do not use its `ok: true` as acceptance evidence.
- `run_002` is the first visually working one-canvas compositor capture after repairing the external-image texture usage and restricting actor-pixel evidence to the projected actor region.
- `run_003` adds the true three-state GPU phase strip.
- `run_004` adds explicit Apple/Metal adapter identity and fails on uncaptured GPU errors; it is the accepted evidence run.

Important image hashes for `run_004`:

- `actor-present.png`: `780146479d2fb917406424d1234d19a2e219a8ced889349ea2a78cd611751042`
- `same-generation-actor-hidden.png`: `82ec9d30e24b2aebeeea6f02e0e2c3dcbf09009f98f8dfa1b1a7e53c3e7b1cd9`
- `second-episode.png`: `858999ba75a3b263e0bf6ea269f5006a2aca8baad95686cc5b41a9f429e489d2`
- `after-departure.png`: `3a7d651498fc58b4a63376de14fd04e4342a5ed179a983c2b7c314a535d1624a`
- `phase-strip.png`: `d11867e88a5ba8ea6f2b6cf7e321dc569e85e4a0de87050d02980dd557758a4c`

Does not prove: visual material quality has converged; the current brown pressure response is intentionally blunt and too broad for final art direction. It also does not prove the CPU oracle can be removed yet. The CPU reference runtime still produces the actor/controller and compact seven-station support binding; the load-bearing claim here is that full terrain updates and presentation are GPU-resident, with one initialization upload, zero post-initialization full-field worker transfers, and zero full-field readbacks.
