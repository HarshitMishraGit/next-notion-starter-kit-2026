// This file is intentionally a thin re-export so that the prism base theme CSS
// is bundled into the same dynamic chunk as the Code component, keeping it out
// of the main CSS bundle on pages that have no code blocks.
import 'prismjs/themes/prism-coy.css'

export { Code } from 'react-notion-x/third-party/code'
