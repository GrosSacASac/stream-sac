export { concatAsStream };

import { Readable } from "node:stream";
import MultiStream from "multistream";
import intoStream from 'into-stream';

const isStream = (x) => {
    return x && typeof x !== `string` && typeof x.destroy === `function`; 
};

const isPromise = (x) => {
    return x && typeof x === `object` && typeof x.then === `function`; 
};

const concatAsStream = (things, options = {}) => {
    return new MultiStream(things.map(x => {
        if (isPromise(x)) {
            return intoStream(x);
        }
        if (isStream(x)) {
            return x;
        }
        return Readable.from(x);
        
    }));
};
