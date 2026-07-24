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
