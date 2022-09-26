import { pipeline } from "node:stream";
import fs from "node:fs";
import { concatAsStream } from "../../source/concatAsStream.js";


// example sources
const readStream = fs.createReadStream(`./readme.md`);
const readStreamInPromise = fs.createReadStream(`./changelog.md`);
const promise = Promise.resolve(readStreamInPromise);
const aString = `Hello love
`;
const otherString = `THE END`;

// create
const concatedStream = concatAsStream([
    readStream, // stream readme
    aString, // String and linebreak
    promise, // promise of a stream (changelog)
    otherString, // String and linebreak
]);
concatedStream.setEncoding(`utf8`);

// output to standard out, could also output to http response, file, etc.
pipeline(concatedStream, process.stdout, (error) => {
    if (error) {
        console.error(error);
    }
});
