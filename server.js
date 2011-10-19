#!/usr/bin/env node
process.title = 'hotcode';

var argv = require('optimist').usage('Usage: $0 -p [num] -h [host.local] -s').argv;

process.addListener('uncaughtException', function (err, stack) {
	console.log('Caught exception: '+err+'\n'+err.stack);
	console.log('\u0007'); // Terminal bell
});

var express = require('express');
var assetManager = require('connect-assetmanager');
var assetHandler = require('connect-assetmanager-handlers');
var exec = require('child_process').exec;
var port;
if (!argv.p && argv.h) {
	port = 80;
} else if (argv.p) {
	port = argv.p;
} else {
	port = 8080;
}

var host = argv.h ? 'http://'+argv.h.replace(/\/ *$/, '')+':'+port : 'http://127.0.0.1:'+port;

console.log('Running hotcode on: '+host);
console.log('Inject js: '+host+'/static/injected.js');

var app = module.exports = express.createServer();
app.listen(port, null);

// Setup socket.io server
var socketIo = new require('./lib/socket-io-server.js')(app);

// Setup groups for CSS / JS assets
var assetsMiddleware = assetManager({
	'js': {
		'route': /\/static\/js\/[a-z0-9]+\/.*\.js/
		, 'path': __dirname+'/public/js/'
		, 'dataType': 'javascript'
		, 'files': [
			'http://code.jquery.com/jquery-latest.js'
			, 'json2.js'
			, 'http://127.0.0.1:'+port+'/socket.io/socket.io.js' // special case since the socket.io module serves its own js
			, 'jquery.client.js'
		]
		, 'debug': true
		, 'postManipulate': {
			'^': [
				function insertSocketIoPort(file, path, index, isLast, callback) {
					callback(file.replace(/'#socketIoPort#'/, port));
					if (argv.s === undefined) {
						// Open the browser window then the js is generated.
						exec('open '+host, function() {});
					}
				}
			]
		}
	}
	, 'js-inject': {
		'route': /\/static(\/[a-z0-9]+)?\/injected.js/
		, 'path': __dirname+'/public/js/'
		, 'dataType': 'javascript'
		, 'files': [
			'json2.js'
			, 'injected.js'
		]
	}
	, 'css': {
		'route': /\/static\/css\/[a-z0-9]+\/.*\.css/
		, 'path': __dirname+'/public/css/'
		, 'dataType': 'css'
		, 'files': [
			'reset.css'
			, 'client.css'
		]
		, 'postManipulate': {
			'^': [
				assetHandler.replaceImageRefToBase64(__dirname+'/public')
			]
		}
	}
});

// Settings
app.configure(function() {
	app.set('view engine', 'ejs');
	app.set('views', __dirname+'/views');
});

// Middleware
app.configure(function() {
	app.use(assetsMiddleware);
	app.use(express['static'](__dirname+'/public', {maxAge: 86400000}));
});

// Error handling
app.use(express.errorHandler({
	'dumpExceptions': true
	, 'showStack': true
}));

// Template helpers
app.dynamicHelpers({
	'assetsCacheHashes': function(req, res) {
		return assetsMiddleware.cacheHashes;
	}
});

// Routing
app.all('*', function(req, res) {
	res.render('index');
});