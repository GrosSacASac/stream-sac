export { MarkdownParser };

import { Transform } from "stream";
import { flush, transform, start } from "./MarkdownParser.js";


// could also use web stream and Readable.fromWeb to convert it to node streams
class MarkdownParser extends Transform {
    constructor(options = {}) {
        super({ readableObjectMode: true });
        start(this, options);
    }

    _transform(buffer, encoding, done) {
        const bufferAsString = String(buffer);
        
        transform(bufferAsString, this);

        done();
        return buffer.length;
    }

    _flush(done) {
        flush(this)
        done();
    }

}
