require("dotenv").config();

const queue = require("./utils/queue")();

queue.add({
	url: "https://www.koalati.com",
	tool: "@koalati/tool-seo",
}).then(times => {
	console.log(times);
	queue.disconnect();
});
