import fs from "node:fs";
import { pipeline } from "node:stream";
import { HtmlMinifier } from "../../source/html/HtmlMinifier.js";


const source = `./tests/manual/html.html`;
const destination =  `./tests/output/html.min.html`;
const readStream = fs.createReadStream(source);
const htmlMinifier = new HtmlMinifier({
    // jsMinifier: () => "",
    // cssMinifier: () => "",
});
htmlMinifier.setEncoding(`utf8`);

console.time(`time`);
pipeline(readStream, htmlMinifier, fs.createWriteStream(destination), (error) => {
    console.timeEnd(`time`);
    if (error) {
        console.error(error);
    }
});
