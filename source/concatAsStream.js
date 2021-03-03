export { concatAsStream };

import { Readable } from "stream";


const isStream = (x) => {
    return x && typeof x !== `string` && typeof x.destroy === `function`; 
}

const isPromise = (x) => {
    return x && typeof x === `object` && typeof x.then === `function`; 
}

const concatAsStream = (things, options = {}) => {
    let currentThing;
    const next = () => {
        currentThing = things.shift();
        return Boolean(currentThing);
    }
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
                        this.push("");// force
                    })
                    attachedMap.add(currentThing);
                }
                return;
            }
            if (isStream(currentThing)) {
                if (!attachedMap.has(currentThing)) {
                    currentThing.on('readable', () => {
                        let result;
                        // todo respect size
                        while (result = currentThing.read(size)) {
                            this.push(result);
                        }
                    });
                    currentThing.on('end', () => {
                        next();
                    });
                    attachedMap.add(currentThing);
                }
                return;
            }
            this.push(currentThing)
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
        ...options
    });
}
