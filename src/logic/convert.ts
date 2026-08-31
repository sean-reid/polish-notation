import type { Formula, ParseError } from './ast'
import { parseConventional } from './parseConventional'
import { parsePolish } from './parsePolish'
import { printConventionalLatex, printPolish, printPolishLatex } from './print'

export type Notation = 'polish' | 'conventional'

export type Conversion = {
  ok: true
  detected: Notation | 'either'
  formula: Formula
  polish: { text: string; latex: string }
  conventional: { latex: string }
}

export type ConversionError = {
  ok: false
  guess: Notation
  error: ParseError
}

const CONVENTIONAL_HINT = /[¬~!→↔∨∧&|↑⊼∀∃□◻◇◊⋄⊤⊥⊃≡()[\]]|->|<->|\\\w/

export function convert(input: string): Conversion | ConversionError {
  const asPolish = parsePolish(input)
  const asConventional = parseConventional(input)

  if (asPolish.ok || asConventional.ok) {
    const formula = asPolish.ok
      ? asPolish.formula
      : (asConventional as { formula: Formula }).formula
    const detected: Conversion['detected'] =
      asPolish.ok && asConventional.ok ? 'either' : asPolish.ok ? 'polish' : 'conventional'
    return {
      ok: true,
      detected,
      formula,
      polish: { text: printPolish(formula), latex: printPolishLatex(formula) },
      conventional: { latex: printConventionalLatex(formula) },
    }
  }

  const guess: Notation = CONVENTIONAL_HINT.test(input) ? 'conventional' : 'polish'
  return {
    ok: false,
    guess,
    error: guess === 'conventional' ? asConventional.error : asPolish.error,
  }
}
