import type { JuniorIgniteApi } from '@shared/apiContract'

declare global {
  interface Window {
    api: JuniorIgniteApi
  }
}

export {}
