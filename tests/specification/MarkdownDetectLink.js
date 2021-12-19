import { finished } from "node:stream/promises";
import test from "ava";
import { MarkdownParser } from "../../source/markdown/MarkdownParserNode.js";
import { concatAsStream } from "../../source/concatAsStream.js";

test(`auto detect link`, async t => {
    const markdownParser = new MarkdownParser();
    const linkTarget = `https://gitlab.com/GrosSacASac/blog-engine-z/`;
    concatAsStream([`${linkTarget}`]).pipe(markdownParser);

    let forceBuffer = ``;
    markdownParser.on(`data`, (x) => {
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

    let forceBuffer = ``;
    markdownParser.on(`data`, (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    // t.is(forceBuffer, (`<a href="${linkTarget}">${linkText}</a>`));
    t.is(forceBuffer, `<p><a href="${linkTarget}">${linkTarget}</a></p>`);
});
