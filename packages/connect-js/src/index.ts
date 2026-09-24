import { create } from './create'

export type {
  MogulConnectOptions,
  MogulConnectHandle,
  MogulConnectSuccess,
  MogulConnectedIdentity,
} from './create'
export { create }

/**
 * Public entry:
 *
 * ```ts
 * const handle = MogulConnect.create({ origin, container, getToken })
 * handle.destroy()
 * ```
 *
 * Available as an ESM named import and, from the UMD/global build, as
 * `window.MogulConnect`.
 */
export const MogulConnect = { create }
