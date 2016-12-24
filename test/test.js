const assert = require('assert');
const { mustNot } = require('./env');
const rollup = require('rollup');
const assign = require('object-assign');
const typescript = require('..');

process.chdir( __dirname );

// Evaluate a bundle (as CommonJS) and return its exports.
function evaluate ( bundle ) {
	const module = { exports: {} };
	const code = bundle.generate({ format: 'cjs' }).code;

	try {
		new Function( 'module', 'exports', code)( module, module.exports );
		return module.exports;
	} catch (e) {
		console.warn(code);
		throw e;
	}
}

// Short-hand for rollup using the typescript plugin.
function bundle ( main, options ) {
	return rollup.rollup({
		entry: main,
		plugins: [ typescript( options ) ]
	});
}

describe( 'rollup-plugin-typescript', function () {
	this.timeout( 5000 );

	it( 'runs code through typescript', () => {
		return bundle( 'sample/basic/main.ts' ).then( bundle => {
			const code = bundle.generate().code;

			mustNot( code.includes('number'), code );
			mustNot( code.includes('const'), code );
		});
	});

	it( 'ignores the declaration option', () => {
		return bundle( 'sample/basic/main.ts', { declaration: true });
	});

	it( 'handles async functions', () => {
		return bundle( 'sample/async/main.ts' )
			.then( bundle => {
				const wait = evaluate( bundle );
				return wait( 3 );
			});
	});

	it( 'does not duplicate helpers', () => {
		return bundle( 'sample/dedup-helpers/main.ts' ).then( bundle => {
			const code = bundle.generate().code;

			// The `__extends` function is defined in the bundle.
			assert.ok( code.includes( '__extends' ), code );

			// No duplicate `__extends` helper is defined.
			mustNot( code.includes( '__extends$1' ), code );
		});
	});

	it( 'transpiles `export class A` correctly', () => {
		return bundle( 'sample/export-class-fix/main.ts' ).then( bundle => {
			const code = bundle.generate().code;

			mustNot( code.includes( 'class' ), code );
			assert.ok( code.includes('var A = (function'), code );
			assert.ok( code.includes('var B = (function'), code );
			assert.ok( code.includes('export { A, B };'), code );
		});
	});

	it( 'transpiles ES6 features to ES5 with source maps', () => {
		return bundle( 'sample/import-class/main.ts' ).then( bundle => {
			const code = bundle.generate().code;

			mustNot( code.includes( 'class' ), code );
			mustNot( code.includes( '...' ), code );
			mustNot( code.includes( '=>' ), code );
		});
	});

	it( 'reports diagnostics and throws if errors occur during transpilation', () => {
		return bundle( 'sample/syntax-error/missing-type.ts' ).catch( error => {
			assert.ok( error.message.includes('There were TypeScript errors transpiling'), 'Should reject erroneous code.' );
		});
	});

	it( 'works with named exports for abstract classes', () => {
		return bundle( 'sample/export-abstract-class/main.ts' ).then(bundle => {
			const code = bundle.generate().code;
			assert.ok( code.length > 0, code );
		});
	});

	it( 'should use named exports for classes', () => {
		return bundle( 'sample/export-class/main.ts' ).then( bundle => {
			assert.equal( evaluate( bundle ).foo, 'bar' );
		});
	});

	it( 'supports overriding the TypeScript version', () => {
		return bundle('sample/overriding-typescript/main.ts', {
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
						sourceMapText: JSON.stringify({ mappings: '' })
					};
				}
			})
		}).then( bundle => {
			assert.equal( evaluate( bundle ), 1337 );
		});
	});

	describe( 'strictNullChecks', () => {
		it( 'is enabled for versions >= 1.9.0', () => {
			return bundle( 'sample/overriding-typescript/main.ts', {
				tsconfig: false,
				strictNullChecks: true,

				typescript: fakeTypescript({
					version: '1.9.0-fake',
					transpileModule ( code, options ) {
						assert.ok( options.compilerOptions.strictNullChecks,
							'strictNullChecks should be passed through' );

						return {
							outputText: '',
							diagnostics: [],
							sourceMapText: JSON.stringify({ mappings: '' })
						};
					}
				})
			});
		});

	});

	it( 'should not resolve .d.ts files', () => {
		return bundle( 'sample/dts/main.ts' ).then( bundle => {
			assert.deepEqual( bundle.imports, [ 'an-import' ] );
		});
	});

	it( 'should transpile JSX if enabled', () => {
		return bundle( 'sample/jsx/main.tsx', { jsx: 'react' }).then( bundle => {
			const code = bundle.generate().code;

			assert( code.includes( '__assign' ),
				'should contain __assign definition' );

			const usage = code.includes( 'React.createElement("span", __assign({}, props), "Yo!")' );

			assert.ok( usage, 'should contain usage' );
		});
	});

	it( 'should throw on bad options', () => {
		assert.throws( () => {
			bundle( 'does-not-matter.ts', {
				foo: 'bar'
			});
		}, /Couldn't process compiler options/ );
	});

	it( 'prevents errors due to conflicting `sourceMap`/`inlineSourceMap` options', () => {
		return bundle( 'sample/overriding-typescript/main.ts', {
			inlineSourceMap: true
		});
	});

	it ( 'should not fail if source maps are off', () => {
		return bundle( 'sample/overriding-typescript/main.ts', {
			inlineSourceMap: false,
			sourceMap: false
		});
	});

	it( 'does not include helpers in source maps', () => {
		return bundle( 'sample/dedup-helpers/main.ts', {
			sourceMap: true
		}).then( bundle => {
			const { map } = bundle.generate({
				sourceMap: true
			});

			assert.ok( map.sources.every( source => !source.includes('typescript-helpers')) );
		});
	});
});

function fakeTypescript ( custom ) {
	return assign({
		transpileModule () {
			return {
				outputText: '',
				diagnostics: [],
				sourceMapText: JSON.stringify({ mappings: '' })
			};
		},

		convertCompilerOptionsFromJson ( options ) {
			[
				'include',
				'exclude',
				'typescript',
				'tsconfig'
			].forEach( option => {
				if ( option in options ) {
					throw new Error( 'unrecognized compiler option "' + option + '"' );
				}
			});

			return {
				options,
				errors: []
			};
		}
	}, custom);
}
