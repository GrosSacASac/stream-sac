import { concatAsStream } from "../source/concatAsStream.js";
import fs from "fs";


const readStream = fs.createReadStream(`./changelog.md`);
const promise = Promise.resolve(readStream);
const q = concatAsStream([fs.createReadStream(`./readme.md`), `zz`, `ee`, `uu`, promise,`999`, `888` ]);
q.setEncoding(`utf8`);
q.pipe(process.stdout);
