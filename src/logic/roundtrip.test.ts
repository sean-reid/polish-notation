import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { atom, equal, type Atom, type Formula } from './ast'
import { convert } from './convert'
import { parseConventional } from './parseConventional'
import { parsePolish } from './parsePolish'
import { printConventionalLatex, printPolish, printPolishLatex } from './print'

const atomArb: fc.Arbitrary<Atom> = fc
  .tuple(
    fc.constantFrom('p', 'q', 'r', 's', 'x', 'y', 'φ', 'ψ', 'χ', 'α'),
    fc.constantFrom('', '1', '2', '12', 'i', 'ij', 'i1'),
    fc.integer({ min: 0, max: 3 }),
  )
  .map(([name, sub, primes]) => atom(name, sub, primes))

const formulaArb: fc.Arbitrary<Formula> = fc.letrec<{ formula: Formula }>((tie) => ({
  formula: fc.oneof(
    { maxDepth: 6, withCrossShrink: true },
    atomArb,
    fc.constantFrom<Formula>({ kind: 'const', op: 'top' }, { kind: 'const', op: 'bot' }),
    fc.record({
      kind: fc.constant('unary' as const),
      op: fc.constantFrom('not' as const, 'box' as const, 'diamond' as const),
      body: tie('formula'),
    }),
    fc.record({
      kind: fc.constant('binary' as const),
      op: fc.constantFrom(
        'and' as const,
        'or' as const,
        'imp' as const,
        'iff' as const,
        'nand' as const,
      ),
      left: tie('formula'),
      right: tie('formula'),
    }),
    fc.record({
      kind: fc.constant('quant' as const),
      op: fc.constantFrom('forall' as const, 'exists' as const),
      variable: atomArb,
      body: tie('formula'),
    }),
  ),
})).formula

describe('round trips', () => {
  it('printPolish then parsePolish is the identity', () => {
    fc.assert(
      fc.property(formulaArb, (formula) => {
        const printed = printPolish(formula)
        const reparsed = parsePolish(printed)
        expect(reparsed.ok, printed).toBe(true)
        if (reparsed.ok) expect(equal(reparsed.formula, formula), printed).toBe(true)
      }),
      { numRuns: 500 },
    )
  })

  it('printConventionalLatex then parseConventional is the identity', () => {
    fc.assert(
      fc.property(formulaArb, (formula) => {
        const printed = printConventionalLatex(formula)
        const reparsed = parseConventional(printed)
        expect(reparsed.ok, printed).toBe(true)
        if (reparsed.ok) expect(equal(reparsed.formula, formula), printed).toBe(true)
      }),
      { numRuns: 500 },
    )
  })

  it('printPolishLatex then parsePolish is the identity', () => {
    fc.assert(
      fc.property(formulaArb, (formula) => {
        const printed = printPolishLatex(formula)
        const reparsed = parsePolish(printed)
        expect(reparsed.ok, printed).toBe(true)
        if (reparsed.ok) expect(equal(reparsed.formula, formula), printed).toBe(true)
      }),
      { numRuns: 500 },
    )
  })
})

// Sources: Łukasiewicz, Elements of Mathematical Logic (1929); Łukasiewicz,
// Selected Works (1970); Meredith, "Single axioms for the systems (C, N),
// (C, O) and (A, N)" (1953); Hughes & Cresswell, A New Introduction to Modal
// Logic (1996).
describe('formulas from the literature', () => {
  const cases: [string, string, string][] = [
    ['Łukasiewicz axiom 1 (syllogism)', 'CCpqCCqrCpr', '(p \\to q) \\to (q \\to r) \\to p \\to r'],
    ['Łukasiewicz axiom 2 (Clavius)', 'CCNppp', '(\\neg p \\to p) \\to p'],
    ['Łukasiewicz axiom 3 (Duns Scotus)', 'CpCNpq', 'p \\to \\neg p \\to q'],
    [
      'Łukasiewicz shortest single axiom of the implicational calculus',
      'CCCpqrCCrpCsp',
      '((p \\to q) \\to r) \\to (r \\to p) \\to s \\to p',
    ],
    [
      'Meredith single axiom',
      'CCCCCpqCNrNsrtCCtpCsp',
      '((((p \\to q) \\to \\neg r \\to \\neg s) \\to r) \\to t) \\to (t \\to p) \\to s \\to p',
    ],
    ["Peirce's law", 'CCCpqpp', '((p \\to q) \\to p) \\to p'],
    ['De Morgan', 'ENKpqANpNq', '\\neg (p \\land q) \\leftrightarrow \\neg p \\lor \\neg q'],
    ['modal axiom T', 'CLpp', '\\Box p \\to p'],
    ['modal axiom 4', 'CLpLLp', '\\Box p \\to \\Box \\Box p'],
    ['modal axiom 5', 'CMpLMp', '\\Diamond p \\to \\Box \\Diamond p'],
    [
      'possibility as dual of necessity',
      'EMpNLNp',
      '\\Diamond p \\leftrightarrow \\neg \\Box \\neg p',
    ],
    ['distribution axiom K', 'CLCpqCLpLq', '\\Box (p \\to q) \\to \\Box p \\to \\Box q'],
  ]
  for (const [name, polish, conventional] of cases) {
    it(name, () => {
      const fromPolish = parsePolish(polish)
      expect(fromPolish.ok).toBe(true)
      if (!fromPolish.ok) return
      expect(printConventionalLatex(fromPolish.formula)).toBe(conventional)
      expect(printPolish(fromPolish.formula)).toBe(polish)
      const fromConventional = parseConventional(conventional)
      expect(fromConventional.ok).toBe(true)
      if (fromConventional.ok)
        expect(equal(fromConventional.formula, fromPolish.formula)).toBe(true)
    })
  }

  it('quantifier duality', () => {
    const fromPolish = parsePolish('EΣpNφΠpNφ')
    expect(fromPolish.ok).toBe(true)
    if (!fromPolish.ok) return
    expect(printConventionalLatex(fromPolish.formula)).toBe(
      '\\exists p \\, \\neg \\varphi \\leftrightarrow \\forall p \\, \\neg \\varphi',
    )
  })
})

describe('convert and detection', () => {
  it('detects Polish input', () => {
    const result = convert('CKpqr')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.detected).toBe('polish')
    expect(result.conventional.latex).toBe('p \\land q \\to r')
    expect(result.polish.text).toBe('CKpqr')
  })

  it('detects conventional input in each spelling family', () => {
    for (const input of ['(p ∧ q) → r', 'p & q -> r', '(p \\wedge q) \\to r']) {
      const result = convert(input)
      expect(result.ok, input).toBe(true)
      if (!result.ok) continue
      expect(result.detected, input).toBe('conventional')
      expect(result.polish.text, input).toBe('CKpqr')
    }
  })

  it('marks a lone atom as either notation', () => {
    const result = convert('p₁')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.detected).toBe('either')
    expect(result.polish.text).toBe('p1')
    expect(result.conventional.latex).toBe('p_{1}')
  })

  it('emits minimal parentheses', () => {
    const check = (polish: string, latex: string) => {
      const result = convert(polish)
      expect(result.ok, polish).toBe(true)
      if (result.ok) expect(result.conventional.latex, polish).toBe(latex)
    }
    check('CpCqr', 'p \\to q \\to r')
    check('CCpqr', '(p \\to q) \\to r')
    check('EEpqr', '(p \\leftrightarrow q) \\leftrightarrow r')
    check('EpEqr', 'p \\leftrightarrow q \\leftrightarrow r')
    check('KKpqr', 'p \\land q \\land r')
    check('KpKqr', 'p \\land (q \\land r)')
    check('ApKqr', 'p \\lor q \\land r')
    check('KApqr', '(p \\lor q) \\land r')
    check('NKpq', '\\neg (p \\land q)')
    check('KNpq', '\\neg p \\land q')
    check('DDpqDpq', '(p \\mid q) \\mid (p \\mid q)')
    check('DpKqr', 'p \\mid (q \\land r)')
    check('KpDqr', 'p \\land q \\mid r')
    check('LCpq', '\\Box (p \\to q)')
    check('CLpq', '\\Box p \\to q')
    check('Πp Cpq', '\\forall p \\, (p \\to q)')
    check('CΠp pq', '\\forall p \\, p \\to q')
  })

  it('normalizes alternate Polish letters to the primary ones', () => {
    const result = convert('QΔpΓq')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.polish.text).toBe('EMpLq')
  })

  it('guesses which notation failed input was meant to be', () => {
    const conventional = convert('p ∨ (q ∧')
    expect(conventional.ok).toBe(false)
    if (!conventional.ok) expect(conventional.guess).toBe('conventional')

    const polish = convert('CKpq')
    expect(polish.ok).toBe(false)
    if (!polish.ok) expect(polish.guess).toBe('polish')
  })

  it('round trips its own conventional output', () => {
    fc.assert(
      fc.property(formulaArb, (formula) => {
        const printed = printConventionalLatex(formula)
        const result = convert(printed)
        expect(result.ok, printed).toBe(true)
        if (result.ok) expect(equal(result.formula, formula), printed).toBe(true)
      }),
      { numRuns: 300 },
    )
  })
})
