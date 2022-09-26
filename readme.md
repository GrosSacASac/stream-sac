# [stream-sac](https://github.com/GrosSacASac/stream-sac)

Stream related functions: Html minifier, Markdown parser, concat as stream and streamify a string function.

## Installation

[`npm i stream-sac`](https://www.npmjs.com/package/stream-sac)

## Usage

## HtmlMinifier.js

Minify Html with a transform stream. Line breaks and spaces are combined into 1 space.
The input should be valid. Optional pass jsMinifier and cssMinifier to minify inline.

```js
import fs from "node:fs";
import { pipeline } from "node:stream";
import {
    HtmlMinifier,
} from "stream-sac/source/html/HtmlMinifier.js";


const source = `./tests/manual/html.html`;
const destination =  `./tests/output/html.min.html`;
const htmlMinifier = new HtmlMinifier({
    jsMinifier: (x) => x, // sync function
    cssMinifier: (y) => y,
});
htmlMinifier.setEncoding(`utf8`);

pipeline(
    fs.createReadStream(source),
    htmlMinifier,
    fs.createWriteStream(destination),
    (error) => {
    if (error) {
        console.error(error);
    }
});

```

## MarkdownParser.js

Parse markdown into html with a transform stream. The input should be valid. Check the demo in the demo/ folder. Deployed demo at [stream-sac.vercel.app/editor](https://stream-sac.vercel.app/editor.html)

```js
import {
    MarkdownParser,
} from "stream-sac/source/markdown/MarkdownParserNode.js";

const markdownStream = new MarkdownParser({
    // all optional
    languagePrefix: `language-`,
    highlight: function (str, lang) {
        // import hljs to get code highlighting
        if (lang && hljs.getLanguage(lang)) {
            try {
            return hljs.highlight(lang, str).value;
            } catch (__) {}
        }
    
        return ``;
    },
    // for example to resize images on the fly
    mediaHook: function (src, alt) {
        return `<img alt="${alt}" src="${src}">`;
    },
    // for example to disable all external links 
    linkHrefHook: function (src) {
        if (!src.startsWith("https://example.com")) {
            return "#";
        }
        return src;
    }
});
```

### Deno and Web

`createMarkdownParserStream` takes the same options as above, however it is a function that returns a web transform stream. It expects data to be strings, so TextDecoderStream may have to be used.

```js
import { createMarkdownParserStream } from "stream-sac/built/MarkdownParserWeb.es.js"
// or
import { createMarkdownParserStream } from "https://unpkg.com/stream-sac/built/MarkdownParserWeb.es.js";
```

[Complete Example for Deno](./tests/manual/DenoMarkdownParser.js)

## streamifyStringFunction.js

Take any function that takes as input and out a string, and return a transform stream creator, that does the same on streams.

```js
import {
    streamifyStringFunction,
} from "stream-sac/source/streamifyStringFunction.js";


// Caesar cipher -only lowercase letters
const shift = 1;
const lowera = 97
const lowerZ = 122;
const range = lowerZ - lowera + 1;
const encodeCaesar = s => {
    return Array.from(s).map(c => {
        const unicodeNumber = c.charCodeAt(0);
        if (unicodeNumber >= lowera && unicodeNumber <= lowerZ) {   
            return String.fromCharCode(((unicodeNumber - lowera + shift) % range) + lowera);
        }
        return c;
    }).join(``);
};

// transforms a function that works with strings into a function that returns a transform stream
const createCesarEncodeStream = streamifyStringFunction(encodeCaesar);
const cesarEncodeStream = createCesarEncodeStream();
cesarEncodeStream.pipe(process.stdout);
cesarEncodeStream.write(`The lazy fox ...`);
cesarEncodeStream.write(`jumps over !`);
cesarEncodeStream.end(); // output: Tif mbaz gpy ...kvnqt pwfs !

```

## concatAsStream.js

Concatenate arrays, strings, streams, promises as one Readable stream.

```js
import {
    concatAsStream,
} from "stream-sac/source/concatAsStream.js";

import { pipeline } from "node:stream";
import fs from "node:fs";
import { concatAsStream } from "../../source/concatAsStream.js";


// example sources
const readStream = fs.createReadStream(`./readme.md`);
const readStreamInPromise = fs.createReadStream(`./changelog.md`);
const promise = Promise.resolve(readStreamInPromise);
const aString = `Hello love
`;
const otherString = `THE END`;

// create
const concatedStream = concatAsStream([
    readStream, // stream readme
    aString, // String and linebreak
    promise, // promise of a stream (changelog)
    otherString, // String and linebreak
]);
concatedStream.setEncoding(`utf8`);

// output to standard out, could also output to http response, file, etc.
pipeline(concatedStream, process.stdout, (error) => {
    if (error) {
        console.error(error);
    }
});

```

## About

### Logo

![Put logo here](https://avatars.githubusercontent.com/u/5721194?v=4)

### Changelog

[Changelog](./changelog.md)

### License

[CC0](./license.txt)

### Related

- [from2](https://www.npmjs.com/package/from2)
- [Readable.from](https://nodejs.org/api/stream.html#stream_creating_readable_streams_with_async_generators)
- [into-stream](https://github.com/sindresorhus/into-stream)
- [table generator](https://www.tablesgenerator.com/markdown_tables)
