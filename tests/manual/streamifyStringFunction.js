import { streamifyStringFunction } from "../../source/streamifyStringFunction.js";


// Caesar cipher -only lowercase letters
const shift = 1;
const lowera = 97
const lowerZ = 122;
const range = lowerZ - lowera + 1;
const encodeCaesar = s => {
    return Array.from(s).map(c => {
        const unicodeNumber = c.charCodeAt(0);
        if (unicodeNumber >= lowera && unicodeNumber <= lowerZ) {   
            return String.fromCharCode(((unicodeNumber - lowera + shift) % range) + lowera);
        }
        return c;
    }).join(``);
};

// transforms a function that works with strings into a function that returns a transform stream
const createCesarEncodeStream = streamifyStringFunction(encodeCaesar);
const cesarEncodeStream = createCesarEncodeStream();
cesarEncodeStream.pipe(process.stdout);
cesarEncodeStream.write(`The lazy fox ...`);
cesarEncodeStream.write(`jumps over !`);
cesarEncodeStream.end(); // output: Tif mbaz gpy ...kvnqt pwfs !
