import markdownit from "markdown-it";
import markdownItMermaid from "../index.mjs";
const md = markdownit();

const TEST = `\`\`\`mermaid
  flowchart LR
    figcaption this is a figcaption
    alt this is alt text
    A(["Start"]) --> B{"Decision"}
    B --> C["Option A"] & D["Option B"]
\`\`\`

\`\`\`mermaid
radar-beta

axis m["Math"], s["Science"], e["English"], h["History"], g["Geography"], a["Art"]
curve a["Alice"]{85, 90, 80, 70, 75, 90}
curve b["Bob"]{70, 75, 85, 80, 90, 85}

max 100
min 0
\`\`\`

\`\`\`mermaid
  flowchart LR
    figcaption this is a figcaption
    alt this is alt text
    A(["Start"]) --> B{"Decision"}
    B --> C["Option A"] & D["Option B"]
\`\`\`


\`\`\`mermaid
  flowchart LR
    figcaption this is a figcaption
    alt this is alt text
    A(["Start"]) --> B{"Decision"}
    B --> C["Option A"] & D["Option B"]
\`\`\`


\`\`\`mermaid
  flowchart LR
    figcaption this is a figcaption
    alt this is alt text
    A(["Start"]) --> B{"Decision"}
    B --> C["Option A"] & D["Option B"]
\`\`\``;

md.use(markdownItMermaid, { clearWorkingFolder: false, verbose: true });

const result = md.render(TEST);
console.log(result);
