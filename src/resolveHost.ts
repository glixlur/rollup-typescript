import { statSync } from 'fs';

export function directoryExists ( dirPath ) {
	try {
		return statSync( dirPath ).isDirectory();
	} catch ( err ) {
		return false;
	}
}

export function fileExists ( filePath ) {
	try {
		return statSync( filePath ).isFile();
	} catch ( err ) {
		return false;
	}
}