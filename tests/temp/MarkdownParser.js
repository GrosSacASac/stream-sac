import test from "ava";
import { MarkdownParser } from "../../source/markdown/MarkdownParser.js";
import { concatAsStream } from "../../source/concatAsStream.js";
import { finished } from "stream/promises";
import slugify from "@sindresorhus/slugify";
//todo change order (block then inline)


test(`MarkdownParser is a function`, t => {
    t.is(typeof MarkdownParser, `function`);
});

test(`paragraph`, async t => {
    const markdownParser = new MarkdownParser();
    const t1 = `blablabla`
    concatAsStream([`${t1}`]).pipe(markdownParser);

    let forceBuffer = ``
    markdownParser.on('data', (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, (`<p>${t1}</p>`));
});

test(`paragraphs`, async t => {
    const markdownParser = new MarkdownParser();
    const t1 = `blablabla`
    const t2 = `zzzzzzzzzzz`
    concatAsStream([`${t1}

${t2}`]).pipe(markdownParser);

    let forceBuffer = ``
    markdownParser.on('data', (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, (`<p>${t1}</p><p>${t2}</p>`));
});

test(`quote`, async t => {
    const markdownParser = new MarkdownParser();
    const quote = `An eye for an eye leaves the whole world blind`
    const author = `Gandhi`
    concatAsStream([`> ${quote}

${author}`]).pipe(markdownParser);

    let forceBuffer = ``
    markdownParser.on('data', (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, (`<blockquote><p>${quote}</p></blockquote><p>${author}</p>`));
});

// test(`inline quote`, async t => {
//     // is this even possible in markdown ?
//     <q></q>
// });

test(`streaming cut in half`, async t => {
    const markdownParser = new MarkdownParser();
    const t1 = `blablabla`
    const t2 = `zzzzzzzzzzz`
    concatAsStream([`${t1.substr(0, 4)}`, `${t1.substr(4)}

${t2}`]).pipe(markdownParser);

    let forceBuffer = ``
    markdownParser.on('data', (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, (`<p>${t1}</p><p>${t2}</p>`));
});

test(`title`, async t => {
    const markdownParser = new MarkdownParser();
    const titleText = `title`
    concatAsStream([`# ${titleText}`]).pipe(markdownParser);

    let forceBuffer = ``
    markdownParser.on('data', (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, `<h1>${titleText}</h1>`);
});

test(`title alternative`, async t => {
    const markdownParser = new MarkdownParser();
    const titleText = `title`
    concatAsStream([`${titleText}
========`]).pipe(markdownParser);

    let forceBuffer = ``
    markdownParser.on('data', (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, `<h1>${titleText}</h1>`);
});

test(`title 2`, async t => {
    const markdownParser = new MarkdownParser();
    const titleText = `title`
    concatAsStream([`## ${titleText}`]).pipe(markdownParser);

    let forceBuffer = ``
    markdownParser.on('data', (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, `<h2>${titleText}</h2>`);
});

test(`title 2 alternative`, async t => {
    const markdownParser = new MarkdownParser();
    const titleText = `title`
    concatAsStream([`${titleText}
-----`]).pipe(markdownParser);

    let forceBuffer = ``
    markdownParser.on('data', (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, `<h2>${titleText}</h2>`);
});

test(`separator`, async t => {
    const markdownParser = new MarkdownParser();
    concatAsStream([`a

-----

b`]).pipe(markdownParser);

    let forceBuffer = ``
    markdownParser.on('data', (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, `<p>a</p><hr><p>b</p>`);
});

test(`link`, async t => {
    const markdownParser = new MarkdownParser();
    const linkTarget = `https://example.com/`
    const linkText = `example`
    concatAsStream([`[${linkText}](${linkTarget})`]).pipe(markdownParser);

    let forceBuffer = ``
    markdownParser.on('data', (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, (`<p><a href="${linkTarget}">${linkText}</a></p>`));
    // t.is(forceBuffer.includes(`<a href="${linkTarget}">${linkText}</a>`), true);
});

test(`reference link`, async t => {
    const markdownParser = new MarkdownParser();
    const linkTarget = `https://example.com/`
    const linkText = `example` 
    const linkRef = `example and you` 
    const linkRefUppercase = linkRef.toUpperCase();
    concatAsStream([`[${linkText}][${linkRef}]

[${linkRefUppercase}]: ${linkTarget}`]).pipe(markdownParser);

    let forceBuffer = ``
    markdownParser.on('data', (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, (`<p><a href="#${slugify(linkRef)}">${linkText}</a></p><p><a id="${slugify(linkRef)}" href="${linkTarget}">${linkRefUppercase}</a></p>`));
    // t.is(forceBuffer, (`<p><a href="${linkTarget}">${linkText}</a></p>`));
});

test(`reference link with only text`, async t => {
    const markdownParser = new MarkdownParser();
    const linkTarget = `https://example.com/`
    const linkText = `example` 
    concatAsStream([`[${linkText}]

[${linkText}]: ${linkTarget}`]).pipe(markdownParser);

    let forceBuffer = ``
    markdownParser.on('data', (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, (`<p><a href="#${slugify(linkText)}">${linkText}</a></p><p><a id="${slugify(linkText)}" href="${linkTarget}">${linkText}</a></p>`));
    // t.is(forceBuffer, (`<p><a href="${linkTarget}">${linkText}</a></p>`));
});


test(`auto detect link`, async t => {
    const markdownParser = new MarkdownParser();
    const linkTarget = `https://gitlab.com/GrosSacASac/blog-engine-z/`;
    concatAsStream([`${linkTarget}`]).pipe(markdownParser);

    let forceBuffer = ``
    markdownParser.on('data', (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    // t.is(forceBuffer, (`<a href="${linkTarget}">${linkText}</a>`));
    t.is(forceBuffer, `<p><a href="${linkTarget}">${linkTarget}</a></p>`);
});

test(`auto detect link that could be falsely handled as md`, async t => {
    const markdownParser = new MarkdownParser();
    const linkTarget = `https://gitlab.com/_notmd_`;
    concatAsStream([`${linkTarget}`]).pipe(markdownParser);

    let forceBuffer = ``
    markdownParser.on('data', (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    // t.is(forceBuffer, (`<a href="${linkTarget}">${linkText}</a>`));
    t.is(forceBuffer, `<p><a href="${linkTarget}">${linkTarget}</a></p>`);
});

test(`link in the middle of text`, async t => {
    const markdownParser = new MarkdownParser();
    let textbefore = `aaa`;
    let textafter = `bbb`;
    const linkTarget = `example.com`
    const linkText = `example`
    concatAsStream([`${textbefore}[${linkText}](${linkTarget})${textafter}`]).pipe(markdownParser);

    let forceBuffer = ``
    markdownParser.on('data', (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    // t.is(forceBuffer, (`<a href="${linkTarget}">${linkText}</a>`));
    t.is(forceBuffer, (`<p>aaa<a href="${linkTarget}">${linkText}</a>bbb</p>`));
});

test(`link in the middle of list items`, async t => {
    const markdownParser = new MarkdownParser();
    const linkTarget = `https://surge.sh/`
    const linkText = `surge`
    const linkTarget2 = `https://letz.social/blog/b/blog-engine-sac`
    const linkText2 = `blog-engine-sac`
    concatAsStream([` - [${linkText}](${linkTarget}) to deploy any local HTML, CSS, JS file to a website
 - [${linkText2}](${linkTarget2}) to create a website from markdown files`]).pipe(markdownParser);

    let forceBuffer = ``
    markdownParser.on('data', (x) => {
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
    const linkTarget = `https://surge.sh/`
    const linkText = `surge`
    const linkTarget2 = `https://letz.social/blog/b/blog-engine-sac`
    const linkText2 = `blog-engine-sac`
    concatAsStream([` 1. [${linkText}](${linkTarget}) to deploy any local HTML, CSS, JS file to a website
 2. [${linkText2}](${linkTarget2}) to create a website from markdown files`]).pipe(markdownParser);

    let forceBuffer = ``
    markdownParser.on('data', (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    // t.is(forceBuffer, (`<a href="${linkTarget}">${linkText}</a>`));
    const a = `<li><a href="${linkTarget}">${linkText}</a> to deploy any local HTML, CSS, JS file to a website</li>`;
    const b = `<li><a href="${linkTarget2}">${linkText2}</a> to create a website from markdown files</li>`;
    t.is(forceBuffer, (`<ol>${a}${b}</ol>`));
});

test(`raw inline`, async t => {
    const markdownParser = new MarkdownParser();
    const text = `*special text*`
    concatAsStream([`
    \`${text}\`
    `]).pipe(markdownParser);

    let forceBuffer = ``
    markdownParser.on('data', (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, (`<p><code>${text}</code></p>`));
});

test(`raw in the middle of a paragraph`, async t => {
    const markdownParser = new MarkdownParser();
    concatAsStream([`Want to make text look big ? Think about the reason first, maybe it is a title and \`<h1-6>\` should be used.`]).pipe(markdownParser);

    let forceBuffer = ``
    markdownParser.on('data', (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, (`<p>Want to make text look big ? Think about the reason first, maybe it is a title and <code>&lt;h1-6&gt;</code> should be used.</p>`));
});

test(`raw with backticks inside`, async t => {
    const markdownParser = new MarkdownParser();
    concatAsStream([`\`\`\`typeof x === \`string\`\`\`\` for type checking .`]).pipe(markdownParser);

    let forceBuffer = ``
    markdownParser.on('data', (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, (`<p><code>typeof x === \`string\`</code> for type checking .</p>`));
});

test(`raw in the middle of a paragraph with triple backticks`, async t => {
    const markdownParser = new MarkdownParser();
    const text = `*special text*`
    concatAsStream([`a \`\`\`<h1-6>\`\`\` c`]).pipe(markdownParser);

    let forceBuffer = ``
    markdownParser.on('data', (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, (`<p>a <code>&lt;h1-6&gt;</code> c</p>`));
});


test(`raw html code is displayed properly`, async t => {
    const markdownParser = new MarkdownParser();
    concatAsStream([`
    \`\`\`html
<style>
    .block{display: block; margin-bottom: 0.5em;}


</style>
\`\`\`
    `]).pipe(markdownParser);

    let forceBuffer = ``
    markdownParser.on('data', (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, (`<pre><code class="language-html">&lt;style&gt;
    .block{display: block; margin-bottom: 0.5em;}


&lt;/style&gt;</code></pre>`));
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



test(`image`, async t => {
    const markdownParser = new MarkdownParser();
    const altText = `drinking face`
    const source = `../images/about.jpg`
    concatAsStream([`![${altText}](${source})`]).pipe(markdownParser);

    let forceBuffer = ``
    markdownParser.on('data', (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, (`<p><img alt="${altText}" src="${source}"></p>`));
});

test(`strong`, async t => {
    const markdownParser = new MarkdownParser();
    const x = `important !`
    concatAsStream([`**${x}**`]).pipe(markdownParser);

    let forceBuffer = ``
    markdownParser.on('data', (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, (`<p><strong>${x}</strong></p>`));
});


test(`strong alternative syntax`, async t => {
    const markdownParser = new MarkdownParser();
    const x = `important !`
    concatAsStream([`__${x}__`]).pipe(markdownParser);

    let forceBuffer = ``
    markdownParser.on('data', (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, (`<p><strong>${x}</strong></p>`));
});


test(`deleted`, async t => {
    const markdownParser = new MarkdownParser();
    const x = `removed !`
    concatAsStream([`~~${x}~~`]).pipe(markdownParser);

    let forceBuffer = ``
    markdownParser.on('data', (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, (`<p><del>${x}</del></p>`));
});


test(`2 deleted`, async t => {
    const markdownParser = new MarkdownParser();
    const x = `removed !`
    concatAsStream([`~~${x}~~~~${x}~~`]).pipe(markdownParser);

    let forceBuffer = ``
    markdownParser.on('data', (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, (`<p><del>${x}</del><del>${x}</del></p>`));
});

test(`deleted without closing`, async t => {
    const markdownParser = new MarkdownParser();
    const x = `removed !`
    concatAsStream([`~~${x}`]).pipe(markdownParser);

    let forceBuffer = ``
    markdownParser.on('data', (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, (`<p>~~${x}</p>`));
});

test(`closing deleted without start`, async t => {
    const markdownParser = new MarkdownParser();
    const x = `removed !`
    concatAsStream([`${x}~~`]).pipe(markdownParser);

    let forceBuffer = ``
    markdownParser.on('data', (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, (`<p>${x}~~</p>`));
});


test(`emphasis`, async t => {
    const markdownParser = new MarkdownParser();
    const x = `notice me`
    concatAsStream([`*${x}*`]).pipe(markdownParser);

    let forceBuffer = ``
    markdownParser.on('data', (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, (`<p><em>${x}</em></p>`));
});

test(`emphasis alternative syntax`, async t => {
    const markdownParser = new MarkdownParser();
    const x = `notice me`
    concatAsStream([`_${x}_`]).pipe(markdownParser);

    let forceBuffer = ``
    markdownParser.on('data', (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, (`<p><em>${x}</em></p>`));
});


test(`unordered list`, async t => {
    const markdownParser = new MarkdownParser();
    const listItem = `xxx yyy`
    const otherListItem = `eee uuu`
    concatAsStream([` * ${listItem}
 * ${otherListItem}`]).pipe(markdownParser);

    let forceBuffer = ``
    markdownParser.on('data', (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, (`<ul><li>${listItem}</li><li>${otherListItem}</li></ul>`));
});

test(`unordered list with end of line`, async t => {
    const markdownParser = new MarkdownParser();
    const listItem = `xxx yyy`
    const otherListItem = `eee uuu`
    concatAsStream([` * ${listItem}
 * ${otherListItem}
`]).pipe(markdownParser);

    let forceBuffer = ``
    markdownParser.on('data', (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, (`<ul><li>${listItem}</li><li>${otherListItem}</li></ul>`));
});


test(`ordered list`, async t => {
    const markdownParser = new MarkdownParser();
    const listItem = `aaa bbb`
    const otherListItem = `ccc ddd`
    concatAsStream([` 1. ${listItem}
 2. ${otherListItem}`]).pipe(markdownParser);

    let forceBuffer = ``
    markdownParser.on('data', (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, (`<ol><li>${listItem}</li><li>${otherListItem}</li></ol>`));
});

test(`nested list`, async t => {
    const markdownParser = new MarkdownParser();
    concatAsStream([`* Fruit
  * Apple
  * Orange
  * Banana
* Dairy
  * Milk
  * Cheese`]).pipe(markdownParser);

    let forceBuffer = ``
    markdownParser.on('data', (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, (`<ul><li>Fruit
<ul>
<li>Apple</li>
<li>Orange</li>
<li>Banana</li>
</ul>
</li>
<li>Dairy
<ul>
<li>Milk</li>
<li>Cheese</li>
</ul>
</li>
</ul>`).replaceAll("\n", ""));
});


test(`code block`, async t => {
    const markdownParser = new MarkdownParser();
    const code = `x = 2`
    const lang = `js`
    concatAsStream([`\`\`\`${lang}
${code}\`\`\``]).pipe(markdownParser);

    let forceBuffer = ``
    markdownParser.on('data', (x) => {
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

    let forceBuffer = ``
    markdownParser.on('data', (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, (`<p>8 &gt; 7</p><p>7 &lt; 8</p><p>1 &amp; 1 = 2</p>`));
});

test(`inline html stays as is `, async t => {
    const markdownParser = new MarkdownParser();
    concatAsStream([`
    <p>8 &gt; 7</p>`]).pipe(markdownParser);

    let forceBuffer = ``
    markdownParser.on('data', (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, (`<p>8 &gt; 7</p>`));
});


test(`inline html inside a markdown element stays as is `, async t => {
    const markdownParser = new MarkdownParser();
    concatAsStream([` * <strong>1</strong>`]).pipe(markdownParser);

    let forceBuffer = ``
    markdownParser.on('data', (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, (`<ul><li><strong>1</strong></li></ul>`));
});

test(`it is not inline html if invalid html`, async t => {
    const markdownParser = new MarkdownParser();
    concatAsStream([`
    <1>*8 > 7*</1>`]).pipe(markdownParser);

    let forceBuffer = ``
    markdownParser.on('data', (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, (`<p>&lt;1&gt;<em>8 &gt; 7</em>&lt;/1&gt;</p>`));
});

test(`it should handle empty html elements`, async t => {
    const markdownParser = new MarkdownParser();
    concatAsStream([`<img src="a" alt="b">

    _c_`]).pipe(markdownParser);

    let forceBuffer = ``
    markdownParser.on('data', (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, (`<img src="a" alt="b"><p><em>c</em></p>`));
});

// convulated tests below

test(`it should not mix elements`, async t => {
    const markdownParser = new MarkdownParser();
    concatAsStream([`# a

    <img src="b" alt="c">
    
    _d_
    
    ## e
    `]).pipe(markdownParser);

    let forceBuffer = ``
    markdownParser.on('data', (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, (`<h1>a</h1><img src="b" alt="c"><p><em>d</em></p><h2>e</h2>`));
});

test(`link inside emphasis alternative syntax`, async t => {
    const markdownParser = new MarkdownParser();
    const x = `notice me`
    const linkTarget = `https://example.com/`
    const linkText = `example`
    concatAsStream([`_${x}[${linkText}](${linkTarget})_`]).pipe(markdownParser);

    let forceBuffer = ``
    markdownParser.on('data', (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, (`<p><em>${x}<a href="${linkTarget}">${linkText}</a></em></p>`));
});


test(`link inside unordered list`, async t => {
    const markdownParser = new MarkdownParser();
    const linkTarget = `https://example.com/`
    const linkText = `example`
    const otherListItem = `ccc ddd`
    concatAsStream([` 1. [${linkText}](${linkTarget})
 2. ${otherListItem}`]).pipe(markdownParser);

    let forceBuffer = ``
    markdownParser.on('data', (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, (`<ol><li><a href="${linkTarget}">${linkText}</a></li><li>${otherListItem}</li></ol>`));
});

