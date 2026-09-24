import { parseFrameMessage, type ParentMessage } from '@usemogul/connect-common'

/** Identity the connected source resolved to, parsed from the integration. */
export type MogulConnectedIdentity = {
  id: string
  name: string
  accounts: Array<{ id: string; name: string }>
}

/** Payload passed to `onSuccess` when a source connects. */
export type MogulConnectSuccess = {
  /** The created integration — the handle for later royalty-report API calls. */
  integrationId: number
  /** Mogul account the integration belongs to. */
  accountId: string
  /** Identity parsed from the connected integration. */
  connectedIdentity: MogulConnectedIdentity
}

export type MogulConnectOptions = {
  /** Embed host origin, e.g. `https://embed.usemogul.com`. */
  origin: string
  /** Element the iframe is mounted into. */
  container: HTMLElement
  /**
   * Partner-supplied source of the session token. Called on `mogul:ready` and on
   * every `mogul:request-token`, so design it as always-fresh (re-mint / refresh
   * on demand) rather than returning one static token.
   */
  getToken: () => Promise<string>
  /** Preselected `IntegrationTarget` → `/embed/connect/<target>`. Not a secret. */
  target?: string
  locale?: string
  onReady?: () => void
  /** Defaults to setting `iframe.style.height`. Provide to take over sizing. */
  onResize?: (height: number) => void
  onSuccess?: (result: MogulConnectSuccess) => void
  onExit?: () => void
  onError?: (err: { code: string }) => void
}

export type MogulConnectHandle = {
  /** The mounted iframe element. */
  readonly iframe: HTMLIFrameElement
  /** Reserved: posts `mogul:logout` (the frame is a no-op on it today). */
  logout: () => void
  /** Removes the message listener and the iframe. Idempotent. */
  destroy: () => void
}

const buildSrc = (embedOrigin: string, target?: string): string => {
  const base = `${embedOrigin}/embed/connect`
  return target ? `${base}/${encodeURIComponent(target)}` : base
}

/**
 * Build and mount the connect iframe, then run the parent side of the
 * `postMessage` handshake. Security invariants enforced here:
 * every inbound message is checked against our own frame **and** the exact embed
 * origin before it is acted on, and every outbound message targets that exact
 * origin — never `'*'`. The token travels only over `postMessage`, never in the
 * iframe URL.
 */
export const create = (options: MogulConnectOptions): MogulConnectHandle => {
  const { container, getToken, target, locale } = options
  if (!options.origin) throw new Error('MogulConnect: `origin` is required')
  if (!container) throw new Error('MogulConnect: `container` is required')
  if (typeof getToken !== 'function') {
    throw new Error('MogulConnect: `getToken` is required')
  }

  // Normalize to a bare origin so the targetOrigin checks below are exact.
  const embedOrigin = new URL(options.origin).origin

  const iframe = document.createElement('iframe')
  iframe.src = buildSrc(embedOrigin, target)
  iframe.title = 'Mogul Connect'
  iframe.style.width = '100%'
  iframe.style.border = '0'
  iframe.style.height = '0px'

  let destroyed = false
  // Dedupe overlapping token fetches (e.g. a `ready` immediately followed by a
  // `request-token`): each `getToken()` is always-fresh, so one in-flight
  // request is enough to answer both.
  let tokenRequestInFlight = false

  const post = (message: ParentMessage): void => {
    iframe.contentWindow?.postMessage(message, embedOrigin)
  }

  const sendInit = async (): Promise<void> => {
    if (destroyed || tokenRequestInFlight) return
    tokenRequestInFlight = true
    try {
      const token = await getToken()
      if (destroyed) return
      if (typeof token === 'string' && token.length > 0) {
        post({ type: 'mogul:init', token, locale })
      }
    } catch {
      options.onError?.({ code: 'token_error' })
    } finally {
      tokenRequestInFlight = false
    }
  }

  const onMessage = (event: MessageEvent): void => {
    if (destroyed) return
    // Bind to our own frame, then require an exact origin match, then validate
    // the shape. Order matters: never touch the payload of a stray message.
    if (event.source !== iframe.contentWindow) return
    if (event.origin !== embedOrigin) return
    const message = parseFrameMessage(event.data)
    if (!message) return

    switch (message.type) {
      case 'mogul:ready':
        options.onReady?.()
        void sendInit()
        break
      case 'mogul:request-token':
        void sendInit()
        break
      case 'mogul:resize':
        if (options.onResize) options.onResize(message.height)
        else iframe.style.height = `${message.height}px`
        break
      case 'mogul:success':
        options.onSuccess?.({
          integrationId: message.integrationId,
          accountId: message.accountId,
          connectedIdentity: message.connectedIdentity,
        })
        break
      case 'mogul:exit':
        options.onExit?.()
        break
      case 'mogul:error':
        options.onError?.({ code: message.code })
        break
    }
  }

  // Listen before mounting: the frame posts `mogul:ready` as soon as it loads,
  // so the parent must already be listening.
  window.addEventListener('message', onMessage)
  container.appendChild(iframe)

  return {
    iframe,
    logout: () => {
      if (!destroyed) post({ type: 'mogul:logout' })
    },
    destroy: () => {
      if (destroyed) return
      destroyed = true
      window.removeEventListener('message', onMessage)
      iframe.remove()
    },
  }
}
