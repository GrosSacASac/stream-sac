# Changelog

## 2.2.0

 * Table alignment


## 2.1.0

Table support

## 2.0.0

MarkdownParser split into

 * MarkdownParserNode.js import this to have have it like 1.16.0
 * MarkdownParserWeb.js
 * MarkdownParser.js (actual implementation)
 * MardownParserWeb.js cannot be used directly in Deno or Web because it has bare imports
 * add built/MarkdownParserWeb.es.js which has all the imports inlined and can directly be used by Deno or Web

## 1.16.0

Change how MarkdownParser works internally

Instead of checking character by character and pushing characters one by one, and pushing `<em>xxx</em>` when the closing part is found,

we store indexes

like `_` seen at position 4 and 12 and when the paragraph is over we try to generate the whole markup at once if possible.

Why this change ?

Previously  when for example a  `_` is found but not the closing one, we had to rollback what was already pushed on a stack. This is error prone as we have to restore the `_` character as well as handling every other opening and closing markdown character. And detecting links would be complicated since links can contain `_`. Also the code to handle underlined inside deleted inside bold was not possible without the recursive function calls that are used now.

We still need to call substr to avoid memory overflow

 * handle reference links



## 1.14.0

 * Add link href hook
 * Add media hook
 * allows to transform images into audio or video depending on the mime type of the extension

## 1.13.0

 * Handle links in the middle of the text
 * Add highlight option

## 1.6.0

Add streaming markdown parser

## 1.5.0

Handle unterminated html

## 1.4.0

Optional JS and CSS minifier

## 1.0.0

Start
