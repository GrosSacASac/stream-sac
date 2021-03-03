export { HtmlMinifier };

import { Transform } from "stream";
import isWhitespace from "is-whitespace-character";


let s = 0;
const STATE = {
    FREE: s++,
    START_TAG_NAME: s++,
    START_DOCTYPE_OR_COMMENT: s++,
    DOCTYPE: s++,
    COMMENT: s++,
    TAG_NAME: s++,
    AFTER_START_TAG: s++,
    ATTRIBUTE_NAME: s++,
    ATTRIBUTE_VALUE: s++,
    ATTRIBUTE_VALUE_QUOTED: s++,
};


const EXPECTED_DOCTYPE = `<!doctype html>`;
const END_COMMENT = `-->`;


class HtmlMinifier extends Transform {
    constructor(options = {}) {
        super({ readableObjectMode: true });
        this._refresh();
    }

    _refresh() {
        this.spaceUsed = false;
        this.state = STATE.FREE;
        this.currentString = ``;
        this.currentQuote = ``;
    }

    _selfBuffer(x) {
        this.currentString = `${this.currentString}${x}`;
    }

    _transform(buffer, _, done) {
        let i = 0;
        const asString = String(buffer);
        const { length } = asString;
        const toPush = []; // avoid pushing character by character

        for (i = 0; i < length; i += 1) {
            const c = asString[i];
            switch (this.state) {
                case STATE.FREE:
                    if (isWhitespace(c)) {
                        if (this.spaceUsed) {

                        } else {
                            toPush.push(c);
                            this.spaceUsed = true;
                        }
                    } else if (c === `<`) {
                        this._selfBuffer(c);
                        this.state = STATE.START_TAG_NAME
                    } else {
                        toPush.push(c);
                        this.spaceUsed = false;
                    }
                    break;
                case STATE.START_TAG_NAME:
                    if (c === `!`) {
                        this._selfBuffer(c);
                        this.state = STATE.START_DOCTYPE_OR_COMMENT;
                    } else {
                        this._selfBuffer(c);
                        this.state = STATE.TAG_NAME;
                    }
                    break;
                case STATE.START_DOCTYPE_OR_COMMENT:
                    if (c.toLowerCase() === `d`) {
                        this._selfBuffer(c);
                        this.state = STATE.DOCTYPE;
                    } else {
                        this._selfBuffer(c);
                        this.state = STATE.COMMENT;
                    }
                    break;
                case STATE.DOCTYPE:
                    this._selfBuffer(c);
                    if (this.currentString.toLowerCase() === EXPECTED_DOCTYPE) {
                        toPush.push(this.currentString.toLowerCase());
                        this._refresh();
                        this.state = STATE.FREE;
                    }
                    break;
                case STATE.COMMENT:
                    this._selfBuffer(c);
                    if (this.currentString.endsWith(END_COMMENT)) {
                        // discard comment
                        //toPush.push(this.currentString);
                        this.currentString = ``;
                        this.state = STATE.FREE;
                    }
                    break;
                case STATE.TAG_NAME:
                    if (isWhitespace(c)) {
                        toPush.push(this.currentString);
                        this._refresh();
                        this.state = STATE.AFTER_START_TAG
                        toPush.push(c);
                        this.spaceUsed = true;
                    } else if (c === `>`) {
                        this._selfBuffer(c);
                        toPush.push(this.currentString);
                        this._refresh();
                        this.state = STATE.FREE;

                    } else {
                        this._selfBuffer(c);

                    }
                    break;
                case STATE.AFTER_START_TAG:
                    if (isWhitespace(c)) {
                        if (this.spaceUsed) {

                        } else {
                            this._selfBuffer(c);
                            this.spaceUsed = true;
                        }
                    } else if (c === `>`) {
                        toPush.push(c);
                        this._refresh();
                        this.state = STATE.FREE;

                    } else {
                        this._selfBuffer(c);
                        this.state = STATE.ATTRIBUTE_NAME;

                    }

                    break;
                case STATE.ATTRIBUTE_NAME:
                    if (isWhitespace(c)) {
                        toPush.push(this.currentString);
                        this._refresh();
                        this._selfBuffer(c);
                        this.spaceUsed = true;
                        this.state = STATE.AFTER_START_TAG;
                    } else if (c === `>`) {
                        this._selfBuffer(c);
                        toPush.push(this.currentString);
                        this._refresh();
                        this.state = STATE.FREE;

                    } else if (c === `=`) {
                        this._selfBuffer(c);
                        toPush.push(this.currentString);
                        this._refresh();
                        this.state = STATE.ATTRIBUTE_VALUE;

                    } else {
                        this._selfBuffer(c);

                    }

                    break;

                case STATE.ATTRIBUTE_VALUE:
                    if (isWhitespace(c)) {
                        toPush.push(this.currentString);
                        this.currentString = ``;
                        this._selfBuffer(c);
                        this.spaceUsed = true;
                        this.state = STATE.AFTER_START_TAG;
                    } else if (c === `>`) {
                        this._selfBuffer(c);
                        toPush.push(this.currentString);
                        this._refresh();
                        this.state = STATE.FREE;
                    } else {
                        if (!this.currentString) {
                            if (c === `"` || c === `'`) {
                                this._selfBuffer(c);
                                this.currentQuote = c;
                                this.state = STATE.ATTRIBUTE_VALUE_QUOTED;
                                break;
                            }
                        }

                        this._selfBuffer(c);

                    }

                    break;
                case STATE.ATTRIBUTE_VALUE_QUOTED:
                    if (c === this.currentQuote) {
                        this._selfBuffer(c);
                        toPush.push(this.currentString);
                        this.currentString = ``;
                        this.state = STATE.AFTER_START_TAG;
                    } else {
                        this._selfBuffer(c);
                    }

                    break;
                default:
                    return i;
            }
        }
        this.push(toPush.join(``));

        done();
        return buffer.length;
    }

    _final(done) {
        done();
    }

}
