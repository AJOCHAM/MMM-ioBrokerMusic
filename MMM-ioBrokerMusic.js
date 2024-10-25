Module.register("MMM-ioBrokerMusic", {
    defaults: {
        players: [], // Array of player configurations
        updateInterval: 10000 // Data refresh interval in milliseconds
    },

    start() {
        this.playersData = {}; // Object to store player data
        this.getData();
        setInterval(() => this.getData(), this.config.updateInterval);
    },

    getData() {
        // Loop through each player and fetch data from ioBroker
        this.config.players.forEach(player => {
            this.sendSocketNotification("FETCH_IOBROKER_DATA", player);
        });
    },

    	// Define required scripts.
	getStyles: function() {
		return ["MMM-ioBrokerMusic.css", "font-awesome.css"];
	},

    socketNotificationReceived(notification, payload) {
        if (notification === "IOBROKER_DATA") {
            this.playersData[payload.id] = payload.data;
            this.updateDom();
        }
    },

    getTemplate() {
        return "MMM-ioBrokerMusic.njk";
    },

    getTemplateData() {
        return {
            players: this.config.players
                .map(player => ({
                    name: player.name,
                    data: this.playersData[player.id] || { status: "Player is on pause" }
                }))
                .filter(player => player.data.status !== "Player is on pause") // Only include active players
        };
    }
});
