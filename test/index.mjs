import markdownit from "markdown-it";
import markdownItMermaid from "../index.mjs";
const md = markdownit();

const TEST = `\`\`\`mermaid
  sequenceDiagram
      title "My sequence diagram"
      participant Alice
      participant Bob
      Bob->>Alice: Hi Alice
      Alice->>Bob: Hi Bob

\`\`\``;

md.use(markdownItMermaid, { useDataUri: false });

const result = md.render(TEST);
console.log(result);
