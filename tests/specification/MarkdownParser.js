import test from "ava";
import { MarkdownParser } from "../../source/markdown/MarkdownParser.js";
import { concatAsStream } from "../../source/concatAsStream.js";
import { finished } from "stream/promises";



test(`MarkdownParser is a function`, t => {
    t.is(typeof MarkdownParser, `function`);
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

test(`link`, async t => {
    const markdownParser = new MarkdownParser();
    const linkTarget = `example.com`
    const linkText = `example`
    concatAsStream([`[${linkText}](${linkTarget})`]).pipe(markdownParser);

    let forceBuffer = ``
    markdownParser.on('data', (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    // t.is(forceBuffer, (`<a href="${linkTarget}">${linkText}</a>`));
    t.is(forceBuffer.includes(`<a href="${linkTarget}">${linkText}</a>`), true);
});


test(`unordered list`, async t => {
    const markdownParser = new MarkdownParser();
    const listItem = `l0`
    const otherListItem = `l1`
    concatAsStream([` * ${listItem}
 * ${otherListItem}`]).pipe(markdownParser);

    let forceBuffer = ``
    markdownParser.on('data', (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, (`<ul><li>${listItem}</li><li>${otherListItem}</li></ul>`));
});

test(`paragraph`, async t => {
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

