import { useRef, useState } from 'react'
import { downloadPng, downloadSvg } from './render/download'

type Props = {
  title: string
  latex: string
  html: string
  stale: boolean
  slug: string
}

export default function FormulaCard({ title, latex, html, stale, slug }: Props) {
  const formulaRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const copy = async () => {
    await navigator.clipboard.writeText(latex)
    setCopied(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), 1500)
  }

  return (
    <section className={`card${stale ? ' stale' : ''}`} aria-label={title}>
      <header className="card-head">
        <h2>{title}</h2>
        <span className={`copied${copied ? ' show' : ''}`} role="status">
          Copied
        </span>
      </header>
      <button
        type="button"
        className="formula"
        title="Copy LaTeX"
        onClick={copy}
        aria-label={`Copy the ${title} LaTeX`}
      >
        <div ref={formulaRef} className="formula-svg" dangerouslySetInnerHTML={{ __html: html }} />
      </button>
      <footer className="card-foot">
        <code className="latex-source" title={latex}>
          {latex}
        </code>
        <div className="card-actions">
          <button
            type="button"
            onClick={() => formulaRef.current && downloadSvg(formulaRef.current, `${slug}.svg`)}
          >
            SVG
          </button>
          <button
            type="button"
            onClick={() => formulaRef.current && downloadPng(formulaRef.current, `${slug}.png`)}
          >
            PNG
          </button>
        </div>
      </footer>
    </section>
  )
}
