# hotcode

![hotcode screenshot](http://mape.me/hotcode.png)

__Since it is a totally separate tool you don't have to integrate it into your project's backend and it works with any language.__

## What does hotcode do?

hotcode is a local development tool that allows you to watch for file changes on a local file path and reloads your web project as a result of a change.

This means you don't have to hit refresh every time you make a change and if the change is a css file it allows you to refresh the CSS without loosing state on the current page.

## Install
`npm install hotcode`

## How to use
* Run `hotcode` in terminal
* Insert the "injected.js" script into your project as a script tag or through a http proxy. ___(semi optional)___
* A browser window should now open up (it runs `open http://host:port`)
* Insert url (`http://projectname.mydomain.com`) in "Url" input, press return. 
* Insert path (`/var/www/projectname/`) in "Watch path" input, press return.
* Start making changes to files in the path and see how hotcode reloads the view.
* Be more productive.

## "Required script"

To get extra features like updating the url while browsing the site and in page CSS refresh you must include the "injected.js" script in your page. This can be done using a script tag or through a http proxy like [Glimmerblocker](http://glimmerblocker.org/).

If the script isn't included cross origin policies negate the ability do these things.

But hotcode will fallback to a "dumb" reload of the iframe on file change when the script isn't present.

## Args

    hotcode -p 8000 -u vhost.local -s

* -p [int] , port, `8080`
* -h [str] , host, `vhost.local`
* -s, silent, doesn't open a browser window on start

# Helper file (predefined paths for urls)

You can add a helper file to hotcode so that you don't have to enter the watch path every time you enter an url.

At `~/.hotcode` you can insert:

    module.exports = [
    	{
    		'regex': /http:\/\/(.+?).mydomain.com/
    		, 'watches': function(regexMatches, callback) {
    			callback(null, '/var/www/'+regexMatches[1]);
    		}
    	}
    ];

This makes it so that hotcode will insert the path `/var/www/subdomain` automatically when you insert an url matching the regex supplied.

### Ordinary script tag
    <script src="http://yourhost:8080/static/injected.js" type="text/javascript"></script>

### [Glimmerblocker](http://glimmerblocker.org/)
* Open Glimmerblocker pref pane.
* New rule.
* Action: Whitelist URL, optinally modifying content.
* Enter a match for the host.
* Paste the following code (modified) in the javascript tabs input area:

&nbsp;

    var hcH = document.getElementsByTagName('HEAD').item(0);
    var hcS= document.createElement("script");
    hcS.type = "text/javascript";
    hcS.src="http://yourhost:8080/static/injected.js";
    hcH.appendChild(hcS);

## Thanks
* [http://p.yusukekamiyamane.com/](http://p.yusukekamiyamane.com/) for the flame graphic used in the favicon.