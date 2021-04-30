export { concatAsStream };

import { Readable } from "stream";


const isStream = (x) => {
    return x && typeof x !== `string` && typeof x.destroy === `function`; 
};

const isPromise = (x) => {
    return x && typeof x === `object` && typeof x.then === `function`; 
};

const concatAsStream = (things, options = {}) => {
    let currentThing;
    let wantsToRead = true;
    const next = () => {
        currentThing = things.shift();
    };
    const readTheStream = function (size) {
        let result;
        while (wantsToRead && (result = currentThing.read(size))) {
            wantsToRead = this.push(result);
        }
    };
    const attachedMap = new WeakSet();
    next();
    return new Readable({
        read(size) {
            if (!currentThing) {
                this.push(null);
                return;
            }
            if (isPromise(currentThing)) {
                if (!attachedMap.has(currentThing)) {
                    currentThing.then(value => {
                        currentThing = value;
                        this.push(``);// force
                    });
                    attachedMap.add(currentThing);
                }
                return;
            }
            if (isStream(currentThing)) {
                if (!attachedMap.has(currentThing)) {
                    currentThing.on(`readable`, () => {
                        readTheStream.call(this, size);
                    });
                    currentThing.once(`end`, () => {
                        wantsToRead = true;
                        next();
                    });
                    attachedMap.add(currentThing);
                } else if (!wantsToRead) {
                    wantsToRead = true;
                    readTheStream.call(this, size);
                }
                return;
            }
            this.push(currentThing);
            next();
            
        },
        destroy(error, callback) {
            for (let k = 0; k < things.length; k += 1) {
                if (isStream(things[k])) {
                    things[k].destroy();
                }
            }
            callback(error);
        },
        // highWaterMark: 1,
        ...options,
    });
};
