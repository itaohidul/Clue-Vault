import { Buffer } from 'buffer';

class MemoryStorage implements Storage {
  private data: Record<string, string> = {};

  get length(): number {
    return Object.keys(this.data).length;
  }

  clear(): void {
    this.data = {};
  }

  getItem(key: string): string | null {
    return this.data.hasOwnProperty(key) ? this.data[key] : null;
  }

  key(index: number): string | null {
    const keys = Object.keys(this.data);
    return index >= 0 && index < keys.length ? keys[index] : null;
  }

  removeItem(key: string): void {
    delete this.data[key];
  }

  setItem(key: string, value: string): void {
    this.data[key] = String(value);
  }
}

if (typeof window !== 'undefined') {
  window.Buffer = Buffer;
  (window as any).global = window;
  (window as any).process = { 
    ...(window as any).process,
    env: { NODE_ENV: import.meta.env.MODE },
    version: '',
    nextTick: (cb: any) => setTimeout(cb, 0),
    browser: true,
    stdout: { write: () => {} },
    stderr: { write: () => {} }
  };

  let isStorageBlocked = false;
  try {
    const test = window.localStorage;
    if (!test) {
      isStorageBlocked = true;
    } else {
      window.localStorage.setItem('__test_ls_blocked__', '1');
      window.localStorage.removeItem('__test_ls_blocked__');
    }
  } catch (e) {
    isStorageBlocked = true;
  }

  if (isStorageBlocked) {
    console.warn("[Polyfills] Native localStorage is blocked or unavailable. Applying robust in-memory storage fallback.");
    const mockLocalStorage = new MemoryStorage();
    const mockSessionStorage = new MemoryStorage();

    const defineBlockedStorage = (obj: any, prop: string, value: any) => {
      try {
        Object.defineProperty(obj, prop, {
          value: value,
          writable: true,
          configurable: true,
          enumerable: true
        });
      } catch (err) {
        try {
          // Fallback definition on Window prototype
          Object.defineProperty(Object.getPrototypeOf(obj), prop, {
            get: () => value,
            configurable: true,
            enumerable: true
          });
        } catch (err2) {
          console.error(`[Polyfills] Failed to polyfill ${prop}:`, err2);
        }
      }
    };

    defineBlockedStorage(window, 'localStorage', mockLocalStorage);
    defineBlockedStorage(window, 'sessionStorage', mockSessionStorage);
  }
}


