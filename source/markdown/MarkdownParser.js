export { MarkdownParser };

import { Transform } from "stream";
import isWhitespace from "is-whitespace-character";


let s = 0;
const STATE = {
    FREE: s++,
    TEXT: s++,
    START_RAW: s++,
    RAW_DESCRIPTION: s++,
    RAW: s++,
    START_TITLE: s++,
    TITLE_TEXT: s++,
    LIST_ITEM_TEXT: s++,
    LIST_ITEM_END: s++,
};


const DEFAULT_OPTIONS = {
};

class MarkdownParser extends Transform {
    constructor(options = {}) {
        super({ readableObjectMode: true });
        this._refresh();
        Object.assign(this, DEFAULT_OPTIONS, options);
        this.inside = [];
        this.items = [];
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

    _closeCurrent(toPush) {
        switch (this.state) {
            case STATE.TEXT:
                toPush.push(`<p>${this.currentString}</p>`);
                this._refresh();
                break;
            case STATE.TITLE_TEXT:
                toPush.push(`<h${this.titleLevel}>${this.currentString}</h${this.titleLevel}>`);
                this._refresh();
                this.state = STATE.FREE;
                break;
            case STATE.RAW:
                toPush.push(`<code class="${this.rawDescription}">${this.currentString}</code>`);
                this._refresh();
                if (this.inside.length) {
                    this.state = this.inside.pop();
                } else {
                    this.state = STATE.FREE;
                }
                break;
            case STATE.LIST_ITEM_TEXT:
                this.items.push(this.currentString);
            case STATE.LIST_ITEM_END:
                toPush.push(`<ul>`);
                this.items.forEach(item => {
                    toPush.push(`<li>${item}</li>`);
                });
                toPush.push(`</ul>`);
                this.items = [];
                break;
            default:
                return;
        }

    }

    _transform(buffer, _, done) {
        const asString = String(buffer);
        const { length } = asString;
        const toPush = []; // avoid pushing character by character

        for (let i = 0; i < length; i += 1) {
            const c = asString[i];
            switch (this.state) {
                case STATE.FREE:
                    if (c === `#`) {
                        this.state = STATE.START_TITLE;
                        this.titleLevel = 1;
                    } else if (c === `\``) {
                        this.state = STATE.START_RAW;
                        this.backTicks = 1;
                    } else if (c === `*` || c === `-`) {
                        this.state = STATE.LIST_ITEM_TEXT;
                    } else if (isWhitespace(c)) {

                    } else {
                        this._selfBuffer(c);
                        this.state = STATE.TEXT
                    }
                    break;

                case STATE.TEXT:
                    if (c === `\``) {
                        this.inside.push(STATE.TEXT);
                        this.state = STATE.START_RAW;
                        this.backTicks = 1;
                    } else if (c === `\n`) {
                        if (this.newLined) {
                            this._closeCurrent(toPush);
                        } else {
                            this.newLined = true;
                        }
                    } else {
                        if (this.newLined) {
                            this._selfBuffer(` `);
                            this.newLined = false;
                        }
                        this._selfBuffer(c);
                    }
                    break;
                case STATE.LIST_ITEM_TEXT:
                    if (c === `\n`) {
                        this.items.push(this.currentString)
                        this._refresh();
                        this.state = STATE.LIST_ITEM_END;
                    } else {
                        this._selfBuffer(c);
                    }
                    break;

                case STATE.LIST_ITEM_END:
                    if (c === `\n`) {
                        this._closeCurrent(toPush);
                    } else if (isWhitespace(c)) {
                    } else if (c === `-` || c === `*`) {
                        this.state = STATE.LIST_ITEM_TEXT;
                    }
                    break;
                case STATE.START_TITLE:
                    if (c === `#`) {
                        this.titleLevel += 1;
                    } else {
                        this.state = STATE.TITLE_TEXT;
                    }
                    break;
                case STATE.TITLE_TEXT:
                    if (c === `\n`) {
                        this._closeCurrent(toPush);
                    } else {
                        this._selfBuffer(c);
                    }
                    break;
                case STATE.START_RAW:
                    if (c === `\``) {
                        this.backTicks += 1;
                        if (this.backTicks === 3) {
                            this.state = STATE.RAW_DESCRIPTION;
                        }
                    } else {
                        this._selfBuffer(c);
                        this.state = STATE.RAW;
                    }
                    break;
                case STATE.RAW_DESCRIPTION:
                    if (c === `\n`) {
                        const description = this.currentString
                        this._refresh();
                        this.rawDescription = description;
                        this.state = STATE.RAW;
                    } else {
                        this._selfBuffer(c);
                    }
                    break;
                case STATE.RAW:
                    if (c === `\``) {
                        this.closingBackTicks += 1;
                        if (this.closingBackTicks === this.backTicks) {
                            this._closeCurrent(toPush);
                        }
                    } else {
                        this._selfBuffer(c);
                    }
                    break;
                default:
                    done(`Invalid state`);
                    return;
            }
        }
        this.push(toPush.join(``));

        done();
        return buffer.length;
    }

    _flush(done) {
        const toPush = [];
        this._closeCurrent(toPush);
        toPush.forEach(string => {
            this.push(string);
        })
        this._refresh();
        done();
    }

}
