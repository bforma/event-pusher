var restify = require('restify');
var redis = require('redis');
var util = require('util');
var GAME_CHANNEL_PATTERN = "robo_racer.%s.games.%s";
var ROBO_RACER_ENV = "development";

function EventPusher(io, endpoint) {
  this.io = io;
  this.restClient = restify.createJsonClient({
    url: endpoint,
    rejectUnauthorized: false
  });

  this.redis = redis.createClient();
  this.redis.psubscribe(util.format(GAME_CHANNEL_PATTERN, ROBO_RACER_ENV, "*"));
  this.redis.on("pmessage", function(pattern, channel, event) {
    console.log("Sending to channel " + channel + ": " + event);
    this.io.to(channel).emit("event", event);
  }.bind(this));
}

EventPusher.prototype.connect = function(socket) {
  socket.on("authenticate", function(accessToken) {
    this.authenticate(accessToken, {
      success: function(player) {
        socket.player = player;
        socket.emit("authenticated", player);
      },
      error: function() {
        socket.disconnect();
      }
    });
  }.bind(this));

  socket.on("disconnect", function() {
    if(socket.player) {
      console.log("Disconnected socket with player " + socket.player._id);
      delete socket.player;
    } else {
      console.log("Disconnected socket");
    }
  });

  socket.on("join", function(id) {
    console.log("Joined game " + id);
    socket.join(util.format(GAME_CHANNEL_PATTERN, ROBO_RACER_ENV, id));
  }.bind(this));
};

EventPusher.prototype.authenticate = function(accessToken, callbacks) {
  this.restClient.get("/api/players/me?access_token=" + accessToken,
    function(err, req, res, data) {
      if (err) {
        if (callbacks.error) {
          callbacks.error.apply(this);
        }
      } else {
        if (res.statusCode === 401) {
          console.error("NOT authenticated");
          if (callbacks.error) {
            callbacks.error.apply(this);
          }
        } else {
          console.log("Authenticated " + data._id);
          if (callbacks.success) {
            callbacks.success.apply(this, [data]);
          }
        }
      }
    }
  );
};

module.exports = EventPusher;
