Module.register("MMM-ioBrokerMusic", {
  defaults: {
    ip: "iobroker.local",
    port: 8082,
    players: [], // Player-Konfigurationen
    updateInterval: 10000 // ms
  },

  start() {
    this.playersData = {};
    this.getData();
    this.timer = setInterval(() => this.getData(), this.config.updateInterval);
  },


  getData() {
    const baseURL = `http://${this.config.ip}:${this.config.port}`;
    this.config.players.forEach((player) => {
      this.sendSocketNotification("FETCH_IOBROKER_DATA", { baseURL, player });
    });
  },

  getStyles() {
    return ["MMM-ioBrokerMusic.css", "font-awesome.css"];
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "IOBROKER_DATA") {
      const prev = JSON.stringify(this.playersData[payload.id]);
      this.playersData[payload.id] = payload.data;
      if (prev !== JSON.stringify(payload.data)) this.updateDom();
    }
  },

  getTemplate() {
    return "MMM-ioBrokerMusic.njk";
  },

  getTemplateData() {
    return {
      players: this.config.players
        .map((p) => ({ name: p.name, data: this.playersData[p.id] }))
        .filter((p) => p.data && p.data.playing)
    };
  }
});
