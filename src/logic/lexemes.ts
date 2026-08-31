// Character tables shared by both parsers.

export const GREEK_BY_COMMAND: Record<string, string> = {
  alpha: 'α',
  beta: 'β',
  gamma: 'γ',
  delta: 'δ',
  epsilon: 'ε',
  varepsilon: 'ε',
  zeta: 'ζ',
  eta: 'η',
  theta: 'θ',
  vartheta: 'θ',
  iota: 'ι',
  kappa: 'κ',
  lambda: 'λ',
  mu: 'μ',
  nu: 'ν',
  xi: 'ξ',
  pi: 'π',
  varpi: 'π',
  rho: 'ρ',
  varrho: 'ρ',
  sigma: 'σ',
  varsigma: 'σ',
  tau: 'τ',
  upsilon: 'υ',
  phi: 'φ',
  varphi: 'φ',
  chi: 'χ',
  psi: 'ψ',
  omega: 'ω',
}

export const COMMAND_BY_GREEK: Record<string, string> = {
  α: 'alpha',
  β: 'beta',
  γ: 'gamma',
  δ: 'delta',
  ε: 'varepsilon',
  ζ: 'zeta',
  η: 'eta',
  θ: 'vartheta',
  ι: 'iota',
  κ: 'kappa',
  λ: 'lambda',
  μ: 'mu',
  ν: 'nu',
  ξ: 'xi',
  π: 'pi',
  ρ: 'rho',
  σ: 'sigma',
  τ: 'tau',
  υ: 'upsilon',
  φ: 'varphi',
  χ: 'chi',
  ψ: 'psi',
  ω: 'omega',
}

const SUBSCRIPT_DIGITS: Record<string, string> = {
  '₀': '0',
  '₁': '1',
  '₂': '2',
  '₃': '3',
  '₄': '4',
  '₅': '5',
  '₆': '6',
  '₇': '7',
  '₈': '8',
  '₉': '9',
}

export function isAtomLetter(ch: string): boolean {
  return (
    (ch >= 'a' && ch <= 'z') || ch in COMMAND_BY_GREEK || ch === 'ϕ' || ch === 'ϑ' || ch === 'ϱ'
  )
}

export function normalizeAtomLetter(ch: string): string {
  if (ch === 'ϕ') return 'φ'
  if (ch === 'ϑ') return 'θ'
  if (ch === 'ϱ') return 'ρ'
  return ch
}

export function isDigit(ch: string): boolean {
  return ch >= '0' && ch <= '9'
}

export function subscriptDigit(ch: string): string | undefined {
  return SUBSCRIPT_DIGITS[ch]
}

export function primeCount(ch: string): number {
  if (ch === "'" || ch === '′' || ch === '‵') return 1
  if (ch === '″') return 2
  if (ch === '‴') return 3
  return 0
}

export function isWhitespace(ch: string): boolean {
  return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === ' '
}

// Modifier suffixes an atom letter can carry: subscripts (p1, p_1, p_{12}, p_i, p₁)
// and primes (p', p′, p^{\prime}).
export function scanAtomSuffix(
  src: string,
  start: number,
): { sub: string; primes: number; end: number; error?: { message: string; position: number } } {
  let i = start
  let sub = ''
  let primes = 0

  const scanPrimeGroup = (from: number): { count: number; end: number } => {
    let j = from
    let count = 0
    for (;;) {
      const c = primeCount(src[j] ?? '')
      if (c > 0) {
        count += c
        j += 1
        continue
      }
      if (src.startsWith('\\prime', j)) {
        count += 1
        j += 6
        continue
      }
      break
    }
    return { count, end: j }
  }

  for (;;) {
    const ch = src[i] ?? ''
    if (isDigit(ch)) {
      sub += ch
      i += 1
      continue
    }
    const uni = subscriptDigit(ch)
    if (uni !== undefined) {
      sub += uni
      i += 1
      continue
    }
    if (ch === '_') {
      i += 1
      if (src[i] === '{') {
        i += 1
        let body = ''
        while (i < src.length && src[i] !== '}') {
          body += src[i]
          i += 1
        }
        if (src[i] !== '}') {
          return {
            sub,
            primes,
            end: i,
            error: { message: 'unclosed subscript brace', position: i },
          }
        }
        i += 1
        if (!/^[a-z0-9]+$/i.test(body)) {
          return {
            sub,
            primes,
            end: i,
            error: { message: `subscript may only contain letters and digits`, position: i - 1 },
          }
        }
        sub += body
        continue
      }
      const c = src[i] ?? ''
      if (isDigit(c) || (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z')) {
        sub += c
        i += 1
        continue
      }
      return {
        sub,
        primes,
        end: i,
        error: { message: 'expected a subscript after _', position: i },
      }
    }
    const direct = scanPrimeGroup(i)
    if (direct.count > 0) {
      primes += direct.count
      i = direct.end
      continue
    }
    if (ch === '^') {
      let j = i + 1
      if (src[j] === '{') {
        const inner = scanPrimeGroup(j + 1)
        if (inner.count > 0 && src[inner.end] === '}') {
          primes += inner.count
          i = inner.end + 1
          continue
        }
      } else {
        const inner = scanPrimeGroup(j)
        if (inner.count > 0) {
          primes += inner.count
          i = inner.end
          continue
        }
      }
    }
    break
  }
  return { sub, primes, end: i }
}
