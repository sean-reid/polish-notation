import { describe, expect, it } from 'vitest'
import { atom, type Formula } from './ast'
import { parsePolish } from './parsePolish'

function parse(input: string): Formula {
  const result = parsePolish(input)
  if (!result.ok) throw new Error(`${input}: ${result.error.message} @${result.error.position}`)
  return result.formula
}

function error(input: string): { message: string; position: number } {
  const result = parsePolish(input)
  if (result.ok) throw new Error(`${input}: expected a parse error`)
  return result.error
}

describe('parsePolish', () => {
  it('parses every operator from the table', () => {
    expect(parse('Np')).toEqual({ kind: 'unary', op: 'not', body: atom('p') })
    expect(parse('Cpq')).toEqual({ kind: 'binary', op: 'imp', left: atom('p'), right: atom('q') })
    expect(parse('Apq')).toEqual({ kind: 'binary', op: 'or', left: atom('p'), right: atom('q') })
    expect(parse('Kpq')).toEqual({ kind: 'binary', op: 'and', left: atom('p'), right: atom('q') })
    expect(parse('Dpq')).toEqual({ kind: 'binary', op: 'nand', left: atom('p'), right: atom('q') })
    expect(parse('Epq')).toEqual({ kind: 'binary', op: 'iff', left: atom('p'), right: atom('q') })
    expect(parse('Πp q')).toEqual({
      kind: 'quant',
      op: 'forall',
      variable: atom('p'),
      body: atom('q'),
    })
    expect(parse('Σp q')).toEqual({
      kind: 'quant',
      op: 'exists',
      variable: atom('p'),
      body: atom('q'),
    })
    expect(parse('V')).toEqual({ kind: 'const', op: 'top' })
    expect(parse('O')).toEqual({ kind: 'const', op: 'bot' })
    expect(parse('Mp')).toEqual({ kind: 'unary', op: 'diamond', body: atom('p') })
    expect(parse('Lp')).toEqual({ kind: 'unary', op: 'box', body: atom('p') })
  })

  it('accepts the alternate letters Q, Δ, Γ', () => {
    expect(parse('Qpq')).toEqual(parse('Epq'))
    expect(parse('Δp')).toEqual(parse('Mp'))
    expect(parse('Γp')).toEqual(parse('Lp'))
  })

  it('accepts LaTeX command forms of the greek operators and atoms', () => {
    expect(parse('\\Pi p \\phi')).toEqual(parse('Πp φ'))
    expect(parse('\\Sigma q \\psi')).toEqual(parse('Σq ψ'))
    expect(parse('\\Delta p')).toEqual(parse('Mp'))
    expect(parse('\\Gamma p')).toEqual(parse('Lp'))
    expect(parse('C\\varphi\\psi')).toEqual(parse('Cφψ'))
  })

  it('parses nested formulas regardless of whitespace', () => {
    const expected = parse('CKpqr')
    expect(parse('C K p q r')).toEqual(expected)
    expect(parse('  CK\npq\tr ')).toEqual(expected)
  })

  it('parses classic Łukasiewicz axioms', () => {
    expect(parse('CCpqCCqrCpr')).toEqual({
      kind: 'binary',
      op: 'imp',
      left: { kind: 'binary', op: 'imp', left: atom('p'), right: atom('q') },
      right: {
        kind: 'binary',
        op: 'imp',
        left: { kind: 'binary', op: 'imp', left: atom('q'), right: atom('r') },
        right: { kind: 'binary', op: 'imp', left: atom('p'), right: atom('r') },
      },
    })
    expect(parsePolish('CCCpqrCCrpCsp').ok).toBe(true)
    expect(parsePolish('CCNppp').ok).toBe(true)
    expect(parsePolish('CpCNpq').ok).toBe(true)
  })

  it('parses modal axioms', () => {
    expect(parsePolish('CLpp').ok).toBe(true)
    expect(parsePolish('CLpLLp').ok).toBe(true)
    expect(parse('EMpNLNp')).toEqual({
      kind: 'binary',
      op: 'iff',
      left: { kind: 'unary', op: 'diamond', body: atom('p') },
      right: {
        kind: 'unary',
        op: 'not',
        body: {
          kind: 'unary',
          op: 'box',
          body: { kind: 'unary', op: 'not', body: atom('p') },
        },
      },
    })
  })

  it('parses quantifier alternation', () => {
    expect(parse('CΠpΣqKpqΣqΠpKpq')).toEqual({
      kind: 'binary',
      op: 'imp',
      left: {
        kind: 'quant',
        op: 'forall',
        variable: atom('p'),
        body: {
          kind: 'quant',
          op: 'exists',
          variable: atom('q'),
          body: { kind: 'binary', op: 'and', left: atom('p'), right: atom('q') },
        },
      },
      right: {
        kind: 'quant',
        op: 'exists',
        variable: atom('q'),
        body: {
          kind: 'quant',
          op: 'forall',
          variable: atom('p'),
          body: { kind: 'binary', op: 'and', left: atom('p'), right: atom('q') },
        },
      },
    })
  })

  it('parses subscripts and primes on atoms', () => {
    expect(parse('p1')).toEqual(atom('p', '1'))
    expect(parse('p12')).toEqual(atom('p', '12'))
    expect(parse('p_1')).toEqual(atom('p', '1'))
    expect(parse('p_{12}')).toEqual(atom('p', '12'))
    expect(parse('p₁₂')).toEqual(atom('p', '12'))
    expect(parse('p_i')).toEqual(atom('p', 'i'))
    expect(parse('p_{ij}')).toEqual(atom('p', 'ij'))
    expect(parse('p_1_2')).toEqual(atom('p', '12'))
    expect(parse("p'")).toEqual(atom('p', '', 1))
    expect(parse("p''")).toEqual(atom('p', '', 2))
    expect(parse('p′')).toEqual(atom('p', '', 1))
    expect(parse('p″')).toEqual(atom('p', '', 2))
    expect(parse("p_{12}'")).toEqual(atom('p', '12', 1))
    expect(parse("φ₂''")).toEqual(atom('φ', '2', 2))
    expect(parse('p^{\\prime}')).toEqual(atom('p', '', 1))
    expect(parse('p^{\\prime\\prime}')).toEqual(atom('p', '', 2))
    expect(parse("CKp1p2Ap1'q_{12}")).toEqual({
      kind: 'binary',
      op: 'imp',
      left: { kind: 'binary', op: 'and', left: atom('p', '1'), right: atom('p', '2') },
      right: { kind: 'binary', op: 'or', left: atom('p', '1', 1), right: atom('q', '12') },
    })
  })

  it('parses subscripted bound variables', () => {
    expect(parse('Πx1 Kx1p')).toEqual({
      kind: 'quant',
      op: 'forall',
      variable: atom('x', '1'),
      body: { kind: 'binary', op: 'and', left: atom('x', '1'), right: atom('p') },
    })
  })

  it('reports missing arguments with position', () => {
    expect(error('K p').message).toMatch(/'K' needs 1 more argument/)
    expect(error('K').message).toMatch(/'K' needs 2 arguments/)
    expect(error('N').message).toMatch(/'N' needs an argument/)
    expect(error('Πp').message).toMatch(/needs a body/)
    expect(error('Π').message).toMatch(/needs a bound variable/)
    expect(error('ΠKpq r').message).toMatch(/needs a bound variable/)
  })

  it('reports trailing input', () => {
    const e = error('Cpqr')
    expect(e.message).toMatch(/extra input/)
    expect(e.position).toBe(3)
  })

  it('rejects unknown characters and operators', () => {
    expect(error('Bpq').message).toMatch(/'B' is not a Polish notation operator/)
    expect(error('C?q').message).toMatch(/unexpected character/)
    expect(error('').message).toMatch(/expecting a formula/)
    expect(error('   ').message).toMatch(/expecting a formula/)
    expect(error('p_').message).toMatch(/expected a subscript/)
    expect(error('p_{i_j}').message).toMatch(/letters and digits/)
    expect(error('p_{12').message).toMatch(/unclosed subscript/)
    expect(error('\\frac{p}{q}').message).toMatch(/unknown command/)
  })
})
