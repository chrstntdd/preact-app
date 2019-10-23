const createScriptTag = (src: string) =>
  `<script type="module" async defer src="${src}"></script>`

const makeDocumentHead = ({
  modulepreload,
  browserSupportsModulePreload,
  headTags = ''
}) => {
  let preloadTags = ''

  for (let mod of modulepreload.main) {
    if (browserSupportsModulePreload) {
      preloadTags += `<link rel="modulepreload" href="${mod}" />`
    } else {
      preloadTags += `<link rel="preload" as="script" crossorigin="anonymous" href="${mod}" />`
    }
  }

  return `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <link rel="icon" href="data:,">
      <meta http-equiv="X-UA-Compatible" content="IE=edge" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <style>
        *,
        *::after,
        *::before {
          box-sizing: border-box;
          -webkit-tap-highlight-color: rgba(0, 0, 0, 0);
        }
        html * {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        html,
        body {
          min-height: 100vh;
          min-width: 100vw;
          text-rendering: optimizeLegibility;
          font: 16px/1.8 -apple-system, BlinkMacSystemFont, Segoe UI, Roboto,
            Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue,
            sans-serif;
          color: #444;
        }
      </style>
      ${headTags}
      ${preloadTags}
    </head>
    <body>
      <div id="root">`
}

const makeFooter = ({ manifest }) => {
  return `</div>
    ${createScriptTag(manifest.main)}
    </body>
  </html>
  `
}

export { makeDocumentHead, makeFooter }
