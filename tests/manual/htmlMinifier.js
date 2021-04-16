import { HtmlMinifier } from "../source/html/HtmlMinifier.js";
import fs from "fs";
import { pipeline } from "stream";


const source = `./tests/html.html`;
const destination =  `./tests/html.min.html`;
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
