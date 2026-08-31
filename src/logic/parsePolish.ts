import type { Atom, BinaryOp, Formula, ParseResult, QuantOp, UnaryOp } from './ast'
import {
  GREEK_BY_COMMAND,
  isAtomLetter,
  isWhitespace,
  normalizeAtomLetter,
  scanAtomSuffix,
} from './lexemes'

const UNARY: Record<string, UnaryOp> = { N: 'not', M: 'diamond', Δ: 'diamond', L: 'box', Γ: 'box' }
const BINARY: Record<string, BinaryOp> = {
  C: 'imp',
  A: 'or',
  K: 'and',
  D: 'nand',
  E: 'iff',
  Q: 'iff',
}
const QUANT: Record<string, QuantOp> = { Π: 'forall', Σ: 'exists' }
const CONST: Record<string, 'top' | 'bot'> = { V: 'top', O: 'bot' }

const COMMAND_OPS: Record<string, string> = { Pi: 'Π', Sigma: 'Σ', Delta: 'Δ', Gamma: 'Γ' }

type Tok = { type: 'op'; ch: string; pos: number } | { type: 'atom'; value: Atom; pos: number }

class Lexer {
  private i = 0
  private src: string
  constructor(src: string) {
    this.src = src
  }

  next(): Tok | { type: 'end'; pos: number } | { type: 'error'; message: string; pos: number } {
    const src = this.src
    for (;;) {
      while (this.i < src.length && isWhitespace(src[this.i])) this.i += 1
      if (this.i >= src.length) return { type: 'end', pos: this.i }
      if (src[this.i] === '\\' && ',;:!'.includes(src[this.i + 1] ?? '')) {
        this.i += 2
        continue
      }
      break
    }
    const pos = this.i
    let ch = src[this.i]

    if (ch === '\\') {
      const m = /^\\([a-zA-Z]+)/.exec(src.slice(this.i))
      if (!m) return { type: 'error', message: 'stray backslash', pos }
      if (m[1] === 'quad' || m[1] === 'qquad') {
        this.i += m[0].length
        return this.next()
      }
      const cmd = m[1]
      if (cmd in COMMAND_OPS) {
        this.i += m[0].length
        return { type: 'op', ch: COMMAND_OPS[cmd], pos }
      }
      if (cmd in GREEK_BY_COMMAND) {
        this.i += m[0].length
        return this.lexAtom(GREEK_BY_COMMAND[cmd], pos)
      }
      return { type: 'error', message: `unknown command \\${cmd}`, pos }
    }

    if (ch in UNARY || ch in BINARY || ch in QUANT || ch in CONST) {
      this.i += 1
      return { type: 'op', ch, pos }
    }

    if (isAtomLetter(ch)) {
      ch = normalizeAtomLetter(ch)
      this.i += 1
      return this.lexAtom(ch, pos)
    }

    if (ch >= 'A' && ch <= 'Z') {
      return { type: 'error', message: `'${ch}' is not a Polish notation operator`, pos }
    }
    return { type: 'error', message: `unexpected character '${ch}'`, pos }
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
      value: { kind: 'atom', name, sub: suffix.sub, primes: suffix.primes },
      pos,
    }
  }
}

export function parsePolish(input: string): ParseResult {
  const lexer = new Lexer(input)

  const fail = (message: string, position: number): ParseResult => ({
    ok: false,
    error: { message, position },
  })

  function parseFormula():
    { ok: true; formula: Formula } | { ok: false; message: string; position: number } {
    const tok = lexer.next()
    if (tok.type === 'error') return { ok: false, message: tok.message, position: tok.pos }
    if (tok.type === 'end') {
      return { ok: false, message: 'expecting a formula', position: tok.pos }
    }
    if (tok.type === 'atom') return { ok: true, formula: tok.value }

    const ch = tok.ch
    if (ch in CONST) return { ok: true, formula: { kind: 'const', op: CONST[ch] } }
    if (ch in UNARY) {
      const body = parseFormula()
      if (!body.ok) {
        return { ...body, message: `'${ch}' needs an argument: ${body.message}` }
      }
      return { ok: true, formula: { kind: 'unary', op: UNARY[ch], body: body.formula } }
    }
    if (ch in BINARY) {
      const left = parseFormula()
      if (!left.ok) {
        return { ...left, message: `'${ch}' needs 2 arguments: ${left.message}` }
      }
      const right = parseFormula()
      if (!right.ok) {
        return { ...right, message: `'${ch}' needs 1 more argument: ${right.message}` }
      }
      return {
        ok: true,
        formula: { kind: 'binary', op: BINARY[ch], left: left.formula, right: right.formula },
      }
    }
    // quantifier: a bound variable, then the body
    const variable = lexer.next()
    if (variable.type === 'error') {
      return { ok: false, message: variable.message, position: variable.pos }
    }
    if (variable.type !== 'atom') {
      return {
        ok: false,
        message: `'${ch}' needs a bound variable`,
        position: variable.pos,
      }
    }
    const body = parseFormula()
    if (!body.ok) {
      return { ...body, message: `'${ch}${variable.value.name}' needs a body: ${body.message}` }
    }
    return {
      ok: true,
      formula: { kind: 'quant', op: QUANT[ch], variable: variable.value, body: body.formula },
    }
  }

  const result = parseFormula()
  if (!result.ok) return fail(result.message, result.position)
  const trailing = lexer.next()
  if (trailing.type === 'error') return fail(trailing.message, trailing.pos)
  if (trailing.type !== 'end') {
    return fail('unexpected extra input after a complete formula', trailing.pos)
  }
  return { ok: true, formula: result.formula }
}
