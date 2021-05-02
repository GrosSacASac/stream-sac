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
} from "stream-sac/source/markdown/MarkdownParser.js";

const markdownStream = new MarkdownParser({
    // optional
    languagePrefix: `language-`,
    highlight: function (str, lang) {
        if (lang && hljs.getLanguage(lang)) {
            try {
            return hljs.highlight(lang, str).value;
            } catch (__) {}
        }
    
        return ``;
    }
});
```


## About

### Logo

TODO
![Put logo here](https://miaou.dystroy.org/static/Miaou.svg)


### Changelog

[Changelog](./changelog.md)


### License

[CC0](./license.txt)

### Related

 - [from2](https://www.npmjs.com/package/from2)
 - [Readable.from](https://nodejs.org/api/stream.html#stream_creating_readable_streams_with_async_generators)
 - [into-stream](https://github.com/sindresorhus/into-stream)
