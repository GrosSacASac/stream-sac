import { finished } from "node:stream/promises";
import test from "ava";
import { MarkdownParser } from "../../source/markdown/MarkdownParserNode.js";
import { concatAsStream } from "../../source/concatAsStream.js";


test(`MarkdownParser is a function`, t => {
    t.is(typeof MarkdownParser, `function`);
});


test(`streaming cut in half`, async t => {
    const markdownParser = new MarkdownParser();
    const t1 = `blablabla`;
    const t2 = `zzzzzzzzzzz`;
    concatAsStream([`${t1.substr(0, 4)}`, `${t1.substr(4)}

${t2}`]).pipe(markdownParser);

    let forceBuffer = ``;
    markdownParser.on(`data`, (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    t.is(forceBuffer, (`<p>${t1}</p><p>${t2}</p>`));
});
