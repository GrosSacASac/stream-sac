export { MarkdownParser };

import { Transform } from "stream";
import { isWhitespaceCharacter as isWhitespace } from "is-whitespace-character";
import {escape as escapeHtml} from 'html-escaper';

const isAsciiLetter = (c) => {
    const ch = c.charCodeAt(0);
	return (ch >= 65 && ch <= 90) || (ch >= 97 && ch <= 122);
};

const needsToBeEscaped = [
    "&",
    "<",
    ">",
];

const emptyElements = [
    `area`,
    `base`,
    `br`,
    `col`,
    `embed`,
    `hr`,
    `img`,
    `input`,
    `link`,
    `meta`,
    `param`,
    `source`,
    `track`,
    `wbr`,
];


let i = 0;
const STATE = {
    FREE: i++,
    TEXT: i++,
    START_RAW: i++,
    RAW_DESCRIPTION: i++,
    RAW: i++,
    START_TITLE: i++,
    TITLE_TEXT: i++,
    UNDERTITLE1: i++,
    UNDERTITLE2: i++,
    ORDERED_LIST_START: i++,
    LIST_ITEM_TEXT: i++,
    LIST_ITEM_END: i++,
    LINK_TEXT: i++,
    IMAGE_ALT: i++,
    DELETED: i++,
    QUOTE: i++,
    HORIZONTAL_RULE: i++,
    POTENTIAL_HTML: i++,
    INISIDE_HTML: i++,
};

const INLINE_STATE = {
    REGULAR: i++,
    AFTER_LINK_TEXT: i++,
    LINK_TARGET: i++,
    AFTER_IMAGE_ALT: i++,
    IMAGE_SOURCE: i++,
    EM: i++,
    EM_ALT: i++,
    STRONG: i++,
    STRONG_ALT: i++,
}


const identity = (x) => {
    return x;
};

const DEFAULT_OPTIONS = {
    languagePrefix: `language-`,
    highlight: undefined,
    linkHrefHook: identity,
    mediaHook: undefined,
};

class MarkdownParser extends Transform {
    constructor(options = {}) {
        super({ readableObjectMode: true });
        this._refresh();
        Object.assign(this, DEFAULT_OPTIONS, options);
        this.inside = [];
        this.items = [];
        this.listTypeOrdered = [];
        this.lastCharacter = ``;
    }

    _refresh() {
        this.state = STATE.FREE;
        this.inlineState = INLINE_STATE.REGULAR;
        this.currentString = ``;
        this.currentInlineString = ``;
        this.linkText = ``;
        this.rawDescription = ``;
        this._currentTagName = ``;
        this.inlineRaw = true;
        this.titleLevel = 0;
        this.closingBackTicks = 0;
        this.firstVisibleCharacterPassed = false;
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
            // case STATE.FREE:
            //     toPush.push(this.currentString);
            //     break;
            case STATE.TEXT:
                toPush.push(`<p>${this.currentString.trim()}</p>`);
                this._refresh();
                break;
            case STATE.QUOTE:
                toPush.push(`<blockquote><p>${this.currentString.trim()}</p></blockquote>`);
                this._refresh();
                break;
            case STATE.DELETED:
                // remove last ~
                this.currentString = this.currentString.substring(0, this.currentString.length - 1);
                const currentString = (`<del>${this.currentString}</del>`);
                this._refresh();
                this.currentString = currentString;
                break;
            case STATE.TITLE_TEXT:
                toPush.push(`<h${this.titleLevel}>${this.currentString}</h${this.titleLevel}>`);
                this._refresh();
                this.state = STATE.FREE;
                break;
            case STATE.RAW: {
                let classText = ``;
                if (this.rawDescription) {
                    classText = ` class="${this.languagePrefix}${escapeHtml(this.rawDescription)}"`;
                }
                
                let currentInlineString;
                if (!this.inlineRaw) {
                    this.currentInlineString = this.currentInlineString.trim();
                    let highlighted;
                    if (this.highlight) {
                        highlighted = this.highlight(this.currentInlineString, this.rawDescription);
                    }
                    if (highlighted) {
                        currentInlineString = `<pre><code${classText}>${highlighted}</code></pre>`;
                    } else {
                        currentInlineString = `<pre><code${classText}>${escapeHtml(this.currentInlineString)}</code></pre>`;
                    }
                    
                    toPush.push(currentInlineString);
                    this.state = STATE.FREE;
                } else {
                    currentInlineString = `<code${classText}>${escapeHtml(this.currentInlineString)}</code>`;
                    if (this.inside.length) {
                        this._selfBuffer(currentInlineString);
                        this.state = this.inside.pop();
                    } else {
                        toPush.push(currentInlineString);
                        this.state = STATE.FREE;
                    }
                }
                this.currentInlineString = ``;
                this.rawDescription = ``;
                this.closingBackTicks = 0;

                break;
            } case STATE.LIST_ITEM_TEXT:
                this.items.push(this.currentString);
            case STATE.LIST_ITEM_END:

                const wasOrdered = this.listTypeOrdered.pop();
                let listContainerHtml;
                if (wasOrdered) {
                    listContainerHtml = `ol`;
                } else {
                    listContainerHtml = `ul`;
                }
                toPush.push(`<${listContainerHtml}>`);
                this.items.forEach(item => {
                    toPush.push(`<li>${item}</li>`);
                });
                toPush.push(`</${listContainerHtml}>`);
                this.items = [];
                this._refresh();
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
            case INLINE_STATE.AFTER_IMAGE_ALT:
                if (c === `(`) {
                    this.inlineState = INLINE_STATE.IMAGE_SOURCE;
                    this.linkText = this.currentString;
                } else {
                    // not an image just regular text inside []
                    this._selfInlineBuffer(c);
                    this._selfBuffer(`![${this.currentString}`);
                    this.inlineState = INLINE_STATE.REGULAR;
                    // we already poped before
                }
                this.currentString = ``;
                break;
            case INLINE_STATE.EM:
                if (c === `*`) {
                    if (!this.currentInlineString) {
                        this.inlineState = INLINE_STATE.STRONG;
                    } else {
                        this.inlineState = INLINE_STATE.REGULAR;
                        this._selfBuffer(`<em>${this.currentInlineString}</em>`);
                        this.currentInlineString = ``;
                    }
                } else {
                    c = this._escapeHtml(c);
                    this._selfInlineBuffer(c);
                }
                break;
            case INLINE_STATE.EM_ALT:
                if (c === `_`) {
                    if (!this.currentInlineString) {
                        this.inlineState = INLINE_STATE.STRONG_ALT;
                    } else {
                        this.inlineState = INLINE_STATE.REGULAR;
                        this._selfBuffer(`<em>${this.currentInlineString}</em>`);
                        this.currentInlineString = ``;
                    }
                } else {
                    c = this._escapeHtml(c);
                    this._selfInlineBuffer(c);
                }
                break;
            case INLINE_STATE.STRONG:
                if (c === `*` && this.lastCharacter === `*`) {
                    this.inlineState = INLINE_STATE.REGULAR;

                    // remove previous *
                    this._selfBuffer(`<strong>${this.currentInlineString.substring(0, this.currentInlineString.length - 1)}</strong>`);
                    this.currentInlineString = ``;
                } else {
                    c = this._escapeHtml(c);
                    this._selfInlineBuffer(c);
                }
                break;
            case INLINE_STATE.STRONG_ALT:
                if (c === `_` && this.lastCharacter === `_`) {
                    this.inlineState = INLINE_STATE.REGULAR;

                    // remove previous *
                    this._selfBuffer(`<strong>${this.currentInlineString.substring(0, this.currentInlineString.length - 1)}</strong>`);
                    this.currentInlineString = ``;
                } else {
                    c = this._escapeHtml(c);
                    this._selfInlineBuffer(c);
                }
                break;
            case INLINE_STATE.LINK_TARGET:
                if (c === `)`) {
                    // this._closeCurrent(toPush); // cannot close current since it is an inline state
                    this.currentString = `${this.currentStringBefore}<a href="${this.linkHrefHook(this.currentInlineString)}">${this.linkText}</a>`;
                    this.inlineState = INLINE_STATE.REGULAR;
                    this.currentInlineString = ``;
                } else {
                    this._selfInlineBuffer(c);
                }
                break;
            case INLINE_STATE.IMAGE_SOURCE:
                if (c === `)`) {
                    // this._closeCurrent(toPush); // cannot close current since it is an inline state
                    if (this.mediaHook) {
                        this.currentString = this.mediaHook(this.currentInlineString, this.linkText);
                    } else {
                        this.currentString = `<img alt="${this.linkText}" src="${this.currentInlineString}">`;
                    }
                    this.inlineState = INLINE_STATE.REGULAR;
                    this.currentInlineString = ``;
                } else {
                    this._selfInlineBuffer(c);
                }
                break;
            default:
                if (c === `\``) {
                    this.inside.push(this.state);

                    this.state = STATE.START_RAW;
                    this.backTicks = 1;
                } else if (c === `[`) {
                    this.inside.push(this.state);
                    if (this.lastCharacter === `!`) {
                        // remove previous !
                        this.currentString = this.currentString.substring(0, this.currentString.length - 1);
                        this.state = STATE.IMAGE_ALT;
                    } else {
                        if (this.state === STATE.FREE) {
                            this.inside.push(STATE.TEXT);
                        }
                        this.state = STATE.LINK_TEXT;
                        this.currentStringBefore = this.currentString;
                        this.currentString = ``;
                    }
                } else if (c === `*` && this.lastCharacter !== ` `) {
                    this.inlineState = INLINE_STATE.EM;
                    if (this.state === STATE.FREE) {
                        this.inside.push(STATE.TEXT);
                    }
                } else if (c === `_`) {
                    this.inlineState = INLINE_STATE.EM_ALT;
                    if (this.state === STATE.FREE) {
                        this.inside.push(STATE.TEXT);
                    }
                } else if (c === `<`) {
                    this.inside.push(this.state);
                    this.state = STATE.POTENTIAL_HTML;
                    this._selfBuffer(c);
                    
                } else if (this.state !== STATE.DELETED && c === `~` && this.lastCharacter === `~`) {

                    this.inside.push(this.state);
                    // remove previous !
                    this.currentString = this.currentString.substring(0, this.currentString.length - 1);
                    this.state = STATE.DELETED;
                } else {
                    return true;
                }
        }
        // the continue makes it skip
        this.lastCharacter = c;
    }

    _escapeHtml(c) {
        if (!needsToBeEscaped.includes(c)) {
            return c;
        }
        return escapeHtml(c);
    }

    _transform(buffer, encoding, done) {
        const asString = String(buffer);
        const { length } = asString;
        const toPush = []; // avoid pushing character by character

        for (let i = 0; i < length; i += 1) {
            let c = asString[i];
            if (c === `\r`) {
                continue;
            }
            switch (this.state) {
                case STATE.UNDERTITLE1:
                    if (c === `\n`) {
                        this.titleLevel = 1
                        this.state = STATE.TITLE_TEXT;
                        this._closeCurrent(toPush);
                    }
                    break;
                case STATE.UNDERTITLE2:
                        if (c === `\n`) {
                        this.titleLevel = 2
                        this.state = STATE.TITLE_TEXT;
                        this._closeCurrent(toPush);
                    }
                    break;
                case STATE.HORIZONTAL_RULE:
                    if (c === `\n`) {
                        toPush.push(`<hr>`);
                        this._refresh();
                    }
                    break;
                case STATE.POTENTIAL_HTML:
                    if ((isWhitespace(c) || (!isAsciiLetter(c) && c !== `-`)) && this.lastCharacter === `<`) {
                        // was not html
                        this.state = this.inside.pop();
                        if (this.state === STATE.FREE) {
                            this.state = STATE.TEXT;
                        }
                        // correct and escape the <
                        this.currentString = this.currentString.substring(0, this.currentString.length - 1);
                        this._selfBuffer(escapeHtml(`<`));
                        this._selfBuffer(c);

                    } else if (c === `>`) {
                        let currentTagName = ``;
                        for (let i = 1; i < this.currentString.length; i += 1) {
                            if (!isAsciiLetter(this.currentString[i]) && this.currentString[i] !== `-`) {
                                break;
                            }
                            currentTagName = `${currentTagName}${this.currentString[i]}`;
                        }
                        this._selfBuffer(c);
                        if (emptyElements.includes(currentTagName)) {
                            toPush.push(this.currentString);
                            this._refresh();
                            this.state = this.inside.pop();
                        } else {
                            this._currentTagName = currentTagName;
                            this.state = STATE.INISIDE_HTML;
                        }

                    } else {
                        this._selfBuffer(c);
                    }
                    break;
                case STATE.INISIDE_HTML:
                    if (c === `>`) {
                        if (this._currentTagName === this.currentString.slice(-this._currentTagName.length)) {

                            this._selfBuffer(c);
                            this.state = this.inside.pop();
                        } else {

                            this._selfBuffer(c);
                        }
                    } else {
                        this._selfBuffer(c);
                        
                    }
                    break;

                case STATE.FREE:
                    if (!this._handleInline(c)) {
                        continue;
                    }
                    if (c === `#`) {
                        this._closeAllPrevious(toPush);
                        this.state = STATE.START_TITLE;
                        this.titleLevel = 1;
                    } else if ((c === `*` || c === `-`) && (isWhitespace(this.lastCharacter))) {
                        this.state = STATE.LIST_ITEM_TEXT;
                        this.listTypeOrdered.push(false);
                    } else if ((c === `0` || c === `1`) && (isWhitespace(this.lastCharacter))) {
                        this.state = STATE.ORDERED_LIST_START;
                    } else if (c === `>`) {
                        this.state = STATE.QUOTE;
                    } else if (isWhitespace(c)) {

                    } else {
                        c = this._escapeHtml(c);
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
                    } else if (c === `=` && this.newLined) {
                        this.state = STATE.UNDERTITLE1;
                    } else if (c === `-` && this.newLined) {
                        this.state = STATE.UNDERTITLE2;
                    } else {
                        c = this._escapeHtml(c);
                        if (this.newLined) {
                            this._selfBuffer(` `);
                            this.newLined = false;
                        }
                        this._selfBuffer(c);
                    }
                    break;
                case STATE.QUOTE:
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
                        c = this._escapeHtml(c);
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
                        c = this._escapeHtml(c);
                        this._selfBuffer(c);
                    }
                    break;
                case STATE.DELETED:
                    if (!this._handleInline(c, toPush)) {
                        continue;
                    }
                    if (c === `~` && this.lastCharacter === `~`) {
                        this._closeCurrent(toPush);
                    } else {
                        c = this._escapeHtml(c);
                        this._selfBuffer(c);
                    }
                    break;
                case STATE.IMAGE_ALT:
                    if (!this._handleInline(c, toPush)) {
                        continue;
                    }
                    if (c === `]`) {
                        this.state = this.inside.pop() || STATE.FREE;
                        this.inlineState = INLINE_STATE.AFTER_IMAGE_ALT;
                    } else {
                        c = this._escapeHtml(c);
                        this._selfBuffer(c);
                    }
                    break;
                case STATE.ORDERED_LIST_START:
                    if (c === `.`) {
                        this.state = STATE.LIST_ITEM_TEXT;
                        this.listTypeOrdered.push(true);
                    } else {
                        c = this._escapeHtml(c);
                        // it was not a start of an ordered list after all
                        this.state = STATE.TEXT;
                        this._selfBuffer(this.lastCharacter);
                        this._selfBuffer(c);
                    }
                    break;
                case STATE.LIST_ITEM_TEXT:
                    if (!this._handleInline(c, toPush)) {
                        this.firstVisibleCharacterPassed = true;
                        continue;
                    }
                    if (c === `\n`) {
                        this.items.push(this.currentString)
                        this._refresh();
                        this.state = STATE.LIST_ITEM_END;
                    } else if (isWhitespace(c)) {
                        if (this.firstVisibleCharacterPassed) {
                            this._selfBuffer(c);
                        }
                    } else if (!this.items.length && c === `-` && this.lastCharacter === `-`) {
                        this.state = STATE.HORIZONTAL_RULE;
                        this._closeAllPrevious(toPush);
                        this._refresh();
                        this.state = STATE.HORIZONTAL_RULE;
                    } else if (c === `.` && this.listTypeOrdered[this.listTypeOrdered.length - 1]) {
                        // ignore dot for ordered list item
                    } else {
                        c = this._escapeHtml(c);
                        this._selfBuffer(c);
                        this.firstVisibleCharacterPassed = true;
                    }
                    break;
                case STATE.TITLE_TEXT:
                    if (!this._handleInline(c, toPush)) {
                        continue;
                    }
                    if (c === `\n`) {
                        this._closeCurrent(toPush);
                    } else {
                        c = this._escapeHtml(c);
                        this._selfBuffer(c);
                    }
                    break;
                case STATE.LIST_ITEM_END:
                    if (c === `\n`) {
                        this._closeCurrent(toPush);
                    } else if (isWhitespace(c)) {
                    } else if (c === `-` || c === `*`) {
                        this.state = STATE.LIST_ITEM_TEXT;
                    } else if (Number.isFinite(Number(c))) {
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
                            if (this.inside[this.inside.length - 1] !== STATE.FREE) {
                                this.state = STATE.RAW;
                                this.inlineRaw = true;
                            } else {
                                this.state = STATE.RAW_DESCRIPTION;
                                this.inlineRaw = false;
                            }
                            
                        } 
                    } else {
                        if (this.inside[this.inside.length - 1] === STATE.FREE) {
                            this.inside.push(STATE.TEXT);
                        }
                        this._selfInlineBuffer(c);
                        this.state = STATE.RAW;
                        this.inlineRaw = true;
                    }
                    break;
                case STATE.RAW_DESCRIPTION:
                    if (c === `\n`) {
                        const description = this.currentInlineString;
                        // this._refresh();
                        this.currentInlineString = ``;
                        this.rawDescription = description;
                        this.state = STATE.RAW;
                    } else {
                        this._selfInlineBuffer(c);
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
                            this._selfInlineBuffer(`\``.repeat(this.closingBackTicks));
                            this.closingBackTicks = 0;
                        }
                        
                        this._selfInlineBuffer(c);
                    }
                    break;
                default:
                    done(`Invalid state`);
                    return;
            }
            this.lastCharacter = c;
        }

        if (toPush.length) {
            this.push(toPush.join(``));
        }

        done();
        return buffer.length;
    }

    _closeAllPrevious(toPush) {
        this._closeCurrent(toPush);
        while (this.inside.length) {
            this.state = this.inside.pop();
            this._closeCurrent(toPush);
        }
    }
    _flush(done) {
        const toPush = [];
        this._closeAllPrevious(toPush);
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
