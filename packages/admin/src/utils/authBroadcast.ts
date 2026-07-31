// Cross-tab auth signalling.
//
// The auth cookie is shared by every tab on the origin, but each tab holds its
// own in-memory copy of the user. Signing out in one tab therefore left all the
// others rendering an authenticated shell until they happened to navigate and
// re-run the router guard — the user sees a working Admin that 401s on the next
// click.
//
// BroadcastChannel closes that gap without polling or a `storage` shim: it is
// scoped to the same origin, delivers to every other same-origin context
// (including the embedded Wizard iframe, which shares the origin), and never
// echoes back to the sender.

const CHANNEL_NAME = 'brand-constructor-auth'

export interface AuthBroadcastMessage {
  type: 'logout'
}

function openChannel(): BroadcastChannel | null {
  // Not available in some private-mode / older-Safari contexts. Cross-tab sync
  // is an enhancement, so degrade silently rather than breaking sign-out.
  if (typeof BroadcastChannel === 'undefined') return null
  try {
    return new BroadcastChannel(CHANNEL_NAME)
  } catch {
    return null
  }
}

/** Tell every other tab that this one signed out. */
export function broadcastLogout(): void {
  const channel = openChannel()
  if (!channel) return
  try {
    const message: AuthBroadcastMessage = { type: 'logout' }
    channel.postMessage(message)
  } finally {
    channel.close()
  }
}

/** Subscribe to auth events from other tabs. Safe to call once at boot. */
export function onRemoteLogout(handler: () => void): void {
  const channel = openChannel()
  if (!channel) return
  channel.addEventListener('message', (event: MessageEvent<AuthBroadcastMessage>) => {
    if (event.data?.type === 'logout') handler()
  })
}
