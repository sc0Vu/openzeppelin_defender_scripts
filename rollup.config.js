import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import builtins from 'builtin-modules';
import esbuild from 'rollup-plugin-esbuild';

let buildPlugin = esbuild;
if (esbuild && typeof esbuild.default === 'function') {
  buildPlugin = esbuild.default
}

// "node:" protocol
const nodePrefixedBuiltins = builtins.concat(builtins.map(x => 'node:' + x));
const baseConfig = {
  plugins: [
    buildPlugin({
      minify: true,
      target: 'es2017',
      tsconfig: 'tsconfig.json',
      loaders: {
        '.json': 'json',
      },
    }),
    nodeResolve({ preferBuiltins: true }),
    commonjs(),
    json({ compact: true }),
  ],
  external: [
    ...nodePrefixedBuiltins,
    'ethers',
    'axios',
    /^defender-relay-client(\/.*)?$/
  ],
}

export default [
  {
    input: 'src/lonstaking.ts',
    output: {
      file: 'dist/lonstaking.js',
      format: 'cjs',
    },
    ...baseConfig
  }, {
    input: 'src/watchuniswappair.ts',
    output: {
      file: 'dist/watchuniswappair.js',
      format: 'cjs',
    },
    ...baseConfig
  }, {
    input: 'src/watchgpuminer.ts',
    output: {
      file: 'dist/watchgpuminer.js',
      format: 'cjs',
    },
    ...baseConfig
  }, {
    input: 'src/watchhiveonminer.ts',
    output: {
      file: 'dist/watchhiveonminer.js',
      format: 'cjs',
    },
    ...baseConfig
  }, {
    input: 'src/ftxlending.ts',
    output: {
      file: 'dist/ftxlending.js',
      format: 'cjs',
    },
    ...baseConfig
  }, {
    input: 'src/watchmeson.ts',
    output: {
      file: 'dist/watchmeson.js',
      format: 'cjs',
    },
    ...baseConfig
  }, 
  {
    input: 'src/watchgit.ts',
    output: {
      file: 'dist/watchgit.js',
      format: 'cjs',
    },
    ...baseConfig
  }, {
    input: 'src/watchcurve.ts',
    output: {
      file: 'dist/watchcurve.js',
      format: 'cjs',
    },
    ...baseConfig
  }
];
