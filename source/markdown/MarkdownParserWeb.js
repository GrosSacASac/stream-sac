export { createMarkdownParserStream };
import { flush, transform, start } from "./MarkdownParser.js";


const createMarkdownParserStream = (options = {}) => {
    return new TransformStream({
        start(controller) {
            start(controller, options);
        },

        transform,
        flush
    });
};

