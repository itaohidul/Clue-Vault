import { Buffer } from 'buffer';

if (typeof window !== 'undefined') {
  window.Buffer = Buffer;
  (window as any).global = window;
  (window as any).process = { 
    ...(window as any).process,
    env: { NODE_ENV: import.meta.env.MODE },
    version: '',
    nextTick: (cb: any) => setTimeout(cb, 0),
    browser: true 
  };
}
