export { start, transform, flush };

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

// todo only markdown - inline note worthy ?
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
    `#`,
    `=`,
    `:`,
    // `<`,
    // `>`,
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
    AFTER_EMPTY_HTML: i++,
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
    let removed = 0;
    while (linksI < links.length && indexesI < indexes.length) {
        const link = links[linksI];
        while (position !== undefined && position < link.iEnd) {
            const index = indexes[indexesI];
            position = index?.i;
            if (position !== undefined && position >= link.i && position <= link.iEnd) {
                // inside a link remove
                indexes.splice(indexesI, 1);
                removed += 1;
            } else {
                indexesI += 1;
            }
        }
        linksI += 1;
    }
    return removed;
}
const replaceThings = (text, links) => {
    links.forEach(({ original, replacement }) => {
        text = text.replace(original, replacement);
    });
    return text;
};

const _escapeHtml = function (c) {
    // does not escape " in the midddle of a p
    if (!needsToBeEscaped.includes(c)) {
        return c;
    }
    return escapeHtml(c);
};


const start = function (controller, options = {}) {
    Object.assign(controller, {
        _refresh() {
            controller.firstCharcater = true;
            controller.indexes = [];
            controller.state = STATE.TEXT;
            controller.lastCharacter = ``;
            controller.linkText = ``;
            controller.rawDescription = ``;
            controller._currentTagName = ``;
            controller.inlineRaw = true;
            controller.titleLevel = 0;
            controller.skipStart = 0;
            controller.skipEnd = 0;
            controller.closingBackTicks = 0;
            controller.newLined = false;
        },

        _selfBuffer(x) {
            controller.currentString = `${controller.currentString}${x}`;
        },

        _closeInlineStuff(currentStringStart, currentStringEnd, start = 0, end = controller.indexes.length) {
            if (controller.skipStart) {
                currentStringStart += Math.max(0, controller.skipStart);
                controller.skipStart = 0;
            }
            if (!controller.indexes.length || start === end) {
                return escapeHtml(controller.currentString.substring(currentStringStart, currentStringEnd));
            }


            const links = scanForLinks(controller.currentString, currentStringStart, currentStringEnd);
            const removed = removeIndexesInsideLinks(controller.indexes, links);
            end -= removed;
            let htmlOutput = ``;
            let lastUsed = controller.indexes[start]?.i ?? currentStringEnd;
            if (lastUsed > currentStringStart) {
                // substring does weird things if end is smaller than start
                htmlOutput = `${replaceThings(escapeHtml(controller.currentString.substring(currentStringStart, Math.max(lastUsed, currentStringStart))), links)}`;
            }
            let j;
            const nextCharacter = () => {
                return controller.indexes[j + 1]?.c;
            }
            const nextIndex = () => {
                return controller.indexes[j + 1]?.i;
            }
            const findClosingPair = (after, targetC) => {
                let result;
                let firstFound = false;
                let firstIndex = 0;
                for (let k = after; k < end; k += 1) {
                    const { i, c } = controller.indexes[k];
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
                    const { i, c } = controller.indexes[k];
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
                    const { i, c } = controller.indexes[k];
                    if (c === targetC) {
                        return k
                    }
                }
            }

            for (j = start; j < end; j += 1) {
                const { i, c, u } = controller.indexes[j];
                if (u) {
                    continue;
                } else {
                    controller.indexes[j].u = true;
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
                            controller.indexes[j + 1].u = true;
                            controller.indexes[closingPairIndex].u = true;
                            controller.indexes[closingPairIndex + 1].u = true;
                            htmlOutput = `${htmlOutput}<del>${replaceThings(
                                controller._closeInlineStuff(
                                    nextIndex() + 1,
                                    controller.indexes[closingPairIndex].i,
                                    j + 2,
                                    closingPairIndex,
                                ), links)}</del>`;
                            j = closingPairIndex + 1;
                            lastUsed = controller.indexes[closingPairIndex].i + 2
                        }

                    } else {

                    }
                } else if (c === `[`) {
                    // link
                    const closingIndex = findClosingSimple(j + 1, `]`);
                    if (closingIndex !== undefined) {
                        const closingPosition = controller.indexes[closingIndex].i;
                        const openingParenthese = findClosingSimple(closingIndex + 1, `(`);
                        if (openingParenthese !== undefined && controller.indexes[openingParenthese].i === closingPosition + 1) {
                            const closingParenthese = findClosingSimple(openingParenthese + 1, `)`);
                            if (closingParenthese !== undefined) {
                                // regular link
                                controller.indexes[closingIndex].u = true;
                                htmlOutput = `${htmlOutput}<a href="${controller.linkHrefHook(
                                    controller.currentString.substring(controller.indexes[openingParenthese].i + 1, controller.indexes[closingParenthese].i)
                                )}">${controller._closeInlineStuff(
                                    i + 1,
                                    controller.indexes[closingIndex].i,
                                    j + 1,
                                    closingIndex,
                                )}</a>`;
                                j = closingParenthese;
                                lastUsed = controller.indexes[closingParenthese].i + 1;
                            }
                        } else {
                            const openingBracket = findClosingSimple(closingIndex + 1, `[`);
                            if (openingBracket !== undefined && controller.indexes[openingBracket].i === closingPosition + 1) {
                                const closingBracket = findClosingSimple(openingBracket + 1, `]`);
                                if (closingBracket !== undefined) {
                                    // reference link
                                    controller.indexes[closingIndex].u = true;
                                    const slug = slugify(controller.currentString.substring(controller.indexes[openingBracket].i + 1, controller.indexes[closingBracket].i));
                                    htmlOutput = `${htmlOutput}<a href="#${slug}">${controller._closeInlineStuff(
                                        i + 1,
                                        controller.indexes[closingIndex].i,
                                        j + 1,
                                        closingIndex,
                                    )}</a>`;
                                    j = closingBracket;
                                    lastUsed = controller.indexes[closingBracket].i + 1
                                }
                            } else {
                                // reference from a previous link
                                const colon = findClosingSimple(closingIndex + 1, `:`);
                                if (colon !== undefined && controller.indexes[colon].i === closingPosition + 1) {
                                    const slug = slugify(controller.currentString.substring(i + 1, closingPosition + 1));
                                    htmlOutput = `<a id="${slug}" href="${controller.linkHrefHook(
                                        controller.currentString.substring(controller.indexes[colon].i + 2, currentStringEnd).trim()
                                    )}">${controller.currentString.substring(i + 1, closingPosition)
                                        }</a>`;
                                    j = end;
                                    lastUsed = currentStringEnd
                                    break;
                                } else {
                                    // reference link with only text
                                    controller.indexes[closingIndex].u = true;
                                    const slug = slugify(controller.currentString.substring(i + 1, closingPosition));
                                    htmlOutput = `${htmlOutput}<a href="#${slug}">${controller.currentString.substring(i + 1, closingPosition)
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
                            const closingPosition = controller.indexes[closingIndex].i;
                            const openingParenthese = findClosingSimple(closingIndex + 1, `(`);
                            if (openingParenthese !== undefined && controller.indexes[openingParenthese].i === closingPosition + 1) {
                                const closingParenthese = findClosingSimple(openingParenthese + 1, `)`);
                                if (closingParenthese !== undefined) {
                                    // regular image
                                    controller.indexes[closingIndex].u = true;
                                    const src = controller.currentString.substring(controller.indexes[openingParenthese].i + 1, controller.indexes[closingParenthese].i);
                                    const alt = controller._closeInlineStuff(
                                        controller.indexes[openingBracketIndex].i + 1,
                                        controller.indexes[closingIndex].i,
                                        j + 2,
                                        closingIndex,
                                    );
                                    let output;
                                    if (controller.mediaHook) {
                                        output = controller.mediaHook(src, alt);
                                    } else {
                                        output = `<img alt="${alt}" src="${src}">`;
                                    }
                                    htmlOutput = `${htmlOutput}${output}`;
                                    j = closingParenthese;
                                    lastUsed = controller.indexes[closingParenthese].i + 1
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
                            controller.indexes[j + 1].u = true;
                            controller.indexes[closingPairIndex].u = true;
                            controller.indexes[closingPairIndex + 1].u = true;
                            htmlOutput = `${htmlOutput}<strong>${replaceThings(controller._closeInlineStuff(
                                nextIndex() + 1,
                                controller.indexes[closingPairIndex].i,
                                j + 2,
                                closingPairIndex,
                            ), links)}</strong>`;
                            j = closingPairIndex + 1;
                            lastUsed = controller.indexes[closingPairIndex].i + 2
                        } else {
                            j += 1;
                        }
                    } else {
                        // emphasis
                        const nextStar = findClosingSimple(j + 1, `*`);
                        if (nextStar) {
                            controller.indexes[nextStar].u = true;
                            htmlOutput = `${htmlOutput}<em>${replaceThings(controller._closeInlineStuff(
                                i + 1,
                                controller.indexes[nextStar].i,
                                j + 1,
                                nextStar,
                            ), links)}</em>`;
                            j = nextStar;
                            lastUsed = controller.indexes[nextStar].i + 1;
                        }
                    }
                } else if (c === `_`) {
                    // todo deduplicate with above
                    if (nextCharacter() === `_` && nextIndex() === i + 1) {
                        // strong
                        const closingPairIndex = findClosingPair(j + 2, `_`);
                        if (closingPairIndex) {
                            controller.indexes[j + 1].u = true;
                            controller.indexes[closingPairIndex].u = true;
                            controller.indexes[closingPairIndex + 1].u = true;
                            htmlOutput = `${htmlOutput}<strong>${replaceThings(controller._closeInlineStuff(
                                nextIndex() + 1,
                                controller.indexes[closingPairIndex].i,
                                j + 2,
                                closingPairIndex,
                            ), links)}</strong>`;
                            j = closingPairIndex + 1;
                            lastUsed = controller.indexes[closingPairIndex].i + 2
                        } else {
                            j += 1;
                        }
                    } else {
                        const nextStar = findClosingSimple(j + 1, `_`);
                        if (nextStar) {
                            controller.indexes[nextStar].u = true;
                            htmlOutput = `${htmlOutput}<em>${replaceThings(controller._closeInlineStuff(
                                i + 1,
                                controller.indexes[nextStar].i,
                                j + 1,
                                nextStar,
                            ), links)}</em>`;
                            j = nextStar;
                            lastUsed = controller.indexes[nextStar].i + 1;
                        }
                    }
                } else if (c === `\``) {
                    let wastriplebacktick = false;
                    const restOfTripleOpening = findClosingPair(j + 1, `\``);
                    if (controller.indexes[restOfTripleOpening]?.i === i + 1) {
                        const startOfTripleClosing = findLastClosingTriple(j + 3, `\``);
                        if (startOfTripleClosing) {
                            controller.indexes[startOfTripleClosing].u = true;
                            controller.indexes[startOfTripleClosing + 2].u = true;
                            controller.indexes[startOfTripleClosing + 1].u = true;
                            htmlOutput = `${htmlOutput}<code>${escapeHtml(controller.currentString.substring(i + 3, controller.indexes[startOfTripleClosing].i))
                                }</code>`;
                            j = startOfTripleClosing + 2;
                            lastUsed = controller.indexes[startOfTripleClosing].i + 3;
                            wastriplebacktick = true;
                        }
                    }
                    if (!wastriplebacktick) {
                        const nextBackTick = findClosingSimple(j + 1, `\``);
                        if (nextBackTick) {
                            //raw
                            controller.indexes[nextBackTick].u = true;
                            htmlOutput = `${htmlOutput}<code>${escapeHtml(controller.currentString.substring(i + 1, controller.indexes[nextBackTick].i))
                                }</code>`;
                            j = nextBackTick;
                            lastUsed = controller.indexes[nextBackTick].i + 1;
                        }
                    }
                } else if (false) {
                }
            }
            return `${htmlOutput}${replaceThings(escapeHtml(controller.currentString.substring(lastUsed, Math.max(currentStringEnd))), links)}`;

        },

        _closeCurrent(toPush, i = controller.currentString.length) {
            let skip;
            if (controller.skipEnd) {
                skip = controller.skipEnd;
                i -= skip;
            }
            let inlineOutput;
            if (controller.state === STATE.TEXT) {
                controller.skipStart -= 1;
            }
            if (controller.state !== STATE.HORIZONTAL_RULE && controller.state !== STATE.CLOSING_RAW && controller.state !== STATE.AFTER_EMPTY_HTML) {
                inlineOutput = controller._closeInlineStuff(0, i).trim();
            }
            switch (controller.state) {
                case STATE.HORIZONTAL_RULE:
                    toPush.push(`<hr>`);
                    controller._refresh();
                    controller.state = STATE.TEXT;
                    break;
                case STATE.TEXT:
                    if (inlineOutput) {
                        toPush.push(`<p>${inlineOutput}</p>`);
                    }
                    controller._refresh();
                    break;

                case STATE.AFTER_EMPTY_HTML:
                    toPush.push(controller.currentString.substring(0, i));
                    controller._refresh();
                    break;
                case STATE.QUOTE:
                    toPush.push(`<blockquote><p>${inlineOutput}</p></blockquote>`);
                    controller._refresh();
                    controller.state = STATE.TEXT;
                    break;
                case STATE.LIST_ITEM_TEXT:
                    controller.items.push(inlineOutput);
                    controller._refresh();
                case STATE.LIST_ITEM_END:
                    const wasOrdered = controller.listTypeOrdered.pop();
                    let listContainerHtml;
                    if (wasOrdered) {
                        listContainerHtml = `ol`;
                    } else {
                        listContainerHtml = `ul`;
                    }
                    toPush.push(`<${listContainerHtml}>`);
                    controller.items.forEach(item => {
                        toPush.push(`<li>${item}</li>`);
                    });
                    toPush.push(`</${listContainerHtml}>`);
                    controller.items = [];
                    controller._refresh();
                    controller.state = STATE.TEXT;
                    break;
                case STATE.UNDERTITLE1:
                case STATE.UNDERTITLE2:
                case STATE.TITLE_TEXT:
                    toPush.push(`<h${controller.titleLevel}>${inlineOutput}</h${controller.titleLevel}>`);
                    controller._refresh();
                    controller.state = STATE.TEXT;
                    break;
                case STATE.CLOSING_RAW:
                    let classText = ``;
                    if (controller.rawDescription) {
                        classText = ` class="${controller.languagePrefix}${escapeHtml(controller.rawDescription)}"`;
                    }

                    let rawString = controller.currentString.substring(controller.rawDescriptionEnd, i - 3).trim();
                    let currentInlineString;

                    let highlighted;
                    if (controller.highlight) {
                        highlighted = controller.highlight(rawString, controller.rawDescription);
                    }
                    if (highlighted) {
                        currentInlineString = `<pre><code${classText}>${highlighted}</code></pre>`;
                    } else {
                        currentInlineString = `<pre><code${classText}>${escapeHtml(rawString)}</code></pre>`;
                    }

                    toPush.push(currentInlineString);
                    controller.state = STATE.TEXT;

                    controller.rawDescription = ``;
                    controller.closingBackTicks = 0;
                    break;

                default:
                    return;

            }
        },

        _noteWorthyCharacters(c, i) {
            if (mardkownNoteWorthyCharacters.includes(c)) {
                controller.indexes.push({ c, i });
                return true;
            }
            return false;
        }
    })
    controller._refresh();
    Object.assign(controller, DEFAULT_OPTIONS, options);
    controller.inside = [];
    controller.items = [];
    controller.listTypeOrdered = [];
    controller.currentString = ``;
}

const transform = function (bufferAsString, controller) {
    controller._selfBuffer(bufferAsString);
    const asString = controller.currentString;
    const { length } = asString;
    const toPush = []; // avoid pushing character by character
    let iAdjust = 0; // as we cut off the beginning of controller.currentString, i has to be adjusted
    let rawStartedAt = 0;
    let rawDescriptionStart = 0;

    for (let i = 0; i < length; i += 1) {
        let c = asString[i];
        if (controller.state === STATE.CLOSING_RAW) {
            if (c === `\``) {
                controller.closingBackTicks += 1;
                continue;
            } else {
                controller._closeCurrent(toPush, i - iAdjust);
                controller.currentString = asString.substr(i);
                iAdjust = i;
                controller._refresh();
            }
        }
        switch (controller.state) {
            case STATE.UNDERTITLE1:
            case STATE.UNDERTITLE2:
                controller.skipEnd += 1;
                if (c === `\n`) {
                    controller._closeCurrent(toPush, i - iAdjust + 1);
                    controller.currentString = asString.substr(i + 1);
                    iAdjust = i + 1;
                }
                break;
            case STATE.HORIZONTAL_RULE:
                if (c === `\n`) {
                    controller._closeCurrent(toPush, i - iAdjust);
                    controller.currentString = asString.substr(i + 1);
                    iAdjust = i + 1;
                } else {
                    controller.skipEnd += 1;
                }
                break;
            case STATE.POTENTIAL_HTML:
                if ((isWhitespace(c) || (!isAsciiLetter(c) && c !== `-`)) && controller.lastCharacter === `<`) {
                    // was not html
                    controller.state = STATE.TEXT;
                    controller.skipStart -= +5;
                    controller.firstCharcater = false;
                } else if (c === `>`) {
                    let currentTagName = ``;
                    for (let j = controller.tagNameStart; j < asString.length; j += 1) {
                        if (!isAsciiLetter(asString[j]) && asString[j] !== `-`) {
                            break; // todo skip whitespace < img>
                        }
                        currentTagName = `${currentTagName}${asString[j]}`;
                    }

                    if (emptyElements.includes(currentTagName)) {
                        controller.state = STATE.AFTER_EMPTY_HTML;
                        controller.currentString = asString.substr(controller.tagNameStart - 1);
                        controller._closeCurrent(toPush, i + 1 - (controller.tagNameStart - 1));
                        controller.currentString = asString.substr(i + 1);
                        iAdjust = i + 1;
                    } else {
                        controller._currentTagName = currentTagName;
                        controller.state = STATE.INISIDE_HTML;
                    }

                } else {
                    // controller._selfBuffer(c);
                }

                controller.lastCharacter = c;
                break;
            case STATE.INISIDE_HTML:
                if (c === `>`) {
                    const closingTagName = asString.slice(i - controller._currentTagName.length, i)
                    if (controller._currentTagName === closingTagName) {


                        controller.state = STATE.AFTER_EMPTY_HTML;
                        controller.currentString = asString.substr(controller.tagNameStart - 1);
                        controller._closeCurrent(toPush, i + 1 - iAdjust - (controller.tagNameStart - 1));
                        controller.currentString = asString.substr(i + 1);
                        iAdjust = i + 1;
                    } else {
                    }
                } else {

                }
                break;

            case STATE.TEXT:
                if (c === `\n`) {
                    if (controller.newLined) {
                        controller._closeCurrent(toPush, i - iAdjust);
                        controller.currentString = asString.substr(i + 1);
                        iAdjust = i + 1;
                    } else {
                        if (controller.firstCharcater) {
                            controller.skipStart += 1;
                        }
                        controller.newLined = true;
                    }
                } else if (c === `=` && controller.newLined &&
                    // avoid empty titles
                    !controller.firstCharcater) {
                    controller.state = STATE.UNDERTITLE1;
                    controller.skipStart -= 1;
                    controller.titleLevel = 1;
                    controller.skipEnd = 1;
                } else if (c === `-` && controller.newLined &&
                    // avoid empty titles
                    !controller.firstCharcater) {
                    controller.state = STATE.UNDERTITLE2;
                    controller.skipStart -= 1;
                    controller.titleLevel = 2;
                    controller.skipEnd = 1;
                } else {
                    if (controller.firstCharcater) {
                        if (c === `#`) {
                            controller.state = STATE.START_TITLE;
                            controller.titleLevel = 1;
                        } else if (c === `*` || c === `-`) {
                            controller.state = STATE.LIST_ITEM_START;
                            controller.lastCharacter = c;
                            controller.firstCharcater = false;
                        } else if (c === `0` || c === `1`) {
                            controller.state = STATE.ORDERED_LIST_START;
                            controller.lastCharacter = c;
                            controller.firstCharcater = false;
                        } else if (c === `>`) {
                            controller.state = STATE.QUOTE;
                            iAdjust += 1;
                            controller.skipStart += 1;
                        } else if (c === `\``) {
                            controller.state = STATE.START_RAW;
                            controller.backTicks = 1;
                            rawStartedAt = i;
                            controller.firstCharcater = false;
                        } else if (isWhitespace(c)) {
                            controller.skipStart += 1;
                        } else if (c === `<`) {
                            controller.state = STATE.POTENTIAL_HTML;
                            controller.lastCharacter = c;
                            controller.tagNameStart = i + 1;
                        } else {
                            // c = controller._escapeHtml(c); // todo when closing
                            if (controller.newLined) {
                                // controller._selfBuffer(` `);
                                controller.newLined = false;
                            }
                            controller.firstCharcater = false;

                            if (controller._noteWorthyCharacters(c, i - iAdjust)) {
                                continue;
                            }
                        }
                    } else {
                        if (controller.newLined && !isWhitespace(c)) {
                            controller.newLined = false;
                        }
                        if (controller._noteWorthyCharacters(c, i - iAdjust)) {
                            continue;
                        }
                    }
                }
                break;
            case STATE.QUOTE:
                if (controller._noteWorthyCharacters(c, i - iAdjust+1)) {
                    continue;
                }
                if (c === `\n`) {
                    if (controller.newLined) {
                        controller._closeCurrent(toPush, i - iAdjust);
                        controller.currentString = asString.substr(i + 1);
                        iAdjust = i + 1;
                    } else {
                        controller.newLined = true;
                    }
                } else {
                    if (controller.newLined) {
                        controller.newLined = false;
                    }
                }
                break;
            case STATE.ORDERED_LIST_START:
                if (Number.isFinite(Number(controller.lastCharacter))) {
                    if (c === `.`) {
                        controller.lastCharacter = c;
                    } else {
                        // force go loop to go again with current character
                        i -= 1;
                        controller.state = STATE.TEXT;
                    }
                } else if (controller.lastCharacter === `.`) {
                    if (c === ` `) {
                        controller.listTypeOrdered.push(true);
                        controller.state = STATE.LIST_ITEM_TEXT;

                        controller.skipStart += 3;
                        iAdjust = i - controller.skipStart + 1;



                    } else {
                        // force go loop to go again with current character
                        i -= 2;
                        controller.state = STATE.TEXT;
                    }
                }
                break;
            case STATE.LIST_ITEM_START:
                if (c === ` `) {
                    controller.listTypeOrdered.push(false);
                    controller.state = STATE.LIST_ITEM_TEXT;

                    controller.skipStart += 2;
                    iAdjust = i - controller.skipStart + 1;

                } else {
                    if (c === `-`) {
                        controller._refresh();
                        controller.state = STATE.HORIZONTAL_RULE;
                        controller.skipEnd = 2;
                    } else {
                        // revert 
                        controller.indexes.push({ c: controller.lastCharacter, i: i - 1 - iAdjust });
                        // force go loop to go again with current character
                        i -= 1;
                        controller.state = STATE.TEXT;
                    }
                }
                break;
            case STATE.LIST_ITEM_TEXT:
                if (controller._noteWorthyCharacters(c, i - iAdjust)) {
                    continue;
                }
                if (c === `\n`) {
                    // do not controller._closeCurrent(toPush, i);
                    // since it will also close the list (to handle lists at the end of markdown without line break
                    const skipStart = controller.skipStart;
                    const inlineOutput = controller._closeInlineStuff(0, i - iAdjust + 1).trim();
                    controller.items.push(inlineOutput);
                    controller.currentString = asString.substr(i + 1);
                    iAdjust = i + 1 + skipStart;
                    controller._refresh();
                    controller.state = STATE.LIST_ITEM_END;
                }
                break;
            case STATE.TITLE_TEXT:
                if (controller._noteWorthyCharacters(c, i - iAdjust)) {
                    continue;
                }
                if (c === `\n`) {
                    controller._closeCurrent(toPush, i - iAdjust);
                    controller.currentString = asString.substr(i + 1);
                    iAdjust = i + 1;
                }
                break;
            case STATE.LIST_ITEM_END:
                if (c === `\n`) {
                    controller._closeCurrent(toPush, i - iAdjust);
                    controller.currentString = asString.substr(i + 1);
                    iAdjust = i + 1;
                } else if (isWhitespace(c)) {
                    controller.skipStart += 1;
                } else if (c === `-` || c === `*`) {
                    controller.state = STATE.LIST_ITEM_START;
                } else if (Number.isFinite(Number(c))) {
                    controller.state = STATE.ORDERED_LIST_START;
                    controller.lastCharacter = c;
                }
                break;
            case STATE.START_TITLE:
                if (c === `#`) {
                    controller.titleLevel += 1;
                } else if (isWhitespace(c)) {
                    controller.state = STATE.TITLE_TEXT;
                    controller.skipStart += controller.titleLevel + 1;
                } else {
                    //malformed title
                    controller.state = STATE.TEXT;
                }
                break;

            case STATE.START_RAW:
                if (c === `\``) {
                    controller.backTicks += 1;
                    if (controller.backTicks === 3) {
                        controller.state = STATE.RAW_DESCRIPTION;
                        rawDescriptionStart = i + 1;
                    }
                } else {
                    for (let q = rawStartedAt; q < i; q += 1) {
                        controller.indexes.push({ c: `\``, i: q - iAdjust });
                    }
                    controller.state = STATE.TEXT;
                    controller.backTicks = 0;
                }
                break;
            case STATE.RAW_DESCRIPTION:
                if (c === `\n`) {
                    controller.rawDescription = asString.substring(rawDescriptionStart, i);
                    controller.rawDescriptionEnd = i + 1 - iAdjust;
                    controller.state = STATE.RAW;
                } else if (!isAsciiLetter(c)) {
                    // not in the description but in the raw text all along
                    for (let q = rawStartedAt; q < rawStartedAt + 3; q += 1) {
                        controller.indexes.push({ c: `\``, i: q - iAdjust });
                    }
                    controller.state = STATE.TEXT;
                    controller.backTicks = 0;
                }
                break;
            case STATE.RAW:
                if (c === `\``) {
                    controller.closingBackTicks += 1;
                    if (controller.closingBackTicks === controller.backTicks) {
                        controller.state = STATE.CLOSING_RAW;
                    }
                } else {
                    if (controller.closingBackTicks) {
                        controller.closingBackTicks = 0;
                    }
                }
                break;
            default:
                throw (`Invalid state ${controller.state}`);
        }
    }

    if (toPush.length) {
        controller.push(toPush.join(``));
    }

};

const flush = function (controller) {
    const toPush = [];
    controller._closeCurrent(toPush);
    toPush.forEach(string => {
        controller.push(string);
    });
    controller._refresh();
}

