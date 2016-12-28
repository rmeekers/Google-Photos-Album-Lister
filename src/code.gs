/** Google Photos Album Lister
 * Manage your Google Analytics account in batch via a Google Sheet
 *
 * @license MIT License
 * @author Rutger Meekers [rutger@meekers.eu]
 *
 * Global Logger, SpreadsheetApp, HtmlService, ContentService, OAuth2
 */

// Define global settings
var settings = {
  oAuth: {
    scope: 'http://picasaweb.google.com/data/',
    clientId: '',
    clientSecret: '',
  },
  googlePhotosFeedUrl: 'https://picasaweb.google.com/data/feed/api/user/default',
  albumsSheetName: 'Albums',
  outputSheetName: 'Cache',
};

/**
 * Retrieve XML feed with all albums of the connected user
 */
function getAlbumXmlFeed() {
  var photosService = getPhotosService();
  if (photosService.hasAccess()) {
    var options = {
      headers: {
        Authorization: 'Bearer ' + photosService.getAccessToken()
      },
    };
    var data = UrlFetchApp.fetch(settings.googlePhotosFeedUrl, options).getContentText();
    return getPhotosAlbums(data);
  } else {
    var authorizationUrl = photosService.getAuthorizationUrl();
    Logger.log('Open the following URL and re-run the script: %s',
               authorizationUrl);
  }
}

/**
 * Process and filter albums which are not 'protected'
 * Write title, url and thumbnailUrl from each album to the configured sheet
 *
 * @param {string} data – Google Photos Album XML feed
 */
function getPhotosAlbums(data){

  var xmlOutput = XmlService.parse(data);

  // Declare XML Namespaces
  var atom = XmlService.getNamespace('http://www.w3.org/2005/Atom');
  var mrss = XmlService.getNamespace('http://search.yahoo.com/mrss/');
  var gphoto = XmlService.getNamespace('http://schemas.google.com/photos/2007');

  var albums = xmlOutput.getRootElement().getChildren('entry', atom);

  var data = [];

  for(var i = 0; i < albums.length; i++){

    var albumRights = albums[i].getChild('rights', atom).getValue();

    // Filter out albums which are not 'protected'
    if(albumRights != 'protected') {

      var title = albums[i].getChild('title', atom).getValue();
      var thumbnailUrl = albums[i].getChild('group', mrss).getChild('content', mrss).getAttribute('url').getValue();

      var links = albums[i].getChildren('link', atom);

      for(var l = 0; l < links.length; l++){

        var linkRel = links[l].getAttribute('rel').getValue();

        if(linkRel == 'alternate'){
          var link = links[l].getAttribute('href').getValue();
        }
      }

      data.push([title, link, thumbnailUrl]);

    }
  }

  // Write albums to sheet
  var albumsSheet = getSheet(settings.albumsSheetName);
  albumsSheet.clear();
  // Verify the required number of columns
  if(albumsSheet.getMaxColumns() < 3) {
    albumsSheet.insertColumns(1, 3 - albumsSheet.getMaxColumns());
  }
  // Verify the required number of rows
  if(albumsSheet.getMaxRows() < data.length) {
    albumsSheet.insertRows(1, data.length - albumsSheet.getMaxRows());
  }
  albumsSheet.getRange(1, 1, data.length, 3).setValues(data);

}

/**
 * Generate album list
 *
 * @param {string} filter – to filter the album list
 * @return {string} JSON object that contains all requested albums
 */
function generateAlbumList(filter) {
  var albumsSheet = getSheet(settings.albumsSheetName);
  var data = albumsSheet.getRange(1,1,albumsSheet.getLastRow(),albumsSheet.getLastColumn()).getValues();
  var results = [];

  for(var d = 0; d < data.length; d++){
    var title = data[d][0];
    var link = data[d][1];
    var thumbnailUrl = data[d][2];
    if(typeof filter == 'undefined') {
      results.push([title,link,thumbnailUrl]);
    } else if(title.indexOf(filter) >= 0) {
      results.push([title,link,thumbnailUrl]);
    }
  }
  return results;
}

/**
 * Handles the GET requests to the published web app
 *
 * @param {string} request – to filter the album list
 * @return {string} JSON-P object that contains all requested albums
 */
function doGet(request) {
  var data = JSON.stringify(generateAlbumList(request.parameters.filter));

  return ContentService.createTextOutput(
    request.parameters.callback + '(' + JSON.stringify(data) + ')')
  .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

/**
 * Helper Functions
 */

/**
 getSheet()
 */
function getSheet(name) {
  var sheet;
  try {
    sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
    if(!sheet) {
      SpreadsheetApp.getActiveSpreadsheet().insertSheet().setName(name);
      sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
    }
  } catch(e) {
    Logger.log('Failed to create sheet');
  }
  return sheet;
}

/**
 * OAth2 Helper Functions
 */

/**
 * Create OAuth2 service for Google Photos
 */
function getPhotosService() {
  // Create a new service with the given name. The name will be used when
  // persisting the authorized token, so ensure it is unique within the
  // scope of the property store.
  return OAuth2.createService('googlePhotos')

      // Set the endpoint URLs, which are the same for all Google services.
      .setAuthorizationBaseUrl('https://accounts.google.com/o/oauth2/auth')
      .setTokenUrl('https://accounts.google.com/o/oauth2/token')

      // Set the client ID and secret, from the Google Developers Console.
      .setClientId(settings.oAuth.clientId)
      .setClientSecret(settings.oAuth.clientSecret)

      // Set the name of the callback function in the script referenced
      // above that should be invoked to complete the OAuth flow.
      .setCallbackFunction('authCallback')

      // Set the property store where authorized tokens should be persisted.
      .setPropertyStore(PropertiesService.getUserProperties())

      // Set the scopes to request (space-separated for Google services).
      .setScope(settings.oAuthScope)

      // Below are Google-specific OAuth2 parameters.

      // Sets the login hint, which will prevent the account chooser screen
      // from being shown to users logged in with multiple accounts.
      .setParam('login_hint', Session.getActiveUser().getEmail())

      // Requests offline access.
      .setParam('access_type', 'offline')

      // Forces the approval prompt every time. This is useful for testing,
      // but not desirable in a production application.
      .setParam('approval_prompt', 'force');
}

/**
 * Direct the user to the OAuth2 authorization URL
 */
function showSidebar() {
  var photosService = getPhotosService();
  if (!photosService.hasAccess()) {
    var authorizationUrl = photosService.getAuthorizationUrl();
    var template = HtmlService.createTemplate(
        '<a href="<?= authorizationUrl ?>" target="_blank">Authorize</a>. ' +
        'Reopen the sidebar when the authorization is complete.');
    template.authorizationUrl = authorizationUrl;
    var page = template.evaluate();
    DocumentApp.getUi().showSidebar(page);
  } else {
    Logger.log('showSidebar: Handle me as some error!')
  }
}

/**
 * Handle the OAuth2 callback
 */
function authCallback(request) {
  var photosService = getPhotosService();
  var isAuthorized = photosService.handleCallback(request);
  if (isAuthorized) {
    return HtmlService.createHtmlOutput('Success! You can close this tab.');
  } else {
    return HtmlService.createHtmlOutput('Denied. You can close this tab');
  }
}

/**
 * Reset the OAuth2 authorization state
 */
function reset() {
  var service = getPhotosService();
  service.reset();
}

/**
 * Logs the redirect URI to register in the Google Developers Console.
 */
function logRedirectUri() {
  var service = getPhotosService();
  Logger.log(service.getRedirectUri());
}
