const MODERN = true /* process.env.MODERN === 'true' */

const sharedConfig = {
  presets: [
    [require.resolve('@babel/preset-typescript'), { jsxPragma: 'h' }],
    [
      require.resolve('@babel/preset-env'),
      {
        // shippedProposals: true,
        // corejs: 3,
        // useBuiltIns: 'usage',
        loose: true,
        // modules: options.modules || false,
        targets: {
          browsers: MODERN
            ? [
                // NOTE: I'm not using the `esmodules` target due to this issue:
                // https://github.com/babel/babel/issues/8809
                'last 2 Chrome versions',
                'last 2 Safari versions',
                'last 2 iOS versions',
                'last 2 Edge versions',
                'Firefox ESR'
              ]
            : ['ie 11']
        },
        exclude: ['transform-regenerator', 'transform-async-to-generator']
      }
    ]
  ],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
        alias: {
          react: 'preact/compat',
          'react-dom': 'preact/compat'
        }
      }
    ],
    require.resolve('@babel/plugin-syntax-dynamic-import'),
    [require.resolve('@babel/plugin-proposal-class-properties'), { loose: true }],
    [require.resolve('@babel/plugin-transform-react-jsx'), { pragma: 'h', pragmaFrag: 'Fragment' }],
    ['module:fast-async', { spec: true }]
  ]
}

const mainBabelConfig = {
  sourceMaps: true,
  ...sharedConfig
}

module.exports = mainBabelConfig
