import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import json from '@rollup/plugin-json';
import builtins from 'builtin-modules';
const baseConfig = {
  plugins: [
    resolve({ preferBuiltins: true }),
    commonjs(),
    json({ compact: true }),
    typescript(),
  ],
  external: [
    ...builtins,
    'ethers',
    'web3',
    'axios',
    /^defender-relay-client(\/.*)?$/,
    'ccxt'
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
  input: 'src/watchminer.ts',
  output: {
    file: 'dist/watchminer.js',
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
}];
