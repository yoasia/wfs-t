controlMousePos = new ol.control.MousePosition({
	coordinateFormat: ol.coordinate.createStringXY(4),
	});

popup = document.getElementById('popup');
$('#popup-closer').on('click', function() {
	overlayPopup.setPosition(undefined);
	});
overlayPopup = new ol.Overlay({
	element: popup
	});

sourceVector = new ol.source.Vector({
	loader: function(extent) {
		//http://localhost:8080/geoserver/tmc/wms?service=WMS&version=1.1.0&request=GetMap&layers=tmc:tasiemki&styles=&bbox=2070016.7945950641,7240185.588484017,2072458.3074736786,7241038.606273427&width=768&height=330&srs=EPSG:3857&format=application/openlayers
		// $.ajax('http://tmc_2017_9:Punkt7!@ksg.eti.pg.gda.pl/geoserver/tmc/wfs',{
			$.ajax('http://localhost:8080/geoserver/wfs',{
			type: 'GET',
			data: {
				service: 'WFS',
				version: '1.1.0',
				request: 'GetFeature',
				typename: 'tmc:tasiemki_points',
				srsname: 'EPSG:3857',
				//cql_filter: "property='Value'",
				//cql_filter: "BBOX(geometry," + extent.join(',') + ")",
				//bbox: extent.join(',') + ',EPSG:3857'
				},
			}).done(function(response) {
				formatWFS = new ol.format.WFS(),
				sourceVector.addFeatures(formatWFS.readFeatures(response))
				});
		},
		strategy: ol.loadingstrategy.tile(new ol.tilegrid.XYZ({
			maxZoom: 19
			})),
	});

var layerVector = new ol.layer.Vector({
	source: sourceVector
	});

//hover highlight
selectPointerMove = new ol.interaction.Select({
	condition: ol.events.condition.pointerMove
	});

layerOSM = new ol.layer.Tile({
	source: new ol.source.OSM()
	});

layerOSM_BW = new ol.layer.Tile({
	source: new ol.source.XYZ({
		url : 'http://a.www.toolserver.org/tiles/bw-mapnik/{z}/{x}/{y}.png'
		})
	});

var map = new ol.Map({
	target: 'map',
	overlays: [overlayPopup],
	controls: [controlMousePos],
	layers: [layerOSM, layerVector],
	view: new ol.View({
		center: [2072561.5687376552, 7238941.001568714],
		zoom: 12
		})
	});
map.addInteraction(selectPointerMove);

//function getCenterOfExtent(extent){
//	x = extent[0] + (extent[2] - extent[0]) / 2;
//	y = extent[1] + (extent[3] - extent[1]) / 2;
//	return [x, y];
//	}

var interaction;
var select = new ol.interaction.Select({
	style: new ol.style.Style({
		stroke: new ol.style.Stroke({
			color: '#FF2828'
		})
	})
});

//wfs-t
var dirty = {};
var formatWFS = new ol.format.WFS();
var formatGML = new ol.format.GML({
	// featureNS: 'http://ksg.eti.pg.gda.pl/geoserver/tmc/wfs',
	featureNS: 'http://localhost:8080/geoserver/wfs',
	featureType: 'tasiemki_points',
	srsName: 'EPSG:3857'
	});
var transactWFS = function(p,f) {
	switch(p) {
	case 'insert':
		node = formatWFS.writeTransaction([f],null,null,formatGML);
		break;
	case 'update':
		node = formatWFS.writeTransaction(null,[f],null,formatGML);
		break;
	case 'delete':
		node = formatWFS.writeTransaction(null,null,[f],formatGML);
		break;
	}
	
	s = new XMLSerializer();
	str = s.serializeToString(node);
	str = str.replace("geometry", "the_geom");
	str = str.replace("geometry", "the_geom");


	$.ajax('http://admin:geoserver@localhost:8080/geoserver/wfs',{
		type: 'POST',
		dataType: 'xml',
		processData: false,
		contentType: 'text/xml',
		data: str,
		statusCode: {  
        404: function() {  
            alert( "Error 404");
        },
        401: function() {  
			alert( "Error 401");
            /*implementation for HTTP Status 401 (Unauthorized) goes here*/
        },
		500: function() {  
			alert( "Error 500");
            /*implementation for HTTP Status 401 (Unauthorized) goes here*/
        }			
    },
	}).done(function(response){
		var x2js = new X2JS();
		alert(JSON.stringify(x2js.xml2json( response)));	}).
	fail(function( jqXHR, textStatus, errorThrown) {
  		alert( "Request failed: " + textStatus + errorThrown);
	});
}

$('.btn-floating').hover(
		function() {
			$(this).addClass('darken-2');},
		function() {
			$(this).removeClass('darken-2');}
		);

$('.btnMenu').on('click', function(event) {
	$('.btnMenu').removeClass('orange');
	$(this).addClass('orange');
	map.removeInteraction(interaction);
	select.getFeatures().clear();
	map.removeInteraction(select);
	switch($(this).attr('id')) {
	
	case 'btnSelect':
		interaction = new ol.interaction.Select({
			style: new ol.style.Style({
				stroke: new ol.style.Stroke({color: '#f50057', width: 2})
				})
		});
		map.addInteraction(interaction);
		interaction.getFeatures().on('add', function(e) {
			props = e.element.getProperties();
			$("#popup").empty();
			var properties = objToArray(props);
			var myForm = '<form id="propertiesForm" action="/action_page.php"></form>'
			$("#popup").append(myForm);
			properties.forEach(function(element){
				var elments = element.split(":");
				$("#propertiesForm").append('  <label for=""'+elments[1]+'"">'elments[0]+'</label><input type="text" id="'+elments[1]+'" value="'+elments[1]+'" name="'+elments[0]+'"><br>')
			})
			 //$("#propertiesForm").append('<input type="submit" value="Submit">');
			
			coord = $('.ol-mouse-position').html().split(',');
			overlayPopup.setPosition(coord);
			});
		break;
		
	case 'btnEdit':
		map.addInteraction(select);
		interaction = new ol.interaction.Modify({
			features: select.getFeatures()
			});
		map.addInteraction(interaction);
		
		snap = new ol.interaction.Snap({
			source: layerVector.getSource()
			});
		map.addInteraction(snap);
		
		dirty = {};
		select.getFeatures().on('add', function(e) {
			e.element.on('change', function(e) {
				dirty[e.target.getId()] = true;
				});
			});
		select.getFeatures().on('remove', function(e) {
			f = e.element;
			if (dirty[f.getId()]){
				delete dirty[f.getId()];
				featureProperties = f.getProperties();
			    delete featureProperties.boundedBy;
			    var clone = new ol.Feature(featureProperties);
			    clone.setId(f.getId());
			    transactWFS('update',clone);
				}
			});
		break;
		
	case 'btnDrawPoint':
		interaction = new ol.interaction.Draw({
		    type: 'Point',
		    source: layerVector.getSource()
		});
		map.addInteraction(interaction);
		interaction.on('drawend', function(e) {
			 var f = e.feature;
			 var id = (Math.floor(Math.random() * 15)+10);
			 var geom = f.getGeometry();
			 var geomName = f.getGeometryName();
			 var coord = geom.getCoordinates();
			f.setProperties({
				id: id,
				name: "MyName"+id,
				comment:"comment" + id			
				})
			transactWFS('insert',f);
	    });
		break;
		
	case 'btnDrawLine':
		interaction = new ol.interaction.Draw({
		    type: 'LineString',
		    source: layerVector.getSource()
		});
		map.addInteraction(interaction);
		interaction.on('drawend', function(e) {
			transactWFS('insert',e.feature);
	    });
		break;
		
	case 'btnDrawPoly':
		interaction = new ol.interaction.Draw({
		    type: 'Polygon',
		    source: layerVector.getSource()
		});
		map.addInteraction(interaction);
		interaction.on('drawend', function(e) {
			transactWFS('insert',e.feature);
	    });
		break;
	case 'btnDrawCircle':
		interaction = new ol.interaction.Draw({
		    type: 'Circle',
		    source: layerVector.getSource()
		});
		map.addInteraction(interaction);
		interaction.on('drawend', function(e) {
			transactWFS('insert',e.feature);
	    });
		break;
		
	case 'btnDelete':
		interaction = new ol.interaction.Select();
		map.addInteraction(interaction);
		interaction.getFeatures().on('change:length', function(e) {
			transactWFS('delete',e.target.item(0));
	        interaction.getFeatures().clear();
	        selectPointerMove.getFeatures().clear();
	    });
		break;

	default:
		break;
	}
	});

$('#btnZoomIn').on('click', function() {
	var view = map.getView();
	var newResolution = view.constrainResolution(view.getResolution(), 1);
	view.setResolution(newResolution);
	});

$('#btnZoomOut').on('click', function() {
	var view = map.getView();
	var newResolution = view.constrainResolution(view.getResolution(), -1);
	view.setResolution(newResolution);
	});
	
	function objToArray (obj) {
    var str = '';
	var arr = new Array()
    for (var p in obj) {
        if (obj.hasOwnProperty(p)) {
			if(p == "the_geom")
				continue;
            arr.push( p + ':' + obj[p]);
        }
    }
    return arr;
}