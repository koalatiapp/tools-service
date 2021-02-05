const { isValidTool } = require("../../src/utils/tool.js");
const assert = require("assert");

describe("isValidTool (src/utils/tool.js)", () => {
	it("Should return false when checking a package that doesn't exist / isn't installed", () => {
		assert.strictEqual(isValidTool("@koalati/doesnt-exist"), false);
	});

	it("Should return false when checking an installed package without the \"koalati\" keyword.", () => {
		assert.strictEqual(isValidTool("mocha"), false);
	});

	it("Should return true when checking an installed Koalati tool.", () => {
		assert.strictEqual(isValidTool("@koalati/tool-seo"), true);
	});
});
