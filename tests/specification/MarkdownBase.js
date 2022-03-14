import { finished } from "node:stream/promises";
import test from "ava";
import slugify from "@sindresorhus/slugify";
import { MarkdownParser } from "../../source/markdown/MarkdownParserNode.js";
import { concatAsStream } from "../../source/concatAsStream.js";
import {isWhitespaceCharacter} from "is-whitespace-character";
//todo change order (block then inline)


test(`paragraph`, async t => {
    const markdownParser = new MarkdownParser();
    const t1 = `blablabla`;
    concatAsStream([`${t1}`]).pipe(markdownParser);

    let forceBuffer = ``;
    markdownParser.on(`data`, (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, (`<p>${t1}</p>`));
});

test(`paragraphs`, async t => {
    const markdownParser = new MarkdownParser();
    const t1 = `blablabla`;
    const t2 = `zzzzzzzzzzz`;
    concatAsStream([`${t1}

${t2}`]).pipe(markdownParser);

    let forceBuffer = ``;
    markdownParser.on(`data`, (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, (`<p>${t1}</p><p>${t2}</p>`));
});

[``, ` `].forEach(potentialSpaceBefore => {
    [``, ` `].forEach(potentialSpaceAfter => {
        test(`quote with Space Before ${potentialSpaceBefore === ` `} and space after ${potentialSpaceAfter === ` `}`, async t => {
            const markdownParser = new MarkdownParser();
            const quote = `An eye for an eye leaves the whole world blind`;
            const author = `Gandhi`;
            concatAsStream([`${potentialSpaceBefore}>${potentialSpaceAfter}${quote}

${author}`]).pipe(markdownParser);
        
            let forceBuffer = ``;
            markdownParser.on(`data`, (x) => {
                forceBuffer = `${forceBuffer}${x}`;
            });
            await finished(markdownParser);
            t.is(forceBuffer, (`<blockquote><p>${quote}</p></blockquote><p>${author}</p>`));
        });
    });
});

// test(`inline quote`, async t => {
//     // is this even possible in markdown ?
//     <q></q>
// });

test(`title`, async t => {
    const markdownParser = new MarkdownParser();
    const titleText = `title`;
    concatAsStream([`# ${titleText}`]).pipe(markdownParser);

    let forceBuffer = ``;
    markdownParser.on(`data`, (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, `<h1>${titleText}</h1>`);
});

test(`title alternative`, async t => {
    const markdownParser = new MarkdownParser();
    const titleText = `title`;
    concatAsStream([`${titleText}
========`]).pipe(markdownParser);

    let forceBuffer = ``;
    markdownParser.on(`data`, (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, `<h1>${titleText}</h1>`);
});

test(`title alternative with linefeed`, async t => {
    const markdownParser = new MarkdownParser();
    const titleText = `title`;
    concatAsStream([`${titleText}
========
`]).pipe(markdownParser);

    let forceBuffer = ``;
    markdownParser.on(`data`, (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, `<h1>${titleText}</h1>`);
});

test(`title 2`, async t => {
    const markdownParser = new MarkdownParser();
    const titleText = `title`;
    concatAsStream([`## ${titleText}`]).pipe(markdownParser);

    let forceBuffer = ``;
    markdownParser.on(`data`, (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, `<h2>${titleText}</h2>`);
});

test(`title 2 alternative`, async t => {
    const markdownParser = new MarkdownParser();
    const titleText = `title`;
    concatAsStream([`${titleText}
-----`]).pipe(markdownParser);

    let forceBuffer = ``;
    markdownParser.on(`data`, (x) => {
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

    let forceBuffer = ``;
    markdownParser.on(`data`, (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, `<p>a</p><hr><p>b</p>`);
});

test(`link`, async t => {
    const markdownParser = new MarkdownParser();
    const linkTarget = `https://example.com/`;
    const linkText = `example`;
    concatAsStream([`[${linkText}](${linkTarget})`]).pipe(markdownParser);

    let forceBuffer = ``;
    markdownParser.on(`data`, (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, (`<p><a href="${linkTarget}">${linkText}</a></p>`));
    // t.is(forceBuffer.includes(`<a href="${linkTarget}">${linkText}</a>`), true);
});

test(`reference link`, async t => {
    const markdownParser = new MarkdownParser();
    const linkTarget = `https://example.com/`;
    const linkText = `example`; 
    const linkRef = `example and you`; 
    const linkRefUppercase = linkRef.toUpperCase();
    concatAsStream([`[${linkText}][${linkRef}]

[${linkRefUppercase}]: ${linkTarget}`]).pipe(markdownParser);

    let forceBuffer = ``;
    markdownParser.on(`data`, (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, (`<p><a href="#${slugify(linkRef)}">${linkText}</a></p><p><a id="${slugify(linkRef)}" href="${linkTarget}">${linkRefUppercase}</a></p>`));
    // t.is(forceBuffer, (`<p><a href="${linkTarget}">${linkText}</a></p>`));
});

test(`reference link with only text`, async t => {
    const markdownParser = new MarkdownParser();
    const linkTarget = `https://example.com/`;
    const linkText = `example`; 
    concatAsStream([`[${linkText}]

[${linkText}]: ${linkTarget}`]).pipe(markdownParser);

    let forceBuffer = ``;
    markdownParser.on(`data`, (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, (`<p><a href="#${slugify(linkText)}">${linkText}</a></p><p><a id="${slugify(linkText)}" href="${linkTarget}">${linkText}</a></p>`));
    // t.is(forceBuffer, (`<p><a href="${linkTarget}">${linkText}</a></p>`));
});


test(`link in the middle of text`, async t => {
    const markdownParser = new MarkdownParser();
    const textbefore = `aaa`;
    const textafter = `bbb`;
    const linkTarget = `example.com`;
    const linkText = `example`;
    concatAsStream([`${textbefore}[${linkText}](${linkTarget})${textafter}`]).pipe(markdownParser);

    let forceBuffer = ``;
    markdownParser.on(`data`, (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    // t.is(forceBuffer, (`<a href="${linkTarget}">${linkText}</a>`));
    t.is(forceBuffer, (`<p>aaa<a href="${linkTarget}">${linkText}</a>bbb</p>`));
});

test(`raw inline`, async t => {
    const markdownParser = new MarkdownParser();
    const text = `*special text*`;
    concatAsStream([`
    \`${text}\`
    `]).pipe(markdownParser);

    let forceBuffer = ``;
    markdownParser.on(`data`, (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, (`<p><code>${text}</code></p>`));
});

test(`raw with backticks inside`, async t => {
    const markdownParser = new MarkdownParser();
    concatAsStream([`\`\`\`typeof x === \`string\`\`\`\` for type checking .`]).pipe(markdownParser);

    let forceBuffer = ``;
    markdownParser.on(`data`, (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, (`<p><code>typeof x === \`string\`</code> for type checking .</p>`));
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

    let forceBuffer = ``;
    markdownParser.on(`data`, (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, (`<pre><code class="language-html">&lt;style&gt;
    .block{display: block; margin-bottom: 0.5em;}


&lt;/style&gt;</code></pre>`));
});


test(`image`, async t => {
    const markdownParser = new MarkdownParser();
    const altText = `drinking face`;
    const source = `../images/about.jpg`;
    concatAsStream([`![${altText}](${source})`]).pipe(markdownParser);

    let forceBuffer = ``;
    markdownParser.on(`data`, (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, (`<p><img alt="${altText}" src="${source}"></p>`));
});

test(`strong`, async t => {
    const markdownParser = new MarkdownParser();
    const x = `important !`;
    concatAsStream([`**${x}**`]).pipe(markdownParser);

    let forceBuffer = ``;
    markdownParser.on(`data`, (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, (`<p><strong>${x}</strong></p>`));
});


test(`strong alternative syntax`, async t => {
    const markdownParser = new MarkdownParser();
    const x = `important !`;
    concatAsStream([`__${x}__`]).pipe(markdownParser);

    let forceBuffer = ``;
    markdownParser.on(`data`, (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, (`<p><strong>${x}</strong></p>`));
});


test(`deleted`, async t => {
    const markdownParser = new MarkdownParser();
    const x = `removed !`;
    concatAsStream([`~~${x}~~`]).pipe(markdownParser);

    let forceBuffer = ``;
    markdownParser.on(`data`, (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, (`<p><del>${x}</del></p>`));
});


test(`2 deleted`, async t => {
    const markdownParser = new MarkdownParser();
    const x = `removed !`;
    concatAsStream([`~~${x}~~~~${x}~~`]).pipe(markdownParser);

    let forceBuffer = ``;
    markdownParser.on(`data`, (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, (`<p><del>${x}</del><del>${x}</del></p>`));
});

test(`deleted without closing`, async t => {
    const markdownParser = new MarkdownParser();
    const x = `removed !`;
    concatAsStream([`~~${x}`]).pipe(markdownParser);

    let forceBuffer = ``;
    markdownParser.on(`data`, (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, (`<p>~~${x}</p>`));
});

test(`closing deleted without start`, async t => {
    const markdownParser = new MarkdownParser();
    const x = `removed !`;
    concatAsStream([`${x}~~`]).pipe(markdownParser);

    let forceBuffer = ``;
    markdownParser.on(`data`, (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, (`<p>${x}~~</p>`));
});


test(`emphasis`, async t => {
    const markdownParser = new MarkdownParser();
    const x = `notice me`;
    concatAsStream([`*${x}*`]).pipe(markdownParser);

    let forceBuffer = ``;
    markdownParser.on(`data`, (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, (`<p><em>${x}</em></p>`));
});

test(`multiple emphasis`, async t => {
    const markdownParser = new MarkdownParser();
    const x = `notice me`;
    concatAsStream([`*${x}**${x}*`]).pipe(markdownParser);

    let forceBuffer = ``;
    markdownParser.on(`data`, (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, (`<p><em>${x}</em><em>${x}</em></p>`));
});

test(`emphasis alternative syntax`, async t => {
    const markdownParser = new MarkdownParser();
    const x = `notice me`;
    concatAsStream([`_${x}_`]).pipe(markdownParser);

    let forceBuffer = ``;
    markdownParser.on(`data`, (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, (`<p><em>${x}</em></p>`));
});


test(`unordered list`, async t => {
    const markdownParser = new MarkdownParser();
    const listItem = `xxx yyy`;
    const otherListItem = `eee uuu`;
    concatAsStream([` * ${listItem}
 * ${otherListItem}`]).pipe(markdownParser);

    let forceBuffer = ``;
    markdownParser.on(`data`, (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, (`<ul><li>${listItem}</li><li>${otherListItem}</li></ul>`));
});

test(`unordered list with end of line`, async t => {
    const markdownParser = new MarkdownParser();
    const listItem = `xxx yyy`;
    const otherListItem = `eee uuu`;
    concatAsStream([` * ${listItem}
 * ${otherListItem}
`]).pipe(markdownParser);

    let forceBuffer = ``;
    markdownParser.on(`data`, (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, (`<ul><li>${listItem}</li><li>${otherListItem}</li></ul>`));
});


test(`ordered list`, async t => {
    const markdownParser = new MarkdownParser();
    const listItem = `aaa bbb`;
    const otherListItem = `ccc ddd`;
    concatAsStream([` 1. ${listItem}
 2. ${otherListItem}`]).pipe(markdownParser);

    let forceBuffer = ``;
    markdownParser.on(`data`, (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, (`<ol><li>${listItem}</li><li>${otherListItem}</li></ol>`));
});

test(`not ordered list`, async t => {
    const markdownParser = new MarkdownParser();
    const text = `aaa bbb`;
    concatAsStream([` 1 ${text}`]).pipe(markdownParser);

    let forceBuffer = ``;
    markdownParser.on(`data`, (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, (`<p>1 ${text}</p>`));
});




test(`it is not inline html if invalid html`, async t => {
    const markdownParser = new MarkdownParser();
    concatAsStream([`
    <1>*8 > 7*</1>`]).pipe(markdownParser);

    let forceBuffer = ``;
    markdownParser.on(`data`, (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, (`<p>&lt;1&gt;<em>8 &gt; 7</em>&lt;/1&gt;</p>`));
});

test(`it should handle empty html elements`, async t => {
    const markdownParser = new MarkdownParser();
    concatAsStream([`<img src="a" alt="b">

    _c_`]).pipe(markdownParser);

    let forceBuffer = ``;
    markdownParser.on(`data`, (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, (`<img src="a" alt="b"><p><em>c</em></p>`));
});


const tableInput = `| A         | B     | C |
|--------------|-----------|------------|
| D | E      | F        |
| G      | H  | I       |`;

const tableOutput = Array.from(
`<table>
<thead>
    <tr>
        <th>A</th>
        <th>B</th>
        <th>C</th>
    </tr>
</thead>
<tbody>
    <tr>
        <td>D</td>
        <td>E</td>
        <td>F</td>
    </tr>
    <tr>
        <td>G</td>
        <td>H</td>
        <td>I</td>
    </tr>
</tbody>
</table>`).filter(c => {
    return !isWhitespaceCharacter(c);
}).join(``);

test(`it should handle table`, async t => {
    
    const markdownParser = new MarkdownParser();
    concatAsStream([tableInput]).pipe(markdownParser);

    let forceBuffer = ``;
    markdownParser.on(`data`, (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, tableOutput);
});


test(`it should handle table with linebreaks`, async t => {
    const markdownParser = new MarkdownParser();
    concatAsStream([`
${tableInput}
`]).pipe(markdownParser);

    let forceBuffer = ``;
    markdownParser.on(`data`, (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, tableOutput);
});

test(`it should handle table with alignments`, async t => {
    const tableInput = `| A         | B     | C |
| :--------------| :------: | --------:|
| D | E      | F        |
| G      | H  | I       |
`;

    const tableOutput = Array.from([
    `<table>`,
    `<thead>`,
        `<tr>`,
            `<th style="text-align: left">A</th>`,
            `<th style="text-align: center">B</th>`,
            `<th style="text-align: right">C</th>`,
        `</tr>`,
    `</thead>`,
    `<tbody>`,
        `<tr>`,
            `<td style="text-align: left">D</td>`,
            `<td style="text-align: center">E</td>`,
            `<td style="text-align: right">F</td>`,
        `</tr>`,
        `<tr>`,
            `<td style="text-align: left">G</td>`,
            `<td style="text-align: center">H</td>`,
`<td style="text-align: right">I</td>`,
        `</tr>`,
    `</tbody>`,
    `</table>`]).join(``);
    const markdownParser = new MarkdownParser();
    concatAsStream([tableInput]).pipe(markdownParser);

    let forceBuffer = ``;
    markdownParser.on(`data`, (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, tableOutput);
});


