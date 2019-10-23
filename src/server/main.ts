import h2 from 'http2'
import { resolve } from 'path'
import { readFileSync } from 'fs'

import Koa from 'koa'
import Logger from 'koa-logger'
import Static from 'koa-static'
import KoaRouter from 'koa-router'
import Helmet from 'koa-helmet'
import uaParser from 'ua-parser-js'

import { CLIENT_LIB, SECURE_SERVER_KEYS } from '../paths'

import { makeDocumentHead, makeFooter } from './html-template'
import { renderAppToString } from './render-app'
import { createShutdownMiddleware } from './graceful-shutdown-middleware'

interface CustomContext {
  res: h2.Http2ServerResponse
}

const app = new Koa<any, CustomContext>()
const router = new KoaRouter<any, CustomContext>()

const PORT = process.env.PORT || 3000,
  ENV = app.env

let MANIFEST, PRELOAD_MANIFEST

router.get('/(.*)', ({ request, res }) => {
  try {
    MANIFEST =
      MANIFEST ||
      JSON.parse(readFileSync(`${CLIENT_LIB}/manifest.json`, 'UTF-8'))
    PRELOAD_MANIFEST =
      PRELOAD_MANIFEST ||
      JSON.parse(readFileSync(`${CLIENT_LIB}/modulepreload.json`, 'UTF-8'))
    const ua = uaParser(request.headers['user-agent'])

    const { app, headTags } = renderAppToString(request.path)

    const templateData = {
      manifest: MANIFEST,
      modulepreload: PRELOAD_MANIFEST,
      browserSupportsModulePreload: ua.engine.name === 'Blink',
      headTags
    }

    const header = makeDocumentHead(templateData)

    res.stream.respond({ ':status': 200 })

    res.stream.write(header)
    res.stream.write(app)
    res.stream.end(makeFooter(templateData))
  } catch (error) {
    throw error
  }
})

let server: h2.Http2SecureServer

const SECURE_KEY_PATH = resolve(SECURE_SERVER_KEYS, 'localhost.key'),
  SECURE_CERT_PATH = resolve(SECURE_SERVER_KEYS, 'localhost.crt')

const runServer = async (port = PORT) => {
  try {
    await new Promise((resolve, reject) => {
      server = h2
        .createSecureServer(
          {
            key: readFileSync(SECURE_KEY_PATH, 'UTF-8'),
            cert: readFileSync(SECURE_CERT_PATH, 'UTF-8')
          },
          app.callback()
        )
        .listen(port, 'localhost' as any, function() {
          const { address, port } = this.address()
          const protocol = this.addContext ? 'https' : 'http'
          console.log(
            `Listening @ ${protocol}://${address}:${port} in a ${ENV} environment.`
          )
          resolve()
        })
        .on('sessionError', e => {
          reject(e)
        })

      app.use(createShutdownMiddleware(server))
      app.use(Static(CLIENT_LIB))
      app.use(Helmet())
      app.use(Logger())

      app.use(router.routes())
      app.use(router.allowedMethods())
    })
  } catch (error) {
    console.error(error)
  }
}

process.on('uncaughtException', e => {
  console.log('UNCAUGHT')
  throw e
})
process.on('unhandledRejection', e => {
  console.log('UNHANDLED')
  throw e
})

runServer()
  .then()
  .catch(err => console.error(err))
