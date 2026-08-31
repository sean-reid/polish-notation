export type Atom = {
  kind: 'atom'
  name: string
  sub: string
  primes: number
}

export type Formula =
  | Atom
  | { kind: 'const'; op: 'top' | 'bot' }
  | { kind: 'unary'; op: 'not' | 'box' | 'diamond'; body: Formula }
  | { kind: 'binary'; op: 'and' | 'or' | 'imp' | 'iff' | 'nand'; left: Formula; right: Formula }
  | { kind: 'quant'; op: 'forall' | 'exists'; variable: Atom; body: Formula }

export type UnaryOp = Extract<Formula, { kind: 'unary' }>['op']
export type BinaryOp = Extract<Formula, { kind: 'binary' }>['op']
export type QuantOp = Extract<Formula, { kind: 'quant' }>['op']

export function atom(name: string, sub = '', primes = 0): Atom {
  return { kind: 'atom', name, sub, primes }
}

export type ParseError = {
  message: string
  /* offset into the original input string */
  position: number
}

export type ParseResult = { ok: true; formula: Formula } | { ok: false; error: ParseError }

export function equal(a: Formula, b: Formula): boolean {
  if (a.kind !== b.kind) return false
  switch (a.kind) {
    case 'atom': {
      const o = b as Atom
      return a.name === o.name && a.sub === o.sub && a.primes === o.primes
    }
    case 'const':
      return a.op === (b as typeof a).op
    case 'unary': {
      const o = b as typeof a
      return a.op === o.op && equal(a.body, o.body)
    }
    case 'binary': {
      const o = b as typeof a
      return a.op === o.op && equal(a.left, o.left) && equal(a.right, o.right)
    }
    case 'quant': {
      const o = b as typeof a
      return a.op === o.op && equal(a.variable, o.variable) && equal(a.body, o.body)
    }
  }
}
