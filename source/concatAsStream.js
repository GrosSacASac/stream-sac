export { concatAsStream };

import { Readable } from "stream";


const isStream = (x) => {
    return x && typeof x !== `string` && typeof x.destroy === `function`; 
}

const isPromise = (x) => {
    return x && typeof x === `object` && typeof x.then === `function`; 
}

const concatAsStream = (things, options = {}) => {
    let j = 0;
    let currentThing;
    const next = () => {
        currentThing = things.shift();
        j = 0;
        return Boolean(currentThing);
    }
    const attachedMap = new WeakSet();
    next();
    return new Readable({
        read(size) {
            let remainingSize = size;
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
            let {length} = currentThing;
            const readMax = remainingSize;
            this.push(currentThing.substr(j, remainingSize))
            remainingSize -= length - j;
            if (remainingSize > 0) {
                const canContinue = next();
                if (!canContinue) {
                    this.push(null);
                    return;
                }
            } else {
                j += readMax;
            }
        
            if (remainingSize > length - j) {
                this.read();
            };
            
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
