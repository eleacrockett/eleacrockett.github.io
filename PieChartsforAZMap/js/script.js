// This script shows a simple leaflet map and simple d3 chart with some interactions


var map = L.map('map').setView([34,-112], 6);

// set a tile layer to be CartoDB tiles 
var CartoDBTiles = L.tileLayer('http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',{
  attribution: 'Map Data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> Contributors, Map Tiles &copy; <a href="http://cartodb.com/attributions">CartoDB</a>'
});

// add these tiles to our map
map.addLayer(CartoDBTiles);


// set data layer as global variable so we can use it in the layer control below
var leaflet_geoJSON;

// use jQuery get geoJSON to grab geoJson layer, parse it, then plot it on the map using the plotDataset function

$.getJSON( "data/azcvap_merged.geojson", function( data ) {
    var dataset = data;
    // draw the dataset on the map
    plotDataset(dataset);
    //creates a dropdown in the sidebar that we can use to fire map events and update the D3 chart
    createDropdown(dataset);
});

// function to plot the dataset passed to it
function plotDataset(dataset) {
    leaflet_geoJSON = L.geoJson(dataset, {
        style: mapStyle,
        onEachFeature: mapOnEachFeature
    }).addTo(map);

    // create layer controls
    createLayerControls(); 
}

// function that sets the style of the geojson layer
var mapStyle = function (feature, latlng) {

    var pctHis = feature.properties.f_18_pop*100;

    var style = {
        weight: 1,
        opacity: .25,
        color: 'grey',
        fillOpacity: fillOpacity(pctHis),
        fillColor: fillColorPercentage(pctHis)
    };

    return style;

}

// function that fills polygons with color based on the data
function fillColorPercentage(d) {
    return d > 78.5 ? '#993404' :
           d > 77  ? '#d95f0e' :
           d > 75  ? '#fe9929' :
           d > 73  ? '#fec44f' :
           d > 70  ? '#fee391' :
                    '#ffffd4';
}


// function that sets the fillOpacity of layers -- if % is 0 then make polygons transparent
function fillOpacity(d) {
    return d == 0 ? 0.0 :
                    0.75;
}

// empty L.popup so we can fire it outside of the map
var popup = new L.Popup();

// set up a counter so we can assign an ID to each layer
var count = 0;

// on each feature function that loops through the dataset, binds popups, and creates a count
var mapOnEachFeature = function(feature,layer){
    var prettyCVAPRate = (feature.properties.f_18_pop*100).toFixed(1);

    // let's bind some feature properties to a pop up with an .on("click", ...) command. We do this so we can fire it both on and off the map
    layer.on("click", function (e) {
        var bounds = layer.getBounds();
        var popupContent = "<h4>District "+ feature.properties.district +"</h4><br /><strong>Total Citizen Voting Age Population:</strong> " + numberWithCommas((feature.properties.f18_pop).toFixed(0)) + "<br /><strong>CVAP Percentage:</strong> " + prettyCVAPRate + "%";
        popup.setLatLng(bounds.getCenter());
        popup.setContent(popupContent);
        map.openPopup(popup);
    });

    // we'll now add an ID to each layer so we can fire the popup outside of the map
    layer._leaflet_id = "mapLayerID" + count;

    // draw pie for first selected
    if (count == 0) {
        updatePie(feature);
        updatePie2(feature);
    }
    
    count++;

}


function createLayerControls(){
    // add in layer controls
    var baseMaps = {
        "CartoDB Basemap": CartoDBTiles,
    };

    var overlayMaps = {
        "CVAP Population": leaflet_geoJSON,
    };

    // add control
    L.control.layers(baseMaps, overlayMaps).addTo(map);
    
}




// add in a legend to make sense of it all
// create a container for the legend and set the location

var legend = L.control({position: 'bottomright'});

// using a function, create a div element for the legend and return that div
legend.onAdd = function (map) {

    // a method in Leaflet for creating new divs and setting classes
    var div = L.DomUtil.create('div', 'legend'),
        amounts = [65, 70, 73, 75, 77, 78.5];

        div.innerHTML += '<p>Total Citizen<br />Voting Age<br />Population</p>';

        for (var i = 0; i < amounts.length; i++) {
            div.innerHTML +=
                '<i style="background:' + fillColorPercentage(amounts[i] + 1) + '"></i> ' +
                amounts[i] + (amounts[i + 1] ? '% &ndash;' + amounts[i + 1] + '%<br />' : '% +<br />');
        }

    return div;
};


// add the legend to the map
legend.addTo(map);



// function to create a list in the right hand column with links that will launch the pop-ups on the map
function createDropdown(dataset) {
    // use d3 to select the div and then iterate over the dataset appending a list element with a link for clicking and firing
    // first we'll create an unordered list ul elelemnt inside the <div id='list'></div>. The result will be <div id='list'><ul></ul></div>
    var district_dropdown = d3.select("#district_dropdown")
                .append("select")
                .attr("class", "form-control")
                .on("change", change);


    // now that we have a selection and something appended to the selection, let's create all of the list elements (li) with the dataset we have 
    
    var options = district_dropdown.selectAll("option")
        .data(dataset.features)
        .enter()
        .append("option")
        .html(function(d) { 
            return d.properties.district; 
        });


    function change() {
        // get id of selected and fire click
        var si   = district_dropdown.property('selectedIndex');
        var leafletId = 'mapLayerID' + si;
        map._layers[leafletId].fire('click');

        // get data out of selected and draw pie chart
        var s = options.filter(function (d, i) { return i === si });
        var feature = s.datum();
        // draw pie chart
        updatePie(feature);
        updatePie2(feature);


    }

}

function updatePie(feature) {
    // remove any previous svg
    d3.select('#d3vis').html('');

    // set up dataset
    var d3_dataset = [{"label":"Hispanic", "value":feature.properties.hisp_perc*100}, 
                      {"label":"Black", "value":feature.properties.black_perc*100}, 
                      {"label":"Asian", "value":feature.properties.asian_perc*100},
                      {"label":"White", "value":feature.properties.white_perc*100},
                      {"label":"Native", "value":feature.properties.native_perc*100},
                      {"label":"Hawaiian", "value":feature.properties.hawai_perc*100},
                      {"label":"Other", "value":feature.properties.other_perc*100}];



    // set width and height of drawing
    var width = $('.col-sm-3').width(),
        height = width,
        radius = width / 2;

    // set color scale and range
    var color = d3.scale.ordinal()
        .range(["#288644", "#E6560D", "#8A1361", "#08529C", "#ffff33", "#a65628", "#636363"]);

    // set inner and outer radius
    var arc = d3.svg.arc()
        .outerRadius(radius - 10)
        .innerRadius(50);

    // set labels
    var labelArc = d3.svg.arc()
        .outerRadius(radius - 40)
        .innerRadius(radius - 50);

    var pie = d3.layout.pie()
        .sort(null)
        .value(function(d) { 
        return d.value; });

    var svg = d3.select("#d3vis")
                .append("svg")
                .attr("width", width)
                .attr("height", height)
                .append("g")
                .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

    var g = svg.selectAll(".arc")
               .data(pie(d3_dataset))
              .enter().append("g")
               .attr("class", "arc");

    g.append("path")
        .attr("d", arc)
        .style("fill", function(d) { console.log(d); return color(d.data.label); });


    g.append("text")
        .attr("transform", function(d) { return "translate(" + labelArc.centroid(d) + ")"; })
        .attr("dy", ".38em")
        .text(function(d) { return d.data.label + " (" + d.data.value.toFixed(0) + ")"; });
//      .text(function(d) { return d.data.label + " (" + numberWithCommas(d.data.value) + ")"; });
}



function numberWithCommas(x) { 
    return x.toString();
}

//function numberWithCommas(x) {
//    return x.toFixed(0);
//}

/*
// function to create a list in the right hand column with links that will launch the pop-ups on the map
function createDropdown(dataset) {
    // use d3 to select the div and then iterate over the dataset appending a list element with a link for clicking and firing
    // first we'll create an unordered list ul elelemnt inside the <div id='list'></div>. The result will be <div id='list'><ul></ul></div>
    var district_dropdown = d3.select("#district_dropdown")
                .append("select")
                .attr("class", "form-control")
                .on("change", change);

var options = district_dropdown.selectAll("option")
        .data(dataset.features)
        .enter()
        .append("option")
        .html(function(d) { 
            return d.properties.district; 
        });


    function change() {
        // get id of selected and fire click
        var si   = district_dropdown.property('selectedIndex');
        var leafletId = 'mapLayerID' + si;
        map._layers[leafletId].fire('click');

        // get data out of selected and draw pie chart
        var s = options.filter(function (d, i) { return i === si });
        var feature = s.datum();
        // draw pie chart
        updatePie2(feature);


    }

}
*/

function updatePie2(feature) {
    // remove any previous svg
    d3.select('#elea').html('');

    // set up dataset
    var d3_dataset = [{"label":"Hispanic", "value":feature.properties.f_h18_pop*100}, 
                      {"label":"Black", "value":feature.properties.black_cvap_perc*100}, 
                      {"label":"Asian", "value":feature.properties.asian_cvap_perc*100},
                      {"label":"White", "value":feature.properties.white_cvap_perc*100},
                      {"label":"Native", "value":feature.properties.native_cvap_perc*100},
                      {"label":"Hawaiian", "value":feature.properties.hawai_cvap_perc*100},
                      {"label":"Other", "value":feature.properties.other_cvap_perc*100}];

console.log(d3_dataset);

    // set width and height of drawing
    var width = $('.col-sm-3').width(),
        height = width,
        radius = width /2;

    // set color scale and range
    var color = d3.scale.ordinal()
        .range(["#288644", "#E6560D", "#8A1361", "#08529C", "#ffff33", "#a65628", "#636363"]);

    // set inner and outer radius
    var arc = d3.svg.arc()
        .outerRadius(radius - 10)
        .innerRadius(50);

    // set labels
    var labelArc = d3.svg.arc()
        .outerRadius(radius - 40)
        .innerRadius(radius - 50);

    var pie = d3.layout.pie()
        .sort(null)
        .value(function(d) { console.log(d); return d.value; });

    var svg = d3.select("#elea")
                .append("svg")
                .attr("width", width)
                .attr("height", height)
               .append("g")
                .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

    var g = svg.selectAll(".arc")
               .data(pie(d3_dataset))
              .enter().append("g")
               .attr("class", "arc");

    g.append("path")
        .attr("d", arc)
        .style("fill", function(d) { console.log(d); return color(d.data.label); });


    g.append("text")
        .attr("transform", function(d) { return "translate(" + labelArc.centroid(d) + ")"; })
        .attr("dy", ".35em")
        .text(function(d) { return d.data.label + " (" + d.data.value.toFixed(0) + ")"; });
}

