import test from "ava";
import { MarkdownParser } from "../../source/markdown/MarkdownParser.js";
import { concatAsStream } from "../../source/concatAsStream.js";
import { finished } from "stream/promises";
import slugify from "@sindresorhus/slugify";
//todo change order (block then inline)


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
