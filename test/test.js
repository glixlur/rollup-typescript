const assert = require('assert');
const { mustNot } = require('./env');
const rollup = require('rollup');
const assign = require('object-assign');
const typescript = require('..');

process.chdir(__dirname);

// Evaluate a bundle (as CommonJS) and return its exports.
async function evaluate(bundle) {
	const module = { exports: {} };
	const { code } = await bundle.generate({ format: 'cjs' });

	try {
		new Function('module', 'exports', code)(module, module.exports);
		return module.exports;
	} catch (e) {
		console.warn(code);
		throw e;
	}
}

// Short-hand for rollup using the typescript plugin.
function createBundle(main, options) {
	return rollup.rollup({
		input: main,
		plugins: [typescript(options)],
	});
}

describe('rollup-plugin-typescript', function () {
	this.timeout(5000);

	it('runs code through typescript', async () => {
		const bundle = await createBundle('sample/basic/main.ts');
		const { code } = await bundle.generate({ format: 'cjs' });

		mustNot(code.includes('number'), code);
		mustNot(code.includes('const'), code);
	});

	it('ignores the declaration option', () => {
		return createBundle('sample/basic/main.ts', {
			declaration: true
		});
	});

	it('handles async functions', async () => {
		const bundle = await createBundle('sample/async/main.ts');
		const wait = await evaluate(bundle);
		return wait(3);
	});

	it('does not duplicate helpers', async () => {
		const bundle = await createBundle('sample/dedup-helpers/main.ts');
		const { code } = await bundle.generate({ format: 'cjs' });

		// The `__extends` function is defined in the bundle.
		assert.ok(code.includes('__extends'), code);

		// No duplicate `__extends` helper is defined.
		mustNot(code.includes('__extends$1'), code);
	});

	it('transpiles `export class A` correctly', async () => {
		const bundle = await createBundle('sample/export-class-fix/main.ts');
		const { code } = await bundle.generate({ format: 'es' });

		mustNot(/class [A-Z]/.test(code), code);
		assert.ok(code.includes('var A = /** @class */ (function'), code);
		assert.ok(code.includes('var B = /** @class */ (function'), code);
		assert.ok(code.includes('export { A, B };'), code);
	});

	it('transpiles ES6 features to ES5 with source maps', async () => {
		const bundle = await createBundle('sample/import-class/main.ts');
		const { code } = await bundle.generate({ format: 'cjs' });

		mustNot(/class [A-Z]/.test(code), code);
		mustNot(code.includes('...'), code);
		mustNot(code.includes('=>'), code);
	});

	it('reports diagnostics and throws if errors occur during transpilation', async () => {
		try {
			await createBundle('sample/syntax-error/missing-type.ts');
		} catch (error) {
			assert.ok(error.message.includes('There were TypeScript errors transpiling'), 'Should reject erroneous code.');
		}
	});

	it('works with named exports for abstract classes', async () => {
		const bundle = await createBundle('sample/export-abstract-class/main.ts');
		const { code } = await bundle.generate({ format: 'cjs' });
		assert.ok(code.length > 0, code);
	});

	it('should use named exports for classes', async () => {
		const bundle = await createBundle('sample/export-class/main.ts');
		assert.equal((await evaluate(bundle)).foo, 'bar');
	});

	it('supports overriding the TypeScript version', async () => {
		const bundle = await createBundle('sample/overriding-typescript/main.ts', {
			// Don't use `tsconfig.json`
			tsconfig: false,

			// test with a mocked version of TypeScript
			typescript: fakeTypescript({
				version: '1.8.0-fake',

				transpileModule: () => {
					// Ignore the code to transpile. Always return the same thing.
					return {
						outputText: 'export default 1337;',
						diagnostics: [],
						sourceMapText: JSON.stringify({
							mappings: ''
						}),
					};
				},
			})
		});
		assert.equal(await evaluate(bundle), 1337);
	});

	describe('strictNullChecks', () => {
		it('is enabled for versions >= 1.9.0', () => {
			return createBundle('sample/overriding-typescript/main.ts', {
				tsconfig: false,
				strictNullChecks: true,

				typescript: fakeTypescript({
					version: '1.9.0-fake',
					transpileModule(code, options) {
						assert.ok(options.compilerOptions.strictNullChecks,
							'strictNullChecks should be passed through');

						return {
							outputText: '',
							diagnostics: [],
							sourceMapText: JSON.stringify({
								mappings: ''
							}),
						};
					},
				}),
			});
		});

	});

	it('should not resolve .d.ts files', async () => {
		const bundle = await createBundle('sample/dts/main.ts');
		assert.deepEqual(bundle.imports, ['an-import']);
	});

	it('should transpile JSX if enabled', async () => {
		const bundle = await createBundle('sample/jsx/main.tsx', { jsx: 'react' });
		const { code } = await bundle.generate({ format: 'cjs' });

		assert(code.includes('__assign'),
			'should contain __assign definition');

		const usage = code.includes('React.createElement("span", __assign({}, props), "Yo!")');

		assert.ok(usage, 'should contain usage');
	});

	it('should throw on bad options', () => {
		assert.throws(() => {
			createBundle('does-not-matter.ts', { foo: 'bar' });
		}, /Couldn't process compiler options/);
	});

	it('prevents errors due to conflicting `sourceMap`/`inlineSourceMap` options', () => {
		return createBundle('sample/overriding-typescript/main.ts', {
			inlineSourceMap: true
		});
	});

	it('should not fail if source maps are off', () => {
		return createBundle('sample/overriding-typescript/main.ts', {
			inlineSourceMap: false,
			sourceMap: false
		});
	});

	it('does not include helpers in source maps', async () => {
		const bundle = await createBundle('sample/dedup-helpers/main.ts', { sourceMap: true });
		const {	map } = await bundle.generate({ sourcemap: true, format: 'cjs' });

		assert.ok(map.sources.every(source => !source.includes('typescript-helpers')));
	});
});

function fakeTypescript(custom) {
	return assign({
		transpileModule() {
			return {
				outputText: '',
				diagnostics: [],
				sourceMapText: JSON.stringify({
					mappings: ''
				})
			};
		},

		convertCompilerOptionsFromJson(options) {
			[
				'include',
				'exclude',
				'typescript',
				'tsconfig',
			].forEach(option => {
				if (option in options) {
					throw new Error('unrecognized compiler option "' + option + '"');
				}
			});

			return {
				options,
				errors: [],
			};
		}
	}, custom);
}
