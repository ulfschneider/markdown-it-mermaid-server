# markdown-it-mermaid-server

A markdown-it plugin to render mermaid diagrams on the server. The resulting diagrams will be referenced in the resulting HTML documents without sending any mermaid code to the browser client. markdown-it-mermaid-server is perfectly suited for Static Site Generators (SSG), like for example [11ty](https://www.11ty.dev).

markdown-it-mermaid-server has a peer dependency to the [@mermaid-js/mermaid-cli](https://www.npmjs.com/package/@mermaid-js/mermaid-cli/) package. When using markdown-it-mermaid-server, you have to install the peer dependency by yourself to your project, which means you can update it at any time to stay up to date with the most current @mermaid-js/mermaid-cli package.

While the creation of mermaid diagrams on the server is an async process, the markdown-it-mermaid-server plugin can still be used in sync-functioning markdown-it render process.

It´s possible to provide a `mermaidConfig` object in the options with any of the configuration settings of mermaid.

## Install

- `npm install markdown-it-mermaid-server`
- `npm install --save-peer @mermaid-js/mermaid-cli`

## Use

```js
import markdownItMermaidServer from 'markdown-it-mermaid-server'
import markdownIt from 'markdown-it'

const md = markdownIt()

//default settings
const markdownItMermaidOptions = {
  workingFolder: "mermaidTmp",
  outputFolder: "mermaid",
  renderPath: "/mermaid/",
  chartFormat: "svg",
  mermaidConfig: {},
};

md.use(markdownItMermaidServer, markdownItMermaidOptions)
```

Explanation of the above options:

`workingFolder`
: A temporary folder to store the currently processed mermaid diagram definition and the mermaidConfig object. **Add the folder to your `.gitignore` file, because it doesn´t require code versioning. Default is `mermaidTmp`.

`outpoutFolder`
: The folder to store the created diagram images to be referenced in the resulting HTML documents. Default is `mermaid`.

`renderPath`
: The path to reference the created diagrams in the resulting HTML. In the following example, the default renderPath `/mermaid/` is used to access the mermaid SVG diagram: `<img src="/mermaid/Q8jScdyns6K32zkmj9SD4.svg"/>`

`chartFormat`
: The format of the resulting mermaid chart. Default is `svg`, other supported formats are `png` and `pdf`.

`mermaidConfig`
: The mermaid [configuration JSON](https://mermaid.js.org/config/schema-docs/config.html) object.
