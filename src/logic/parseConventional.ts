import type { Atom, BinaryOp, Formula, ParseResult, QuantOp, UnaryOp } from './ast'
import {
  GREEK_BY_COMMAND,
  isAtomLetter,
  isWhitespace,
  normalizeAtomLetter,
  scanAtomSuffix,
} from './lexemes'

type TokType = 'atom' | 'unary' | 'binary' | 'quant' | 'const' | 'lparen' | 'rparen' | 'end'

type Tok = {
  type: TokType
  pos: number
  text: string
  atom?: Atom
  unary?: UnaryOp
  binary?: BinaryOp
  quant?: QuantOp
  konst?: 'top' | 'bot'
}

const SYMBOLS: [string, Partial<Tok>][] = [
  ['<->', { type: 'binary', binary: 'iff' }],
  ['<=>', { type: 'binary', binary: 'iff' }],
  ['->', { type: 'binary', binary: 'imp' }],
  ['=>', { type: 'binary', binary: 'imp' }],
  ['&&', { type: 'binary', binary: 'and' }],
  ['/\\', { type: 'binary', binary: 'and' }],
  ['\\/', { type: 'binary', binary: 'or' }],
  ['↔', { type: 'binary', binary: 'iff' }],
  ['≡', { type: 'binary', binary: 'iff' }],
  ['→', { type: 'binary', binary: 'imp' }],
  ['⊃', { type: 'binary', binary: 'imp' }],
  ['∨', { type: 'binary', binary: 'or' }],
  ['∧', { type: 'binary', binary: 'and' }],
  ['&', { type: 'binary', binary: 'and' }],
  ['·', { type: 'binary', binary: 'and' }],
  ['|', { type: 'binary', binary: 'nand' }],
  ['↑', { type: 'binary', binary: 'nand' }],
  ['⊼', { type: 'binary', binary: 'nand' }],
  ['¬', { type: 'unary', unary: 'not' }],
  ['~', { type: 'unary', unary: 'not' }],
  ['!', { type: 'unary', unary: 'not' }],
  ['□', { type: 'unary', unary: 'box' }],
  ['◻', { type: 'unary', unary: 'box' }],
  ['◇', { type: 'unary', unary: 'diamond' }],
  ['◊', { type: 'unary', unary: 'diamond' }],
  ['⋄', { type: 'unary', unary: 'diamond' }],
  ['∀', { type: 'quant', quant: 'forall' }],
  ['∃', { type: 'quant', quant: 'exists' }],
  ['⊤', { type: 'const', konst: 'top' }],
  ['⊥', { type: 'const', konst: 'bot' }],
  ['(', { type: 'lparen' }],
  ['[', { type: 'lparen' }],
  ['{', { type: 'lparen' }],
  [')', { type: 'rparen' }],
  [']', { type: 'rparen' }],
  ['}', { type: 'rparen' }],
]

const COMMANDS: Record<string, Partial<Tok>> = {
  neg: { type: 'unary', unary: 'not' },
  lnot: { type: 'unary', unary: 'not' },
  sim: { type: 'unary', unary: 'not' },
  to: { type: 'binary', binary: 'imp' },
  rightarrow: { type: 'binary', binary: 'imp' },
  Rightarrow: { type: 'binary', binary: 'imp' },
  implies: { type: 'binary', binary: 'imp' },
  supset: { type: 'binary', binary: 'imp' },
  land: { type: 'binary', binary: 'and' },
  wedge: { type: 'binary', binary: 'and' },
  cdot: { type: 'binary', binary: 'and' },
  lor: { type: 'binary', binary: 'or' },
  vee: { type: 'binary', binary: 'or' },
  leftrightarrow: { type: 'binary', binary: 'iff' },
  Leftrightarrow: { type: 'binary', binary: 'iff' },
  iff: { type: 'binary', binary: 'iff' },
  equiv: { type: 'binary', binary: 'iff' },
  mid: { type: 'binary', binary: 'nand' },
  uparrow: { type: 'binary', binary: 'nand' },
  barwedge: { type: 'binary', binary: 'nand' },
  forall: { type: 'quant', quant: 'forall' },
  exists: { type: 'quant', quant: 'exists' },
  Box: { type: 'unary', unary: 'box' },
  square: { type: 'unary', unary: 'box' },
  Diamond: { type: 'unary', unary: 'diamond' },
  lozenge: { type: 'unary', unary: 'diamond' },
  diamond: { type: 'unary', unary: 'diamond' },
  top: { type: 'const', konst: 'top' },
  bot: { type: 'const', konst: 'bot' },
}

// Skipped entirely: sizing, spacing, and math-mode wrappers that carry no structure.
const SKIP_COMMANDS = new Set([
  'left',
  'right',
  'big',
  'Big',
  'bigl',
  'bigr',
  'Bigl',
  'Bigr',
  'quad',
  'qquad',
  'displaystyle',
])

class Lexer {
  private i = 0
  private src: string
  constructor(src: string) {
    this.src = src
  }

  next(): Tok | { type: 'error'; message: string; pos: number } {
    const src = this.src
    for (;;) {
      // '.', ',' and ':' are the optional separators after a quantified variable
      while (this.i < src.length && (isWhitespace(src[this.i]) || '$.,:'.includes(src[this.i]))) {
        this.i += 1
      }
      const pos = this.i
      if (this.i >= src.length) return { type: 'end', pos, text: '' }
      const ch = src[this.i]

      for (const [sym, tok] of SYMBOLS) {
        if (src.startsWith(sym, this.i)) {
          this.i += sym.length
          return { ...tok, pos, text: sym } as Tok
        }
      }

      if (ch === '\\') {
        if (src[this.i + 1] === '(' || src[this.i + 1] === '[') {
          this.i += 2
          continue
        }
        if (src[this.i + 1] === ')' || src[this.i + 1] === ']') {
          this.i += 2
          continue
        }
        const m = /^\\([a-zA-Z]+)/.exec(src.slice(this.i))
        if (!m) {
          // spacing commands like \, \; \! and escaped braces
          const nxt = src[this.i + 1]
          if (nxt === ',' || nxt === ';' || nxt === ':' || nxt === '!') {
            this.i += 2
            continue
          }
          if (nxt === '{' || nxt === '}') {
            this.i += 1
            continue
          }
          return { type: 'error', message: 'stray backslash', pos }
        }
        const cmd = m[1]
        if (SKIP_COMMANDS.has(cmd)) {
          this.i += m[0].length
          continue
        }
        if (cmd in COMMANDS) {
          this.i += m[0].length
          return { ...COMMANDS[cmd], pos, text: `\\${cmd}` } as Tok
        }
        if (cmd in GREEK_BY_COMMAND) {
          this.i += m[0].length
          return this.lexAtom(GREEK_BY_COMMAND[cmd], pos)
        }
        return { type: 'error', message: `unknown command \\${cmd}`, pos }
      }

      if (isAtomLetter(ch)) {
        this.i += 1
        return this.lexAtom(normalizeAtomLetter(ch), pos)
      }

      if ((ch >= 'A' && ch <= 'Z') || ch === 'Π' || ch === 'Σ' || ch === 'Δ' || ch === 'Γ') {
        return {
          type: 'error',
          message: `'${ch}' looks like a Polish notation operator; conventional notation uses lowercase variables`,
          pos,
        }
      }
      return { type: 'error', message: `unexpected character '${ch}'`, pos }
    }
  }

  private lexAtom(
    name: string,
    pos: number,
  ): Tok | { type: 'error'; message: string; pos: number } {
    const suffix = scanAtomSuffix(this.src, this.i)
    if (suffix.error) {
      return { type: 'error', message: suffix.error.message, pos: suffix.error.position }
    }
    this.i = suffix.end
    return {
      type: 'atom',
      pos,
      text: name,
      atom: { kind: 'atom', name, sub: suffix.sub, primes: suffix.primes },
    }
  }
}

export const BINDING_POWER: Record<BinaryOp, number> = {
  iff: 10,
  imp: 20,
  or: 30,
  and: 40,
  nand: 50,
}

export const RIGHT_ASSOC: Record<BinaryOp, boolean> = {
  iff: true,
  imp: true,
  or: false,
  and: false,
  nand: false,
}

export const PREFIX_POWER = 60

type Step<T> = { ok: true; value: T } | { ok: false; message: string; position: number }

export function parseConventional(input: string): ParseResult {
  const lexer = new Lexer(input)
  let peeked: Tok | { type: 'error'; message: string; pos: number } | null = null

  const peek = () => {
    if (peeked === null) peeked = lexer.next()
    return peeked
  }
  const advance = () => {
    const tok = peek()
    peeked = null
    return tok
  }

  function parsePrimary(): Step<Formula> {
    const tok = advance()
    if (tok.type === 'error') return { ok: false, message: tok.message, position: tok.pos }
    switch (tok.type) {
      case 'end':
        return { ok: false, message: 'expecting a formula', position: tok.pos }
      case 'atom':
        return { ok: true, value: tok.atom! }
      case 'const':
        return { ok: true, value: { kind: 'const', op: tok.konst! } }
      case 'unary': {
        const body = parseAt(PREFIX_POWER)
        if (!body.ok) return body
        return { ok: true, value: { kind: 'unary', op: tok.unary!, body: body.value } }
      }
      case 'quant': {
        const variable = advance()
        if (variable.type === 'error') {
          return { ok: false, message: variable.message, position: variable.pos }
        }
        if (variable.type !== 'atom') {
          return {
            ok: false,
            message: `'${tok.text}' needs a bound variable`,
            position: variable.pos,
          }
        }
        const body = parseAt(PREFIX_POWER)
        if (!body.ok) return body
        return {
          ok: true,
          value: { kind: 'quant', op: tok.quant!, variable: variable.atom!, body: body.value },
        }
      }
      case 'lparen': {
        const inner = parseAt(0)
        if (!inner.ok) return inner
        const close = advance()
        if (close.type === 'error')
          return { ok: false, message: close.message, position: close.pos }
        if (close.type !== 'rparen') {
          return { ok: false, message: 'expecting a closing parenthesis', position: close.pos }
        }
        return inner
      }
      case 'rparen':
        return { ok: false, message: 'unexpected closing parenthesis', position: tok.pos }
      default:
        return { ok: false, message: `unexpected '${tok.text}'`, position: tok.pos }
    }
  }

  function parseAt(minPower: number): Step<Formula> {
    const first = parsePrimary()
    if (!first.ok) return first
    let lhs = first.value
    let lhsIsBareNand = false

    for (;;) {
      const tok = peek()
      if (tok.type === 'error') return { ok: false, message: tok.message, position: tok.pos }
      if (tok.type !== 'binary') break
      const op = tok.binary!
      const power = BINDING_POWER[op]
      if (power < minPower) break
      if (op === 'nand' && lhsIsBareNand) {
        return {
          ok: false,
          message: `'${tok.text}' is non-associative; add parentheses`,
          position: tok.pos,
        }
      }
      advance()
      const rhs = parseAt(RIGHT_ASSOC[op] ? power : power + 1)
      if (!rhs.ok) return rhs
      lhs = { kind: 'binary', op, left: lhs, right: rhs.value }
      lhsIsBareNand = op === 'nand'
    }
    return { ok: true, value: lhs }
  }

  const result = parseAt(0)
  if (!result.ok)
    return { ok: false, error: { message: result.message, position: result.position } }
  const trailing = advance()
  if (trailing.type === 'error') {
    return { ok: false, error: { message: trailing.message, position: trailing.pos } }
  }
  if (trailing.type !== 'end') {
    return {
      ok: false,
      error: { message: 'unexpected extra input after a complete formula', position: trailing.pos },
    }
  }
  return { ok: true, formula: result.value }
}
