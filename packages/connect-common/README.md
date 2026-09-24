# `@usemogul/connect-common`

Shared schemas for the Mogul Connect embedded component. This is the single source of truth for
the `postMessage` contract between the Mogul application and the partner-side
loader (`@usemogul/connect-js`). Both sides depend on this package so the message
shapes can't drift.

Zero runtime dependencies. Ships ESM + TypeScript types.

## Exports

- `FrameMessage` / `ParentMessage` — the message unions
- `ConnectedIdentity` — identity payload carried on `mogul:success`
- `FRAME_EVENT` / `PARENT_EVENT` — event-name constants
- `parseFrameMessage(data)` — validates untrusted `postMessage` data into a known
  `FrameMessage`, or `null`.

```ts
import { parseFrameMessage, type ParentMessage } from '@usemogul/connect-common'
```

Consumed by `@usemogul/connect-js` (bundled at build time) and by the Mogul application.
