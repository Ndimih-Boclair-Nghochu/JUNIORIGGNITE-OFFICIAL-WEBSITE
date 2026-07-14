import type { JuniorIgniteApi } from '@shared/apiContract'

declare global {
  interface Window {
    api: JuniorIgniteApi
  }
}

declare module '*.png' {
  const src: string
  export default src
}

export {}
