//deno run --allow-read --allow-write ./tests/manual/DenoBasicStream.js
import { readableStreamFromReader, writableStreamFromWriter } from "https://deno.land/std@0.114.0/streams/conversion.ts";

const sourceFile = readableStreamFromReader(await Deno.open("./readme.md", { read: true }));

const transformStream = new TransformStream({
    start(controller) {
        // Called immediately when the TransformStream is created
        
    },

    transform(chunk, controller) {
        controller.enqueue(chunk.toUpperCase());
    },

    flush(controller) {
        // Called when chunks are no longer being forwarded to the transformer
    }
});

const upperCaseStream = sourceFile
  .pipeThrough(new TextDecoderStream())
  .pipeThrough(transformStream)
  .pipeThrough(new TextEncoderStream())
  ;

const outputFile = await Deno.open("./tests/output/denomd.txt", { create: true, write: true });
upperCaseStream.pipeTo(writableStreamFromWriter(outputFile));
