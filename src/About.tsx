export default function About() {
  return (
    <div className="about">
      <section>
        <h2>Polish notation</h2>
        <p>
          Polish notation writes every logical operator before its arguments: the conventional
          formula (p ∧ q) → r becomes CKpqr. Jan Łukasiewicz, a logician of the Lwów-Warsaw school,
          devised it in 1924 and used it in print from 1929 in his{' '}
          <em>Elementy logiki matematycznej</em> [1, 2]. The joint paper with Alfred Tarski on the
          sentential calculus carried it to a wider audience [3].
        </p>
      </section>
      <section>
        <h2>Why it needs no parentheses</h2>
        <p>
          Each operator has a fixed number of arguments, so a formula read left to right can be
          decoded in exactly one way. C always takes two arguments and N always takes one, which
          means CNpq can only be (¬p) → q, and parentheses have nothing left to disambiguate. Church
          discusses this unique readability property in his survey of notations [5], and Hamblin
          gives the classic algorithms for translating to and from it [6].
        </p>
        <p>
          The capital letters follow the Polish names of the connectives where they can: N for
          negacja, K for koniunkcja, A for alternatywa, D for dysjunkcja, E for ekwiwalencja, M for
          możliwość. Łukasiewicz used M and L for possibility and necessity in his modal system [4],
          and Π and Σ for the quantifiers [3].
        </p>
      </section>
      <section>
        <h2>Legacy</h2>
        <p>
          Reversing the idea gives reverse Polish notation, where operators follow their arguments.
          Burks, Warren and Wright analysed a parenthesis-free logic machine in 1954 [7], stack
          machines and compilers adopted the form, and Hewlett-Packard built entire calculator lines
          around RPN entry. Lisp keeps the prefix idea alive today: (and p q) is Kpq with
          parentheses put back for variable arity [8].
        </p>
      </section>
      <section>
        <h2>References</h2>
        <ol className="references">
          <li>
            Łukasiewicz, J. <em>Elementy logiki matematycznej</em>. Warsaw, 1929. English
            translation: <em>Elements of Mathematical Logic</em>, Pergamon Press, 1963.
          </li>
          <li>
            Łukasiewicz, J. "Uwagi o aksjomacie Nicoda i o 'dedukcji uogólniającej'".{' '}
            <em>Księga pamiątkowa Polskiego Towarzystwa Filozoficznego</em>, Lwów, 1931. The
            footnote there dates the notation to his 1924 lectures.
          </li>
          <li>
            Łukasiewicz, J. and Tarski, A. "Untersuchungen über den Aussagenkalkül".{' '}
            <em>
              Comptes rendus des séances de la Société des Sciences et des Lettres de Varsovie
            </em>
            , Classe III, vol. 23, 1930.
          </li>
          <li>
            Łukasiewicz, J. "A System of Modal Logic". <em>The Journal of Computing Systems</em>,
            vol. 1, no. 3, 1953.
          </li>
          <li>
            Church, A. <em>Introduction to Mathematical Logic</em>. Princeton University Press,
            1956.
          </li>
          <li>
            Hamblin, C. L.{' '}
            <a href="https://doi.org/10.1093/comjnl/5.3.210">
              "Translation to and from Polish notation"
            </a>
            . <em>The Computer Journal</em>, vol. 5, no. 3, 1962.
          </li>
          <li>
            Burks, A. W., Warren, D. W. and Wright, J. B.{' '}
            <a href="https://doi.org/10.2307/2001990">
              "An Analysis of a Logical Machine Using Parenthesis-Free Notation"
            </a>
            . <em>Mathematical Tables and Other Aids to Computation</em>, vol. 8, no. 46, 1954.
          </li>
          <li>
            McCarthy, J.{' '}
            <a href="http://www-formal.stanford.edu/jmc/recursive.pdf">
              "Recursive Functions of Symbolic Expressions and Their Computation by Machine, Part I"
            </a>
            . <em>Communications of the ACM</em>, vol. 3, no. 4, 1960.
          </li>
          <li>
            Simons, P.{' '}
            <a href="https://plato.stanford.edu/entries/lukasiewicz/">"Jan Łukasiewicz"</a>.{' '}
            <em>The Stanford Encyclopedia of Philosophy</em>.
          </li>
        </ol>
      </section>
    </div>
  )
}
