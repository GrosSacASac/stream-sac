// not used
// when STATE.TEXT is closed, it does not know if it already processed links
const autoLinkRawText = (text) => {
    const index = text.indexOf("https://");
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
    };
    const linkTarget = text.substring(index, end)
    const link = `<a href="${linkTarget}">${linkTarget}</a>`
    return `${text.substring(0, index)}${link}${text.substring(end)}`;
    
}
