import { resolve } from 'path'

const PROJECT_ROOT = resolve(__dirname, '../'),
  SOURCE_DIRECTORY = resolve(PROJECT_ROOT, 'src'),
  BUILD_DIRECTORY = resolve(PROJECT_ROOT, 'build'),
  CLIENT_LIB = resolve(PROJECT_ROOT, 'lib'),
  SECURE_SERVER_KEYS = resolve(PROJECT_ROOT, 'keys')

export { BUILD_DIRECTORY, CLIENT_LIB, SECURE_SERVER_KEYS, SOURCE_DIRECTORY }
