# [stream-sac](https://github.com/GrosSacASac/stream-sac)

Stream related functions



## Installation

[`npm i stream-sac`](https://www.npmjs.com/package/stream-sac)

## Usage

The source code is the documentation.

## concatAsStream.js

```js
import {
    concatAsStream,
} from "stream-sac/source/concatAsStream.js";
```

## streamifyStringFunction.js

```js
import {
    streamifyStringFunction,
} from "stream-sac/source/streamifyStringFunction.js";
```

## HtmlMinifier.js

The input should be valid. Optional pass jsMinifier and cssMinifier to minify inline.

```js
import {
    HtmlMinifier,
} from "stream-sac/source/html/HtmlMinifier.js";

const htmlStream = new HtmlMinifier({
    jsMinifier: (x) => x,
    cssMinifier: (y) => y,
});
```

## MarkdownParser.js

The input should be valid. 

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

`createMarkdownParserStream` takes the same options as above, however it is a function that returns a web transform stream. It expects data to be strings, so TextDecoderStream may have to be used

```js
import { createMarkdownParserStream } from "stream-sac/built/MarkdownParserWeb.es.js"
// or
import { createMarkdownParserStream } from "https://unpkg.com/stream-sac/built/MarkdownParserWeb.es.js";
```

[Complete Example for Deno](./tests/manual/DenoMarkdownParser.js)


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
