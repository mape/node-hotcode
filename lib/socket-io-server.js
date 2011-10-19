var exec = require('child_process').exec;
var fs = require('fs');

var helperRules = [];
try {
	helperRules = require(process.env.HOME+'/.hotcode');
} catch(e) {}

module.exports = function Server(expressInstance) {
	var io = require('socket.io').listen(expressInstance, {
		'log level': 0
	});

	io.sockets.on('connection', function(client) {
		var id = client.store.id;
		var flags = [];
		var currentWatch;
		client.on('message', function(msg) {});
		client.on('openUrl', function(url) {
			helperRules.forEach(function(helper) {
				if (helper.regex.test(url)) {
					helper.watches(url.match(helper.regex), function(err, path) {
						client.emit('watch-path', path);
					});
				}
			});
		});
		client.on('stop', function(msg) {
			client.emit('watching', false);
			if (currentWatch) {
				currentWatch.remove(id);
			}
		});
		client.on('watch', function(path) {
			if (currentWatch) {
				currentWatch.remove(id);
			}
			if (!watches[path]) {
				watches[path] = new Watch(path);
			}
			currentWatch = watches[path];
			currentWatch.add(client, id);
		});
		client.on('disconnect', function() {
			if (currentWatch) {
				currentWatch.remove(id);
			}
		});
	});
	io.sockets.on('error', function(){ console.log(arguments); });

	return io;
};
var watches = {};

function Watch(path) {
	var self = this;
	self.timeoutWatching;
	self.fileWatch;
	self.pool = {};
	self.path = path;
	self.flag = '/tmp/watching-'+(path.replace(/\//g, '-').replace(/ +/g, '-'));
	var flag = self.flag;
	fs.writeFileSync(flag, '');
	var cmd = 'find -L '+path+' -type f -newer ' + flag + ' -print';
	fs.stat(path, function(err) {
		if (err) {
			self.broadcast('error', 'Path "'+path+'" does not exist.');
		} else {
			(function watching() {
				if (self.fileWatch) {
					self.fileWatch.kill();
					clearTimeout(self.timeoutWatching);
				}

				self.fileWatch = exec(cmd, function (error, stdout, stderr) {
					if (error) {
						console.log(error);
						self.broadcast('error', 'Error: Path "'+path+'" could not be watched.');
						self.fileWatch.kill();
						clearTimeout(self.timeoutWatching);
						return;
					}

					var files = stdout.split(/\n/).filter(function(file) {
						if (file) {
							return file;
						}
					});
					if (files.length) {
						fs.writeFileSync(flag, '');
						if (files.length == 1 && files[0].match(/\.monitor/)) {
							// Do nothing because this is nodemon..
						} else {
							self.broadcast('reload', files[0]);
						}
					}
					self.timeoutWatching = setTimeout(watching, 300);
				});
			})();
		}
	});
}
Watch.prototype.add = function(client, id) {
	this.pool[id] = client;
	client.emit('watching', this.path);
};
Watch.prototype.remove = function(id) {
	delete this.pool[id];
	if (!Object.keys(this.pool).length) {
		clearTimeout(this.timeoutWatching);
		this.fileWatch.kill();
		fs.unlinkSync(this.flag);
		delete watches[this.path];
	}
};
Watch.prototype.broadcast = function(key, value) {
	var self = this;
	Object.keys(self.pool).forEach(function(id) {
		self.pool[id].emit(key, value);
	});
};