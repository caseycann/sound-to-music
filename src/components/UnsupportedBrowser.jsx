// Shown instead of the app when the browser lacks something it needs
// (see src/support.js).
export default function UnsupportedBrowser({ missing }) {
  return (
    <section className="unsupported" aria-labelledby="unsupported-heading">
      <h2 id="unsupported-heading">This browser can’t run Found Sound</h2>
      <p>
        It’s missing what we need for {missing.join(', ')}. Open this page in an up-to-date
        Chrome, Edge, Firefox or Safari instead.
      </p>
      <p>On a school computer, ask your teacher which browser to use.</p>
    </section>
  )
}
