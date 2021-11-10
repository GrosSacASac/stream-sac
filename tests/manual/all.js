import fs from "fs";
import { pipeline } from "stream";
import { concatAsStream } from "../../source/concatAsStream.js";
import { MarkdownParser } from "../../source/markdown/MarkdownParserNode.js";


// example sources
const markdownParser = new MarkdownParser({});
markdownParser.setEncoding(`utf8`);
const readStream = fs.createReadStream(`./readme.md`);
const destination = `./tests/output/readme.html`;
console.time(`time`);


// create
const concatedStream = concatAsStream([
    `<html>`,
     // readStream,
     // readStream.pipe(createHash('sha256'))
    readStream.pipe(markdownParser),
    `</html>`,
    
]);
concatedStream.setEncoding(`utf8`);

// output to standard out
pipeline(concatedStream,  fs.createWriteStream(destination), (error) => {
    console.timeEnd(`time`);
    if (error) {
        console.error(error);
    }
});

