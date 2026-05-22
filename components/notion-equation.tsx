// This file is intentionally a thin re-export so that katex CSS is bundled
// into the same dynamic chunk as the Equation component, keeping it out of
// the main CSS bundle on pages that have no math blocks (~22 KB saving).
import 'katex/dist/katex.min.css'

export { Equation } from 'react-notion-x/third-party/equation'
