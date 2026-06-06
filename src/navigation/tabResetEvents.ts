type TabResetListener = () => void;

const listenersByRoute = new Map<string, Set<TabResetListener>>();

export function emitTabReset(route: string) {
  const listeners = listenersByRoute.get(route);
  if (!listeners) {
    return;
  }

  for (const listener of listeners) {
    listener();
  }
}

export function subscribeToTabReset(route: string, listener: TabResetListener) {
  const listeners = listenersByRoute.get(route) ?? new Set<TabResetListener>();
  listeners.add(listener);
  listenersByRoute.set(route, listeners);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      listenersByRoute.delete(route);
    }
  };
}
