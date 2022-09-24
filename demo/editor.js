// todo if this grows use core-js
import * as d from "../node_modules/dom99/built/dom99.es.js";
import { throttledWithLast} from "../node_modules/utilsac/utility.js";
import { createMarkdownParserStream } from "../built/MarkdownParserWeb.es.js";

d.functions.updatePreview = /*throttledWithLast*/(function () {
    if (typeof TransformStream !== `function`) {
        return;
    }
    const options = {
        mediaHook: function (src, alt) {
            return `<em>${alt} with src ${src} disabled for preview</em>`;
        },
    };
    const stream = new ReadableStream({
        pull(controller) {
            controller.enqueue(d.variables.md);
            controller.close();
        },
    
        autoAllocateChunkSize: 1000,
    });
    
    const readStream = function () {
        const reader = stream.pipeThrough(createMarkdownParserStream(options)).getReader();
        let result = ``;
    
        return reader.read().then(function processText({ done, value }) {
            if (done) {
                d.elements.htmlPreview.innerHTML = result;
                return;
            }
    
            result = `${result}${value}`;
            return reader.read().then(processText);
        });
    };
    /*await */readStream();
}/*, 1000, 1000*/);


d.start();

if (typeof TransformStream === `function`) {
    d.elements.htmlPreviewNote.hidden = true;
}



