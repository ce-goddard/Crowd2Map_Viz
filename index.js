var mobile = document.documentElement.clientWidth <= 700;

mapboxgl.accessToken = 'pk.eyJ1IjoibG9iZW5pY2hvdSIsImEiOiJjajdrb2czcDQwcHR5MnFycmhuZmo4eWwyIn0.nUf9dWGNVRnMApuhQ44VSw';
window.map = new mapboxgl.Map({
  container: "map", // container id
  style: "mapbox://styles/lobenichou/cjk09rxji5jjm2tr1f6jg94u6?fresh=true", //stylesheet location
  center: [32.43975,-6.58698], // starting position 
  maxBounds: [[19.416599, -11.874457], [46.95735, -0.82930]], 
  maxZoom: 14,
  minZoom: 4
});

var sidebar = document.getElementById('sidebar');
if (!mobile) {
  window.map.addControl(new mapboxgl.NavigationControl());
  sidebar.className += " pin-bottomleft";
} else {
  window.map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
}

var playControl = document.getElementById('play-control');
var range = document.getElementById('range');
var time = document.getElementById('time');
var buildings = document.getElementById('buildings');

var startDate = new Date(2015, 10, 1);
var playback = false;

var dayStats = {};

var styleByWeek = throttle(function (week) {
  var layers = ['tanzania-building-point', 'tanzania-building-shape'];
  var filter = ["<=", "@day", week * 7];

  if (map.loaded()) {
    layers.forEach(function(layer) {
      map.setFilter(layer, filter);
    });
  }
}, 400);

var updateCounts = throttle(function(total, date) {
  buildings.innerHTML = total.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  time.innerHTML = date.format('MMM D, YYYY');
}, 150);

function play(v) {
  range.value = v;
  var date = moment(startDate).add(v, 'weeks');

  var sum = 0;
  for(var d = 0; d <= (v * 7); d++) {
    sum += dayStats[d] || 0;
  }
  updateCounts(sum, date);
  styleByWeek(v);

  // If range hit's the end show play button again
  if (parseInt(range.value) >= parseInt(range.max)) {
    clearPlayback();
  }
}

loadBuildingStats(function(stats) {
  dayStats = stats;
  console.log(stats);
  map.on('load', function() {
    map.resize()
    // TODO: The query string parsing could be done nicer
    var minWeek = isNaN(parseInt(getQueryVariable('minday'))) ? 0 : parseInt(getQueryVariable('minday'));
    var week = isNaN(parseInt(getQueryVariable('day'))) ? 0 : parseInt(getQueryVariable('day'));
    var speed = parseInt(getQueryVariable('speed')) || 200;

    range.min = minWeek;

    styleByWeek(week);
    playControl.addEventListener('click', setPlay);
    setTimeout(function() {
      range.value = week;
      setPlay(speed);
    }, 500);
  });
});

map.on('zoomend', function() {
  var zoom = map.getZoom();
  if(zoom <= 5) {
    setSpeed(50);
  }
});

// Add events.
range.addEventListener('input', function() {
  if (playback) clearPlayback();
  play(parseInt(range.value, 10));
});

function loadBuildingStats(callback) {
  var xmlhttp;
  xmlhttp = new XMLHttpRequest();
  xmlhttp.onreadystatechange = function(){
    if (xmlhttp.readyState == 4 && xmlhttp.status == 200){
      callback(JSON.parse(xmlhttp.responseText));
    }
  }
  xmlhttp.open("GET", "./scripts/tanzania_buildings_by_day.json", true);
  xmlhttp.send();
}

function clearPlayback() {
  window.clearInterval(playback);
  playControl.classList.remove('pause');
  playControl.classList.add('play');
  playback = false;
}

function setSpeed(speed) {
  console.log('Set speed', speed);
  clearPlayback();
  playback = window.setInterval(function() {
    var value = parseInt(range.value, 10);
    play(value + 1);
  }, speed);
}

function setPlay(speed) {
  if (parseInt(range.value) >= parseInt(range.max)) {
    range.value = parseInt(range.min);
  }

  speed = parseInt(speed) || 200;
  if (playback) return clearPlayback();
  playControl.classList.remove('play');
  playControl.classList.add('pause');

  playback = window.setInterval(function() {
    var value = parseInt(range.value, 10);
    play(value + 1);
  }, speed);
}

function throttle(fn, threshhold, scope) {
  threshhold || (threshhold = 250);
  var last,
      deferTimer;
  return function () {
    var context = scope || this;

    var now = Date.now(),
        args = arguments;
    if (last && now < last + threshhold) {
      // hold on to it
      clearTimeout(deferTimer);
      deferTimer = setTimeout(function () {
        last = now;
        fn.apply(context, args);
      }, threshhold);
    } else {
      last = now;
      fn.apply(context, args);
    }
  };
}

function flyHandler(id, options) {
  var button = document.getElementById(id);
  if(!button) return;
  button.addEventListener('click', function() {
    map.flyTo({
      center: options.center,
      zoom: options.zoom || 5
    });
    if (options.startDay) {
      console.log('Play from day', options.startDay);
      play(options.startDay);
    }
    if (options.speed) {
      setSpeed(options.speed);
    }
  });
}

function getQueryVariable(variable) {
    var query = window.location.search.substring(1);
    var vars = query.split('&');
    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split('=');
        if (decodeURIComponent(pair[0]) == variable) {
            return decodeURIComponent(pair[1]);
        }
    }
    console.log('Query variable %s not found', variable);
}
