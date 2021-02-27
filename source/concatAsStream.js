export { concatAsStream };

import { Readable } from "stream";

const isStream = (x) => {
    return x && typeof x !== `string` && typeof x.destroy === `function`; 
}

const concatAsStream = (things, options = {}) => {
    let i = 0;
    let j = 0;
    const next = () => {
        i += 1;
        j = 0;
        return things.length !== i;
    }
    const attachedMap = new WeakSet();
    return new Readable({
        read(size) {
            let remainingSize = size;
            let currentThing = things[i];
            if (!currentThing) {
                this.push(null);
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
                        console.log("end")
                        
                        next();
                        // console.log(things[i])
                    });
                    attachedMap.add(currentThing);
                }
                return;
            }
            let {length} = currentThing;
            globalThis.i++
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
                this.read()
            };
            
        },
        destroy(error, callback) {
            for (let k = i; k < things.length; k += 1) {
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
