import test from "ava";
import { MarkdownParser } from "../../source/markdown/MarkdownParser.js";
import { concatAsStream } from "../../source/concatAsStream.js";
import { finished } from "stream/promises";
import slugify from "@sindresorhus/slugify";



test(`raw and titles`, async t => {
    const markdownParser = new MarkdownParser();
    concatAsStream([`
## a

\`\`\`
b
\`\`\`

## d

\`\`\`e
f
\`\`\`
`]).pipe(markdownParser);

    let forceBuffer = ``
    markdownParser.on('data', (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);  
    t.is(forceBuffer, (`<h2>a</h2><pre><code>b</code></pre><h2>d</h2><pre><code class="language-e">f</code></pre>`));
});

test(`raw and titles 2`, async t => {
    const markdownParser = new MarkdownParser();
    concatAsStream([`### a

\`\`\`b
c
\`\`\`

### \`d\`

e`]).pipe(markdownParser);

    let forceBuffer = ``
    markdownParser.on('data', (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);  
    t.is(forceBuffer, (`<h3>a</h3><pre><code class="language-b">c</code></pre><h3><code>d</code></h3><p>e</p>`));
});
