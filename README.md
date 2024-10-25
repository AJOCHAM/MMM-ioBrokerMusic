# MMM-ioBroker-Music


{
			module: "MMM-ioBrokerMusic",
			position: "top_left",
			config: {
				players: [
					{ id: "Bose", name: "Bose Küche", 
						albumId: "bosesoundtouch.1.nowPlaying.album", 
						artistId: "bosesoundtouch.1.nowPlaying.artist", 
						trackId: "bosesoundtouch.1.nowPlaying.track", 
						coverId: "bosesoundtouch.1.nowPlaying.art" 
					},
					{ id: "AlexaKüche", name: "AlexaKüche", 
						albumId: "alexa2.0.Echo-Devices.xxxxxxxxxx.Player.currentAlbum", 
						artistId: "alexa2.0.Echo-Devices.xxxxxxxxxx.Player.currentArtist", 
						trackId: "alexa2.0.Echo-Devices.xxxxxxxxxx.Player.currentTitle", 
						coverId: "alexa2.0.Echo-Devices.xxxxxxxxxx.Player.miniArtUrl" }
				]
			}
		},
