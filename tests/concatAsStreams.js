import { concatAsStream } from "../source/concatAsStream.js";
import { pipeline } from "stream";
import fs from "fs";


// example sources
const readStream = fs.createReadStream(`./readme.md`);
const readStreamInPromise = fs.createReadStream(`./changelog.md`);
const promise = Promise.resolve(readStreamInPromise);
const aString = `zzzzzzzzzzzzzzzzzzzzzzzzzz
`;

// create
const concatedStream = concatAsStream([
    readStream,
    aString,
    promise,
    `999`, `888`
]);
concatedStream.setEncoding(`utf8`);

// output to standard out
pipeline(concatedStream, process.stdout, (error) => {
    if (error) {
        console.error(error);
    }
});
