# Lerm Horde Producer-History Composition Receipt

This artifact records the first live Lerm Horde composition of a current
Kaminos creature-motion producer into Hill of Hills' reviewed
`lerms.hill-of-hills.producer-contact-history.v0` inlet.

## Source Identity

- LERMS candidate: `cc/lerm-horde-live-producer-history-0723@1014904b64c8e2adef257bafc0a2489cab0e56a1`
- Hill base: `cc/hill-producer-contact-history-0723@653175725ed695094a7420247ef4b9f96b988125`
- Producer source: `cc/mushfinger-motion-ready-719024-0720@ced6db3d2ed3325ae86f781ab9d7d565dc6d5f58`
- Producer checkout: `cc/lerm-horde-producer-ced6db3d@ced6db3d2ed3325ae86f781ab9d7d565dc6d5f58`
- Producer module SHA-256: `ffce984721d00468856e70bd0805961a852d8690bcd402d1dc5ae96ad1ec88f0`
- Receipt SHA-256: `c56627554f5cacb8f151361419bfe70177e2d86490193e30b2f148a11b430b2e`

## Result

The producer selected the deterministic
`left-longitudinal-short` crossing after recording six rejected candidates. It
emitted 15 strictly monotonic root samples over 2.436 seconds, with 14 supported
roots and no complete stance contacts. Horde admitted that history once against
the exact prior Hill identity, preserved the traffic field after producer
departure, produced a topology-possibility checksum distinct from the
no-history control, replayed idempotently, and incurred zero support shock
resets.

The receipt intentionally preserves `motion-ready-719024` as
`producer-control-non-lerm`. It proves the producer-to-Horde-to-Hill composition
contract, not Lerm species semantics, a final Lerm body, or a visually inspected
moving-body scene. Contact history remains absent rather than inferred because
the producer did not supply a complete contact payload.

## Reproduction

From the clean LERMS candidate worktree at the revision above:

```sh
npm run witness:lerm-horde-producer-history -- \
  --lerms-repo-root /private/tmp/lerms-lerm-horde-live-producer-history-0723 \
  --producer-repo-root /private/tmp/kaminos-lerm-horde-producer-ced6db3d \
  --out artifacts/lerm-horde-producer-history/receipt.json
```

The witness rejects dirty source inputs, wrong revisions, fallback routes,
missing output, stale or partial evidence, altered source identity, non-monotonic
history, wrong prior-Hill targeting, lost post-departure traffic, no-history
equivalence, non-idempotent replay, and shock resets.

## Hill Operator Replay

Question: can Hill independently consume the reviewed live receipt and make its
causal consequence operator-visible without upgrading root support into contact
or Lerm-species evidence?

Result: yes. `operator-replay.png` and `operator-replay.svg` show the exact
no-history control, the history-admitted Hill, and the same Hill after producer
departure. The control carries no traffic. Admission creates one compact
producer-traffic band over 14 supported roots, and the identical traffic field
persists after departure. All three panels retain zero inferred contacts and
zero support-shock resets. The replay independently reproduces the receipt's
traffic and topology-possibility checksums before it renders.

Route:

- repo: `lerms`
- worktree: `/private/tmp/lerms-hill-producer-history-operator-replay-0724`
- branch: `cc/hill-producer-history-operator-replay-0724`
- replay implementation: `d1f3e841f84ae1ebfb5a2ba2dd58495bf8c5eb7a`
- receipt input: `receipt.json` at SHA-256 `c56627554f5cacb8f151361419bfe70177e2d86490193e30b2f148a11b430b2e`
- generated: `2026-07-24T00:57:47Z`
- effective Hill route: `lerms/hill-of-hills/producer-contact-history-v0`
- effective authority/backend/config: `live_simulation` / `cpu-live` / `hill-of-hills-live-v0`
- replay profile: `lerm-horde-live-producer-history-v0`, seed `414`, grid `48x60`, terrain `12x15`, phase duration `600ms`
- command:

```sh
npm run witness:hill-producer-history-replay -- \
  --input artifacts/lerm-horde-producer-history/receipt.json \
  --image-out artifacts/lerm-horde-producer-history/operator-replay.svg \
  --report-out artifacts/lerm-horde-producer-history/operator-replay.json
```

Images and reports:

- `operator-replay.png`: inspected raster rendering of the three-state replay;
  SHA-256 `7a8227a07cbaa42c73bc7d107eb73537e4b55171e28b9337e518f96106e8c699`.
- `operator-replay.svg`: primary deterministic replay image; SHA-256
  `c80f05025997a109e503fbb052215881b00cd9d0192742d16db4a2fd8ab2411a`.
- `operator-replay.json`: machine report with requested/effective source
  identity, independently replayed checksums, assertion results, and primary
  output status; SHA-256
  `eacd59287f04f377a8cd7b9dbea3391e8156f83e1060c7775f89c022d130bbae`.

This evidence does not prove a moving rendered creature, a final Lerm body,
complete stance contacts, or that the current traffic material is the desired
shipping art direction. It proves that Hill can independently replay, preserve,
and expose the reviewed producer-derived root history while keeping those
authority boundaries intact.
