import { HtmlMinifier } from "../source/html/HtmlMinifier.js";
import fs from "fs";


const source = `./tests/html.html`;
const destination =  `./tests/html.min.html`;
console.time(`time`);
const readStream = fs.createReadStream(source);
const q = new HtmlMinifier({
    // jsMinifier: () => "",
    // cssMinifier: () => "",
});
q.setEncoding(`utf8`);
q.pipe(fs.createWriteStream(destination));
readStream.pipe(q);
q.on(`end`, () => {
    console.timeEnd(`time`);
});


