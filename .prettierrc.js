module.exports = {
	semi: true,
	trailingComma: 'all',
	singleQuote: true,
	_printWidth: 240,
	get printWidth() {
		return this._printWidth;
	},
	set printWidth(value) {
		this._printWidth = value;
	},
	useTabs: true,
	tabWidth: 4,
	endOfLine: 'lf',
};
