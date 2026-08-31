import { describe, expect, it } from 'vitest'
import { atom, type Formula } from './ast'
import { parseConventional } from './parseConventional'

function parse(input: string): Formula {
  const result = parseConventional(input)
  if (!result.ok) throw new Error(`${input}: ${result.error.message} @${result.error.position}`)
  return result.formula
}

function error(input: string): { message: string; position: number } {
  const result = parseConventional(input)
  if (result.ok) throw new Error(`${input}: expected a parse error`)
  return result.error
}

describe('parseConventional', () => {
  it('accepts LaTeX, Unicode, and ASCII spellings of each connective', () => {
    const spellings: [string, string[]][] = [
      ['\\neg p', ['\\lnot p', '\\sim p', '¬p', '~p', '!p']],
      [
        'p \\to q',
        ['p \\rightarrow q', 'p \\implies q', 'p \\supset q', 'p → q', 'p ⊃ q', 'p -> q', 'p => q'],
      ],
      ['p \\land q', ['p \\wedge q', 'p ∧ q', 'p & q', 'p && q', 'p /\\ q', 'p · q', 'p \\cdot q']],
      ['p \\lor q', ['p \\vee q', 'p ∨ q', 'p \\/ q']],
      [
        'p \\leftrightarrow q',
        ['p \\iff q', 'p \\equiv q', 'p ↔ q', 'p ≡ q', 'p <-> q', 'p <=> q'],
      ],
      ['p \\mid q', ['p \\uparrow q', 'p | q', 'p ↑ q', 'p ⊼ q']],
      ['\\forall x\\, p', ['∀x p', '∀x. p', '∀x: p', '\\forall x , p']],
      ['\\exists x\\, p', ['∃x p', '∃x. p']],
      ['\\Box p', ['\\square p', '□p', '◻p']],
      ['\\Diamond p', ['\\lozenge p', '\\diamond p', '◇p', '◊p', '⋄p']],
      ['\\top', ['⊤']],
      ['\\bot', ['⊥']],
    ]
    for (const [canonical, variants] of spellings) {
      const expected = parse(canonical)
      for (const variant of variants) {
        expect(parse(variant), variant).toEqual(expected)
      }
    }
  })

  it('applies precedence: not > nand > and > or > imp > iff', () => {
    expect(parse('p ∨ q ∧ r → s ↔ t')).toEqual(parse('((p ∨ (q ∧ r)) → s) ↔ t'))
    expect(parse('¬p ∧ q')).toEqual(parse('(¬p) ∧ q'))
    expect(parse('p ∧ q | r')).toEqual(parse('p ∧ (q | r)'))
  })

  it('associates → and ↔ to the right, ∧ and ∨ to the left', () => {
    expect(parse('p -> q -> r')).toEqual(parse('p -> (q -> r)'))
    expect(parse('p <-> q <-> r')).toEqual(parse('p <-> (q <-> r)'))
    expect(parse('p & q & r')).toEqual(parse('(p & q) & r'))
    expect(parse('p ∨ q ∨ r')).toEqual(parse('(p ∨ q) ∨ r'))
  })

  it('rejects unparenthesized Sheffer stroke chains', () => {
    expect(error('p | q | r').message).toMatch(/non-associative/)
    expect(parseConventional('(p | q) | r').ok).toBe(true)
    expect(parseConventional('p | (q | r)').ok).toBe(true)
  })

  it('binds quantifiers and modal operators tightly, like negation', () => {
    expect(parse('∀x p → q')).toEqual(parse('(∀x p) → q'))
    expect(parse('□p → p')).toEqual(parse('(□p) → p'))
    expect(parse('∀x (p → q)')).toEqual({
      kind: 'quant',
      op: 'forall',
      variable: atom('x'),
      body: { kind: 'binary', op: 'imp', left: atom('p'), right: atom('q') },
    })
  })

  it('parses stacked unary operators', () => {
    expect(parse('¬¬p')).toEqual(parse('~ ~ p'))
    expect(parse('□◇¬p')).toEqual({
      kind: 'unary',
      op: 'box',
      body: { kind: 'unary', op: 'diamond', body: { kind: 'unary', op: 'not', body: atom('p') } },
    })
  })

  it('parses subscripts and primes on atoms', () => {
    expect(parse('p_1 \\lor p_{12}')).toEqual(parse('p1 ∨ p₁₂'))
    expect(parse('x_i \\land x_{ij}')).toEqual({
      kind: 'binary',
      op: 'and',
      left: atom('x', 'i'),
      right: atom('x', 'ij'),
    })
    expect(parse("p' → p''")).toEqual(parse('p^{\\prime} → p^{\\prime\\prime}'))
    expect(parse("\\varphi_3' \\mid q")).toEqual({
      kind: 'binary',
      op: 'nand',
      left: atom('φ', '3', 1),
      right: atom('q'),
    })
  })

  it('strips math-mode wrappers, sizing, and spacing commands', () => {
    expect(parse('$\\neg p$')).toEqual(parse('¬p'))
    expect(parse('\\( p \\lor q \\)')).toEqual(parse('p ∨ q'))
    expect(parse('\\[ p \\to q \\]')).toEqual(parse('p → q'))
    expect(parse('\\left( p \\lor q \\right) \\to r')).toEqual(parse('(p ∨ q) → r'))
    expect(parse('\\bigl( p \\land q \\bigr) \\to r')).toEqual(parse('(p ∧ q) → r'))
    expect(parse('p \\quad \\to \\; q')).toEqual(parse('p → q'))
    expect(parse('{p \\land q} \\to r')).toEqual(parse('(p ∧ q) → r'))
  })

  it('parses textbook formulas', () => {
    expect(parseConventional('((p \\to q) \\land (q \\to r)) \\to (p \\to r)').ok).toBe(true)
    expect(parse('~(p & q) <-> (~p \\/ ~q)')).toEqual(parse('¬(p ∧ q) ↔ (¬p ∨ ¬q)'))
    expect(parseConventional('((p → q) → p) → p').ok).toBe(true)
    expect(parseConventional('∀x (φ → ψ) → (∀x φ → ∀x ψ)').ok).toBe(true)
    expect(parseConventional('◇p ↔ ¬□¬p').ok).toBe(true)
    expect(parseConventional('∃x1 ∀x2 ((x1 ∧ x2) ∨ (¬x1 ∧ ¬x2))').ok).toBe(true)
  })

  it('reports helpful errors with positions', () => {
    expect(error('').message).toMatch(/expecting a formula/)
    expect(error('p →').message).toMatch(/expecting a formula/)
    expect(error('→ p').message).toMatch(/unexpected/)
    expect(error('(p ∨ q').message).toMatch(/closing parenthesis/)
    expect(error('p ∨ q)').message).toMatch(/extra input/)
    expect(error('p q').message).toMatch(/extra input/)
    expect(error('∀ → p').message).toMatch(/bound variable/)
    expect(error('Kpq').message).toMatch(/Polish notation operator/)
    expect(error('p ∨ Π').message).toMatch(/Polish notation operator/)
    expect(error('p # q').message).toMatch(/unexpected character/)
    const e = error('p ∨ (q ∧')
    expect(e.position).toBeGreaterThan(0)
  })
})
