export { MarkdownParser };

import { Transform } from "stream";
import { isWhitespaceCharacter as isWhitespace } from "is-whitespace-character";
import {escape as escapeHtml} from 'html-escaper';
import slugify from "@sindresorhus/slugify";


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

const mardkownNoteWorthyCharacters = [
    `~`,
    `\``,
    `[`,
    `]`,
    `(`,
    `)`,
    `-`,
    `*`,
    `_`,
    `!`,
    `<`,
    `>`,
    `#`,
    `=`,
    `:`,
]


let i = 0;
const STATE = {
    TEXT: i++,
    START_RAW: i++,
    RAW_DESCRIPTION: i++,
    RAW: i++,
    CLOSING_RAW: i++,
    START_TITLE: i++,
    TITLE_TEXT: i++,
    UNDERTITLE1: i++,
    UNDERTITLE2: i++,
    ORDERED_LIST_START: i++,
    LIST_ITEM_TEXT: i++,
    LIST_ITEM_END: i++,
    DELETED: i++,
    QUOTE: i++,
    HORIZONTAL_RULE: i++,
    POTENTIAL_HTML: i++,
    INISIDE_HTML: i++,
};

const INLINE_STATE = {
    REGULAR: i++,
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
        this.currentString = ``;
        this.iAdjust = 0;
    }

    _refresh() {
        this.firstCharcater = true;
        this.indexes = [];
        this.state = STATE.TEXT;
        this.inlineState = INLINE_STATE.REGULAR;
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

    _closeInlineStuff(currentStringStart, currentStringEnd, start = 0, end = this.indexes.length) {
        this.currentString
        if (!this.indexes.length) {
            return this.currentString.substr(currentStringStart, currentStringEnd);
        }
        let htmlOutput = ``;
        if (this.indexes[start]?.i !== 0) {
            htmlOutput = `${escapeHtml(this.currentString.substring(currentStringStart, this.indexes[start]?.i || currentStringEnd))}`;
        }
        let absorbedIndex = 0;
        let lastUsed = this.indexes[start]?.i || 0;
        let j;
        const nextCharacter = () => {
            return this.indexes[j+1]?.c;
        }
        const nextIndex = () => {
            return this.indexes[j+1]?.i;
        }
        const findClosingPair = (after, targetC) => {
            let result;
            let firstFound = false;
            let firstIndex = 0;
            for (let k = after; k < end; k+= 1) {
                const {i, c} = this.indexes[k];
                if (c === targetC) {
                    if (!firstFound || firstIndex + 1 !== i) {
                        firstFound = true;
                        firstIndex = i;
                        result = k;
                    } else {
                        return result;
                    }
                } else {
                    firstFound = false;
                }
            } 
        }
        const findClosingSimple = (after, targetC) => {
            for (let k = after; k < end; k+= 1) {
                const {i, c} = this.indexes[k];
                if (c === targetC) {
                    return k
                }
            } 
        }

        for (j = start; j < end; j+= 1) {
            const {i, c, u} = this.indexes[j];
            if (u) {
                continue;
            } else {
                this.indexes[j].u = true;
            }
            if (c === `~`) {
                if (nextCharacter() === `~` && nextIndex() === i+1) {
                    // DELETED
                    // todo do not search inside raw stuff
                    const closingPairIndex = findClosingPair(j+2, `~`);
                    if (closingPairIndex === undefined) {
                        // does not have a closing pair
                        j += 1;
                        
                    } else {
                        this.indexes[j+1].u = true;
                        this.indexes[closingPairIndex].u = true;
                        this.indexes[closingPairIndex+1].u = true;
                        htmlOutput = `${htmlOutput}<del>${
                            this._closeInlineStuff(
                                nextIndex()+1,
                                this.indexes[closingPairIndex].i,
                                j+2,
                                closingPairIndex,
                            )}</del>`;
                        j = closingPairIndex + 1;
                        lastUsed = this.indexes[closingPairIndex].i+2
                    }

                } else {

                }
            } else if (c === `[`) {
                // link
                const closingIndex = findClosingSimple(j+1, `]`);
                if (closingIndex !== undefined) {
                    const closingPosition = this.indexes[closingIndex].i;
                    const openingParenthese = findClosingSimple(closingIndex+1, `(`);
                    if (openingParenthese !== undefined && this.indexes[openingParenthese].i === closingPosition + 1) {
                        const closingParenthese = findClosingSimple(openingParenthese+1, `)`);
                        if (closingParenthese !== undefined) {
                            // regular link
                            this.indexes[closingIndex].u = true;
                            htmlOutput = `${htmlOutput}<a href="${this.linkHrefHook(
                                this.currentString.substring(this.indexes[openingParenthese].i+1, this.indexes[closingParenthese].i)
                            )}">${
                                this._closeInlineStuff(
                                    i+1,
                                    this.indexes[closingIndex].i,
                                    j+1,
                                    closingIndex,
                            )}</a>`;
                            j = closingParenthese;
                            lastUsed = this.indexes[closingParenthese].i+1
                        }
                    } else {
                        const openingBracket = findClosingSimple(closingIndex+1, `[`);
                        if (openingBracket !== undefined && this.indexes[openingBracket].i === closingPosition + 1) {
                            const closingBracket = findClosingSimple(openingBracket+1, `]`);
                            if (closingBracket !== undefined) {
                                // reference link
                                this.indexes[closingIndex].u = true;
                                const slug = slugify(this.currentString.substring(this.indexes[openingBracket].i+1, this.indexes[closingBracket].i));
                                htmlOutput = `${htmlOutput}<a href="#${slug}">${
                                    this._closeInlineStuff(
                                        i+1,
                                        this.indexes[closingIndex].i,
                                        j+1,
                                        closingIndex,
                                )}</a>`;
                                j = closingBracket;
                                lastUsed = this.indexes[closingBracket].i+1
                            }
                        } else {
                            // reference from a previous link
                            const colon = findClosingSimple(closingIndex+1, `:`);
                            if (colon !== undefined && this.indexes[colon].i === closingPosition + 1) {
                                const slug = slugify(this.currentString.substring(i+1, closingPosition));
                                htmlOutput = `<a id="${slug}" href="${this.linkHrefHook(
                                    this.currentString.substring(this.indexes[colon].i+1, currentStringEnd).trim()
                                )}">${
                                    this.currentString.substring(i+1, closingPosition)
                                }</a>`;
                                j = end;
                                lastUsed = currentStringEnd
                                break;
                            } else {
                                // reference link with only text
                                this.indexes[closingIndex].u = true;
                                const slug = slugify(this.currentString.substring(i+1, closingPosition));
                                htmlOutput = `${htmlOutput}<a href="#${slug}">${
                                    this.currentString.substring(i+1, closingPosition)
                                }</a>`;
                                j = closingIndex;
                                lastUsed = closingPosition+1
                            }
                        }
                    }


                } else {

                }
            } else if (c === `!`) {
                const openingBracketIndex = findClosingSimple(j+1, `[`);
                if (openingBracketIndex) {
                    const closingIndex = findClosingSimple(openingBracketIndex+1, `]`);
                    if (closingIndex !== undefined) {
                        const closingPosition = this.indexes[closingIndex].i;
                        const openingParenthese = findClosingSimple(closingIndex+1, `(`);
                        if (openingParenthese !== undefined && this.indexes[openingParenthese].i === closingPosition + 1) {
                            const closingParenthese = findClosingSimple(openingParenthese+1, `)`);
                            if (closingParenthese !== undefined) {
                                // regular image
                                this.indexes[closingIndex].u = true;
                                const src = this.currentString.substring(this.indexes[openingParenthese].i+1, this.indexes[closingParenthese].i);
                                const alt = this._closeInlineStuff(
                                    this.indexes[openingBracketIndex].i+1,
                                    this.indexes[closingIndex].i,
                                    j+2,
                                    closingIndex,
                                );
                                let output;
                                if (this.mediaHook) {
                                    output = this.mediaHook(src, alt);
                                } else {
                                    output = `<img alt="${alt}" src="${src}">`;
                                }
                                htmlOutput = `${htmlOutput}${output}`;
                                j = closingParenthese;
                                lastUsed = this.indexes[closingParenthese].i+1
                            }
                        }
                    }
                }
                
            } else if (c === `*`) {
                if (nextCharacter() === `*` && nextIndex() === i + 1) {
                    // strong
                    const closingPairIndex = findClosingPair(j+2, `*`);
                    if (closingPairIndex) {
                        this.indexes[j+1].u = true;
                        this.indexes[closingPairIndex].u = true;
                        this.indexes[closingPairIndex+1].u = true;
                        htmlOutput = `${htmlOutput}<strong>${
                            this._closeInlineStuff(
                                nextIndex()+1,
                                this.indexes[closingPairIndex].i,
                                j+2,
                                closingPairIndex,
                            )}</strong>`;
                        j = closingPairIndex + 1;
                        lastUsed = this.indexes[closingPairIndex].i+2
                    } else {
                        j += 1;
                    }
                } else {
                    const nextStar = findClosingSimple(j+1, `*`);
                    if (nextStar) {
                        this.indexes[nextStar].u = true;
                        htmlOutput = `${htmlOutput}<em>${
                            this._closeInlineStuff(
                                i+1,
                                this.indexes[nextStar].i,
                                j+1,
                                nextStar,
                            )}</em>`;
                        j = nextStar + 1;
                        lastUsed = this.indexes[nextStar].i+1;
                    } 
                }
            } else if (c === `_`) {
                // todo deduplicate with above
                if (nextCharacter() === `_` && nextIndex() === i + 1) {
                    // strong
                    const closingPairIndex = findClosingPair(j+2, `_`);
                    if (closingPairIndex) {
                        this.indexes[j+1].u = true;
                        this.indexes[closingPairIndex].u = true;
                        this.indexes[closingPairIndex+1].u = true;
                        htmlOutput = `${htmlOutput}<strong>${
                            this._closeInlineStuff(
                                nextIndex()+1,
                                this.indexes[closingPairIndex].i,
                                j+2,
                                closingPairIndex,
                            )}</strong>`;
                        j = closingPairIndex + 1;
                        lastUsed = this.indexes[closingPairIndex].i+2
                    } else {
                        j += 1;
                    }
                } else {
                    const nextStar = findClosingSimple(j+1, `_`);
                    if (nextStar) {
                        this.indexes[nextStar].u = true;
                        htmlOutput = `${htmlOutput}<em>${
                            this._closeInlineStuff(
                                i+1,
                                this.indexes[nextStar].i,
                                j+1,
                                nextStar,
                            )}</em>`;
                        j = nextStar + 1;
                        lastUsed = this.indexes[nextStar].i+1;
                    } 
                }
            } else if (c === `\``) {
                const nextBackTick = findClosingSimple(j+1, `\``);
                if (nextBackTick) {
                    //raw
                    this.indexes[nextBackTick].u = true;
                    htmlOutput = `${htmlOutput}<code>${
                        escapeHtml(this.currentString.substring(i+1,this.indexes[nextBackTick].i))
                    }</code>`;
                    j = nextBackTick + 1;
                    lastUsed = this.indexes[nextBackTick].i+1;
                } 
            } else if (false) {
            
                STATE.CLOSING_RAW
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
                    this.state = STATE.TEXT;
                } else {
                    currentInlineString = `<code${classText}>${escapeHtml(this.currentInlineString)}</code>`;
                    if (this.inside.length) {
                        this._selfBuffer(currentInlineString);
                        this.state = this.inside.pop();
                    } else {
                        toPush.push(currentInlineString);
                        this.state = STATE.TEXT;
                    }
                }
                this.currentInlineString = ``;
                this.rawDescription = ``;
                this.closingBackTicks = 0;
            INLINE_STATE.STRONG
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
            INLINE_STATE.STRONG_ALT
                if (c === `_` && this.lastCharacter === `_`) {
                    this.inlineState = INLINE_STATE.REGULAR;

                    // remove previous *
                    this._selfBuffer(`<strong>${this.currentInlineString.substring(0, this.currentInlineString.length - 1)}</strong>`);
                    this.currentInlineString = ``;
                                
                } else if (c === `<`) {
                    this.inside.push(this.state);
                    this.state = STATE.POTENTIAL_HTML;
                    this._selfBuffer(c);
                    
                } else if (this.state !== STATE.DELETED && c === `~` && this.lastCharacter === `~`) {

                    this.inside.push(this.state);
                    // remove previous !
                    this.currentString = this.currentString.substring(0, this.currentString.length - 1);
                    this.state = STATE.DELETED;
                }
            }
        }        
        return `${htmlOutput}${escapeHtml(this.currentString.substring(lastUsed, currentStringEnd))}`;
        
    }
    _closeCurrent(toPush, i = this.currentString.length) {
        const inlineOutput = this._closeInlineStuff(0, i).trim();
        switch (this.state) {
            case STATE.TEXT:
                toPush.push(`<p>${inlineOutput}</p>`);
                this._refresh();
                break;
            case STATE.QUOTE:
                toPush.push(`<blockquote><p>${this.currentString.trim()}</p></blockquote>`);
                this._refresh();
                break;
            
            case STATE.TITLE_TEXT:
                toPush.push(`<h${this.titleLevel}>${this.currentString}</h${this.titleLevel}>`);
                this._refresh();
                this.state = STATE.TEXT;
                break;
            
            case STATE.LIST_ITEM_TEXT:
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
        this.iAdjust = i+1;
        this.currentString = this.currentString.substr(i+1);

    }

    _noteWorthyCharacters(c, i) {
        if (mardkownNoteWorthyCharacters.includes(c)) {
            this.indexes.push({c,i});
            return true;
        }
        return false;
    }

    _escapeHtml(c) {
        if (!needsToBeEscaped.includes(c)) {
            return c;
        }
        return escapeHtml(c);
    }

    _transform(buffer, encoding, done) {
        const asString = String(buffer);
        this._selfBuffer(asString);
        const { length } = asString;
        const toPush = []; // avoid pushing character by character
        let finished = 0;

        for (let i = 0; i < length; i += 1) {
            let c = asString[i];
            if (c === `\r`) {
                continue;
            }
            if (this.state === STATE.CLOSING_RAW) {
                if (c === `\``) {
                    this.closingBackTicks += 1;
                    continue;
                } else {
                    if (this.closingBackTicks > this.backTicks) {
                        this._selfInlineBuffer(`\``.repeat(this.closingBackTicks - this.backTicks));
                    }
                    this._closeCurrent(toPush);
                }
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
                        if (this.state === STATE.TEXT) {
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

                case STATE.TEXT:
                    if (this._noteWorthyCharacters(c, i - this.iAdjust)) {
                        this.firstCharcater = false;
                        continue;
                    }
                    if (c === `\n`) {
                        if (this.newLined) {
                            this._closeCurrent(toPush, i);
                        } else {
                            this.newLined = true;
                        }
                    } else if (c === `=` && this.newLined) {
                        this.state = STATE.UNDERTITLE1;
                    } else if (c === `-` && this.newLined) {
                        this.state = STATE.UNDERTITLE2;
                    } else {
                        if (this.firstCharcater) {
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
                                // c = this._escapeHtml(c); // todo when closing
                                if (this.newLined) {
                                    // this._selfBuffer(` `);
                                    this.newLined = false;
                                }
                            }
                        } else {
                            // c = this._escapeHtml(c); // todo when closing
                            if (this.newLined) {
                                // this._selfBuffer(` `); // todo
                                this.newLined = false;
                            }
                        }
                    }
                    this.firstCharcater = false
                    break;
                case STATE.QUOTE:
                    if (!this._noteWorthyCharacters(c, toPush)) {
                        continue;
                    }
                    if (c === `\n`) {
                        if (this.newLined) {
                            // this._closeCurrent(toPush);
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
                case STATE.DELETED:
                    if (!this._noteWorthyCharacters(c, toPush)) {
                        continue;
                    }
                    if (c === `~` && this.lastCharacter === `~`) {
                        // this._closeCurrent(toPush);
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
                    if (!this._noteWorthyCharacters(c, toPush)) {
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
                    if (!this._noteWorthyCharacters(c, toPush)) {
                        continue;
                    }
                    if (c === `\n`) {
                        // this._closeCurrent(toPush);
                    } else {
                        c = this._escapeHtml(c);
                        this._selfBuffer(c);
                    }
                    break;
                case STATE.LIST_ITEM_END:
                    if (c === `\n`) {
                        // this._closeCurrent(toPush);
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
                    } else if (c === ` `) {
                        // not in the description but in the raw text all along
                        this.inlineRaw = true;
                        this.inside.push(STATE.TEXT);
                        this.state = STATE.RAW;
                        this._selfInlineBuffer(c);
                    } else {
                        this._selfInlineBuffer(c);
                    }
                    break;
                case STATE.RAW:
                    if (c === `\``) {
                        this.closingBackTicks += 1;
                        if (this.closingBackTicks === this.backTicks) {
                            this.state = STATE.CLOSING_RAW;
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
