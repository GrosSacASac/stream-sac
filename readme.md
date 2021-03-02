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

## concatAsStream.js

```js
import {
    streamifyStringFunction,
} from "stream-sac/source/streamifyStringFunction.js";
```

## HtmlMinifier.js

The input should be valid. Only removes whitespace and comments for now.

Does not work with inline css and js. Does not keep whitespace inside `<pre>`.

```js
import {
    HtmlMinifier,
} from "stream-sac/source/html/HtmlMinifier.js";
```


## About

### Changelog

[Changelog](./changelog.md)


### License

[CC0](./license.txt)

### Related

 - [from2](https://www.npmjs.com/package/from2)
 - [Readable.from](https://nodejs.org/api/stream.html#stream_creating_readable_streams_with_async_generators)
 - [into-stream](https://github.com/sindresorhus/into-stream)
