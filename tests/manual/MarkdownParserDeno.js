//deno run --allow-read --allow-write ./tests/manual/MarkdownParserDeno.js
import { readableStreamFromReader, copy } from "https://deno.land/std/io/mod.ts";

const sourceFile = readableStreamFromReader(await Deno.open("./readme.md", { read: true }));

const transformStream = new TransformStream({
    start(controller) {
        // Called immediately when the TransformStream is created
        controller.decoder = new TextDecoder();
    },

    transform(chunk, controller) {
        controller.enqueue(controller.decoder.decode(chunk, { stream: true }).toUpperCase());
    },

    flush(controller) {
        // Called when chunks are no longer being forwarded to the transformer
    }
});


sourceFile.pipeTo(transformStream.writable)
// this works
// transformStream.readable.getReader().read().then(({value, done}) => console.log(value))

// creates empty file, does not stop until CTRL+C
const outputFile = await Deno.open("./tests/output/denomd.txt", { create: true, write: true });
await copy(transformStream.readable.getReader(), outputFile);
// await outputFile.close();
// await sourceFile.close();

