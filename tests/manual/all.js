import { createHash } from 'crypto';
import fs from "fs";
import { pipeline } from "stream";
import { concatAsStream } from "../../source/concatAsStream.js";
import { MarkdownParser } from "../../source/markdown/MarkdownParser.js";


// example sources
const markdownParser = new MarkdownParser({});
markdownParser.setEncoding(`utf8`);
const readStream = fs.createReadStream(`./readme.md`);
const destination = `./tests/manual/readme.html`;
console.time(`time`);


// create
const concatedStream = concatAsStream([
    `<html>`,
     // todo why are those 2 working 
     // readStream,
     // readStream.pipe(createHash('sha256')),
    // but not but not the markdownParser
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

