(function() {
	// Only run in iframe.
	if (top === self) {
		return;
	}

	// Cross browser support for listening on events from the parent.
	var eventMethod = window.addEventListener ? 'addEventListener' : 'attachEvent';
	var attachEvent = window[eventMethod];
	var messageEvent = eventMethod == 'attachEvent' ? 'onmessage' : 'message';
	attachEvent(messageEvent,function(e) {
		var data = JSON.parse(e.data);
		if (data.type === 'css') {
			var request = new XMLHttpRequest();
			request.open('GET', window.location.toString(), true);
			request.onreadystatechange = handleRequest(request);
			request.send(null);
		} else if (data.type === 'content') {
			window.location.reload(true);
		}

		// Acknowledge that we recieved the data.
		window.top.postMessage(JSON.stringify({'type': 'ack'}), '*');
	}, false);
	
	function handleRequest(request) {
		function addCacheBuster(currentHref, newHref) {
			// If they don't match at all the site is most likely using a hash to bust caches.
			if (!currentHref.match(new RegExp(newHref))) {
				currentHref = newHref;
			}

			// If the path stays the same we append/update a cache buster GET variable.
			if (currentHref.match(/cachebust/)) {
				return currentHref.replace(/cachebust=[0-9]+/, 'cachebust='+new Date().getTime());
			}
			if (currentHref.indexOf('?') === -1) {
				return currentHref+'?cachebust='+new Date().getTime();
			} else {
				return currentHref+'&cachebust='+new Date().getTime();
			}
		}

		return function() {
			if (request.readyState !== 4 || request.status !== 200) {
				return;
			}

			var newDom = document.createElement('div');
			newDom.innerHTML = request.responseText;

			var currentLinks = document.getElementsByTagName('link');
			var newLinks = newDom.getElementsByTagName('link');

			// If the css link count doesn't match they probably added something, to be safe we refresh.
			if (currentLinks.length !== newLinks.length) {
				window.location.reload(true);
			} else {
				for (var i=0; i < currentLinks.length; i++) {
					currentLinks[i].href = addCacheBuster(currentLinks[i].href, newLinks[i].href);
				}
			}
		};
	}

	// Announce what page we are on to the parent.
	window.top.postMessage(JSON.stringify({'type': 'url', 'url': window.location.toString()}), '*');
})();