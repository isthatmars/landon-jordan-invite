"use client";

import { useCallback, useSyncExternalStore } from "react";

type Store = { dismissed: boolean; hydrated: boolean; listeners: Set<() => void> };

/** Start dismissed to match SSR; hydrate from sessionStorage on first subscribe. */
const stores = new Map<string, Store>();

function storeFor(key: string) {
  let store = stores.get(key);
  if (!store) {
    store = { dismissed: true, hydrated: false, listeners: new Set() };
    stores.set(key, store);
  }
  return store;
}

function readDismissed(key: string) {
  try {
    return sessionStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function notify(store: Store) {
  store.listeners.forEach((listener) => listener());
}

/** Once-per-session flag for touch hints: `[dismissed, dismiss]`. */
export function useSessionDismiss(key: string) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const store = storeFor(key);
      store.listeners.add(onChange);
      if (!store.hydrated) {
        store.hydrated = true;
        const next = readDismissed(key);
        if (next !== store.dismissed) {
          store.dismissed = next;
          queueMicrotask(() => notify(store));
        }
      }
      return () => {
        store.listeners.delete(onChange);
      };
    },
    [key],
  );

  const dismissed = useSyncExternalStore(
    subscribe,
    () => storeFor(key).dismissed,
    () => true,
  );

  const dismiss = useCallback(() => {
    const store = storeFor(key);
    if (store.dismissed) return;
    store.dismissed = true;
    try {
      sessionStorage.setItem(key, "1");
    } catch {
      /* private mode / blocked storage */
    }
    notify(store);
  }, [key]);

  return [dismissed, dismiss] as const;
}
