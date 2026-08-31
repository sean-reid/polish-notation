import { useEffect, useState } from 'react'
import About from './About'
import Converter from './Converter'

type Tab = 'convert' | 'about'

function App() {
  const [tab, setTab] = useState<Tab>(() => (location.hash === '#about' ? 'about' : 'convert'))

  useEffect(() => {
    history.replaceState(null, '', tab === 'about' ? '#about' : location.pathname + location.search)
  }, [tab])

  return (
    <>
      <header className="site-head">
        <h1>Polish Notation</h1>
        <nav aria-label="Sections">
          <button type="button" aria-current={tab === 'convert'} onClick={() => setTab('convert')}>
            Convert
          </button>
          <button type="button" aria-current={tab === 'about'} onClick={() => setTab('about')}>
            About
          </button>
        </nav>
      </header>
      <main>{tab === 'convert' ? <Converter /> : <About />}</main>
      <footer className="site-foot">
        <a href="https://github.com/sean-reid/polish-notation">Source on GitHub</a>
      </footer>
    </>
  )
}

export default App
