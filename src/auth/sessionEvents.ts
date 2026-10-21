/** Decouples "the API said 401" from React.
 *
 * `services/api.ts` must not import the auth provider (that would be a cycle and
 * would drag React into every service module). Instead the response interceptor
 * emits here and the provider subscribes, so there is exactly one place that
 * reacts to an unauthorized response.
 */

type UnauthorizedListener = () => void

const listeners = new Set<UnauthorizedListener>()

export function onUnauthorized(listener: UnauthorizedListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function emitUnauthorized(): void {
  for (const listener of [...listeners]) {
    listener()
  }
}
