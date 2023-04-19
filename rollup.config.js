import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import json from '@rollup/plugin-json';
import builtins from 'builtin-modules';
import terser from '@rollup/plugin-terser';
const baseConfig = {
  plugins: [
    resolve({ preferBuiltins: true }),
    commonjs(),
    json({ compact: true }),
    typescript(),
  ],
  treeshake: true,
  external: [
    ...builtins,
    'ethers',
    'axios',
    'node:os',
    'node:process',
    'node:tty',
    /^defender-relay-client(\/.*)?$/
  ],
}

export default [{
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
}, {
  input: 'src/watchgit.ts',
  output: {
    file: 'dist/watchgit.js',
    format: 'cjs',
    plugins: [
      terser(),
    ],
  },
  ...baseConfig
}];
