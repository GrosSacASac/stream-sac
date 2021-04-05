export { MarkdownParser };

import { Transform } from "stream";
import isWhitespace from "is-whitespace-character";


let s = 0;
const STATE = {
    FREE: s++,
    START_RAW: s++,
    RAW_DESCRIPTION: s++,
    RAW: s++,
    START_TITLE: s++,
    TITLE_TEXT: s++,
};


const DEFAULT_OPTIONS = {
}

class MarkdownParser extends Transform {
    constructor(options = {}) {
        super({ readableObjectMode: true });
        this._refresh();
        this.currentTag = ``; // not accurate
        Object.assign(this, DEFAULT_OPTIONS, options);
    }

    _refresh() {
        this.state = STATE.FREE;
        this.currentString = ``;
        this.rawDescription = ``;
        this.titleLevel = 0;
        this.closingBackTicks = 0;
        this.newLined = false;
    }

    _selfBuffer(x) {
        this.currentString = `${this.currentString}${x}`;
    }

    _transform(buffer, _, done) {
        const asString = String(buffer);
        const { length } = asString;
        const toPush = []; // avoid pushing character by character

        for (let i = 0; i < length; i += 1) {
            const c = asString[i];
            switch (this.state) {
                case STATE.FREE:
                    if (c === "#") {
                        this.state = STATE.START_TITLE;
                        this.titleLevel = 1;
                    } else if (c === `\``) {
                        this.state = STATE.START_RAW;
                        this.backTicks = 1;
                    } else if (c === `\n`) {
                        if (this.newLined) {
                            toPush.push(`<p>${this.currentString}</p>`);
                            this._refresh();
                        } else {
                            this.newLined = true;
                        }
                    } else {
                        // todo state paragraph
                        if (this.newLined) {
                            this._selfBuffer(` `);
                            this.newLined = false
                        }
                        this._selfBuffer(c);
                    }
                    break;
                case STATE.START_TITLE:
                    if (c === "#") {
                        this.titleLevel += 1;
                    } else {
                        this.state = STATE.TITLE_TEXT
                    }
                    break;
                case STATE.START_RAW:
                    if (c === "`") {
                        this.backTicks += 1;
                        if (this.backTicks === 3) {
                            this.state = STATE.RAW_DESCRIPTION
                        }
                    } else {
                        this.state = STATE.RAW
                    }
                    break;
                case STATE.RAW_DESCRIPTION:
                    if (c === `\n`) {
                        this.rawDescription = this.currentBuffer;
                        this._refresh();
                        this.state = STATE.RAW
                    } else {
                        this._selfBuffer(c);
                    }
                    break;
                case STATE.RAW:
                    if (c === "`") {
                        this.closingBackTicks += 1;
                        if (this.closingBackTicks === this.backTicks) {
                            toPush.push(`<code class="${this.rawDescription}">${this.currentBuffer}</code>`);
                            this._refresh();
                            this.state = STATE.FREE;
                        }
                    } else {
                        this._selfBuffer(c);
                    }
                    break;
                default:
                    done("Invalid state");
                    return;
            }
        }
        this.push(toPush.join(``));

        done();
        return buffer.length;
    }

    _flush(done) {
        if (this.currentString) {
            // todo ???
            // this.push(this.currentString);
        }
        this._refresh();
        done();
    }

}
