/**
 * Mogul Connect — wire message schemas.
 *
 * The single source of truth for the `postMessage` contract between the Mogul
 * application (running in the iframe) and the partner-side loader
 * (`@usemogul/connect-js`). Both sides depend on this package so the shapes
 * can't drift.
 */

/** Event-name constants, so neither side hard-codes the raw strings. */
export const FRAME_EVENT = {
  ready: 'mogul:ready',
  requestToken: 'mogul:request-token',
  resize: 'mogul:resize',
  success: 'mogul:success',
  exit: 'mogul:exit',
  error: 'mogul:error',
} as const

export const PARENT_EVENT = {
  init: 'mogul:init',
  logout: 'mogul:logout',
} as const

/** Identity the connected source resolved to, parsed from the integration. */
export type ConnectedIdentity = {
  /** Source-side account/entity id. */
  id: string
  /** Display name (artist / label / handle) as the source reports it. */
  name: string
  /** One entry per connected account (a single-account target has one). */
  accounts: Array<{ id: string; name: string }>
}

/** Messages the frame sends to the parent — the loader listens for these. */
export type FrameMessage =
  | { type: 'mogul:ready' }
  | { type: 'mogul:request-token' }
  | { type: 'mogul:resize'; height: number }
  | {
      type: 'mogul:success'
      /** The created integration — the handle for later royalty-report API calls. */
      integrationId: number
      /** Mogul account the integration belongs to (from the session token). */
      accountId: string
      /** Identity parsed from the connected integration. */
      connectedIdentity: ConnectedIdentity
    }
  | { type: 'mogul:exit' }
  | { type: 'mogul:error'; code: string }

/** Messages the parent sends to the frame — the loader posts these. */
export type ParentMessage =
  | { type: 'mogul:init'; token: string; locale?: string }
  | { type: 'mogul:logout' }

export type FrameMessageType = FrameMessage['type']
export type ParentMessageType = ParentMessage['type']
