import { streamifyStringFunction } from "../source/streamifyStringFunction.js";
// import { pipeline } from "stream";

const encode = c => {
    return String.fromCharCode(c.charCodeAt(0) + 1);
};


const createCesarEncodeStream = streamifyStringFunction(encode);
const cesarEncodeStream = createCesarEncodeStream();
cesarEncodeStream.pipe(process.stdout);
cesarEncodeStream.write(`&`);
cesarEncodeStream.write(`<`);
cesarEncodeStream.write(`>`);
cesarEncodeStream.write(`a`);
cesarEncodeStream.write(`b`);
cesarEncodeStream.write(`c`);
cesarEncodeStream.end();
