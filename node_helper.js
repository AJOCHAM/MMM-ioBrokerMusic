const NodeHelper = require("node_helper");
const request = require("request");

module.exports = NodeHelper.create({
    socketNotificationReceived(notification, payload) {
        if (notification === "FETCH_IOBROKER_DATA") {
            this.fetchIoBrokerData(payload);
        }
    },

    fetchIoBrokerData(player) {
        const ip = "192.168.4.211";
        
        // Define URLs based on player IDs for each property
        const urls = {
            album: `http://${ip}:8087/getPlainValue/${player.albumId}`,
            artist: `http://${ip}:8082/getPlainValue/${player.artistId}`,
            track: `http://${ip}:8082/getPlainValue/${player.trackId}`,
            cover: `http://${ip}:8082/getPlainValue/${player.coverId}`
        };
        
        // Fetch data from each URL
        let playerData = { status: "playing" };
        Promise.all(Object.entries(urls).map(([key, url]) =>
            new Promise(resolve => {
                request(url, (error, response, body) => {
                    if (!error && body) {
                        playerData[key] = body.replace(/^"(.*)"$/, '$1');  // Remove leading and trailing quotes
                    } else {
                        playerData[key] = "Unknown";
                    }
                    resolve();
                });
            })
        )).then(() => {
            if (!playerData.track) playerData.status = "Player is on pause";
            this.sendSocketNotification("IOBROKER_DATA", { id: player.id, data: playerData });
        });
    }
});
