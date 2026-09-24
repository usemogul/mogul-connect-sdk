import { afterEach, describe, expect, it, vi } from 'vitest'
import { MogulConnect } from './index'
import type { MogulConnectOptions } from './create'

const ORIGIN = 'https://embed.usemogul.com'
const CLIENT_ID = 'mcci_test'

const tick = () => new Promise(resolve => setTimeout(resolve, 0))

/**
 * Mount the loader against a fresh container and replace the iframe's
 * `contentWindow` with a stub, so we can (a) assert exactly what the loader
 * posts and to which `targetOrigin`, and (b) use that same stub as the trusted
 * `event.source` for inbound messages.
 */
const setup = (overrides: Partial<MogulConnectOptions> = {}) => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const getToken = overrides.getToken ?? vi.fn(async () => 'jwt.header.payload')

  const handle = MogulConnect.create({
    origin: ORIGIN,
    container,
    getToken,
    clientId: CLIENT_ID,
    ...overrides,
  })

  const post = vi.fn()
  const frameWindow = { postMessage: post }
  Object.defineProperty(handle.iframe, 'contentWindow', {
    configurable: true,
    value: frameWindow,
  })

  const emit = (
    data: unknown,
    { origin = ORIGIN, source = frameWindow } = {},
  ) =>
    window.dispatchEvent(
      new MessageEvent('message', {
        data,
        origin,
        source: source as unknown as Window,
      }),
    )

  return { container, handle, getToken, post, emit, frameWindow }
}

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('MogulConnect.create', () => {
  it('mounts an iframe at /embed/connect with full width', () => {
    const { container, handle } = setup()
    const iframe = container.querySelector('iframe')
    expect(iframe).toBe(handle.iframe)
    expect(handle.iframe.src).toBe(`${ORIGIN}/embed/connect`)
    expect(handle.iframe.style.width).toBe('100%')
  })

  it('appends a preselected target as a path segment', () => {
    const { handle } = setup({ target: 'DISTROKID' })
    expect(handle.iframe.src).toBe(`${ORIGIN}/embed/connect/DISTROKID`)
  })

  it('answers mogul:ready with mogul:init to the exact embed origin, never "*"', async () => {
    const { handle, getToken, post, emit } = setup()
    emit({ type: 'mogul:ready' })
    await vi.waitFor(() => expect(post).toHaveBeenCalled())

    expect(getToken).toHaveBeenCalledTimes(1)
    expect(post).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'mogul:init',
        token: 'jwt.header.payload',
        clientId: CLIENT_ID,
      }),
      ORIGIN,
    )
    for (const [, targetOrigin] of post.mock.calls) {
      expect(targetOrigin).toBe(ORIGIN)
      expect(targetOrigin).not.toBe('*')
    }
    void handle
  })

  it('requires a clientId', () => {
    const container = document.createElement('div')
    const base = { origin: ORIGIN, container, getToken: async () => 't' }
    for (const clientId of [undefined, '']) {
      expect(() =>
        MogulConnect.create({
          ...base,
          clientId,
        } as unknown as MogulConnectOptions),
      ).toThrow('`clientId` is required')
    }
    expect(container.querySelector('iframe')).toBeNull()
  })

  it('never puts the token in the iframe URL', () => {
    const { handle } = setup({ getToken: async () => 'super.secret.jwt' })
    expect(handle.iframe.src).toBe(`${ORIGIN}/embed/connect`)
    expect(handle.iframe.src).not.toContain('super.secret.jwt')
  })

  it('ignores messages from the wrong origin', async () => {
    const { getToken, post, emit } = setup()
    emit({ type: 'mogul:ready' }, { origin: 'https://evil.example' })
    await tick()
    expect(getToken).not.toHaveBeenCalled()
    expect(post).not.toHaveBeenCalled()
  })

  it('ignores messages that do not come from its own frame', async () => {
    const { getToken, post, emit } = setup()
    emit({ type: 'mogul:ready' }, { source: { postMessage: vi.fn() } })
    await tick()
    expect(getToken).not.toHaveBeenCalled()
    expect(post).not.toHaveBeenCalled()
  })

  it('re-fetches a fresh token on mogul:request-token (refresh path)', async () => {
    const getToken = vi
      .fn<() => Promise<string>>()
      .mockResolvedValueOnce('token.one')
      .mockResolvedValueOnce('token.two')
    const { post, emit } = setup({ getToken })

    emit({ type: 'mogul:ready' })
    await vi.waitFor(() => expect(post).toHaveBeenCalledTimes(1))
    emit({ type: 'mogul:request-token' })
    await vi.waitFor(() => expect(post).toHaveBeenCalledTimes(2))

    expect(getToken).toHaveBeenCalledTimes(2)
    expect(post).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: 'mogul:init',
        token: 'token.two',
        clientId: CLIENT_ID,
      }),
      ORIGIN,
    )
  })

  it('sets the iframe height on mogul:resize by default', () => {
    const { handle, emit } = setup()
    emit({ type: 'mogul:resize', height: 640 })
    expect(handle.iframe.style.height).toBe('640px')
  })

  it('defers to onResize when provided, leaving height untouched', () => {
    const onResize = vi.fn()
    const { handle, emit } = setup({ onResize })
    emit({ type: 'mogul:resize', height: 640 })
    expect(onResize).toHaveBeenCalledWith(640)
    expect(handle.iframe.style.height).toBe('0px')
  })

  it('routes terminal events to their callbacks', () => {
    const onSuccess = vi.fn()
    const onExit = vi.fn()
    const onError = vi.fn()
    const { emit } = setup({ onSuccess, onExit, onError })

    emit({
      type: 'mogul:success',
      integrationId: 42,
      accountId: 'acct_1',
      connectedIdentity: {
        id: 'ext_1',
        name: 'Artist',
        accounts: [{ id: 'a1', name: 'A1' }],
      },
    })
    emit({ type: 'mogul:exit' })
    emit({ type: 'mogul:error', code: 'invalid_target' })

    expect(onSuccess).toHaveBeenCalledWith({
      integrationId: 42,
      accountId: 'acct_1',
      connectedIdentity: {
        id: 'ext_1',
        name: 'Artist',
        accounts: [{ id: 'a1', name: 'A1' }],
      },
    })
    expect(onExit).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenCalledWith({ code: 'invalid_target' })
  })

  it('destroy() removes the iframe and stops handling messages', async () => {
    const onSuccess = vi.fn()
    const { container, handle, emit } = setup({ onSuccess })
    handle.destroy()

    expect(container.querySelector('iframe')).toBeNull()
    emit({ type: 'mogul:success', integrationId: 1 })
    await tick()
    expect(onSuccess).not.toHaveBeenCalled()
  })
})
