// not used
// when STATE.TEXT is closed, it does not know if it already processed links
// also see https://github.com/Canop/miaou/blob/9f5546c84d78f0ea61d624f516bc60a4e3892263/src/main-js/miaou.fmt.js
const autoLinkRawText = (text) => {
    const index = text.indexOf(`https://`);
    if (index === -1) {
        return text;
    }
    // https:// length is 8
    let end = index + 1;
    for (let i = index + 8; i < text.length; i += 1) {
        if (isWhitespace(text[i])) {
            break;
        }
        end = i + 1;
    }
    const linkTarget = text.substring(index, end);
    const link = `<a href="${linkTarget}">${linkTarget}</a>`;
    return `${text.substring(0, index)}${link}${text.substring(end)}`;
    
};
