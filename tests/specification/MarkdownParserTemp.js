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

test(`title alternative with linefeed`, async t => {
    const markdownParser = new MarkdownParser();
    const titleText = `title`
    concatAsStream([`${titleText}
========
`]).pipe(markdownParser);

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


