export { MarkdownParser };

import { Transform } from "stream";
import {isWhitespaceCharacter as isWhitespace} from "is-whitespace-character";


let i = 0;
const STATE = {
    FREE: i++,
    TEXT: i++,
    START_RAW: i++,
    RAW_DESCRIPTION: i++,
    RAW: i++,
    START_TITLE: i++,
    TITLE_TEXT: i++,
    LIST_ITEM_TEXT: i++,
    LIST_ITEM_END: i++,
    LINK_TEXT: i++,
};

const INLINE_STATE = {
    REGULAR: i++,
    AFTER_LINK_TEXT: i++,
    LINK_TARGET: i++,
}


const DEFAULT_OPTIONS = {
    languagePrefix: `language-`,
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
        this.inlineState = INLINE_STATE.REGULAR;
        this.currentString = ``;
        this.currentInlineString = ``;
        this.linkText = ``;
        this.rawDescription = ``;
        this.titleLevel = 0;
        this.closingBackTicks = 0;
        this.newLined = false;
        this.inlineState = undefined;
    }

    _selfBuffer(x) {
        this.currentString = `${this.currentString}${x}`;
    }
    
    _selfInlineBuffer(x) {
        this.currentInlineString = `${this.currentInlineString}${x}`;
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
            case STATE.RAW: {
                let classText = ``;
                if (this.rawDescription) {
                    classText = `class="${this.languagePrefix}${this.rawDescription}"`;
                }
                const codeBlock = `<code${classText}>${this.currentString}</code>`
                let currentString;
                if (this.closingBackTicks === 3) {
                    currentString = `<pre>${codeBlock}</pre>`;
                } else {
                    currentString = codeBlock;
                }
                this._refresh();
                if (this.inside.length) {
                    this.currentString = currentString;
                    this.state = this.inside.pop();
                } else {
                    toPush.push(currentString);
                    this.state = STATE.FREE;
                }
                break;
            } case STATE.LIST_ITEM_TEXT:
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

    _handleInline(c) {
        switch (this.inlineState) {
            case INLINE_STATE.AFTER_LINK_TEXT:
                if (c === `(`) {
                    this.inlineState = INLINE_STATE.LINK_TARGET;
                    this.linkText = this.currentString;
                } else {
                    // not a link just regular text inside []
                    this._selfInlineBuffer(c);
                    this._selfBuffer(`[${this.currentString}`);
                    this.inlineState = INLINE_STATE.REGULAR;
                    // we already poped before
                }
                this.currentString = ``;
                break;
            case INLINE_STATE.LINK_TARGET:
                if (c === `)`) {
                    // this._closeCurrent(toPush); // cannot close current since it is an inline state
                    this.currentString = `<a href=${this.currentInlineString}>${this.linkText}</a>`;
                    this.inlineState = INLINE_STATE.REGULAR;
                    this.currentInlineString = ``;                    
                } else {
                    this._selfInlineBuffer(c);
                }
                break;
            default:
                if (c === `\``) {
                    this.inside.push(this.state);
                    if (this.state === STATE.FREE) {
                        this.inside.push(STATE.TEXT);
                    }
                    this.state = STATE.START_RAW;
                    this.backTicks = 1;
                } else if (c === `[`) {
                    this.inside.push(this.state);
                    if (this.state === STATE.FREE) {
                        this.inside.push(STATE.TEXT);
                    }
                    this.state = STATE.LINK_TEXT;
                } else {
                    return true;
                }
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
                    if (!this._handleInline(c)) {
                        continue;
                    }
                    if (c === `#`) {
                        this.state = STATE.START_TITLE;
                        this.titleLevel = 1;
                    } else if (c === `*` || c === `-`) {
                        this.state = STATE.LIST_ITEM_TEXT;
                    } else if (isWhitespace(c)) {

                    } else {
                        this._selfBuffer(c);
                        this.state = STATE.TEXT;
                    }
                    break;

                case STATE.TEXT:
                    if (!this._handleInline(c, toPush)) {
                        continue;
                    }
                     if (c === `\n`) {
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
                case STATE.LINK_TEXT:
                    if (!this._handleInline(c, toPush)) {
                        continue;
                    }
                    if (c === `]`) {
                        this.state = this.inside.pop() || STATE.FREE;
                        this.inlineState = INLINE_STATE.AFTER_LINK_TEXT;
                    } else {
                        this._selfBuffer(c);
                    }
                    break;
                case STATE.LIST_ITEM_TEXT:
                    if (!this._handleInline(c, toPush)) {
                        continue;
                    }
                    if (c === `\n`) {
                        this.items.push(this.currentString)
                        this._refresh();
                        this.state = STATE.LIST_ITEM_END;
                    } else {
                        this._selfBuffer(c);
                    }
                    break;
                case STATE.TITLE_TEXT:
                    if (!this._handleInline(c, toPush)) {
                        continue;
                    }
                    if (c === `\n`) {
                        this._closeCurrent(toPush);
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
                    } else if (isWhitespace(c)) {
                        this.state = STATE.TITLE_TEXT;
                    } else {
                        //malformed title
                        this._selfBuffer(`${"#".repeat(this.titleLevel)}${c}`);
                        this.state = STATE.TEXT;
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
                        if (this.closingBackTicks) {
                            this._selfBuffer(`\``.repeat(this.closingBackTicks));
                            this.closingBackTicks = 0;
                        }
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
        });
        if (this.currentString) {
            this.push(this.currentString);
        }
        this._refresh();
        done();
    }

}
