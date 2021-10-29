export { MarkdownParser };

import { Transform } from "stream";
import { isWhitespaceCharacter as isWhitespace } from "is-whitespace-character";
import { escape as escapeHtml } from 'html-escaper';
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
    LIST_ITEM_START: i++,
    LIST_ITEM_END: i++,
    QUOTE: i++,
    HORIZONTAL_RULE: i++,
    POTENTIAL_HTML: i++,
    INISIDE_HTML: i++,
};


const identity = (x) => {
    return x;
};

const DEFAULT_OPTIONS = {
    languagePrefix: `language-`,
    highlight: undefined,
    linkHrefHook: identity,
    mediaHook: undefined,
};

// scan for links
// remove special characters found inside links
// parse markdown with special characters left
// plaintext replace detected link with actual links (done inside parsing to avoid messing up reference links)
const scanForLinks = (plainText, start, stop) => {
    const words = plainText.split(` `);
    return words.reduce((links, word) => {
        if (word.startsWith("https://") || word.match(/[a-z]+\.[a-z]+/)?.[0]?.index === 0) {
            const index = plainText.indexOf(word);
            const indexEnd = index + word.length;
            if (index >= start && indexEnd <= stop) {
                links.push({
                    i: index,
                    iEnd: indexEnd,
                    original: word,
                    replacement: `<a href="${word}">${word}</a>`,
                });
            }
        }
        return links;
    }, []);
};

const removeIndexesInsideLinks = (indexes, links) => {
    let indexesI = 0;
    let linksI = 0;
    let position = 0;
    while (linksI < links.length && indexesI < indexes.length) {
        const link = links[linksI];
        while (position !== undefined && position < link.iEnd) {
            const index = indexes[indexesI];
            position = index?.i;
            if (position !== undefined && position >= link.i && position <= link.iEnd) {
                // inside a link remove
                indexes.splice(indexesI, 1);
                end -= 1;
            } else {
                indexesI += 1;
            }
        }
        linksI += 1;
    }
}
const replaceThings = (text, links) => {
    links.forEach(({ original, replacement }) => {
        text = text.replace(original, replacement);
    });
    return text;
};

class MarkdownParser extends Transform {
    constructor(options = {}) {
        super({ readableObjectMode: true });
        this._refresh();
        Object.assign(this, DEFAULT_OPTIONS, options);
        this.inside = [];
        this.items = [];
        this.listTypeOrdered = [];
        this.currentString = ``;
    }

    _refresh() {
        this.firstCharcater = true;
        this.indexes = [];
        this.state = STATE.TEXT;
        this.lastCharacter = ``;
        this.linkText = ``;
        this.rawDescription = ``;
        this._currentTagName = ``;
        this.inlineRaw = true;
        this.titleLevel = 0;
        this.skipStart = 0;
        this.skipEnd = 0;
        this.closingBackTicks = 0;
        this.newLined = false;
    }

    _selfBuffer(x) {
        this.currentString = `${this.currentString}${x}`;
    }

    _closeInlineStuff(currentStringStart, currentStringEnd, start = 0, end = this.indexes.length) {
        if (this.skipStart) {
            currentStringStart += this.skipStart;
            this.skipStart = 0;
        }
        if (!this.indexes.length || start === end) {
            return this.currentString.substring(currentStringStart, currentStringEnd);
        }


        const links = scanForLinks(this.currentString, currentStringStart, currentStringEnd);
        removeIndexesInsideLinks(this.indexes, links);
        let htmlOutput = ``;
        let lastUsed = this.indexes[start]?.i ?? currentStringEnd;
        if (lastUsed > currentStringStart) {
            // substring does weird things if end is smaller than start
            htmlOutput = `${replaceThings(escapeHtml(this.currentString.substring(currentStringStart, Math.max(lastUsed, currentStringStart))), links)}`;
        }
        let j;
        const nextCharacter = () => {
            return this.indexes[j + 1]?.c;
        }
        const nextIndex = () => {
            return this.indexes[j + 1]?.i;
        }
        const findClosingPair = (after, targetC) => {
            let result;
            let firstFound = false;
            let firstIndex = 0;
            for (let k = after; k < end; k += 1) {
                const { i, c } = this.indexes[k];
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
        const findLastClosingTriple = (after, targetC) => {
            let result;
            let confirmedResult;
            let firstFound = false;
            let firstIndex = 0;
            let secondFound = false;
            let secondIndex = false;
            let thirdIndex;
            for (let k = after; k < end; k += 1) {
                const { i, c } = this.indexes[k];
                if (c === targetC) {
                    if (!firstFound || (!secondFound && firstIndex + 1 !== i)) {
                        firstFound = true;
                        firstIndex = i;
                        result = k;
                    } else if (!secondFound) {
                        secondFound = true;
                        secondIndex = i;
                    } else if (secondIndex + 1 === i) {
                        confirmedResult = result;
                        thirdIndex = i;
                    } else if (confirmedResult) {
                        if (i === thirdIndex + 1) {
                            // 4 or 5  back ticks in a row
                            confirmedResult += 1;
                            thirdIndex += 1;
                        } else {
                            break;
                        }
                    } else {
                        firstFound = false;
                        secondFound = false;
                    }
                } else {
                    firstFound = false;
                    secondFound = false;
                }
            }
            return confirmedResult;
        }
        const findClosingSimple = (after, targetC) => {
            for (let k = after; k < end; k += 1) {
                const { i, c } = this.indexes[k];
                if (c === targetC) {
                    return k
                }
            }
        }

        for (j = start; j < end; j += 1) {
            const { i, c, u } = this.indexes[j];
            if (u) {
                continue;
            } else {
                this.indexes[j].u = true;
            }
            if (c === `~`) {
                if (nextCharacter() === `~` && nextIndex() === i + 1) {
                    // DELETED
                    // todo do not search inside raw stuff
                    const closingPairIndex = findClosingPair(j + 2, `~`);
                    if (closingPairIndex === undefined) {
                        // does not have a closing pair
                        j += 1;

                    } else {
                        this.indexes[j + 1].u = true;
                        this.indexes[closingPairIndex].u = true;
                        this.indexes[closingPairIndex + 1].u = true;
                        htmlOutput = `${htmlOutput}<del>${replaceThings(
                            this._closeInlineStuff(
                                nextIndex() + 1,
                                this.indexes[closingPairIndex].i,
                                j + 2,
                                closingPairIndex,
                            ), links)}</del>`;
                        j = closingPairIndex + 1;
                        lastUsed = this.indexes[closingPairIndex].i + 2
                    }

                } else {

                }
            } else if (c === `[`) {
                // link
                const closingIndex = findClosingSimple(j + 1, `]`);
                if (closingIndex !== undefined) {
                    const closingPosition = this.indexes[closingIndex].i;
                    const openingParenthese = findClosingSimple(closingIndex + 1, `(`);
                    if (openingParenthese !== undefined && this.indexes[openingParenthese].i === closingPosition + 1) {
                        const closingParenthese = findClosingSimple(openingParenthese + 1, `)`);
                        if (closingParenthese !== undefined) {
                            // regular link
                            this.indexes[closingIndex].u = true;
                            htmlOutput = `${htmlOutput}<a href="${this.linkHrefHook(
                                this.currentString.substring(this.indexes[openingParenthese].i + 1, this.indexes[closingParenthese].i)
                            )}">${this._closeInlineStuff(
                                i + 1,
                                this.indexes[closingIndex].i,
                                j + 1,
                                closingIndex,
                            )}</a>`;
                            j = closingParenthese;
                            lastUsed = this.indexes[closingParenthese].i + 1;
                        }
                    } else {
                        const openingBracket = findClosingSimple(closingIndex + 1, `[`);
                        if (openingBracket !== undefined && this.indexes[openingBracket].i === closingPosition + 1) {
                            const closingBracket = findClosingSimple(openingBracket + 1, `]`);
                            if (closingBracket !== undefined) {
                                // reference link
                                this.indexes[closingIndex].u = true;
                                const slug = slugify(this.currentString.substring(this.indexes[openingBracket].i + 1, this.indexes[closingBracket].i));
                                htmlOutput = `${htmlOutput}<a href="#${slug}">${this._closeInlineStuff(
                                    i + 1,
                                    this.indexes[closingIndex].i,
                                    j + 1,
                                    closingIndex,
                                )}</a>`;
                                j = closingBracket;
                                lastUsed = this.indexes[closingBracket].i + 1
                            }
                        } else {
                            // reference from a previous link
                            const colon = findClosingSimple(closingIndex + 1, `:`);
                            if (colon !== undefined && this.indexes[colon].i === closingPosition + 1) {
                                const slug = slugify(this.currentString.substring(i + 1, closingPosition + 1));
                                htmlOutput = `<a id="${slug}" href="${this.linkHrefHook(
                                    this.currentString.substring(this.indexes[colon].i + 2, currentStringEnd).trim()
                                )}">${this.currentString.substring(i + 1, closingPosition)
                                    }</a>`;
                                j = end;
                                lastUsed = currentStringEnd
                                break;
                            } else {
                                // reference link with only text
                                this.indexes[closingIndex].u = true;
                                const slug = slugify(this.currentString.substring(i + 1, closingPosition));
                                htmlOutput = `${htmlOutput}<a href="#${slug}">${this.currentString.substring(i + 1, closingPosition)
                                    }</a>`;
                                j = closingIndex;
                                lastUsed = closingPosition + 1
                            }
                        }
                    }


                } else {

                }
            } else if (c === `!`) {
                const openingBracketIndex = findClosingSimple(j + 1, `[`);
                if (openingBracketIndex) {
                    const closingIndex = findClosingSimple(openingBracketIndex + 1, `]`);
                    if (closingIndex !== undefined) {
                        const closingPosition = this.indexes[closingIndex].i;
                        const openingParenthese = findClosingSimple(closingIndex + 1, `(`);
                        if (openingParenthese !== undefined && this.indexes[openingParenthese].i === closingPosition + 1) {
                            const closingParenthese = findClosingSimple(openingParenthese + 1, `)`);
                            if (closingParenthese !== undefined) {
                                // regular image
                                this.indexes[closingIndex].u = true;
                                const src = this.currentString.substring(this.indexes[openingParenthese].i + 1, this.indexes[closingParenthese].i);
                                const alt = this._closeInlineStuff(
                                    this.indexes[openingBracketIndex].i + 1,
                                    this.indexes[closingIndex].i,
                                    j + 2,
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
                                lastUsed = this.indexes[closingParenthese].i + 1
                            }
                        }
                    }
                } else {
                    // no need, the 
                    // htmlOutput = `${htmlOutput}${c}`;
                }

            } else if (c === `*`) {
                if (nextCharacter() === `*` && nextIndex() === i + 1) {
                    // strong
                    const closingPairIndex = findClosingPair(j + 2, `*`);
                    if (closingPairIndex) {
                        this.indexes[j + 1].u = true;
                        this.indexes[closingPairIndex].u = true;
                        this.indexes[closingPairIndex + 1].u = true;
                        htmlOutput = `${htmlOutput}<strong>${replaceThings(this._closeInlineStuff(
                            nextIndex() + 1,
                            this.indexes[closingPairIndex].i,
                            j + 2,
                            closingPairIndex,
                        ), links)}</strong>`;
                        j = closingPairIndex + 1;
                        lastUsed = this.indexes[closingPairIndex].i + 2
                    } else {
                        j += 1;
                    }
                } else {
                    // emphasis
                    const nextStar = findClosingSimple(j + 1, `*`);
                    if (nextStar) {
                        this.indexes[nextStar].u = true;
                        htmlOutput = `${htmlOutput}<em>${replaceThings(this._closeInlineStuff(
                            i + 1,
                            this.indexes[nextStar].i,
                            j + 1,
                            nextStar,
                        ), links)}</em>`;
                        j = nextStar + 1;
                        lastUsed = this.indexes[nextStar].i + 1;
                    }
                }
            } else if (c === `_`) {
                // todo deduplicate with above
                if (nextCharacter() === `_` && nextIndex() === i + 1) {
                    // strong
                    const closingPairIndex = findClosingPair(j + 2, `_`);
                    if (closingPairIndex) {
                        this.indexes[j + 1].u = true;
                        this.indexes[closingPairIndex].u = true;
                        this.indexes[closingPairIndex + 1].u = true;
                        htmlOutput = `${htmlOutput}<strong>${replaceThings(this._closeInlineStuff(
                            nextIndex() + 1,
                            this.indexes[closingPairIndex].i,
                            j + 2,
                            closingPairIndex,
                        ), links)}</strong>`;
                        j = closingPairIndex + 1;
                        lastUsed = this.indexes[closingPairIndex].i + 2
                    } else {
                        j += 1;
                    }
                } else {
                    const nextStar = findClosingSimple(j + 1, `_`);
                    if (nextStar) {
                        this.indexes[nextStar].u = true;
                        htmlOutput = `${htmlOutput}<em>${replaceThings(this._closeInlineStuff(
                            i + 1,
                            this.indexes[nextStar].i,
                            j + 1,
                            nextStar,
                        ), links)}</em>`;
                        j = nextStar + 1;
                        lastUsed = this.indexes[nextStar].i + 1;
                    }
                }
            } else if (c === `\``) {
                let wastriplebacktick = false;
                const restOfTripleOpening = findClosingPair(j + 1, `\``);
                if (this.indexes[restOfTripleOpening]?.i === i + 1) {
                    const startOfTripleClosing = findLastClosingTriple(j + 3, `\``);
                    if (startOfTripleClosing) {
                        this.indexes[startOfTripleClosing].u = true;
                        this.indexes[startOfTripleClosing + 2].u = true;
                        this.indexes[startOfTripleClosing + 1].u = true;
                        htmlOutput = `${htmlOutput}<code>${escapeHtml(this.currentString.substring(i + 3, this.indexes[startOfTripleClosing].i))
                            }</code>`;
                        j = startOfTripleClosing + 3;
                        lastUsed = this.indexes[startOfTripleClosing].i + 3;
                        wastriplebacktick = true;
                    }
                }
                if (!wastriplebacktick) {
                    const nextBackTick = findClosingSimple(j + 1, `\``);
                    if (nextBackTick) {
                        //raw
                        this.indexes[nextBackTick].u = true;
                        htmlOutput = `${htmlOutput}<code>${escapeHtml(this.currentString.substring(i + 1, this.indexes[nextBackTick].i))
                            }</code>`;
                        j = nextBackTick + 1;
                        lastUsed = this.indexes[nextBackTick].i + 1;
                    }
                }
            } else if (false) {
            }
        }
        return `${htmlOutput}${replaceThings(escapeHtml(this.currentString.substring(lastUsed, Math.max(currentStringEnd))), links)}`;

    }

    _closeCurrent(toPush, i = this.currentString.length) {
        let skip;
        if (this.skipEnd) {
            skip = this.skipEnd;
            i -= skip;
        }
        let inlineOutput;
        if (this.state !== STATE.HORIZONTAL_RULE && this.state !== STATE.CLOSING_RAW) {
            inlineOutput = this._closeInlineStuff(0, i).trim();
        }
        switch (this.state) {
            case STATE.HORIZONTAL_RULE:
                toPush.push(`<hr>`);
                this._refresh();
                this.state = STATE.TEXT;
                break;
            case STATE.TEXT:
                if (inlineOutput) {
                    toPush.push(`<p>${inlineOutput}</p>`);
                }
                this._refresh();
                break;
            case STATE.QUOTE:
                toPush.push(`<blockquote><p>${inlineOutput}</p></blockquote>`);
                this._refresh();
                this.state = STATE.TEXT;
                break;
            case STATE.LIST_ITEM_TEXT:
                this.items.push(inlineOutput);
                this._refresh();
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
                this.state = STATE.TEXT;
                break;
            case STATE.UNDERTITLE1:
            case STATE.UNDERTITLE2:
            case STATE.TITLE_TEXT:
                toPush.push(`<h${this.titleLevel}>${inlineOutput}</h${this.titleLevel}>`);
                this._refresh();
                this.state = STATE.TEXT;
                break;
            case STATE.CLOSING_RAW:
                let classText = ``;
                if (this.rawDescription) {
                    classText = ` class="${this.languagePrefix}${escapeHtml(this.rawDescription)}"`;
                }

                let rawString = this.currentString.substring(this.rawDescriptionEnd, i - 3).trim();
                let currentInlineString;

                let highlighted;
                if (this.highlight) {
                    highlighted = this.highlight(rawString, this.rawDescription);
                }
                if (highlighted) {
                    currentInlineString = `<pre><code${classText}>${highlighted}</code></pre>`;
                } else {
                    currentInlineString = `<pre><code${classText}>${escapeHtml(rawString)}</code></pre>`;
                }

                toPush.push(currentInlineString);
                this.state = STATE.TEXT;

                this.rawDescription = ``;
                this.closingBackTicks = 0;
                break;

            default:
                return;

        }
    }

    _noteWorthyCharacters(c, i) {
        if (mardkownNoteWorthyCharacters.includes(c)) {
            this.indexes.push({ c, i });
            return true;
        }
        return false;
    }

    _escapeHtml(c) {
        // does not escape " in the midddle of a p
        if (!needsToBeEscaped.includes(c)) {
            return c;
        }
        return escapeHtml(c);
    }

    _transform(buffer, encoding, done) {
        const bufferAsString = String(buffer);
        this._selfBuffer(bufferAsString);
        const asString = this.currentString;
        const { length } = asString;
        const toPush = []; // avoid pushing character by character
        let iAdjust = 0; // as we cut off the beginning of this.currentString, i has to be adjusted
        let rawStartedAt = 0;
        let rawDescriptionStart = 0;

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
                    this._closeCurrent(toPush, i - iAdjust);
                    this.currentString = asString.substr(i);
                    iAdjust = i;
                    this._refresh();
                }
            }
            switch (this.state) {
                case STATE.UNDERTITLE1:
                case STATE.UNDERTITLE2:
                    this.skipEnd += 1;
                    if (c === `\n`) {
                        this._closeCurrent(toPush, i - iAdjust + 1);
                        this.currentString = asString.substr(i + 1);
                        iAdjust = i + 1;
                    }
                    break;
                case STATE.HORIZONTAL_RULE:
                    if (c === `\n`) {
                        this._closeCurrent(toPush, i - iAdjust);
                        this.currentString = asString.substr(i + 1);
                        iAdjust = i + 1;
                    } else {
                        this.skipEnd += 1;
                    }
                    break;
                case STATE.POTENTIAL_HTML:
                    if ((isWhitespace(c) || (!isAsciiLetter(c) && c !== `-`)) && this.lastCharacter === `<`) {
                        // was not html

                        this.state = STATE.text;

                    } else if (c === `>`) {
                        let currentTagName = ``;
                        for (let j = 1; j < asString.length; j += 1) {
                            if (!isAsciiLetter(asString[j]) && asString[j] !== `-`) {
                                break;
                            }
                            currentTagName = `${currentTagName}${asString[i]}`;
                        }
                        
                        if (emptyElements.includes(currentTagName)) {
                            toPush.push(`<${currentTagName}>`);
                            iAdjust = i + 1;
                            this._refresh();
                        } else {
                            this._currentTagName = currentTagName;
                            this.state = STATE.INISIDE_HTML;
                        }

                    } else {
                        // this._selfBuffer(c);
                    }
                    break;
                case STATE.INISIDE_HTML:
                    if (c === `>`) {
                        if (this._currentTagName === this.currentString.slice(-this._currentTagName.length)) {

                            this._selfBuffer(c);
                        } else {

                            this._selfBuffer(c);
                        }
                    } else {
                        this._selfBuffer(c);

                    }
                    break;

                case STATE.TEXT:
                    if (c === `\n`) {
                        if (this.newLined) {
                            this.skipStart -= 1;
                            this._closeCurrent(toPush, i - iAdjust);
                            this.currentString = asString.substr(i + 1);
                            iAdjust = i + 1;
                        } else {
                            this.skipStart += 1;
                            this.newLined = true;
                        }
                    } else if (c === `=` && this.newLined &&
                        // avoid empty titles
                        !this.firstCharcater) {
                        this.state = STATE.UNDERTITLE1;
                        this.skipStart -= 1;
                        this.titleLevel = 1;
                        this.skipEnd = 1;
                    } else if (c === `-` && this.newLined &&
                        // avoid empty titles
                        !this.firstCharcater) {
                        this.state = STATE.UNDERTITLE2;
                        this.skipStart -= 1;
                        this.titleLevel = 2;
                        this.skipEnd = 1;
                    } else {
                        if (this.firstCharcater) {
                            if (c === `#`) {
                                this.state = STATE.START_TITLE;
                                this.titleLevel = 1;
                            } else if (c === `*` || c === `-`) {
                                this.state = STATE.LIST_ITEM_START;
                                this.lastCharacter = c;
                            } else if (c === `0` || c === `1`) {
                                this.state = STATE.ORDERED_LIST_START;
                                this.lastCharacter = c;
                            } else if (c === `>`) {
                                this.state = STATE.QUOTE;
                                iAdjust += 1;
                                this.skipStart += 1;
                            } else if (c === `\``) {
                                this.state = STATE.START_RAW;
                                this.backTicks = 1;
                                rawStartedAt = i;
                            } else if (isWhitespace(c)) {
                                this.skipStart += 1;
                            } else if (c === `<`) {
                                this.state = STATE.POTENTIAL_HTML;
                                this.lastCharacter = c
                            } else {
                                // c = this._escapeHtml(c); // todo when closing
                                if (this.newLined) {
                                    // this._selfBuffer(` `);
                                    this.newLined = false;
                                }
                                this.firstCharcater = false

                                if (this._noteWorthyCharacters(c, i - iAdjust)) {
                                    continue;
                                }
                            }
                        } else {
                            // c = this._escapeHtml(c); // todo when closing
                            if (this.newLined) {
                                // this._selfBuffer(` `); // todo
                                this.newLined = false;
                            }
                            if (this._noteWorthyCharacters(c, i - iAdjust)) {
                                this.firstCharcater = false;
                                continue;
                            }
                        }
                    }
                    break;
                case STATE.QUOTE:
                    if (this._noteWorthyCharacters(c, i - iAdjust)) {
                        continue;
                    }
                    if (c === `\n`) {
                        if (this.newLined) {
                            this._closeCurrent(toPush, i - iAdjust);
                            this.currentString = asString.substr(i + 1);
                            iAdjust = i + 1;
                        } else {
                            this.newLined = true;
                        }
                    } else {
                        if (this.newLined) {
                            this.newLined = false;
                        }
                    }
                    break;
                case STATE.ORDERED_LIST_START:
                    if (Number.isFinite(Number(this.lastCharacter))) {
                        if (c === `.`) {
                            this.lastCharacter = c;
                        } else {
                            // force go loop to go again with current character
                            // todo avoid infinite loop
                            i -= 1;
                            this.state = STATE.TEXT;
                        }
                    } else if (this.lastCharacter === `.`) {
                        if (c === ` `) {
                            this.listTypeOrdered.push(true);
                            this.state = STATE.LIST_ITEM_TEXT;

                            this.skipStart += 3;
                            iAdjust = i - this.skipStart + 1;



                        } else {
                            // force go loop to go again with current character
                            i -= 2;
                            this.state = STATE.TEXT;
                        }
                    }
                    break;
                case STATE.LIST_ITEM_START:
                    if (c === ` `) {
                        this.listTypeOrdered.push(false);
                        this.state = STATE.LIST_ITEM_TEXT;

                        this.skipStart += 2;
                        iAdjust = i - this.skipStart + 1;

                    } else {
                        if (c === `-`) {
                            this._refresh();
                            this.state = STATE.HORIZONTAL_RULE;
                            this.skipEnd = 2;
                        } else {
                            // revert 
                            this.indexes.push({ c: this.lastCharacter, i: i - 1 - iAdjust });
                            // force go loop to go again with current character
                            i -= 1;
                            this.state = STATE.TEXT;
                        }
                    }
                    break;
                case STATE.LIST_ITEM_TEXT:
                    if (this._noteWorthyCharacters(c, i - iAdjust)) {
                        continue;
                    }
                    if (c === `\n`) {
                        // do not this._closeCurrent(toPush, i);
                        // since it will also close the list (to handle lists at the end of markdown without line break
                        const skipStart = this.skipStart;
                        const inlineOutput = this._closeInlineStuff(0, i - iAdjust + 1).trim();
                        this.items.push(inlineOutput);
                        this.currentString = asString.substr(i + 1);
                        iAdjust = i + 1 + skipStart;
                        this._refresh();
                        this.state = STATE.LIST_ITEM_END;
                    }
                    break;
                case STATE.TITLE_TEXT:
                    if (this._noteWorthyCharacters(c, i - iAdjust)) {
                        continue;
                    }
                    if (c === `\n`) {
                        this._closeCurrent(toPush, i - iAdjust);
                        this.currentString = asString.substr(i + 1);
                        iAdjust = i + 1;
                    }
                    break;
                case STATE.LIST_ITEM_END:
                    if (c === `\n`) {
                        this._closeCurrent(toPush, i - iAdjust);
                        this.currentString = asString.substr(i + 1);
                        iAdjust = i + 1;
                    } else if (isWhitespace(c)) {
                        this.skipStart += 1;
                    } else if (c === `-` || c === `*`) {
                        this.state = STATE.LIST_ITEM_START;
                    } else if (Number.isFinite(Number(c))) {
                        this.state = STATE.ORDERED_LIST_START;
                        this.lastCharacter = c;
                    }
                    break;
                case STATE.START_TITLE:
                    if (c === `#`) {
                        this.titleLevel += 1;
                    } else if (isWhitespace(c)) {
                        this.state = STATE.TITLE_TEXT;
                        this.skipStart += this.titleLevel + 1;
                    } else {
                        //malformed title
                        this.state = STATE.TEXT;
                    }
                    break;

                case STATE.START_RAW:
                    if (c === `\``) {
                        this.backTicks += 1;
                        if (this.backTicks === 3) {
                            this.state = STATE.RAW_DESCRIPTION;
                            rawDescriptionStart = i + 1;
                        }
                    } else {
                        for (let q = rawStartedAt; q < i; q += 1) {
                            this.indexes.push({ c: `\``, i: q - iAdjust });
                        }
                        this.state = STATE.TEXT;
                        this.backTicks = 0;
                    }
                    break;
                case STATE.RAW_DESCRIPTION:
                    if (c === `\n`) {
                        this.rawDescription = asString.substring(rawDescriptionStart, i);
                        this.rawDescriptionEnd = i + 1 - iAdjust;
                        this.state = STATE.RAW;
                    } else if (!isAsciiLetter(c)) {
                        // not in the description but in the raw text all along
                        for (let q = rawStartedAt; q < rawStartedAt + 3; q += 1) {
                            this.indexes.push({ c: `\``, i: q - iAdjust });
                        }
                        this.state = STATE.TEXT;
                        this.backTicks = 0;
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
                            this.closingBackTicks = 0;
                        }
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

    _flush(done) {
        const toPush = [];
        this._closeCurrent(toPush);
        toPush.forEach(string => {
            this.push(string);
        });
        this._refresh();
        done();
    }

}
