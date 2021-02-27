import { concatAsStream } from "../source/concatAsStream.js";
import fs from "fs";


const readStream = fs.createReadStream("./changelog.md")
const q = concatAsStream([fs.createReadStream("./readme.md"), "zz", "ee", "uu", readStream,"999", "888" ]);
q.setEncoding("utf8");
q.pipe(process.stdout);
