import markdownit from "markdown-it";
import markdownItMermaid from "../index.mjs";
const md = markdownit();

const TEST = `\`\`\`mermaid
  flowchart LR
    A(["Start"]) --> B{"Decision"}
    B --> C["Option A"] & D["Option B"]
\`\`\``;

md.use(markdownItMermaid);

const result = md.render(TEST);
console.log(result);
