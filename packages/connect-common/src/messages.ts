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

/** `mogul:error` codes, so neither side hard-codes the raw strings. */
export const CONNECT_ERROR_CODE = {
  /** Loader: the partner's `getToken()` threw. */
  tokenError: 'token_error',
  /** Frame: the preselected `/embed/connect/<target>` isn't a known source. */
  invalidTarget: 'invalid_target',
  /**
   * Frame: `mogul:init.clientId` doesn't match the session token's `client_id`
   * claim, so the token is refused.
   */
  clientMismatch: 'client_mismatch',
  /**
   * Frame: the connection succeeded, but the integration ID or a complete
   * identity couldn't be resolved, so no `mogul:success` is sent.
   */
  identityUnavailable: 'identity_unavailable',
} as const

export type ConnectErrorCode =
  (typeof CONNECT_ERROR_CODE)[keyof typeof CONNECT_ERROR_CODE]

/** Identity the connected source resolved to, parsed from the integration. */
export type ConnectedIdentity = {
  /** Source-side account/entity id. */
  id: string
  /** Display name (artist / label / handle) as the source reports it. */
  name: string
  /**
   * One entry per synced account: for a multi-account login, the accounts the
   * user chose in the picker; a single-account source has exactly one.
   */
  accounts: Array<{ id: string; name: string }>
}

/** Messages the frame sends to the parent — the loader listens for these. */
export type FrameMessage =
  | { type: 'mogul:ready' }
  | { type: 'mogul:request-token' }
  | { type: 'mogul:resize'; height: number }
  | {
      /**
       * Sent when the user dismisses the success screen (Done), and only when
       * every field below — including a name for every account — is present.
       * Otherwise the frame sends `mogul:error` `identity_unavailable` instead.
       */
      type: 'mogul:success'
      /** The created integration — the handle for later royalty-report API calls. */
      integrationId: number
      /** Mogul account the integration belongs to (from the session token). */
      accountId: string
      /** Identity parsed from the connected integration. */
      connectedIdentity: ConnectedIdentity
    }
  /**
   * Flow closed. Always follows the `mogul:success` or `mogul:error` for the
   * same completion, so the parent can safely tear the frame down here.
   */
  | { type: 'mogul:exit' }
  | {
      type: 'mogul:error'
      /**
       * A {@link ConnectErrorCode}, typed as `string` so older loaders keep
       * working when the frame adds a code.
       */
      code: string
    }

/** Messages the parent sends to the frame — the loader posts these. */
export type ParentMessage =
  | {
      type: 'mogul:init'
      token: string
      /**
       * Mogul-issued partner client ID (`mcci_…`). Identifies the partner; not a
       * secret. Must equal the token's `client_id` claim: on a mismatch (or a
       * token with no claim) the frame refuses the token and answers with
       * `mogul:error` `client_mismatch`.
       */
      clientId: string
      locale?: string
    }
  /** Reserved: the frame accepts and ignores it. */
  | { type: 'mogul:logout' }

export type FrameMessageType = FrameMessage['type']
export type ParentMessageType = ParentMessage['type']
