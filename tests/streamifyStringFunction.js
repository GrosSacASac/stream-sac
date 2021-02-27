import { streamifyStringFunction } from "../source/streamifyStringFunction.js";


const encode = c => {
    return String.fromCharCode(c.charCodeAt(0)+1);
};


const createEncodeStream = streamifyStringFunction(encode);
const q = createEncodeStream();
q.pipe(process.stdout);
q.write('&');
q.write('<');
q.write('>');
q.write('a');
q.write('b');
q.write('c');
q.end();
