// In case we leave a console.*** in the code without native support
(function(b){function c(){}for(var d="assert,count,debug,dir,dirxml,error,exception,group,groupCollapsed,groupEnd,info, log,markTimeline,profile,profileEnd,time,timeEnd,trace,warn".split(","),a;a=d.pop();)b[a]=b[a]||c;})(window.console=window.console||{});

(function ($) {
	// Fallback for old browsers...
	if (!window.localStorage) {
		window.localStorage = {};
	}
	
	var $$ = (function() {
		var cache = {};
		return function(selector) {
			if (!cache[selector]) {
				cache[selector] = $(selector);
			}
			return cache[selector];
		};
	})();

	var socketIoClient = io.connect(null, {
		'port': '#socketIoPort#'
		, 'rememberTransport': true
		, 'transports': [
			'websocket'
			, 'xhr-multipart'
			, 'xhr-polling'
		]
	});

	socketIoClient.on('connect', function () {
		$$('.status.socket').addClass('on').removeClass('off');
		$$('#url').trigger('change-url');
	});

	socketIoClient.on('error', function(msg) {
		if (typeof msg === 'string') {
			message(msg, 'error');
		} else {
			message('Websocket disconnected', 'error');
		}
	});

	socketIoClient.on('reload', function(path) {
		if (path.match(/.css$/)) {
			postToIframe({
				'type': 'css'
				, 'path': path
			});
		} else {
			postToIframe({
				'type': 'content'
				, 'path': path
			});
		}
		$$('.path span').text(path+', ');
		$$('.path .time-since-change').text('0 sec ago').data('time', new Date().getTime());
		resetTimeCounter();
	});

	function getIframeUrl() {
		return $$('iframe').get(0).contentWindow.location;
	}

	var titleStatus = (function() {
		var activeTitle;
		var activeTitleSymbols = [
			'.'
			, '!'
		];
		var activeTitleIndex = 0;
		var methods = {
			start: function() {
				methods.stop();
				activeTitleIndex = 0;
				activeTitle = setInterval(function() {
					var title = document.title;
					if (!title.match(/^\[/)) {
						title = '['+activeTitleSymbols[activeTitleIndex%activeTitleSymbols.length]+'] '+title;
					} else {
						title = title.replace(/\[.\]/, '['+activeTitleSymbols[activeTitleIndex%activeTitleSymbols.length]+']');
					}
					activeTitleIndex += 1;
					document.title = title;
				}, 500);
			}
			, stop: function() {
				if (activeTitle) {
					clearInterval(activeTitle);
					activeTitle = null;
					document.title = document.title.replace(/\[.\] /, '');
				}
			}
			, isActive: function() {
				return !!activeTitle;
			}
		};
		return methods;
	})();

	var resetTimeCounter = (function() {
		var timeout;
		return function() {
			if (timeout) {
				clearTimeout(timeout);
			}
			(function update() {
				var time = $$('.path .time-since-change').data('time');
				if (time) {
					var sec = Math.round((new Date().getTime()-time)/1000);
					if (sec < 10) {
						$$('.history').addClass('new');
						if (!titleStatus.isActive()) {
							titleStatus.start();
						}
					} else {
						$$('.history').removeClass('new');
						if (titleStatus.isActive()) {
							titleStatus.stop();
						}
					}
					$$('.path strong').text(sec+' sec ago');
				}
				timeout = setTimeout(update, 1000);
			})();
		};
	})();
	resetTimeCounter();

	socketIoClient.on('watch-path', function(path) {
		$$('#reload').val(path).trigger('change-path');
	});

	socketIoClient.on('watching', function(isWatching) {
		if (isWatching) {
			message('Now watching: '+isWatching, 'message');
			$$('.status.watching').addClass('on').removeClass('off');
		} else {
			message('Stopped watching', 'message');
			$$('.status.watching').removeClass('on').addClass('off');
		}
	});

	socketIoClient.on('disconnect', function() {
		$$('.status.socket').removeClass('on').addClass('off');
		$$('.status.watching').removeClass('on').addClass('off');
	});
	
	$(window).resize(function() {
		$$('iframe').height($(window).height()-36);
	}).resize();

	$$('#url').bind('change-url', function(event) {
		var url = $.trim($(this).val());
		$$('iframe').attr('src', url);
		localStorage['url'] = url;
		socketIoClient.emit('openUrl', url);
		if (titleStatus.isActive()) {
			titleStatus.stop();
		}
		document.title = url.replace(/http:\/\//,'');
	}).keyup(function(event) {
		var val = $(this).val();
		if (val.length > 4 && val.substr(0,4) !== 'http') {
			$(this).val('http://'+val);
		}
		if (event.which === 13) {
			$(this).trigger('change-url');
			event.preventDefault();
		}
	});

	$$('#url').val(localStorage['url'] || '');
	$$('#reload').val(localStorage['path'] || '');

	$$('#reload').bind('change-path', function(event) {
		var path = $(this).val();
		localStorage['path'] = path;
		socketIoClient.emit('watch', path);
	}).keyup(function(event) {
		if (event.which === 13) {
			$(this).trigger('change-path');
			event.preventDefault();
		}
	});

	$$('.stop').click(function(event) {
		socketIoClient.emit('stop', true);
	});

	function message(msg, type) {
		var $message = $('<div>').addClass(type).text(msg).appendTo('#messages').height(0).animate({
			'height': '36px'
		}, 300, function() {
			setTimeout(function() {
				$message.animate({
					'height': 0
				}, 300, function() { $(this).remove(); });
			}, 2000);
		});
	}
	
	var fallbackTimeout;
	function postToIframe(data) {
		window.frames[0].postMessage(JSON.stringify(data), '*');
		if (fallbackTimeout) {
			clearTimeout(fallbackTimeout);
		}
		// If we don't get an acknowledgement back (ie the script isn't included) we reload the iframe.
		fallbackTimeout = setTimeout(function() {
			$('iframe').attr('src', $('iframe').attr('src'));
		}, 50);
	}

	var eventMethod = window.addEventListener ? 'addEventListener' : 'attachEvent';
	var attachEvent = window[eventMethod];
	var messageEvent = eventMethod == 'attachEvent' ? 'onmessage' : 'message';
	attachEvent(messageEvent,function(e) {
		var data = JSON.parse(e.data);

		if (data.type === 'ack') {
			clearTimeout(fallbackTimeout);
		} else if (data.type === 'url') {
			$$('#url').val(data.url);
			localStorage['url'] = data.url;
		}
	}, false);
})(jQuery);