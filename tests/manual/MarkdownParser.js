import fs from "node:fs";
import { pipeline } from "node:stream";
import { MarkdownParser } from "../../source/markdown/MarkdownParserNode.js";

const source = `./readme.md`;
const destination =  `./tests/output/readme.html`;
const readStream = fs.createReadStream(source);
const links = [];
const medias = [];
const markdownParser = new MarkdownParser({
    linkHrefHook: function (originalHref) {
        links.push(originalHref);
        return originalHref;
    },
    mediaHook: function (source, altText) {
        medias.push(source);
        return `<picture>
        <source src="${source}-big" media="big">
        <img alt="${altText}" src="${source}">
        </picture>`;
    },
});
markdownParser.setEncoding(`utf8`);


console.time(`time`);
pipeline(readStream, markdownParser, fs.createWriteStream(destination), (error) => {
    console.timeEnd(`time`);
    if (error) {
        console.error(error);
        return;
    }
    console.log(`links used:`);
    console.log(links);
    console.log(`medias used:`);
    console.log(medias);
});


