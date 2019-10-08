import h2 from 'http2'

const TERMINATE_SIGNALS: NodeJS.Signals[] = ['SIGINT', 'SIGTERM', 'SIGQUIT']

function createShutdownMiddleware(server: h2.Http2SecureServer) {
  let isShuttingDown = false

  function makeGracefulExitHandler(signal: NodeJS.Signals) {
    return function gracefulExit() {
      if (isShuttingDown) return

      isShuttingDown = true

      // Don't bother with graceful shutdown in development
      if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
        process.exit(0)
      }

      console.warn(`\nReceived kill signal (${signal}), shutting down...`)

      server.close(() => {
        console.info('Closed out remaining connections')
        process.exit(1)
      })
      setImmediate(() => {
        server.emit('close')
      })
    }
  }

  TERMINATE_SIGNALS.forEach(sig => {
    process.on(sig, makeGracefulExitHandler(sig))
  })

  return function shutDownMiddleware(ctx, next) {
    if (isShuttingDown) {
      ctx.status = 503
      ctx.set('Connection', 'close')
      ctx.body = 'Server is in the process of reing'
    } else {
      return next()
    }
  }
}

export { createShutdownMiddleware }
