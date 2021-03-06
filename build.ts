import { dirname, relative, resolve } from 'path'
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs'
import { performance } from 'perf_hooks'
import { SpawnOptions } from 'child_process'

import spawn from 'cross-spawn'
import { minify } from 'terser'
import { transformSync } from '@babel/core'
import { walkSync, emptyDirSync, WalkOptions } from '@chrstntdd/node'
import { transform, Transform } from 'sucrase'

import {
  BUILD_DIRECTORY,
  CLIENT_LIB,
  SECURE_SERVER_KEYS,
  SOURCE_DIRECTORY
} from './src/paths'

import mainBabelConfig from './.babelrc'

type Compiler = 'sucrase' | 'babel'

type BuildConfig = { compiler: Compiler; moduleTarget: 'esm' | 'cjs' }

const SOURCE_EXT = /\.(ts|mjs)x?$/,
  BLANK_LINES_REGEXP = /^\s*$(?:\r\n?|\n)/gm,
  WALK_OPTS: WalkOptions = {
    filter: fileName =>
      !!(
        !fileName.endsWith('.spec.js') &&
        !fileName.endsWith('.d.ts') &&
        SOURCE_EXT.test(fileName)
      )
  },
  DEFAULT_CONFIG: BuildConfig = {
    compiler: 'sucrase',
    moduleTarget: 'cjs'
  },
  IS_PRODUCTION = process.env.NODE_ENV === 'production',
  SPAWN_OPTS: SpawnOptions = { stdio: 'inherit' }

let makePathRelative = (path: string) => relative(process.cwd(), path)

let removeOldFiles = async (path: string) => {
  console.log('🧨  REMOVED', path)
  existsSync(path) && emptyDirSync(path)
}

let makeDirIfNonExistent = (path: string) => {
  !existsSync(path) && mkdirSync(path, { recursive: true })
}

let makeSecureKeys = (dirWithKeys: string, name: string) => {
  ;['.crt', '.key'].forEach(ext => {
    let fileName = `${name}${ext}`
    if (!existsSync(resolve(dirWithKeys, fileName))) {
      mkdirSync(dirWithKeys, { recursive: true })
      console.log(`🔑  Writing new ${fileName}`)

      spawn.sync(
        'openssl',
        ['genrsa', '-out', './keys/localhost.key', '2048'],
        SPAWN_OPTS
      )
      spawn.sync(
        'openssl',
        [
          'req',
          '-new',
          '-x509',
          '-key',
          './keys/localhost.key',
          '-out',
          './keys/localhost.crt',
          '-days',
          '3650',
          '-subj',
          '/CN=locahost'
        ],
        SPAWN_OPTS
      )
    } else {
      console.log(
        "✅  Looks like you've already got some self signed keys and certs there, champ"
      )
    }
  })
}

async function main({ compiler, moduleTarget }: BuildConfig) {
  const start = performance.now()
  // Clear old files
  await Promise.all([
    removeOldFiles(CLIENT_LIB),
    removeOldFiles(BUILD_DIRECTORY)
  ])

  makeSecureKeys(SECURE_SERVER_KEYS, 'localhost')

  // Bundle with rollup
  spawn.sync('yarn', [`${IS_PRODUCTION ? 'prod' : 'dev'}:rollup`], {
    stdio: 'inherit'
  })

  for (let { name } of walkSync(SOURCE_DIRECTORY, WALK_OPTS)) {
    let compiledCode, finalSourceMap

    const isEsm = moduleTarget === 'esm'
    const content = readFileSync(name, 'UTF-8')
    const newName = name
      .replace('src', 'build')
      .replace(SOURCE_EXT, `.${isEsm ? 'm' : ''}js`)

    if (compiler === 'babel') {
      const { code, map } = transformSync(content, {
        ...mainBabelConfig,
        filename: name
      })
      compiledCode = code
      finalSourceMap = map.mappings
    } else {
      // Default to sucrase
      const { code, sourceMap } = transform(content, {
        jsxPragma: 'h',
        jsxFragmentPragma: 'Fragment',
        filePath: name,
        sourceMapOptions: {
          compiledFilename: newName
        },
        production: IS_PRODUCTION,
        transforms: ['typescript', 'jsx', !isEsm && 'imports'].filter(
          Boolean
        ) as Transform[]
      })
      compiledCode = code.replace(BLANK_LINES_REGEXP, '')
      finalSourceMap = sourceMap.mappings
    }

    makeDirIfNonExistent(dirname(newName))

    if (IS_PRODUCTION) {
      const { code, error } = minify(compiledCode)

      if (error) {
        throw error
      }

      if (code) {
        compiledCode = code
      }
    }

    writeFileSync(newName, compiledCode, 'UTF-8')

    finalSourceMap
      ? writeFileSync(`${newName}.map`, finalSourceMap, 'UTF-8')
      : console.log(`NO MAP FOR ${newName}`)

    console.log(`📝  Wrote ${makePathRelative(newName)}`)
  }

  const end = performance.now()

  console.log(
    `\n🤑  All built. Took ${((end - start) / 1000).toFixed(3)} seconds.\n`
  )
}

process.on('uncaughtException', e => {
  console.error(e)
})
process.on('unhandledRejection', e => {
  console.error(e)
})

require.main === module &&
  main(DEFAULT_CONFIG).catch(err => {
    console.error(err)
  })
