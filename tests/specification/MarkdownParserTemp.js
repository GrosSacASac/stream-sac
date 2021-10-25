import test from "ava";
import { MarkdownParser } from "../../source/markdown/MarkdownParser.js";
import { concatAsStream } from "../../source/concatAsStream.js";
import { finished } from "stream/promises";
import slugify from "@sindresorhus/slugify";
//todo change order (block then inline)



test(`em in the middle of list items`, async t => {
    const markdownParser = new MarkdownParser();
    const a = `aaa`
    const outside = `outside`
    const b = `bbb`
    concatAsStream([` - *${a}*
- ${outside}*${b}*${outside}`]).pipe(markdownParser);

    let forceBuffer = ``
    markdownParser.on('data', (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    // t.is(forceBuffer, (`<a href="${linkTarget}">${linkText}</a>`));
    const li1 = `<li><em>${a}</em></li>`;
    const li2 = `<li>${outside}<em>${b}</em>${outside}</li>`;
    t.is(forceBuffer, (`<ul>${li1}${li2}</ul>`));
});


test(`em in the middle of list items 2`, async t => {
    const markdownParser = new MarkdownParser();
    const a = `aaa`
    const outside = `outside`
    const b = `bbb`
    concatAsStream([` - *${a}*
- ${outside}*${b}*${outside}
- ${outside}*${b}*${outside}
- ${outside}*${b}*${outside}
- ${outside}*${b}*${outside}`]).pipe(markdownParser);

    let forceBuffer = ``
    markdownParser.on('data', (x) => {
        forceBuffer = `${forceBuffer}${x}`;
    });
    await finished(markdownParser);
    // t.is(forceBuffer, (`<a href="${linkTarget}">${linkText}</a>`));
    const li1 = `<li><em>${a}</em></li>`;
    const li2 = `<li>${outside}<em>${b}</em>${outside}</li>`;
    t.is(forceBuffer, (`<ul>${li1}${li2}${li2}${li2}${li2}</ul>`));
});
