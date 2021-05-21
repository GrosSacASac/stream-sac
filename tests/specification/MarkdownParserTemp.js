import test from "ava";
import { MarkdownParser } from "../../source/markdown/MarkdownParser.js";
import { concatAsStream } from "../../source/concatAsStream.js";
import { finished } from "stream/promises";
import slugify from "@sindresorhus/slugify";


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
