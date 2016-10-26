# rollup-plugin-typescript
![travis-ci](https://travis-ci.org/alexlur/rollup-plugin-typescript.svg?branch=master)
![npm-version](https://img.shields.io/npm/v/@alexlur/rollup-plugin-typescript.svg?maxAge=2592000)
![npm-dependencies](https://img.shields.io/david/alexlur/rollup-plugin-typescript.svg?maxAge=2592000)

Seamless integration between Rollup and Typescript.

## Why?
See [rollup-plugin-babel](https://github.com/rollup/rollup-plugin-babel).

## Installation

```bash
# with npm
npm install --save-dev rollup-plugin-typescript typescript
# with yarn
yarn add typescript rollup-plugin-typescript --dev
```

## Usage

```js
// rollup.config.js
import typescript from 'rollup-plugin-typescript';

export default {
  entry: './main.ts',

  plugins: [
    typescript()
  ]
}
```

The plugin loads any [`compilerOptions`](http://www.typescriptlang.org/docs/handbook/compiler-options.html) from the `tsconfig.json` file by default. Passing options to the plugin directly overrides those options.

The following options are unique to `rollup-plugin-typescript`:

* `options.include` and `options.exclude` (each a minimatch pattern, or array of minimatch patterns), which determine which files are transpiled by Typescript (all `.ts` and `.tsx` files by default).

* `tsconfig` when set to false, ignores any options specified in the config file

* `typescript` overrides TypeScript used for transpilation

### TypeScript version
This plugin is version agnostic and will simply `require` TypeScript installed in your current folder.

## Issues
Emit-less types, see [#28](https://github.com/alexlur/rollup-plugin-typescript/issues/28).
