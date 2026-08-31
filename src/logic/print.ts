import type { Atom, Formula } from './ast'
import { COMMAND_BY_GREEK } from './lexemes'
import { BINDING_POWER, PREFIX_POWER, RIGHT_ASSOC } from './parseConventional'

const POLISH_LETTER = {
  not: 'N',
  box: 'L',
  diamond: 'M',
  imp: 'C',
  or: 'A',
  and: 'K',
  nand: 'D',
  iff: 'E',
  forall: 'Π',
  exists: 'Σ',
  top: 'V',
  bot: 'O',
} as const

function atomText(a: Atom): string {
  let out = a.name
  if (a.sub) out += /^[0-9]+$/.test(a.sub) ? a.sub : `_${a.sub.length === 1 ? a.sub : `{${a.sub}}`}`
  out += "'".repeat(a.primes)
  return out
}

function atomLatex(a: Atom): string {
  let out = a.name in COMMAND_BY_GREEK ? `\\${COMMAND_BY_GREEK[a.name]}` : a.name
  if (a.sub) out += `_{${a.sub}}`
  out += "'".repeat(a.primes)
  return out
}

export function printPolish(f: Formula): string {
  switch (f.kind) {
    case 'atom':
      return atomText(f)
    case 'const':
      return POLISH_LETTER[f.op]
    case 'unary':
      return POLISH_LETTER[f.op] + printPolish(f.body)
    case 'binary':
      return POLISH_LETTER[f.op] + printPolish(f.left) + printPolish(f.right)
    case 'quant':
      return `${POLISH_LETTER[f.op]}${atomText(f.variable)} ${printPolish(f.body)}`
  }
}

const POLISH_LATEX = {
  ...POLISH_LETTER,
  forall: '\\Pi ',
  exists: '\\Sigma ',
} as const

export function printPolishLatex(f: Formula): string {
  return polishLatex(f).trimEnd()
}

// A greek atom command directly followed by a letter would fuse into one
// command name, so those atoms carry a trailing space.
function polishAtomLatex(a: Atom): string {
  const out = atomLatex(a)
  return /[a-zA-Z]$/.test(out) && out.startsWith('\\') ? `${out} ` : out
}

function polishLatex(f: Formula): string {
  switch (f.kind) {
    case 'atom':
      return polishAtomLatex(f)
    case 'const':
      return POLISH_LATEX[f.op]
    case 'unary':
      return POLISH_LATEX[f.op] + polishLatex(f.body)
    case 'binary':
      return POLISH_LATEX[f.op] + polishLatex(f.left) + polishLatex(f.right)
    case 'quant':
      return `${POLISH_LATEX[f.op]}${polishAtomLatex(f.variable)}\\, ${polishLatex(f.body)}`
  }
}

const CONVENTIONAL_LATEX = {
  not: '\\neg',
  box: '\\Box',
  diamond: '\\Diamond',
  imp: '\\to',
  or: '\\lor',
  and: '\\land',
  nand: '\\mid',
  iff: '\\leftrightarrow',
  forall: '\\forall',
  exists: '\\exists',
  top: '\\top',
  bot: '\\bot',
} as const

// Minimal parenthesization: a subformula is wrapped only when its top-level
// connective binds more loosely than its context requires.
export function printConventionalLatex(f: Formula, minPower = 0): string {
  switch (f.kind) {
    case 'atom':
      return atomLatex(f)
    case 'const':
      return CONVENTIONAL_LATEX[f.op]
    case 'unary':
      return `${CONVENTIONAL_LATEX[f.op]} ${printConventionalLatex(f.body, PREFIX_POWER)}`
    case 'quant':
      return `${CONVENTIONAL_LATEX[f.op]} ${atomLatex(f.variable)} \\, ${printConventionalLatex(
        f.body,
        PREFIX_POWER,
      )}`
    case 'binary': {
      const power = BINDING_POWER[f.op]
      const nonAssoc = f.op === 'nand'
      const left = printConventionalLatex(f.left, RIGHT_ASSOC[f.op] || nonAssoc ? power + 1 : power)
      const right = printConventionalLatex(
        f.right,
        RIGHT_ASSOC[f.op] && !nonAssoc ? power : power + 1,
      )
      const body = `${left} ${CONVENTIONAL_LATEX[f.op]} ${right}`
      return power < minPower ? `(${body})` : body
    }
  }
}
