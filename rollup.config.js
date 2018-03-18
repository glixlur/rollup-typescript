import ts from '@alexlur/rollup-plugin-typescript';

const pkg = require('./package.json');

export default {
	input: 'src/index.ts',

	external: [
		'path',
		'fs',
		'object-assign',
		'rollup-pluginutils',
		'typescript',
	],

	plugins: [
		ts(),
	],

	banner: '/* eslint-disable */',

	output: [
		{
			format: 'cjs',
			file: pkg.main,
		},
		{
			format: 'es',
			file: pkg.module,
		}
	]
};
