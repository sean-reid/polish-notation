export type Renderer = (latex: string) => string

let loading: Promise<Renderer> | null = null

// MathJax and its font are ~half the bundle, so they load as a split chunk
// after first paint.
export function loadRenderer(): Promise<Renderer> {
  loading ??= Promise.all([
    import('@mathjax/src/js/mathjax.js'),
    import('@mathjax/src/js/input/tex.js'),
    import('@mathjax/src/js/output/svg.js'),
    import('@mathjax/src/js/adaptors/liteAdaptor.js'),
    import('@mathjax/src/js/handlers/html.js'),
    import('@mathjax/mathjax-newcm-font/js/svg.js'),
    import('@mathjax/src/js/input/tex/base/BaseConfiguration.js'),
    import('@mathjax/src/js/input/tex/ams/AmsConfiguration.js'),
  ]).then(
    ([
      { mathjax },
      { TeX },
      { SVG },
      { liteAdaptor },
      { RegisterHTMLHandler },
      { MathJaxNewcmFont },
    ]) => {
      const adaptor = liteAdaptor()
      RegisterHTMLHandler(adaptor)
      const document = mathjax.document('', {
        InputJax: new TeX({ packages: ['base', 'ams'] }),
        OutputJax: new SVG({ fontData: MathJaxNewcmFont }),
      })
      return (latex: string) => {
        const node = document.convert(latex, { display: true })
        return adaptor.outerHTML(node)
      }
    },
  )
  return loading
}
