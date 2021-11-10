// import {
//     TransformStream
//   } from 'node:stream/web';
  
//   const transform = new TransformStream({
//     transform(chunk, controller) {
//       controller.enqueue(chunk.toUpperCase());
//     }
//   });
  
import {readableStreamFromReader as toStream} from "https://deno.land/std/io/mod.ts";

const file = toStream(await Deno.open("./readme.md", { read: true }));
// //   console.log(Object.getOwnPropertyDescriptors(file.constructor))
  

//   await transform.writable.getWriter().write(file);
// //   console.log(await Promise.all([
// //       transform.writable.getWriter().write('A'),
// //       transform.readable.getReader().read(),
// //     ]));
    
//     for await (const chunk of transform.readable) {
//         console.log(chunk);
//       }
//     await file.close();


const transformStream = new TransformStream({
    start(controller) {
      // Called immediately when the TransformStream is created
      controller.decoder = new TextDecoder();
    },

    transform(chunk, controller) {
        controller.enqueue(controller.decoder.decode(chunk, {stream: true}).toUpperCase());
      },
  
    flush(controller) {
      // Called when chunks are no longer being forwarded to the transformer
    }
  });


file.pipeTo(transformStream.writable)
transformStream.readable.getReader().read().then(({value, done}) => console.log(value))
