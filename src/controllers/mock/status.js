module.exports = {
	up: async (req, res) => {
		res.send({
			success: true,
			uptime: process.uptime(),
		});
	},

	queue: async (req, res) => {
		res.send({
			success: true,
			message: "",
			data: {
				unassignedRequests: 0,
				pendingRequests: 0,
			},
		});
	},

	timeEstimates: async (req, res) => {
		res.send({
			success: true,
			message: "",
			data: null,
		});
	}
};
