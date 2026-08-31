import Converter from './Converter'

function App() {
  return (
    <>
      <header className="site-head">
        <h1>Polish Notation</h1>
      </header>
      <main>
        <Converter />
      </main>
      <footer className="site-foot">
        <a href="https://github.com/sean-reid/polish-notation">Source on GitHub</a>
      </footer>
    </>
  )
}

export default App
