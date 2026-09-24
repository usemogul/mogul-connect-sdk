import type { ConnectedIdentity, FrameMessage, ParentMessage } from './messages'

/**
 * Parse the optional `connectedIdentity` payload. All fields are required, so a
 * partially-formed identity is rejected entirely (returns `undefined`); the
 * payload itself may still be absent.
 */
const parseConnectedIdentity = (
  value: unknown,
): ConnectedIdentity | undefined => {
  if (typeof value !== 'object' || value === null) return undefined
  const raw = value as Record<string, unknown>
  if (typeof raw.id !== 'string') return undefined
  if (typeof raw.name !== 'string') return undefined
  if (!Array.isArray(raw.accounts)) return undefined

  const accounts: Array<{ id: string; name: string }> = []
  for (const entry of raw.accounts) {
    if (typeof entry !== 'object' || entry === null) return undefined
    const acc = entry as Record<string, unknown>
    if (typeof acc.id !== 'string' || typeof acc.name !== 'string') {
      return undefined
    }
    accounts.push({ id: acc.id, name: acc.name })
  }

  return { id: raw.id, name: raw.name, accounts }
}

/**
 * Narrow untrusted `postMessage` data to a known {@link FrameMessage}. Check the
 * discriminant first, then the payload shape. Anything that doesn't match
 * returns `null` and must be ignored by the caller — the origin/source checks
 * happen separately, before this runs.
 */
export const parseFrameMessage = (data: unknown): FrameMessage | null => {
  if (typeof data !== 'object' || data === null) return null
  const message = data as Record<string, unknown>

  switch (message.type) {
    case 'mogul:ready':
    case 'mogul:request-token':
    case 'mogul:exit':
      return { type: message.type }
    case 'mogul:resize':
      return typeof message.height === 'number'
        ? { type: 'mogul:resize', height: message.height }
        : null
    case 'mogul:success': {
      const connectedIdentity = parseConnectedIdentity(
        message.connectedIdentity,
      )
      return typeof message.integrationId === 'number' &&
        typeof message.accountId === 'string' &&
        connectedIdentity
        ? {
            type: 'mogul:success',
            integrationId: message.integrationId,
            accountId: message.accountId,
            connectedIdentity,
          }
        : null
    }
    case 'mogul:error':
      return typeof message.code === 'string'
        ? { type: 'mogul:error', code: message.code }
        : null
    default:
      return null
  }
}

/**
 * Narrow untrusted `postMessage` data to a known {@link ParentMessage} — the
 * frame's counterpart to {@link parseFrameMessage}. The returned object is
 * rebuilt from the checked fields, so extra keys never reach the frame. Anything
 * that doesn't match returns `null`; the origin check happens separately, before
 * this runs.
 */
export const parseParentMessage = (data: unknown): ParentMessage | null => {
  if (typeof data !== 'object' || data === null) return null
  const message = data as Record<string, unknown>

  switch (message.type) {
    case 'mogul:init': {
      const { token, clientId, locale } = message
      if (typeof token !== 'string' || token.length === 0) return null
      if (typeof clientId !== 'string' || clientId.length === 0) return null
      // A malformed `locale` is dropped rather than rejecting the whole init.
      return typeof locale === 'string'
        ? { type: 'mogul:init', token, clientId, locale }
        : { type: 'mogul:init', token, clientId }
    }
    case 'mogul:logout':
      return { type: 'mogul:logout' }
    default:
      return null
  }
}
