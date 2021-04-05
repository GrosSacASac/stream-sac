import fs from "fs";
import { MarkdownParser } from "../source/markdown/MarkdownParser.js";


const source = `./readme.md`;
const destination =  `./tests/readme.html`;
console.time(`time`);
const readStream = fs.createReadStream(source);
const q = new MarkdownParser({
    // jsMinifier: () => "",
    // cssMinifier: () => "",
});
q.setEncoding(`utf8`);
q.pipe(fs.createWriteStream(destination));
readStream.pipe(q);
q.on(`end`, () => {
    console.timeEnd(`time`);
});




