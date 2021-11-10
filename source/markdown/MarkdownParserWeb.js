export { createMarkdownParserStream };
import { flush, transform, start } from "./MarkdownParser.js";


const createMarkdownParserStream = (options = {}) => {
    return new TransformStream({
        start(controller) {
            controller.push = controller.enqueue.bind(controller);
            start(controller, options);
        },

        transform,
        flush
    });
};

