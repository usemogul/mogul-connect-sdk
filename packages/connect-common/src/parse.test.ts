import { describe, expect, it } from 'vitest'
import { parseFrameMessage, parseParentMessage } from './index'

describe('parseFrameMessage', () => {
  it('accepts the no-payload events', () => {
    for (const type of ['mogul:ready', 'mogul:request-token', 'mogul:exit']) {
      expect(parseFrameMessage({ type })).toEqual({ type })
    }
  })

  it('validates resize height', () => {
    expect(parseFrameMessage({ type: 'mogul:resize', height: 640 })).toEqual({
      type: 'mogul:resize',
      height: 640,
    })
    expect(parseFrameMessage({ type: 'mogul:resize' })).toBeNull()
    expect(
      parseFrameMessage({ type: 'mogul:resize', height: '640' }),
    ).toBeNull()
  })

  it('accepts a fully-formed success message', () => {
    const success = {
      type: 'mogul:success',
      integrationId: 7,
      accountId: 'acct_1',
      connectedIdentity: {
        id: 'ext_1',
        name: 'Artist',
        accounts: [
          { id: 'a1', name: 'A1' },
          { id: 'a2', name: 'A2' },
        ],
      },
    }
    expect(parseFrameMessage(success)).toEqual(success)
  })

  it('rejects a success message missing any required field', () => {
    const identity = {
      id: 'ext_1',
      name: 'Artist',
      accounts: [{ id: 'a1', name: 'A1' }],
    }
    const cases = [
      {
        type: 'mogul:success',
        accountId: 'acct_1',
        connectedIdentity: identity,
      }, // no integrationId
      { type: 'mogul:success', integrationId: 7, connectedIdentity: identity }, // no accountId
      { type: 'mogul:success', integrationId: 7, accountId: 'acct_1' }, // no connectedIdentity
      {
        type: 'mogul:success',
        integrationId: '7',
        accountId: 'acct_1',
        connectedIdentity: identity,
      }, // non-numeric integrationId
      {
        type: 'mogul:success',
        integrationId: 7,
        accountId: 'acct_1',
        connectedIdentity: { id: 'x', name: 'y' }, // incomplete identity (no accounts)
      },
    ]
    for (const c of cases) expect(parseFrameMessage(c)).toBeNull()
  })

  it('requires code on error', () => {
    expect(parseFrameMessage({ type: 'mogul:error', code: 'x' })).toEqual({
      type: 'mogul:error',
      code: 'x',
    })
    expect(parseFrameMessage({ type: 'mogul:error' })).toBeNull()
  })

  it('rejects non-objects, unknown types, and parent-only messages', () => {
    expect(parseFrameMessage(null)).toBeNull()
    expect(parseFrameMessage('mogul:ready')).toBeNull()
    expect(parseFrameMessage({ type: 'mogul:whatever' })).toBeNull()
    expect(parseFrameMessage({ type: 'mogul:init', token: 't' })).toBeNull()
  })
})

describe('parseParentMessage', () => {
  const init = { type: 'mogul:init', token: 'tok', clientId: 'mcci_1' }

  it('accepts a fully-formed init, with and without locale', () => {
    expect(parseParentMessage(init)).toStrictEqual(init)
    expect(parseParentMessage({ ...init, locale: 'en-US' })).toStrictEqual({
      ...init,
      locale: 'en-US',
    })
  })

  it('rejects an init missing or with an empty token or clientId', () => {
    const cases = [
      { type: 'mogul:init', clientId: 'mcci_1' }, // no token
      { type: 'mogul:init', token: '', clientId: 'mcci_1' }, // empty token
      { type: 'mogul:init', token: 'tok' }, // no clientId
      { type: 'mogul:init', token: 'tok', clientId: '' }, // empty clientId
      { type: 'mogul:init', token: 1, clientId: 'mcci_1' }, // non-string token
    ]
    for (const c of cases) expect(parseParentMessage(c)).toBeNull()
  })

  it('drops a non-string locale instead of rejecting', () => {
    expect(parseParentMessage({ ...init, locale: 42 })).toStrictEqual(init)
  })

  it('drops unknown keys', () => {
    expect(parseParentMessage({ ...init, extra: 'x' })).toStrictEqual(init)
    expect(
      parseParentMessage({ type: 'mogul:logout', extra: 'x' }),
    ).toStrictEqual({ type: 'mogul:logout' })
  })

  it('accepts logout', () => {
    expect(parseParentMessage({ type: 'mogul:logout' })).toStrictEqual({
      type: 'mogul:logout',
    })
  })

  it('rejects non-objects, unknown types, and frame-only messages', () => {
    expect(parseParentMessage(null)).toBeNull()
    expect(parseParentMessage('mogul:logout')).toBeNull()
    expect(parseParentMessage({ type: 'mogul:whatever' })).toBeNull()
    expect(parseParentMessage({ type: 'mogul:ready' })).toBeNull()
    expect(
      parseParentMessage({
        type: 'mogul:success',
        integrationId: 7,
        accountId: 'acct_1',
        connectedIdentity: { id: 'x', name: 'y', accounts: [] },
      }),
    ).toBeNull()
  })
})
