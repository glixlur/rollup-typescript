if (!String.prototype.includes) {
	Object.defineProperty(String.prototype, 'includes', {
		value: function includes (search, start = 0) {
			if (start + search.length > this.length) {
				return false;
			} else {
				return this.indexOf(search, start) !== -1;
			}
		}
	});
}

exports.mustNot = function (value, message) {
	return require('assert').ok(!value, message);
};
