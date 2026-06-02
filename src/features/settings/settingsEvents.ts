type SettingListener = (value: string) => void;

const listenersByKey = new Map<string, Set<SettingListener>>();

export function subscribeToSetting(key: string, listener: SettingListener) {
  const listeners = listenersByKey.get(key) ?? new Set<SettingListener>();
  listeners.add(listener);
  listenersByKey.set(key, listeners);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      listenersByKey.delete(key);
    }
  };
}

export function emitSettingChange(key: string, value: string) {
  const listeners = listenersByKey.get(key);
  if (!listeners) {
    return;
  }

  for (const listener of listeners) {
    listener(value);
  }
}
