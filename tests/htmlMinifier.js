import { HtmlMinifier } from "../source/html/HtmlMinifier.js";
import fs from "fs";


const readStream = fs.createReadStream("./tests/html.html");
const q = new HtmlMinifier();
q.setEncoding("utf8");
q.pipe(fs.createWriteStream("./tests/html.min.html"));
readStream.pipe(q);
