import _package from "../package.json";
import resolve from '@rollup/plugin-node-resolve';
import cjs from '@rollup/plugin-commonjs';


const { version, name, license } = _package;
const GLOBAL_NAME = `createMarkdownParserStream`;
const banner = `/*  ${name} v${version} ${new Date().toJSON()} licensed ${license} */`;

const commonOutputOptions = {
    // core output options
    name: GLOBAL_NAME,
    // globals: [],

    // advanced output options
    // paths: {},
    banner,
    // footer: ``,
    // intro: ``,
    // outro: ``,
    // sourcemap,
    // sourcemapFile,
    interop: false,
    extend: false,

    // danger zone
    // exports,
    // indent,
    strict: true,
    // freeze,
    namespaceToStringTag: false

    // experimental
    // entryFileNames,
    // chunkFileNames,
    // assetFileNames
};

export default { // can be an array (for multiple inputs)
    // core input options
    input: `source/markdown/MarkdownParserWeb.js`,
    plugins: [resolve(), cjs()],
    
    // external: [],

    // advanced input options
    // onwarn,
    // perf,

    // danger zone
    // acorn,
    // acornInjectPlugins,
    treeshake: {
        moduleSideEffects: true,
        moduleSideEffects: `no-external`,
    },
    // context,
    // moduleContext,


    output: [  // required (can be an array, for multiple outputs),
        Object.assign({
            format: `es`,
            file: `built/MarkdownParserWeb.es.js`,
        }, commonOutputOptions),
        // Object.assign({
        //     format: `iife`,
        //     file: `dist/core.iife.js`,
        // }, commonOutputOptions),
        // Object.assign({
        //     format: `umd`,
        //     file: `dist/core.umd.cjs`,
        //     amd: {
        //         id: GLOBAL_NAME
        //     }
        // }, commonOutputOptions)
    ],

    watch: {
        // chokidar,
        // include,
        // exclude,
        clearScreen: true
    }
};
