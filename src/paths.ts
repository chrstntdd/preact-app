import { resolve } from 'path'

const PROJECT_ROOT = resolve(__dirname, '../'),
  BUILD_DIRECTORY = resolve(PROJECT_ROOT, 'build'),
  CLIENT_LIB = resolve(PROJECT_ROOT, 'lib'),
  SOURCE_DIRECTORY = resolve(PROJECT_ROOT, 'src'),
  BROWSER_ENTRY = resolve(SOURCE_DIRECTORY, 'browser.tsx')

export { PROJECT_ROOT, BUILD_DIRECTORY, SOURCE_DIRECTORY, BROWSER_ENTRY, CLIENT_LIB }
