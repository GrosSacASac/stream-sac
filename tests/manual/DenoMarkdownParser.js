//deno run --allow-read --allow-write ./tests/manual/DenoMarkdownParser.js
import { readableStreamFromReader, writableStreamFromWriter } from "https://deno.land/std@0.114.0/streams/conversion.ts";

import {createMarkdownParserStream} from "../../built/MarkdownParserWeb.es.js"
const sourceFile = readableStreamFromReader(await Deno.open("./readme.md", { read: true }));

const options = {};

const upperCaseStream = sourceFile
  .pipeThrough(new TextDecoderStream())
  .pipeThrough(createMarkdownParserStream(options))
  .pipeThrough(new TextEncoderStream())
  ;

const outputFile = await Deno.open("./tests/output/denoreadme.html", { create: true, write: true });
upperCaseStream.pipeTo(writableStreamFromWriter(outputFile));
