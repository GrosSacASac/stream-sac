import fs from "fs";
import { pipeline } from "stream";
import { MarkdownParser } from "../source/markdown/MarkdownParser.js";

const source = `./readme.md`;
const destination =  `./tests/readme.html`;
const readStream = fs.createReadStream(source);
const markdownParser = new MarkdownParser({});
markdownParser.setEncoding(`utf8`);


console.time(`time`);
pipeline(readStream, markdownParser, fs.createWriteStream(destination), (error) => {
    console.timeEnd(`time`);
    if (error) {
        console.error(errror);
    }
});


