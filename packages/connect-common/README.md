# `@usemogul/connect-common`

Shared schemas for the Mogul Connect embedded component. This is the single source of truth for
the `postMessage` contract between the Mogul application and the partner-side
loader (`@usemogul/connect-js`). Both sides depend on this package so the message
shapes can't drift.

Zero runtime dependencies. Ships ESM + CJS + TypeScript types.

## Exports

- `FrameMessage` / `ParentMessage` — the message unions (`mogul:init` carries
  the session `token` and the partner's public `clientId`)
- `ConnectedIdentity` — identity payload carried on `mogul:success`
- `FRAME_EVENT` / `PARENT_EVENT` — event-name constants
- `CONNECT_ERROR_CODE` / `ConnectErrorCode` — the `mogul:error` codes
  (`token_error`, `invalid_target`, `client_mismatch`, `identity_unavailable`).
  `mogul:error.code` stays typed as `string` on the wire, so handle unknown codes.
- `parseFrameMessage(data)` — for the loader: validates untrusted `postMessage`
  data into a known `FrameMessage`, or `null`.
- `parseParentMessage(data)` — for the frame: validates untrusted `postMessage`
  data into a known `ParentMessage`, or `null`.

Both parsers rebuild the message from the checked fields, so unknown keys are
dropped. Check the message origin before calling them.

```ts
import { parseFrameMessage, type ParentMessage } from '@usemogul/connect-common'
```

Consumed by `@usemogul/connect-js` (bundled at build time) and by the Mogul application.
