export { streamifyStringFunction };

import { Transform } from "stream";


const streamifyStringFunction = (stringFunction) => {
    const AsTransformStream = class extends Transform {
        constructor() {
            super({ readableObjectMode: false });
            this.setEncoding('utf8');
            // this.setDefaultEncoding('utf8');
        }
    
        _flush(done) {
            done();
        }
    
        _transform(string, encoding, done) {
            const { length } = string;
            // const string;
            let result;
            try {
                result = stringFunction(String(string));
            } catch (error) {
                done(error);
                return;
            }
            if (result) {
                this.push(result)
            }
            done();
            return length;
        }
    }
    return () => {
        return new AsTransformStream();
    };
};

