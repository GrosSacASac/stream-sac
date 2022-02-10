import { finished } from "node:stream/promises";
import test from "ava";
import { MarkdownParser } from "../../source/markdown/MarkdownParserNode.js";
import { concatAsStream } from "../../source/concatAsStream.js";


test(`em in the middle of list items`, async t => {
    const markdownParser = new MarkdownParser();
    const a = `aaa`;
    const outside = `outside`;
    const b = `bbb`;
    concatAsStream([` - *${a}*
- ${outside}*${b}*${outside}`]).pipe(markdownParser);
// todo alsow with 1 space before

    let forceBuffer = ``;
    markdownParser.on(`data`, (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    const li1 = `<li><em>${a}</em></li>`;
    const li2 = `<li>${outside}<em>${b}</em>${outside}</li>`;
    t.is(forceBuffer, (`<ul>${li1}${li2}</ul>`));
});


test(`em in the middle of list items 2`, async t => {
    const markdownParser = new MarkdownParser();
    const a = `aaa`;
    const outside = `outside`;
    const b = `bbb`;
    concatAsStream([` - *${a}*
- ${outside}*${b}*${outside}
- ${outside}*${b}*${outside}
- ${outside}*${b}*${outside}
- ${outside}*${b}*${outside}`]).pipe(markdownParser);

    let forceBuffer = ``;
    markdownParser.on(`data`, (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    const li1 = `<li><em>${a}</em></li>`;
    const li2 = `<li>${outside}<em>${b}</em>${outside}</li>`;
    t.is(forceBuffer, (`<ul>${li1}${li2}${li2}${li2}${li2}</ul>`));
});


test(`link in the middle of list items`, async t => {
    const markdownParser = new MarkdownParser();
    const linkTarget = `https://surge.sh/`;
    const linkText = `surge`;
    const linkTarget2 = `https://letz.social/blog/b/blog-engine-sac`;
    const linkText2 = `blog-engine-sac`;
    concatAsStream([` - [${linkText}](${linkTarget}) to deploy any local HTML, CSS, JS file to a website
 - [${linkText2}](${linkTarget2}) to create a website from markdown files`]).pipe(markdownParser);

    let forceBuffer = ``;
    markdownParser.on(`data`, (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    // t.is(forceBuffer, (`<a href="${linkTarget}">${linkText}</a>`));
    const a = `<li><a href="${linkTarget}">${linkText}</a> to deploy any local HTML, CSS, JS file to a website</li>`;
    const b = `<li><a href="${linkTarget2}">${linkText2}</a> to create a website from markdown files</li>`;
    t.is(forceBuffer, (`<ul>${a}${b}</ul>`));
});

test(`link in the middle of ordered list items`, async t => {
    const markdownParser = new MarkdownParser();
    const linkTarget = `https://surge.sh/`;
    const linkText = `surge`;
    const linkTarget2 = `https://letz.social/blog/b/blog-engine-sac`;
    const linkText2 = `blog-engine-sac`;
    concatAsStream([` 1. [${linkText}](${linkTarget}) to deploy any local HTML, CSS, JS file to a website
 2. [${linkText2}](${linkTarget2}) to create a website from markdown files`]).pipe(markdownParser);

    let forceBuffer = ``;
    markdownParser.on(`data`, (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    // t.is(forceBuffer, (`<a href="${linkTarget}">${linkText}</a>`));
    const a = `<li><a href="${linkTarget}">${linkText}</a> to deploy any local HTML, CSS, JS file to a website</li>`;
    const b = `<li><a href="${linkTarget2}">${linkText2}</a> to create a website from markdown files</li>`;
    t.is(forceBuffer, (`<ol>${a}${b}</ol>`));
});


test(`raw in the middle of a paragraph`, async t => {
    const markdownParser = new MarkdownParser();
    concatAsStream([`Want to make text look big ? Think about the reason first, maybe it is a title and \`<h1-6>\` should be used.`]).pipe(markdownParser);

    let forceBuffer = ``;
    markdownParser.on(`data`, (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, (`<p>Want to make text look big ? Think about the reason first, maybe it is a title and <code>&lt;h1-6&gt;</code> should be used.</p>`));
});


test(`raw in the middle of a paragraph with triple backticks`, async t => {
    const markdownParser = new MarkdownParser();
    const text = `*special text*`;
    concatAsStream([`a \`\`\`<h1-6>\`\`\` c`]).pipe(markdownParser);

    let forceBuffer = ``;
    markdownParser.on(`data`, (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, (`<p>a <code>&lt;h1-6&gt;</code> c</p>`));
});


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

    let forceBuffer = ``;
    markdownParser.on(`data`, (x) => {
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

    let forceBuffer = ``;
    markdownParser.on(`data`, (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);  
    t.is(forceBuffer, (`<h3>a</h3><pre><code class="language-b">c</code></pre><h3><code>d</code></h3><p>e</p>`));
});





// todo
// test(`nested list`, async t => {
//     const markdownParser = new MarkdownParser();
//     concatAsStream([`* Fruit
//   * Apple
//   * Orange
//   * Banana
// * Dairy
//   * Milk
//   * Cheese`]).pipe(markdownParser);

//     let forceBuffer = ``
//     markdownParser.on('data', (x) => {
//         forceBuffer = `${forceBuffer}${x}`;
//     });
//     await finished(markdownParser);
//     t.is(forceBuffer, (`<ul><li>Fruit
// <ul>
// <li>Apple</li>
// <li>Orange</li>
// <li>Banana</li>
// </ul>
// </li>
// <li>Dairy
// <ul>
// <li>Milk</li>
// <li>Cheese</li>
// </ul>
// </li>
// </ul>`).replaceAll("\n", ""));
// });


test(`code block`, async t => {
    const markdownParser = new MarkdownParser();
    const code = `x = 2`;
    const lang = `js`;
    concatAsStream([`\`\`\`${lang}
${code}\`\`\``]).pipe(markdownParser);

    let forceBuffer = ``;
    markdownParser.on(`data`, (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, (`<pre><code class="language-${lang}">${code}</code></pre>`));
});

test(`inline html symbols are escaped`, async t => {
    const markdownParser = new MarkdownParser();
    concatAsStream([`
    8 > 7

    7 < 8

    1 & 1 = 2
`]).pipe(markdownParser);

    let forceBuffer = ``;
    markdownParser.on(`data`, (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, (`<p>8 &gt; 7</p><p>7 &lt; 8</p><p>1 &amp; 1 = 2</p>`));
});

test(`inline html stays as is `, async t => {
    const markdownParser = new MarkdownParser();
    concatAsStream([`
    <p>8 &gt; 7</p>`]).pipe(markdownParser);

    let forceBuffer = ``;
    markdownParser.on(`data`, (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, (`<p>8 &gt; 7</p>`));
});

// todo requires refactor
// test(`inline html inside a markdown element stays as is `, async t => {
//     const markdownParser = new MarkdownParser();
//     concatAsStream([` * <strong>1</strong>`]).pipe(markdownParser);

//     let forceBuffer = ``
//     markdownParser.on('data', (x) => {
//         forceBuffer = `${forceBuffer}${x}`;
//     });
//     await finished(markdownParser);
//     t.is(forceBuffer, (`<ul><li><strong>1</strong></li></ul>`));
// });

test(`it should not mix elements`, async t => {
    const markdownParser = new MarkdownParser();
    concatAsStream([`# a

    <img src="b" alt="c">
    
    _d_
    
    ## e
    `]).pipe(markdownParser);

    let forceBuffer = ``;
    markdownParser.on(`data`, (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, (`<h1>a</h1><img src="b" alt="c"><p><em>d</em></p><h2>e</h2>`));
});

test(`link inside emphasis alternative syntax`, async t => {
    const markdownParser = new MarkdownParser();
    const x = `notice me`;
    const linkTarget = `https://example.com/`;
    const linkText = `example`;
    concatAsStream([`_${x}[${linkText}](${linkTarget})_`]).pipe(markdownParser);

    let forceBuffer = ``;
    markdownParser.on(`data`, (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, (`<p><em>${x}<a href="${linkTarget}">${linkText}</a></em></p>`));
});

test(`image instead of the link text`, async t => {
    // [![npm bundle size minified + gzip](https://img.shields.io/bundlephobia/minzip/dom99.svg)](https://bundlephobia.com/result?p=dom99)
    const markdownParser = new MarkdownParser();
    const imageAlt = `npm bundle size minified + gzip`;
    const imageSrc = `https://img.shields.io/bundlephobia/minzip/dom99.svg`;
    const linkSrc = `https://bundlephobia.com/result?p=dom99`;
    
    concatAsStream([`[![${imageAlt}](${imageSrc})](${linkSrc})`]).pipe(markdownParser);

    let forceBuffer = ``;
    markdownParser.on(`data`, (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, (`<p><a href="${linkSrc}"><img alt="${imageAlt}" src="${imageSrc}"></a></p>`));
});


test(`link inside ordered list`, async t => {
    const markdownParser = new MarkdownParser();
    const linkTarget = `https://example.com/`;
    const linkText = `example`;
    const otherListItem = `ccc ddd`;
    concatAsStream([` 1. [${linkText}](${linkTarget})
 2. ${otherListItem}`]).pipe(markdownParser);

    let forceBuffer = ``;
    markdownParser.on(`data`, (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, (`<ol><li><a href="${linkTarget}">${linkText}</a></li><li>${otherListItem}</li></ol>`));
});


test(`h3 then link inside li`, async t => {
    const markdownParser = new MarkdownParser();
    concatAsStream([`
### Related

 - [from2](https://www.npmjs.com/package/from2)
`,
    ]).pipe(markdownParser);

    let forceBuffer = ``;
    markdownParser.on(`data`, (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, (`<h3>Related</h3><ul><li><a href="https://www.npmjs.com/package/from2">from2</a></li></ul>`));
});



test(`em inside quote`, async t => {
    const markdownParser = new MarkdownParser();
    const quote = `An eye for an eye leaves the whole world blind`;
    concatAsStream([`> *${quote}*`]).pipe(markdownParser);

    let forceBuffer = ``;
    markdownParser.on(`data`, (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, (`<blockquote><p><em>${quote}</em></p></blockquote>`));
});


test(`ems inside quote`, async t => {
    const markdownParser = new MarkdownParser();
    const parts = [`a`, `b`, `c`];
    
    concatAsStream([`> *${parts[0]}*${parts[1]}*${parts[2]}*`]).pipe(markdownParser);

    let forceBuffer = ``;
    markdownParser.on(`data`, (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, (`<blockquote><p><em>${parts[0]}</em>${parts[1]}<em>${parts[2]}</em></p></blockquote>`));
});

test(`strongs inside quote`, async t => {
    const markdownParser = new MarkdownParser();
    const parts = [`a`, `b`, `c`];
    
    concatAsStream([`**${parts[0]}**${parts[1]}**${parts[2]}**`]).pipe(markdownParser);

    let forceBuffer = ``;
    markdownParser.on(`data`, (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, (`<p><strong>${parts[0]}</strong>${parts[1]}<strong>${parts[2]}</strong></p>`));
});


test(`title and html`, async t => {
    const markdownParser = new MarkdownParser();
    const title = `hello world`;
    const htmlPart = `<meter value="0.6"></meter>`;
    
    concatAsStream([`# ${title}

${htmlPart}`]).pipe(markdownParser);

    let forceBuffer = ``;
    markdownParser.on(`data`, (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, (`<h1>${title}</h1>${htmlPart}`));
});
