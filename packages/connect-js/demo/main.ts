import { MogulConnect, type MogulConnectHandle } from '@usemogul/connect-js'

const byId = <T extends HTMLElement>(id: string): T =>
  document.getElementById(id) as T

const form = byId<HTMLFormElement>('config')
const originInput = byId<HTMLInputElement>('origin')
const clientIdInput = byId<HTMLInputElement>('client-id')
const targetInput = byId<HTMLInputElement>('target')
const tokenInput = byId<HTMLTextAreaElement>('token')
const container = byId<HTMLDivElement>('container')
const destroyButton = byId<HTMLButtonElement>('destroy')
const logEl = byId<HTMLPreElement>('log')

const log = (...parts: unknown[]) => {
  const line = parts
    .map(part => (typeof part === 'string' ? part : JSON.stringify(part)))
    .join(' ')
  logEl.textContent += `${line}\n`
  logEl.scrollTop = logEl.scrollHeight
}

let handle: MogulConnectHandle | null = null

form.addEventListener('submit', event => {
  event.preventDefault()
  handle?.destroy()
  logEl.textContent = ''

  const origin = originInput.value.trim()
  const clientId = clientIdInput.value.trim()
  const target = targetInput.value.trim() || undefined
  const token = tokenInput.value.trim()
  log('mounting', origin, clientId, target ?? '(no target)')

  handle = MogulConnect.create({
    origin,
    clientId,
    target,
    container,
    getToken: async () => {
      log('→ getToken()')
      if (!token) log('  (no token pasted — the handshake will stall)')
      return token
    },
    onReady: () => log('← ready'),
    onResize: height => {
      log('← resize', height)
      const iframe = container.querySelector('iframe')
      if (iframe) iframe.style.height = `${height}px`
    },
    onSuccess: result => log('← success', result),
    onExit: () => log('← exit'),
    onError: err => log('← error', err),
  })

  destroyButton.disabled = false
})

destroyButton.addEventListener('click', () => {
  handle?.destroy()
  handle = null
  destroyButton.disabled = true
  log('destroyed')
})
