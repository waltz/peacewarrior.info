// usage: log('inside coolFunc',this,arguments);
// http://paulirish.com/2009/log-a-lightweight-wrapper-for-consolelog/
window.log = function(){
  log.history = log.history || [];   // store logs to an array for reference
  log.history.push(arguments);
  if(this.console){
    console.log( Array.prototype.slice.call(arguments) );
  }
};

// Grab photos from a set on flickr and pop them onto a google map.
$(document).ready(function(){
  markers = new Array();
  initialize_map();
  fetch_photos();
  render_banner();
  
  $("#title").click(function(){ toggle_info(); });
  $("#more_or_less").click(function(){ toggle_info(); });
});

// Fetch the photos.
function fetch_photos() {
  var api_key     = "cd888866fe74bb00d33dfe88e32bc5eb"; // My api key for the app called peace warrior.
  var user_id     = "76523925@N00"; // For user 'thebigdeadwaltz', ie: me.
  var photoset_id = "72157624778570810"; // The set id for 'Moped Across America"
  
  $.getJSON('http://api.flickr.com/services/rest/?&method=flickr.photosets.getPhotos&api_key=' + api_key + '&photoset_id=' + photoset_id + '&format=json&jsoncallback=?', function(data){
    var processed_photos = [];
    var unprocessed_photos = data.photoset.photo;

    // Process + display each photo.
    $.each(unprocessed_photos, function(i, photo){        
      var params = { title: '', photo_url: '', latitude: '', longitude: '', created_at: 0, description: '', link: '' }
      
      // Grab detailed photo information.
      $.getJSON('http://api.flickr.com/services/rest/?&method=flickr.photos.getInfo&api_key=' + api_key + '&photo_id=' + photo.id + '&format=json&jsoncallback=?', function(data){
        params.title = data.photo.title._content;
	if (data.photo.location) {
        	params.latitude = data.photo.location.latitude;
        	params.longitude = data.photo.location.longitude;
        }
	params.created_at = data.photo.dateuploaded;
        params.description = data.photo.description._content;
        params.flickr_link = data.photo.urls.url[0]._content;
        params.id = data.photo.id;
        
        // Grab photo size urls
        $.getJSON('http://api.flickr.com/services/rest/?&method=flickr.photos.getSizes&api_key=' + api_key + '&photo_id=' + photo.id + '&format=json&jsoncallback=?', function(data){
          params.photo_url = data.sizes.size[3].source;
          processed_photos.push(params);
          
          // If this is the last photo to process, move on with the display.
          if (unprocessed_photos.length == processed_photos.length) {
            post_process(processed_photos);
          }
        });
      });
    });
  });
}

// Setup the map.
function initialize_map() {
  worcester = new google.maps.LatLng(42.2490, -71.7692);
  var map_options = {
    center: worcester,
    zoom: 5,
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    mapTypeControl: false,
    navigationControl: true,
    navigationControlOptions: {
      style: google.maps.NavigationControlStyle.ZOOM_PAN
    }
  }
  
  // Store the map object in a global so we can get at it anyplace.
  map = new google.maps.Map(document.getElementById("map"), map_options);
}

// Sort the photos and display them.
function post_process(photos) {
  // Sort the photos in descending order based on their unix timestamp.
  photos = photos.sort(function(x, y){
    if (parseInt(x.created_at) > parseInt(y.created_at)) {
      return 1;
    }
    else {
      return -1;
    }
    return 0;
  });
  
  // Display each of the photos on the map.
  $.each(photos, function(i, photo){ add_photo(photo); });
  
  check_permalink();
}

// Given photo params display them on a map.
function add_photo(params) {
  var photo_location = new google.maps.LatLng(params.latitude, params.longitude);
  
  if (params.latitude == '' && params.longitude == '') {
    photo_location = worcester;
  }
  
  var marker = new google.maps.Marker({
      position: photo_location, 
      map: map, 
      title: params.title
  });

  // Annotate this marker with it's flickr photo id so we can find it later.
  marker.flickr_id = params.id;
  
  // Pop this marker onto the global stack.
  markers.push(marker);
  
  var content_string = '<div class="photo">';
  
  if (params.title.length > 0) {
    content_string += '<h2>' + params.title + '</h2>';
  }
  
  if (params.description.length > 0) {
    content_string += '<p class="description">' + params.description + '</p>';
  }

  permalink = 'http://peacewarrior.info/hash/' + params.id;
  content_string += '<a target="_blank" title="View this photo on Flickr." href="' + params.flickr_link + '"><img src="' + params.photo_url + '" /></a>';
  content_string += '<p class="bottom_bar">';
  content_string += '<a class="permalink" title="Permalink for this post." href="' + permalink + '">' + permalink + '</a>';
  content_string += '</p>';
  content_string += '</div>';

  var infowindow = new google.maps.InfoWindow({
      content: content_string
  });
  
  marker.infowindow = infowindow;
  
  // Open the infowindow when the marker gets clicked.
  google.maps.event.addListener(marker, 'click', function() {
    infowindow.open(map, marker);
    document.location.hash = params.id;
  });

  // When the user clicks someplace else on the map, close the current infowindow.
  google.maps.event.addListener(map, 'click', function() {
    infowindow.close();
  });
  
  map.panTo(photo_location);
}

// Pluck the banner html from the page and pop it onto the map as a control.
function render_banner() {
  var title_elem = $("#banner");
  title_elem.index = 1;
  map.controls[google.maps.ControlPosition.BOTTOM].push(title_elem.get(0));
}

// See if this page has a valid permalink hash.
function check_permalink() {
  var id = document.location.hash.substr(1);
  if (id == "info") {
    toggle_info();
  }
  else {
    var opened_one = false;
    $.each(markers, function(i, marker){
      if (marker.flickr_id == id) {
        show_marker(marker);
        opened_one = true;
      }
    });
    
    if (!opened_one) {
      show_marker(markers[markers.length - 1]);
    }
  }
}

function toggle_info() {
  $("#info").slideToggle("fast");

  if ($("#info").is(':hidden')){
    $("#more_or_less").text("tell me more");
  }
  else {
    $("#more_or_less").text("be quiet");
  }
}

function show_marker(marker) {
  var location = new google.maps.LatLng(marker.position.b, marker.position.c);
  marker.infowindow.open(map, marker);
  map.panTo(location);
}
