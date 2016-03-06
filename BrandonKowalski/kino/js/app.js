var buildQueue = [];

var loadSavedKino = function() {
    var loc = location.href;
    var qs = loc.split('?')[1];
    var qsp = decodeURIComponent(qs).split('&');
    var title = qsp[0].split('=')[1];
    var author = qsp[1].split('=')[1];
    var vidSnip = qsp[2].split('=');
    var videos = vidSnip[1].split(';');
    if (videos.length > 0) {
        playKino(videos);
        $('#meta').val(title + ' by ' + author);
        $('.kino-video-deck').show();
    }
}

var playKino = function(videos) {
    var i = 0;
    console.log(JSON.stringify(videos));
    $('#kino-video').bind('ended', function() {
        //'this' is the DOM video element
        this.src = videos[i++ % videos.length];
        this.load();
        this.play();
    });
}

var showBuilder = function() {
    $('.builder-wrapper').show();
    $('#make-button').hide();
}

var addToQueue = function() {
    var vineURL = $('#vine').val();
    var yql = 'http://query.yahooapis.com/v1/public/yql?q=select * from html where url="' + vineURL + '" and xpath=\'/html/head/meta\'&format=json';
    $.ajax({
    type: 'GET',
    url: yql,
    dataType: 'jsonp',
    success: function(data){
      buildQueue.push(data.query.results.meta[9].content.split('?')[0]);
      alert('video added!');
      $('#vine').val('');
    },
    error: function(xhr, type){
      alert('unable to load video.')
    }
  });
}

var build = function() {
    var title  = $('#title').val();
    var author = $('#author').val();
    var videos = '';

    for (var i = 0; i < buildQueue.length; i++) {
        videos = videos + buildQueue[i] + ';';
    }

    videos = videos.substring(0, videos.length - 1);

    var url = 'http://brandonkowalski.com/kino?title=' + title + '&author=' + author + '&kino=' + videos;
    $('#kinoURL').val(url);
    $('#build-button').hide();
    $('.kino-url-wrapper').show();
}

$(document).ready(function() {
    loadSavedKino();
});

