import { useEffect, useMemo, useState } from 'react'
import { convert, type Conversion } from './logic/convert'
import FormulaCard from './FormulaCard'
import { loadRenderer, type Renderer } from './render/mathjax'

const EXAMPLES: [string, string][] = [
  ["Peirce's law", 'CCCpqpp'],
  ['De Morgan', '~(p & q) <-> (~p \\/ ~q)'],
  ['Possibility', 'EMpNLNp'],
  ['Quantified', '∀x (φ → ψ)'],
  ['Subscripts', "CKp1p2Ap1'q_{12}"],
]

const NOTATION_LABEL = {
  polish: 'Polish notation',
  conventional: 'Conventional notation',
  either: 'Either notation',
} as const

export default function Converter() {
  const [input, setInput] = useState('')
  const [renderer, setRenderer] = useState<Renderer | null>(null)
  const [lastGood, setLastGood] = useState<Conversion | null>(null)
  const [imageNote, setImageNote] = useState(false)

  useEffect(() => {
    let mounted = true
    loadRenderer().then((r) => {
      if (mounted) setRenderer(() => r)
    })
    return () => {
      mounted = false
    }
  }, [])

  const trimmed = input.trim()
  const result = useMemo(() => (trimmed ? convert(trimmed) : null), [trimmed])

  if (result?.ok && result !== lastGood) setLastGood(result)
  if (!trimmed && lastGood !== null) setLastGood(null)

  const shown = result?.ok ? result : lastGood
  const stale = !result?.ok && !!lastGood
  const error = result && !result.ok ? result : null

  const rejectImages = (items: DataTransferItemList | null) => {
    if (items && [...items].some((item) => item.kind === 'file')) {
      setImageNote(true)
      return true
    }
    return false
  }

  return (
    <div className="converter">
      <label className="visually-hidden" htmlFor="formula-input">
        Formula in Polish or conventional notation
      </label>
      <div className="input-wrap">
        <textarea
          id="formula-input"
          autoFocus
          spellCheck={false}
          placeholder="Type or paste a formula in either notation, e.g. CKpqr or (p ∧ q) → r"
          value={input}
          rows={2}
          onChange={(event) => {
            setInput(event.target.value)
            setImageNote(false)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setInput('')
          }}
          onPaste={(event) => {
            if (rejectImages(event.clipboardData?.items ?? null)) event.preventDefault()
          }}
          onDrop={(event) => {
            if (rejectImages(event.dataTransfer?.items ?? null)) event.preventDefault()
          }}
        />
        {input && (
          <button
            type="button"
            className="clear"
            aria-label="Clear input"
            title="Clear (Esc)"
            onClick={() => setInput('')}
          >
            ×
          </button>
        )}
      </div>

      <div className="input-status">
        {trimmed && (
          <span className={`badge${error ? ' badge-error' : ''}`} data-testid="badge">
            {error
              ? `Not yet valid ${NOTATION_LABEL[error.guess]}`
              : NOTATION_LABEL[shown!.detected]}
          </span>
        )}
        {imageNote && (
          <span className="hint" role="status">
            Image input is on the roadmap; for now, paste the formula as text or LaTeX.
          </span>
        )}
      </div>

      {error && (
        <div className="error" role="status" data-testid="error">
          <p>{error.error.message}</p>
          <pre aria-hidden="true">
            {trimmed.replace(/\s/g, ' ')}
            {'\n'}
            {' '.repeat(Math.min(error.error.position, trimmed.length))}^
          </pre>
        </div>
      )}

      {shown && (
        <div className="cards">
          <FormulaCard
            title="Polish notation"
            latex={shown.polish.latex}
            html={renderer ? renderer(shown.polish.latex) : ''}
            stale={stale}
            slug="polish-notation"
          />
          <FormulaCard
            title="Conventional notation"
            latex={shown.conventional.latex}
            html={renderer ? renderer(shown.conventional.latex) : ''}
            stale={stale}
            slug="conventional-notation"
          />
        </div>
      )}

      {!trimmed && (
        <div className="examples">
          <span>Try:</span>
          {EXAMPLES.map(([name, formula]) => (
            <button key={name} type="button" className="chip" onClick={() => setInput(formula)}>
              {name}
            </button>
          ))}
        </div>
      )}

      <details className="syntax">
        <summary>Supported syntax</summary>
        <table>
          <thead>
            <tr>
              <th scope="col">Concept</th>
              <th scope="col">Polish</th>
              <th scope="col">Conventional input</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Negation</td>
              <td>N</td>
              <td>¬, ~, !, \neg</td>
            </tr>
            <tr>
              <td>Conditional</td>
              <td>C</td>
              <td>{'→, ->, =>, ⊃, \\to'}</td>
            </tr>
            <tr>
              <td>Disjunction</td>
              <td>A</td>
              <td>∨, \/, \lor</td>
            </tr>
            <tr>
              <td>Conjunction</td>
              <td>K</td>
              <td>∧, &amp;, /\, ·, \land</td>
            </tr>
            <tr>
              <td>Non-conjunction</td>
              <td>D</td>
              <td>|, ↑, ⊼, \mid</td>
            </tr>
            <tr>
              <td>Biconditional</td>
              <td>E or Q</td>
              <td>{'↔, <->, ≡, \\leftrightarrow'}</td>
            </tr>
            <tr>
              <td>Universal quantifier</td>
              <td>Π</td>
              <td>∀x, \forall x</td>
            </tr>
            <tr>
              <td>Existential quantifier</td>
              <td>Σ</td>
              <td>∃x, \exists x</td>
            </tr>
            <tr>
              <td>Verum / falsum</td>
              <td>V / O</td>
              <td>⊤ / ⊥, \top / \bot</td>
            </tr>
            <tr>
              <td>Possibility</td>
              <td>M or Δ</td>
              <td>◇, \Diamond</td>
            </tr>
            <tr>
              <td>Necessity</td>
              <td>L or Γ</td>
              <td>□, \Box</td>
            </tr>
            <tr>
              <td>Variables</td>
              <td colSpan={2}>
                a to z and greek letters, with subscripts and primes: p, φ, x1, p_{'{'}12{'}'}, q_i,
                p′
              </td>
            </tr>
          </tbody>
        </table>
        <p>
          Precedence, tightest first: ¬ and quantifiers, then | (parenthesize chains), ∧, ∨, →, ↔.
          Conditionals and biconditionals associate to the right.
        </p>
      </details>
    </div>
  )
}
