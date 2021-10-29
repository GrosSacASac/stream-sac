import test from "ava";
import { MarkdownParser } from "../../source/markdown/MarkdownParser.js";
import { concatAsStream } from "../../source/concatAsStream.js";
import { finished } from "stream/promises";
import slugify from "@sindresorhus/slugify";
//todo change order (block then inline)

// test(`it should handle empty html elements`, async t => {
//     const markdownParser = new MarkdownParser();
//     concatAsStream([`<img src="a" alt="b">

//     _c_`]).pipe(markdownParser);

//     let forceBuffer = ``
//     markdownParser.on('data', (x) => {
//         forceBuffer = `${forceBuffer}${x}`;
//     });
//     await finished(markdownParser);
//     t.is(forceBuffer, (`<img src="a" alt="b"><p><em>c</em></p>`));
// });

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


