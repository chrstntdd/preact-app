import { dirname, relative } from 'path'
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs'

import spawn from 'cross-spawn'
import { transformSync } from '@babel/core'
import { walkSync, emptyDirSync, WalkOptions } from '@chrstntdd/node'
import { transform, Transform } from 'sucrase'

import { SOURCE_DIRECTORY, CLIENT_LIB, BUILD_DIRECTORY } from './src/paths'

import mainBabelConfig from './.babelrc'

type Compiler = 'sucrase' | 'babel'

type BuildConfig = { compiler: Compiler; moduleTarget: 'esm' | 'cjs' }

const SOURCE_EXT = /\.(ts)x?$/,
  BLANK_LINES_REGEXP = /^\s*$(?:\r\n?|\n)/gm,
  WALK_OPTS: WalkOptions = {
    filter: fileName =>
      !!(!fileName.endsWith('.spec.js') && !fileName.endsWith('.d.ts') && SOURCE_EXT.test(fileName))
  },
  DEFAULT_CONFIG: BuildConfig = {
    compiler: 'babel',
    moduleTarget: 'cjs'
  },
  IS_PRODUCTION = process.env.NODE_ENV === 'production'

let makePathRelative = (path: string) => relative(process.cwd(), path)

let removeOldFiles = async (path: string) => {
  existsSync(path) && emptyDirSync(path)
}

let makeDirIfNonExistent = (path: string) => {
  !existsSync(path) && mkdirSync(path, { recursive: true })
}

async function main({ compiler, moduleTarget }: BuildConfig) {
  // Clear old files
  await Promise.all([removeOldFiles(CLIENT_LIB), removeOldFiles(BUILD_DIRECTORY)])

  // Bundle with rollup
  spawn('yarn', ['build:rollup'], { stdio: 'inherit' })

  for (let { name } of walkSync(SOURCE_DIRECTORY, WALK_OPTS)) {
    let compiledCode, finalSourceMap

    const isEsm = moduleTarget === 'esm'
    const content = readFileSync(name, 'UTF-8')
    const newName = name.replace('src', 'build').replace(SOURCE_EXT, `.${isEsm ? 'm' : ''}js`)

    if (compiler === 'babel') {
      const { code, map } = transformSync(content, { ...mainBabelConfig, filename: name })
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
        transforms: ['typescript', 'jsx', !isEsm && 'imports'].filter(Boolean) as Transform[]
      })
      compiledCode = code.replace(BLANK_LINES_REGEXP, '')
      finalSourceMap = sourceMap.mappings
    }

    makeDirIfNonExistent(dirname(newName))

    writeFileSync(newName, compiledCode, 'UTF-8')

    finalSourceMap
      ? writeFileSync(`${newName}.map`, finalSourceMap, 'UTF-8')
      : console.log(`NO MAP FOR ${newName}`)

    console.log(`📝  Wrote ${makePathRelative(newName)}`)
  }
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
