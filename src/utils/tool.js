/*
* Checks if the package name corresponds to a valid Koalati tool.
* To be considered a valid, the package must:
*     - be an existing Node package that is installed locally
*     - contain the "koalati" keyword in its package.json
*/
module.exports.isValidTool = function (packageName) {
	let toolExistsAndIsInstalled = true;

	try {
		require(packageName);
		const toolKeywords = require(`${packageName}/package.json`).keywords;

		if (!Array.isArray(toolKeywords) || toolKeywords.map(str => str.toLowerCase()).indexOf("koalati") == -1) {
			toolExistsAndIsInstalled = false;
		}
	} catch (error) {
		toolExistsAndIsInstalled = false;
	}

	return toolExistsAndIsInstalled;
};
