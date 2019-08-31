import ts from 'rollup-typescript';

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

	output: [
		{
			format: 'cjs',
			file: pkg.main,
			banner: '/* eslint-disable */',
		},
		{
			format: 'es',
			file: pkg.module,
			banner: '/* eslint-disable */',
		}
	]
};
