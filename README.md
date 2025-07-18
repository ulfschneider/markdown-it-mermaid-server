# markdown-it-mermaid-server

A markdown-it plugin to transform textual [Mermaid](https://mermaid.js.org) diagram definitions into SVG images.

markdown-it-mermaid-server runs on the server as part of the markdown-it transformation. The produced SVG images will be referenced in the resulting HTML documents without the need of any Mermaid code running on the browser client. The plugin is perfectly suited for the build process of Static Site Generators (SSG), like for example [11ty](https://www.11ty.dev).

The created images are inserted into `figure` HTML tags, for example:

```html
<figure class="mermaid"><img src="/mermaid/16f17fbc.svg"/></figure>
```

You can configure to insert the image as a data URI, like:

```html
<figure class="mermaid"><img src="data:image/svg+xml;base64,PHN2ZyBhcmlhLXJvbGVk..." /></figure>
```

When the diagram has a title, the title will be added as a `figcaption` to the `figure`.


## Install

markdown-it-mermaid-server has a peer dependency to the [@mermaid-js/mermaid-cli](https://www.npmjs.com/package/@mermaid-js/mermaid-cli/) package. You have to add the peer dependency by yourself to your project, which allows you to update it at any time to stay up to date with the most current @mermaid-js/mermaid-cli package. To make a complete install in one go, issue the command:

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
  themeCSS: "",
  mermaidConfig: {},
  puppeteerConfig: {},
  clearWorkingFolder: false,
  clearOutputFolder: false,
  verbose: false
};

md.use(markdownItMermaidServer, markdownItMermaidOptions)
```

## Options

> [!CAUTION]
> Use the `workingFolder` and the `outputFolder` exclusively for markdown-it-mermaid-server and not for other content. It also makes sense to have those folders part of your `.gitignore` file to avoid having the generated content being part of your code versioning.

- `workingFolder`: A temporary folder to used to transform the Mermaid diagram definitions to chart SVG images. **Add the folder to your `.gitignore` file, because it doesn´t require code versioning**. The default name of the folder is `mermaidTmp`.
- `outpoutFolder`: The folder to store the created diagram images to be referenced in the resulting HTML documents. The folder is only created and used when `useDataUri == false`. The default name is `mermaid`. Because the contents of this folder are generated, **the output folder should be part of your `.gitignore` file to avoid having it in the code versioning**.
- `renderPath`: The path to reference the created diagrams in the resulting HTML. It is only used when `useDataUri == false`. In the following example, the default renderPath `/mermaid/` is used to access the Mermaid SVG diagram: `<img src="/mermaid/16f17fbc.svg"/>`
- `imageAttributes`: A string with HTML attributes to add to the resulting HTML image tag.
- `useDataUri`: A boolean value to indicate if the diagram should be referenced with a data URI, like `<img src="data:image/svg+xml;base64,PHN2ZyBhcm...`. By default, this settings is `false`.
- `backgroundColor`: The background for the SVG diagrams. Default is `white`.
- `themeCSS`: A custom Mermaid theme CSS to style the resulting SVG diagrams.
- `mermaidConfig`: The Mermaid [configuration JSON](https://mermaid.js.org/config/schema-docs/config.html) object.
- `puppeteerConfig`: The Puppeteer [configuration JSON](https://pptr.dev/guides/configuration) object.
- `verbose`: A value of `true` will activate detailed logging. Default is `false`.
- `clearWorkingFolder`: A value of `true` will delete the working folder when initializing the plugin. Default is `false`.
- `clearOutputFolder`: A value of `true` will delete the output folder when initializing the plugin. Default is `false`.

## Markdown

In your Markdown, describe the Mermaid chart within a fenced codeblock, introduced with the `mermaid` keyword, like so:

~~~markdown
```mermaid
flowchart LR
  A(["Start"]) --> B{"Decision"}
  B --> C["Option A"] & D["Option B"]
```
~~~

The fenced codeblock will be replaced by a`figure` tag containing the diagram:

```html
<figure class="mermaid"><img src="/mermaid/16f17fbc.svg"/><figcaption>Reach and engagement of campaigns</figcaption></figure>
```
