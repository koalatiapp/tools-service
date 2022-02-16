/**
 * Sleeps for a given duration, then resolves the returned promise.
 *
 * @param {int} duration Duration to sleep for (in milliseconds)
 * @returns Promise
 */
function sleep(duration) {
	return new Promise(resolve => {
		setTimeout(resolve, duration);
	});
}

module.exports = sleep;
