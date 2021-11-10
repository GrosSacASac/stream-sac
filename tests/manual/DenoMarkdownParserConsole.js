//deno run ./tests/manual/DenoMarkdownParserConsole.js
import { createMarkdownParserStream } from "../../built/MarkdownParserWeb.es.js"


const options = {};
const stream = new ReadableStream({
    pull(controller) {
        controller.enqueue(`# This is markdow

No way !

 * Cool story
 * For real ?
`);
        controller.close();
    },

    autoAllocateChunkSize: 1000,
});

function readStream() {
    const reader = stream.pipeThrough(createMarkdownParserStream(options)).getReader();
    let result = '';

    return reader.read().then(function processText({ done, value }) {
        if (done) {
            console.log("Stream complete");
            console.log(result);
            return;
        }

        result = `${result}${value}`;
        return reader.read().then(processText);
    });
}
/*await */readStream();
