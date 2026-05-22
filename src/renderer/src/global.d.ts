/// <reference types="vite/client" />

import type { StrApi } from '../../preload'

declare global {
  interface Window {
    str: StrApi
  }
}

export {}
