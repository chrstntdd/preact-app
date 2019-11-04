import { dirname, relative, resolve, basename } from 'path'
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs'
import { performance } from 'perf_hooks'
import { SpawnOptions } from 'child_process'

import { rollup, RollupOptions, OutputOptions } from 'rollup'
import spawn from 'cross-spawn'
import terser from 'terser'
import { transformSync } from '@babel/core'
import { walkSync, emptyDirSync, WalkOptions } from '@chrstntdd/node'
import { transform, Transform } from 'sucrase'

import {
  BUILD_DIRECTORY,
  CLIENT_LIB,
  SECURE_SERVER_KEYS,
  SOURCE_DIRECTORY
} from './src/paths'
import { memoize } from './src/server/util'

import mainBabelConfig from './.babelrc'
import mainRollupConfig from './rollup.config'

type Compiler = 'sucrase' | 'babel'

type BuildConfig = {
  compiler: Compiler
  minify?: boolean
  moduleTarget: 'esm' | 'cjs'
  moduleAlias?: Record<string, string>
}

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
    moduleTarget: 'cjs',
    moduleAlias: {
      'src/': SOURCE_DIRECTORY
    }
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

async function main({
  compiler,
  moduleTarget,
  minify = false,
  moduleAlias
}: BuildConfig) {
  const isEsm = moduleTarget === 'esm'
  const start = performance.now()
  // Clear old files
  await Promise.all([
    removeOldFiles(CLIENT_LIB),
    removeOldFiles(BUILD_DIRECTORY)
  ])

  makeSecureKeys(SECURE_SERVER_KEYS, 'localhost')

  buildWithRollup()

  for (let { name } of walkSync(SOURCE_DIRECTORY, WALK_OPTS)) {
    let compiledCode, finalSourceMap
    let fileContents = readFileSync(name, 'UTF-8')
    const newName = name
      .replace('src', 'build')
      .replace(SOURCE_EXT, `.${isEsm ? 'm' : ''}js`)

    // TODO: implement reliable path alias transforms
    if (basename(name).includes('main.ts')) {
      fileContents = transformImportStatements(fileContents, {
        moduleAlias,
        name
      })
    }

    if (compiler === 'babel') {
      const { code, map } = transformSync(fileContents, {
        ...mainBabelConfig,
        filename: name
      })
      compiledCode = code
      finalSourceMap = map
    } else {
      // Default to sucrase
      const { code, sourceMap } = transform(fileContents, {
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
      finalSourceMap = sourceMap
    }

    makeDirIfNonExistent(dirname(newName))

    if (minify) {
      const { code, error } = terser.minify(compiledCode)

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

function buildWithRollup() {
  mainRollupConfig.forEach(async build => {
    try {
      const bundle = await rollup({ ...build, output: void 0 } as RollupOptions)

      const outputOptions = build.output as OutputOptions

      await bundle.generate(outputOptions)

      await bundle.write(outputOptions)
    } catch (error) {
      console.log('🍣  Encountered an error bundling with rollup')
      throw error
    }
  })
}

/**
 * Parses ES6 module import statements
 * - Used for aliasing for now
 */
function transformImportStatements(
  fileContents: string,
  { moduleAlias, name }
): string {
  let importEntries: Map<string, any> | undefined
  const lines = fileContents.split('\n')

  for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
    const lineContent = lines[lineNumber]
    const hasImportKeyword = lineContent.startsWith('import ')
    const terminatedWithSemiColon = lineContent.endsWith(';')
    const lastChar = lineContent[lineContent.length - 1]

    // TODO: look into being able to parse multiple import statements on the same line
    // We currently assume that the input will not be minified tho.
    if (
      // Standard JS with semicolons in the authored source
      (hasImportKeyword && terminatedWithSemiColon) ||
      // For cool kids who do not need semicolons
      (hasImportKeyword && /'|"/.test(lastChar))
    ) {
      // Initialize
      if (!importEntries) {
        importEntries = new Map()
      }

      importEntries.set(lineContent, { lineNumber, end: lineContent.length })
    }

    // Started to parse non-imports
    if (lineContent.trim() && !hasImportKeyword) {
      break
    }
  }

  let transformedInput = fileContents
  const mappings = Object.keys(moduleAlias)

  if (importEntries) {
    for (let [originalLine] of importEntries) {
      const importPath: string = getImportPath(originalLine)

      // This is so brittle but works in the single use case right now
      for (let i = 0; i < mappings.length; i++) {
        const aliasedPath = mappings[i]

        if (importPath.includes(aliasedPath)) {
          // make import relative to current file
          const aliasVal = moduleAlias[aliasedPath]
          const relativePath = relative(dirname(name), aliasVal)
          const remappedImport = originalLine.replace(
            aliasedPath,
            `${relativePath}/`
          )
          // Final transformation
          transformedInput = transformedInput.replace(
            originalLine,
            remappedImport
          )
        }
      }
    }
  }

  return transformedInput
}

const getImportPath = memoize(function getImportPath(
  importLine: string
): string {
  return importLine
    .slice(importLine.indexOf('from') + 4, importLine.length)
    .trim()
})

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
