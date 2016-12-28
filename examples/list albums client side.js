function getAlbums() {
  var $jsonp = (function(){
    var that = {};

    that.send = function(src, options) {
      var callback_name = options.callbackName || 'callback',
        on_success = options.onSuccess || function(){},
          on_timeout = options.onTimeout || function(){},
            timeout = options.timeout || 10; // sec

      var timeout_trigger = window.setTimeout(function(){
        window[callback_name] = function(){};
        on_timeout();
      }, timeout * 1000);

      window[callback_name] = function(data){
        window.clearTimeout(timeout_trigger);
        on_success(data);
      }

      var script = document.createElement('script');
      script.type = 'text/javascript';
      script.async = true;
      script.src = src;

      document.getElementsByTagName('head')[0].appendChild(script);
    }

    return that;
  })();

  function getFilterUrlParam(name) {
    name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
    var regexS = "[\\?&]"+name+"=([^&#]*)";
    var regex = new RegExp( regexS );
    var results = regex.exec( window.location.href );
    if(results == null)
      return '';
    else
      return results[1];
  }

  if(getFilterUrlParam('filter')) {
     var filter = '&filter=' + getFilterUrlParam('filter');
  } else {
    var filter = '';
  }

  $jsonp.send('https://script.google.com/macros/s/___YOUR_KEY_HERE____/exec?callback=handleStuff' + filter, {
    callbackName: 'handleStuff',
    onSuccess: function(json){
      var data = JSON.parse(json);
      var output = [];

      for(var d = 0; d < data.length; d++){
        var title = data[d][0];
        var link = data[d][1];
        var thumbnailUrl = data[d][2];
        output.push('<li><a href="' + link + '" target="_blank"><div class="image"><img src="' + thumbnailUrl + '"/></div><div class="title">' + title + '</div></a></li>');
      }
      var html = '<ul class="albumList">' + output.join('') + '</ul>';
      document.getElementById('albumList').innerHTML = html;
    },
    onTimeout: function(){
      console.log('Something went wrong.');
    },
    timeout: 5
  });

}
getAlbums();
