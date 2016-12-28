# Google-Photos-Album-Lister
This script retrieves all Google Photos (formerly Picasa) albums and writes them to a Google Sheet.
The album list is exposed via an API in JSON-P format so you can list the albums anywhere you want. On a webpage for example.

## Requirements / installation

* Google Sheet with this script attached
* OAuth2 library added to your script (key: `1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF`)
* A `clientId` and `clientSecret` from the Google Developers Console (no need to activate an API) which you need to add to the script config
* Setup a trigger on the function `getAlbumXmlFeed()` to refresh the album list
* Publish the script as a web app
* Make sure to run the `getAlbumXmlFeed()` manually to setup the OAuth2 permissions

See the examples folder for an example implementation. 
