declare global {
  interface Window {
    requestIdleCallback(cb: (deadline: any) => any): NodeJS.Timer
    cancelIdleCallback(id: NodeJS.Timer): void
  }
}

export {}
