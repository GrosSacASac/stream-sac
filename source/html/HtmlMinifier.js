export { HtmlMinifier };

import { Transform } from "node:stream";
import {isWhitespaceCharacter as isWhitespace} from "is-whitespace-character";


let i = 0;
const STATE = {
    FREE: i++,
    SCRIPT_CONTENT: i++,
    PRE_CONTENT: i++,
    STYLE_CONTENT: i++,
    START_TAG_NAME: i++,
    START_DOCTYPE_OR_COMMENT: i++,
    DOCTYPE: i++,
    COMMENT: i++,
    TAG_NAME: i++,
    AFTER_START_TAG: i++,
    ATTRIBUTE_NAME: i++,
    ATTRIBUTE_VALUE: i++,
    ATTRIBUTE_VALUE_QUOTED: i++,
};


const EXPECTED_DOCTYPE = `<!doctype html>`;
const END_COMMENT = `-->`;
const SCRIPT_START = `<script`;
const SCRIPT_END = `</script>`;
const PRE_START = `<pre`;
const PRE_END = `</pre>`;
const STYLE_START = `<style`;
const STYLE_END = `</style>`;

const identity = (x) => {
    return x;
};

const DEFAULT_OPTIONS = {
    cssMinifier: identity,
    jsMinifier: identity,
};

class HtmlMinifier extends Transform {
    constructor(options = {}) {
        super({ readableObjectMode: true });
        this._refresh();
        this.currentTag = ``; // not accurate
        Object.assign(this, DEFAULT_OPTIONS, options);
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
        const asString = String(buffer);
        const { length } = asString;
        const toPush = []; // avoid pushing character by character

        for (let i = 0; i < length; i += 1) {
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
                        this.state = STATE.START_TAG_NAME;
                    } else {
                        toPush.push(c);
                        this.spaceUsed = false;
                    }
                    break;
                case STATE.SCRIPT_CONTENT:
                    this._selfBuffer(c);
                    if (c === `>` && this.currentString.endsWith(SCRIPT_END)) {
                        const scriptContent = this.currentString.substring(0, this.currentString.length - SCRIPT_END.length);
                        toPush.push(this.jsMinifier(scriptContent));
                        toPush.push(SCRIPT_END);
                        this._refresh();
                        this.currentTag = ``;
                    }
                    break;
                case STATE.STYLE_CONTENT:
                    this._selfBuffer(c);
                    if (c === `>` && this.currentString.endsWith(STYLE_END)) {
                        const styleContent = this.currentString.substring(0, this.currentString.length - STYLE_END.length);
                        toPush.push(this.cssMinifier(styleContent));
                        toPush.push(STYLE_END);
                        this._refresh();
                        this.currentTag = ``;
                    }
                    break;
                case STATE.PRE_CONTENT:
                    // todo we can minify more (attributes)
                    this._selfBuffer(c);
                    if (c === `>` && this.currentString.endsWith(PRE_END)) {
                        toPush.push(this.currentString);
                        this._refresh();
                        this.currentTag = ``;
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
                        this.currentTag = this.currentString;
                        toPush.push(this.currentString);
                        this._refresh();
                        this.state = STATE.AFTER_START_TAG;
                        this._selfBuffer(c);
                        this.spaceUsed = true;
                    } else if (c === `>`) {
                        this.currentTag = this.currentString;
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
                    done(`Invalid state`);
                    return;
            }
            if (this.state === STATE.FREE) {
                if (this.currentTag === SCRIPT_START) {
                    this.state = STATE.SCRIPT_CONTENT;
                } else if (this.currentTag === PRE_START) {
                    this.state = STATE.PRE_CONTENT;
                } else if (this.currentTag === STYLE_START) {
                    this.state = STATE.STYLE_CONTENT;
                }
                
            }
        }
        this.push(toPush.join(``));

        done();
        return buffer.length;
    }

    _flush(done) {
        if (this.currentString) {
            this.push(this.currentString);
        }
        this._refresh();
        done();
    }

}
