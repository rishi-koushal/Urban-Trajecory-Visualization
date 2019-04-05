//Init Map
//*******************************************************************************************************************************************************
var lat = 41.141376;
var lng = -8.613999;
var zoom = 14;

// add an OpenStreetMap tile layer
var mbAttr = 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
	'<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
	'Imagery © <a href="http://mapbox.com">Mapbox</a>',
	mbUrl = 'https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoicGxhbmVtYWQiLCJhIjoiemdYSVVLRSJ9.g3lbg_eN0kztmsfIPxa9MQ';


var grayscale = L.tileLayer(mbUrl, {
	id: 'mapbox.light',
	attribution: mbAttr
}),
	streets = L.tileLayer(mbUrl, {
		id: 'mapbox.streets',
		attribution: mbAttr
	});


var map = L.map('map', {
	center: [lat, lng], // Porto
	zoom: zoom,
	layers: [streets],
	zoomControl: true,
	fullscreenControl: true,
	fullscreenControlOptions: { // optional
		title: "Show me the fullscreen !",
		titleCancel: "Exit fullscreen mode",
		position: 'bottomright'
	}
});

var baseLayers = {
	"Grayscale": grayscale, // Grayscale tile layer
	"Streets": streets, // Streets tile layer
};

layerControl = L.control.layers(baseLayers, null, {
	position: 'bottomleft'
}).addTo(map);

// Initialise the FeatureGroup to store editable layers
var drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

var featureGroup = L.featureGroup();

var drawControl = new L.Control.Draw({
	position: 'bottomright',
	collapsed: false,
	draw: {
		// Available Shapes in Draw box. To disable anyone of them just convert true to false
		polyline: false,
		polygon: false,
		circle: false,
		rectangle: true,
		marker: false,
	}

});
map.addControl(drawControl); // To add anything to map, add it to "drawControl"

var dateFormat = d3.time.format("%Y-%m-%d %H:%M:%S");

//*******************************************************************************************************************************************************
//*****************************************************************************************************************************************
// Index Road Network by Using R-Tree
//*****************************************************************************************************************************************
var rt = cw(function (data, cb) {
	var self = this;
	var request, _resp;
	importScripts("js/rtree.js");
	if (!self.rt) {
		self.rt = RTree();
		request = new XMLHttpRequest();
		request.open("GET", data);
		request.onreadystatechange = function () {
			if (request.readyState === 4 && request.status === 200) {
				_resp = JSON.parse(request.responseText);
				self.rt.geoJSON(_resp);
				cb(true);
			}
		};
		request.send();
	} else {
		return self.rt.bbox(data);
	}
});

rt.data(cw.makeUrl("js/trips.json"));


//*****************************************************************************************************************************************	
//*****************************************************************************************************************************************
// Drawing Shapes (polyline, polygon, circle, rectangle, marker) Event:
// Select from draw box and start drawing on map.
//*****************************************************************************************************************************************	
map.on('draw:created', function (e) {

	var type = e.layerType,
		layer = e.layer;

	if (type === 'rectangle') {
		var bounds = layer.getBounds();
		rt.data([[bounds.getSouthWest().lng, bounds.getSouthWest().lat], [bounds.getNorthEast().lng, bounds.getNorthEast().lat]]).
			then(function (d) {
				var result = d.map(function (a) {
					return a.properties;
				});
				console.log(result);		// Trip Info: avspeed, distance, duration, endtime, maxspeed, minspeed, starttime, streetnames, taxiid, tripid
				FormatData(result);
				DrawRS(result);
				DrawScatterMatrix(result);
				DrawWordCloud(result);
				DrawChord(result);
			});
	}
	drawnItems.addLayer(layer);			//Add your Selection to Map  
});


//*****************************************************************************************************************************************
// DrawRS Function:
// Input is a list of road segments ID and their color. Then the visualization can show the corresponding road segments with the color
// Test:      var input_data = [{road:53, color:"#f00"}, {road:248, color:"#0f0"}, {road:1281, color:"#00f"}];
//            DrawRS(input_data);
//*****************************************************************************************************************************************
function DrawRS(trips) {
	clearMap();
	for (var j = 0; j < trips.length; j++) {  // Check Number of Segments and go through all segments
		var TPT = new Array();
		TPT = TArr[trips[j].tripid].split(',');  		 // Find each segment in TArr Dictionary. 
		var polyline = new L.Polyline([]).addTo(drawnItems);
		polyline.setStyle({
			color: "red",                      // polyline color
			weight: 1,                         // polyline weight
			opacity: 0.5,                      // polyline opacity
			smoothFactor: 1.0
		});
		for (var y = 0; y < TPT.length - 1; y = y + 2) {    // Parse latlng for each segment
			polyline.addLatLng([parseFloat(TPT[y + 1]), parseFloat(TPT[y])]);
		}

		//Add circle to every starting point.
		L.circle([parseFloat(TPT[1]), parseFloat(TPT[0])],
			10,
			{
				color: "yello",
				opacity: 1,
				fillColor: "yellow",
				fillOpacity: .4
			})
			.addTo(drawnItems);
	}

}
function DrawRS_selected(trips) {
	clearMap();
	for (var j = 0; j < trips.length; j++) {  // Check Number of Segments and go through all segments
		var TPT = new Array();
		TPT = TArr[trips[j].tripid].split(',');  		 // Find each segment in TArr Dictionary. 
		var polyline = new L.Polyline([]).addTo(drawnItems);
		polyline.setStyle({
			color: "red",                      // polyline color
			weight: 5,                         // polyline weight
			opacity: 0.3,                      // polyline opacity
			smoothFactor: 1.0
		});
		for (var y = 0; y < TPT.length - 1; y = y + 2) {    // Parse latlng for each segment
			polyline.addLatLng([parseFloat(TPT[y + 1]), parseFloat(TPT[y])]);
		}

		//Add circle to every starting point.
		L.circle([parseFloat(TPT[1]), parseFloat(TPT[0])],
			30,
			{
				color: "black", 
				fillColor: "black",
			})
			.addTo(drawnItems);
	}

}


//function to use proper format
function FormatData(trips) {
	var hours, minutes;
	trips.forEach(function (d) {
		d["avspeed"] = +d3.format(".2f")(d["avspeed"]);
		d["distance"] = +d3.format(".2f")(d["distance"] * 0.00062137);
		d["duration"] = +d3.format(".2f")(d["duration"] / 60);
		d["endtime"] = dateFormat.parse(d["endtime"]);
		d["starttime"] = dateFormat.parse(d["starttime"]);
		d["starttime"].setSeconds(0);
		if (d.starttime.getMinutes() <= 30) {
			d["timeslot"] = (("0" + d.starttime.getHours()).slice(-2) + ":" + "00" + "-" + d.starttime.getHours() + ":" + "30");
		}
		else {
			d["timeslot"] = (("0" + d.starttime.getHours()).slice(-2) + ":" + "30" + "-" + (d.starttime.getHours() + 1) + ":" + "00");
		}
	});
}
//function to clear the map after every new selection by the user
function clearMap() {
	for (i in map._layers) {
		if (map._layers[i]._heat != undefined || map._layers[i]._path != undefined) {
			try {
				map.removeLayer(map._layers[i]);
			} catch (e) {
				console.log("problem with " + e + map._layers[i]);
			}
		}
	}
}

// Draw scatter plot with average speed, distance and duration of the number of taxis selected within the region by the user.
function DrawScatterMatrix(trips) {
	var svgWidth = 150;
	var svgHeight = 150;
	var padding = 20;
	var x = d3.scale.linear()
		.range([padding / 2, svgWidth - padding / 2]);

	var y = d3.scale.linear()
		.range([svgHeight - padding / 2, padding / 2]);
	var xAxis = d3.svg.axis()
		.scale(x)
		.orient("bottom")
		.ticks(6);
	var yAxis = d3.svg.axis()
		.scale(y)
		.orient("left")
		.ticks(6);
	var domainByTrait = {};
	var traits = d3.keys(trips[0]).filter(function (d) {
		return (d !== "endtime" && d !== "maxspeed" && d !== "minspeed" && d !== "starttime" && d !== "streetnames" && d !== "taxiid" && d !== "tripid" && d !== "timeslot");
	});
	var n = traits.length;

	traits.forEach(function (trait) {
		domainByTrait[trait] = d3.extent(trips, function (d) {
			return d[trait];
		});
	});
	xAxis.tickSize(svgWidth * n);
	yAxis.tickSize(-svgHeight * n);
	d3.select("#scatterplot > *").remove();
	d3.select("#scatterplot").selectAll("div.tooltip").remove();
	var svg = d3.select("#scatterplot")
		.append("svg")
		.attr("width", svgWidth * n + padding)
		.attr("height", svgHeight * n + padding)
		.append("g")
		.attr("transform", "translate(" + padding + "," + padding / 2 + ")");

	svg.selectAll(".x.axis")
		.data(traits)
		.enter().append("g")
		.attr("class", "x axis")
		.attr("transform", function (d, i) {
			return "translate(" + (n - i - 1) * svgWidth + ",0)";
		})
		.each(function (d) {
			x.domain(domainByTrait[d]);
			d3.select(this).call(xAxis);
		});
	svg.selectAll(".y.axis")
		.data(traits)
		.enter().append("g")
		.attr("class", "y axis")
		.attr("transform", function (d, i) {
			return "translate(0," + i * svgHeight + ")";
		})
		.each(function (d) {
			y.domain(domainByTrait[d]);
			d3.select(this).call(yAxis);
		});
	var cell = svg.selectAll(".cell")
		.data(cross(traits, traits))
		.enter().append("g")
		.attr("class", "cell")
		.attr("transform", function (d) {
			return "translate(" + (n - d.i - 1) * svgWidth + "," + d.j * svgHeight + ")";
		})
		.each(plot);
	var tooltip = d3.select("#scatterplot")
		.append("div")
		.attr("class", "tooltip")
		.style("opacity", 0);
	cell.filter(function (d) {
		return d.i === d.j;
	})
		.append("text")
		.attr("x", padding)
		.attr("y", padding)
		.attr("dy", ".71em")
		.text(function (d) {
			return d.x;
		});
	function plot(p) {
		var cell = d3.select(this);
		x.domain(domainByTrait[p.x]);
		y.domain(domainByTrait[p.y]);
		cell.append("rect")
			.attr("class", "frame")
			.attr("x", padding / 2)
			.attr("y", padding / 2)
			.attr("width", svgWidth - padding)
			.attr("height", svgHeight - padding);
		cell.selectAll("circle")
			.data(trips)
			.enter().append("circle")
			.attr("cx", function (d) {
				return x(d[p.x]);
			})
			.attr("cy", function (d) {
				return y(d[p.y]);
			})
			.attr("r", 4)
			.style("fill", "#9C171F")
			.on("mouseover", function (d) {
				d3.select('.tooltip')
				tooltip.html("Trip Id: " + d.tripid + "<br/> "
					+ "Average Speed: " + d.avspeed + "<br/> "
					+ "Distance: " + d.distance + "<br/>"
					+ "Duration: " + d.duration
				)
					.style("left", (d3.mouse(d3.select("#scatterplot").node())[0] + 20) + "px")
					.style("top", (d3.mouse(d3.select("#scatterplot").node())[1] - 18) + "px")
					.transition()
					.duration(200) 
					.style("opacity", .7);
				var circle = d3.select(this);
				circle.transition()
					.duration(800)
					.style("opacity", 1)
					.attr("r", 8)
					.ease("elastic");
			})
			.on("click", function (d) {
				new_arr = []
				for (var i = 0; i < trips.length; i++) {
					if (trips[i].tripid == d.tripid) {
						new_arr.push(trips[i]);
					}
				}
				DrawRS_selected(new_arr)
				DrawWordCloud(new_arr)
				DrawChord(new_arr);
			})
			.on("mouseout", function (d) {
				tooltip.transition()
					.duration(300) 
					.style("opacity", 0);
				var circle = d3.select(this);
				circle.transition()
					.duration(800)
					.style("opacity", .7)
					.attr("r", 4)
					.ease("elastic");

			});
	}

	function cross(a, b) {
		var c = [], n = a.length, m = b.length, i, j;
		for (i = -1; ++i < n;) for (j = -1; ++j < m;) c.push({ x: a[i], i: i, y: b[j], j: j });
		return c;
	}
}

// Draw the wordcloud based on streenames and it's frequency count
function DrawWordCloud(trips){
	var streetnames = []
	for (var i = 0; i < trips.length; i++) {
		for (var j = 0; j < trips[i].streetnames.length; j++) {
			streetnames.push(trips[i].streetnames[j]);
		}
	}
	var words = sortByFrequency(streetnames)
			.map(function(d,i) {
				return {text: d, size: -i};
			});
	var fontName = "Impact",
		cWidth = 500,
		cHeight = 300,
		svg,
		wCloud,
		bbox,
		ctm,
		bScale,
		bWidth,
		bHeight,
		bMidX,
		bMidY,
		bDeltaX,
		bDeltaY;
	var cTemp = document.createElement('canvas'),
		ctx = cTemp.getContext('2d');
		ctx.font = "100px " + fontName;
	var fRatio = Math.min(cWidth, cHeight) / ctx.measureText(words[0].text).width,
		fontScale = d3.scale.linear()
			.domain([
				d3.min(words, function(d) { return d.size; }), 
				d3.max(words, function(d) { return d.size; })
			])
			.range([20,100*fRatio/2]), 
		fill = d3.scale.category20();
		d3.select(".cloud > *").remove();
	d3.layout.cloud()
		.size([cWidth, cHeight])
		.words(words)
		.rotate(function() { return ~~(Math.random() * 2) * 90; })
		.font(fontName)
		.fontSize(function(d) { return fontScale(d.size) })
		.on("end", draw)
		.start();
	function draw(words, bounds) {
		bWidth = bounds[1].x - bounds[0].x;
		bHeight = bounds[1].y - bounds[0].y;
		bMidX = bounds[0].x + bWidth/2;
		bMidY = bounds[0].y + bHeight/2;
		bDeltaX = cWidth/2 - bounds[0].x + bWidth/2;
		bDeltaY = cHeight/2 - bounds[0].y + bHeight/2;
		bScale = bounds ? Math.min( cWidth / bWidth, cHeight / bHeight) : 1;
		console.log(
			"bounds (" + bounds[0].x + 
			", " + bounds[0].y + 
			", " + bounds[1].x + 
			", " + bounds[1].y + 
			"), width " + bWidth +
			", height " + bHeight +
			", mid (" + bMidX +
			", " + bMidY +
			"), delta (" + bDeltaX +
			", " + bDeltaY +
			"), scale " + bScale
		);
		svg = d3.select(".cloud").append("svg")
			.attr("width", cWidth)
			.attr("height", cHeight);
		wCloud = svg.append("g")
			.attr("transform", "translate(" + [bWidth>>1, bHeight>>1] + ") scale(" + bScale + ")") 
			.selectAll("text")
			.data(words)
			.enter().append("text")
			.style("font-size", function(d) { return d.size + "px"; })
			.style("font-family", fontName)
			.style("fill", function(d, i) { return fill(i); })
			.attr("text-anchor", "middle")
			.transition()
			.duration(500)
			.attr("transform", function(d) {
				return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
			})
			.text(function(d) { return d.text; });
		bbox = wCloud.node(0).getBBox();
		console.log(
			"bbox (x: " + bbox.x + 
			", y: " + bbox.y + 
			", w: " + bbox.width + 
			", h: " + bbox.height + 
			")"
		);

		
	};
	
	function sortByFrequency(arr) {
		var f = {};
		arr.forEach(function(i) { f[i] = 0; });
		var u = arr.filter(function(i) { return ++f[i] == 1; });
		return u.sort(function(a, b) { return f[b] - f[a]; });
	}
	}
//Draw the chord diagram that links the first 4 street names, average speed, distance and duration
function DrawChord(trips){
	var streetnames = []
	for (var i = 0; i < trips.length; i++) {
		for (var j = 0; j < trips[i].streetnames.length; j++) {
			streetnames.push(trips[i].streetnames[j]);
		}
	}
	
	var myConfig = {
		"type": "chord",
		plot:{
			animation:{
			  effect: 4,
			  method: 0,
			  sequence: 1
			}
		},
		"options": {
		  "radius": "90%"
		},
		"plotarea": {
		  "margin": "dynamic"
		},
		"series": [{
		  "values": [trips[0].streetnames.length,trips[1].streetnames.length,trips[2].streetnames.length,trips[3].streetnames.length],
		  "text": "Street Names"
		}, {
		  "values": [trips[0].streetnames.length,trips[1].streetnames.length,trips[2].streetnames.length,trips[3].streetnames.length],
		  "text": "Average Speed"
		}, {
		  "values": [trips[0].streetnames.length,trips[1].streetnames.length,trips[2].streetnames.length,trips[3].streetnames.length],
		  "text": "Distance"
		}, {
		  "values": [trips[0].streetnames.length,trips[1].streetnames.length,trips[2].streetnames.length,trips[3].streetnames.length],
		  "text": "Duration"
		}]
	  };
	  
	  zingchart.render({
		id: 'myChart',
		data: myConfig,
		height: "100%",
		width: "100%",
	  });
}


