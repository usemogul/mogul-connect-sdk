# Mogul Connect SDK

SDK packages for the embeddable Mogul Connect component.

| package                                               | description                                                                                                                                                                                                            |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`@usemogul/connect-js`](packages/connect-js)         | Loader library used by Mogul Connect partners to embed the component in their external application. Responsible for mounting the embed iframe and running the `postMessage` handshake. Ships ESM + UMD/global + types. |
| [`@usemogul/connect-common`](packages/connect-common) | Shared schemas (message types, event-name constants, error codes, validators). Also consumed by the main Mogul application. Ships ESM + CJS + types.                                                                   |

`connect-js` depends on `connect-common` and bundles it, so partners install a
single package; `connect-common` is published independently for the Mogul application
to consume, so the contract can't drift between the two sides.

## Develop

```sh
npm install            # installs all workspaces
npm test               # runs every package's tests
npm run typecheck
npm run build          # builds every package
npm run lint
npm run dev            # serves the connect-js demo harness on http://localhost:4000
```

Per-package commands: `npm run <script> -w @usemogul/connect-js` (or
`-w @usemogul/connect-common`).
