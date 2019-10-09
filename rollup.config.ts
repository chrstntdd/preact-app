import Rollup from 'rollup'
import path, { resolve } from 'path'
import { brotliCompressSync, gzipSync } from 'zlib'

import { filterSync } from '@chrstntdd/common'
import babel from 'rollup-plugin-babel'
import commonjs from 'rollup-plugin-commonjs'
import nodeResolve from 'rollup-plugin-node-resolve'
import replace from 'rollup-plugin-replace'
import { terser } from 'rollup-plugin-terser'
import progress from 'rollup-plugin-progress'

function compressionPlugin() {
  return {
    name: 'rollup-compression-plugin',
    generateBundle(options, bundle) {
      for (const [name, assetInfo] of filterSync(
        Object.entries(bundle),
        ([name]) => /\.(ts|mjs)x?$/.test(name)
      )) {
        const bufContent = Buffer.from(assetInfo.code, 'utf-8')

        this.emitFile({
          type: 'asset',
          fileName: `${name}.br`,
          source: brotliCompressSync(bufContent)
        })
        this.emitFile({
          type: 'asset',
          fileName: `${name}.gz`,
          source: gzipSync(bufContent)
        })
      }
    }
  }
}

const mainBabelConfig = require('./.babelrc.js')

const BROWSER_ENTRY = resolve(__dirname, './src/client/browser.tsx')

const IS_DEVELOPMENT = process.env.NODE_ENV === 'development',
  IS_PRODUCTION = process.env.NODE_ENV === 'production'

const extensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs']
const EXTERNALS = ['react', 'react-dom']

// NOTE: this value must be defined outside of the plugin because it needs
// to persist from build to build (e.g. the module and nomodule builds).
// If, in the future, the build process were to extends beyond just this rollup
// config, then the manifest would have to be initialized from a file, but
// since everything  is currently being built here, it's OK to just initialize
// it as an empty object object when the build starts.
const manifest = {}

/**
 * A Rollup plugin to generate a manifest of chunk names to their filenames
 * (including their content hash). This manifest is then used by the template
 * to point to the currect URL.
 * @return {Object}
 */
function manifestPlugin() {
  return {
    name: 'manifest',
    generateBundle(options, bundle) {
      for (const [name, assetInfo] of Object.entries(bundle)) {
        manifest[assetInfo.name] = name
      }

      this.emitFile({
        type: 'asset',
        fileName: 'manifest.json',
        source: JSON.stringify(manifest, null, 2)
      })
    }
  }
}

/**
 * A Rollup plugin to generate a list of import dependencies for each entry
 * point in the module graph. This is then used by the template to generate
 * the necessary `<link rel="modulepreload">` tags.
 * @return {Object}
 */
function modulepreloadPlugin() {
  return {
    name: 'modulepreload',
    generateBundle(options, bundle) {
      // A mapping of entry chunk names to their full dependency list.
      const modulepreloadMap = {}

      // Loop through all the chunks to detect entries.
      for (const [fileName, chunkInfo] of Object.entries(bundle)) {
        if (chunkInfo.isEntry || chunkInfo.isDynamicEntry) {
          modulepreloadMap[chunkInfo.name] = [fileName, ...chunkInfo.imports]
        }
      }

      this.emitFile({
        type: 'asset',
        fileName: 'modulepreload.json',
        source: JSON.stringify(modulepreloadMap, null, 2)
      })
    }
  }
}

function basePlugins({ nomodule = false } = {}) {
  const plugins = [
    progress({
      clearLine: false
    }),
    nodeResolve({ extensions }),
    commonjs({
      include: ['node_modules/**']
    }),
    babel({
      extensions,
      exclude: /node_modules/,
      presets: mainBabelConfig.presets,
      plugins: mainBabelConfig.plugins
    }),
    replace({
      'process.env.NODE_ENV': IS_DEVELOPMENT
        ? JSON.stringify('development')
        : JSON.stringify('production')
    }),
    manifestPlugin()
  ]
  if (process.env.NODE_ENV === 'production') {
    // TODO: enable if actually deploying this to production, but I have
    // minification off for now so it's easier to view the demo source.
    plugins.push(terser({ module: !nomodule, compress: true }))
  }
  return plugins
}

// Module config for <script type="module">
/** @type Rollup.RollupOptions */
const moduleConfig = {
  input: {
    main: BROWSER_ENTRY,
    ...(IS_DEVELOPMENT && { 'preact-devtools': 'preact/debug' })
  },
  output: {
    dir: './lib',
    format: 'esm',
    entryFileNames: '[name]-[hash].mjs',
    chunkFileNames: '[name]-[hash].mjs'
    // dynamicImportFunction: '__import__'
  },
  plugins: [
    ...basePlugins(),
    modulepreloadPlugin(),
    IS_PRODUCTION && compressionPlugin()
  ].filter(Boolean),
  manualChunks(id) {
    if (id.includes('node_modules')) {
      // The directory name following the last `node_modules`.
      // Usually this is the package, but it could also be the scope.
      const directories = id.split(path.sep)
      const name = directories[directories.lastIndexOf('node_modules') + 1]

      // Group react dependencies into a common "react" chunk.
      // NOTE: This isn't strictly necessary for this app, but it's include
      // to show how it's done.
      if (name.match(/^react/) || ['prop-types', 'scheduler'].includes(name)) {
        return 'react'
      }

      // Group `tslib` and `dynamic-import-polyfill` into the default bundle.
      // NOTE: This isn't strictly necessary for this app, but it's include
      // to show how it's done.
      if (name === 'tslib' || name === 'dynamic-import-polyfill') {
        return
      }

      // Otherwise just return the name.
      return name
    }
  },
  external: EXTERNALS,
  watch: {
    clearScreen: false
  }
}

// Legacy config for <script nomodule>
const nomoduleConfig = {
  input: {
    nomodule: BROWSER_ENTRY
  },
  output: {
    dir: './lib',
    format: 'iife',
    entryFileNames: '[name]-[hash].js',
    name: 'nomodule.js',
    globals: {
      react: 'React'
    }
  },
  plugins: [
    ...basePlugins({ nomodule: true }),
    IS_PRODUCTION && compressionPlugin()
  ].filter(Boolean),
  external: EXTERNALS,
  inlineDynamicImports: true,
  watch: {
    clearScreen: false
  }
}

const configs = [moduleConfig]

if (IS_PRODUCTION) {
  configs.push(nomoduleConfig)
}

export default configs
