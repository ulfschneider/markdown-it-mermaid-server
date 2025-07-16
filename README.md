# markdown-it-mermaid-server

A markdown-it plugin to transform textual [Mermaid](https://mermaid.js.org) diagram definitions into SVG images.

markdown-it-mermaid-server runs on the server. The produced SVG images will be referenced in the HTML documents without sending any Mermaid code to the browser client. The plugin is perfectly suited for the build process of Static Site Generators (SSG), like for example [11ty](https://www.11ty.dev).

The transformed images are inserted into `figure` HTML tags, like so:

```html
<figure class="mermaid"><img src="/mermaid/16f17fbc.svg"/></figure>
```

You can configure to insert the image as a data URI, like:

```html
<figure class="mermaid"><img src="data:image/svg+xml;base64,PHN2ZyBhcmlhLXJvbGVk..." /></figure>
```

## Install

markdown-it-mermaid-server has a peer dependency to the [@mermaid-js/mermaid-cli](https://www.npmjs.com/package/@mermaid-js/mermaid-cli/) package. You have to install the peer dependency by yourself to your project, which means you can update it at any time to stay up to date with the most current @mermaid-js/mermaid-cli package.

`npm install @mermaid-js/mermaid-cli markdown-it-mermaid-server`

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
  imageAttributes: [],
  useDataUri: false,
  backgroundColor: "white",
  mermaidConfig: {},
};

md.use(markdownItMermaidServer, markdownItMermaidOptions)
```

## Options

> [!CAUTION]
> Use the `workingFolder` and the `outputFolder` exclusively for markdown-it-mermaid-server and not for other content. It also makes sense to have those folders part of your `.gitignore` file to avoid having the generated content part of your code versioning.

- `workingFolder`: A temporary folder to store the currently processed Mermaid diagram definition and the mermaidConfig object. **Add the folder to your `.gitignore` file, because it doesn´t require code versioning**. Default is `mermaidTmp`.
- `outpoutFolder`: The folder to store the created diagram images to be referenced in the resulting HTML documents. Default is `mermaid`. Because with every build the created diagram images will receive a new name, **the output folder should be part of your .gitignore file**.
- `renderPath`: The path to reference the created diagrams in the resulting HTML. In the following example, the default renderPath `/mermaid/` is used to access the Mermaid SVG diagram: `<img src="/mermaid/Q8jScdyns6K32zkmj9SD4.svg"/>`
- `imageAttributes`: A string array with HTML attributes to add to the resulting HTML image tag.
- `useDataUri`: A boolean value to indicate if the diagram should be referenced with a data uri, like `<img src="data:image/svg+xml;base64,PHN2ZyBhcm...`. By default, this settings is `false`.
- `backgroundColor`: The background for the SVG diagrams. Default is `white`.
- `mermaidConfig`: The Mermaid [configuration JSON](https://mermaid.js.org/config/schema-docs/config.html) object.

## Markdown

Within your Markdown, describe the Mermaid chart within a fenced codeblock, introduced with the `mermaid` keyword, like so:

<pre>
```mermaid
quadrantChart
title Reach and engagement of campaigns
x-axis Low Reach --> High Reach
y-axis Low Engagement --> High Engagement
quadrant-1 We should expand
quadrant-2 Need to promote
quadrant-3 Re-evaluate
quadrant-4 May be improved
Campaign A: [0.3, 0.6]
Campaign B: [0.45, 0.23]
Campaign C: [0.57, 0.69]
Campaign D: [0.78, 0.34]
Campaign E: [0.40, 0.34]
Campaign F: [0.35, 0.78]
```
</pre>
