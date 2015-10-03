/**
 * SiaeMap.js
 * 
 * depends:
 * - Leaflet http://leafletjs.com
 * - Leaflet plugin: Leaflet.markercluster https://github.com/Leaflet/Leaflet.markercluster 
 */

function SiaeMap( options )
{
	var self = this ;

	this.mapId = options.mapId ;
	this.popupTemplateId = options.popupTemplateId ;
	this.siae = [];
	this.siaeIdToMarkerId = [];
	this.markers ;

	// create a indexed array for SIAE
	options.data.forEach( function(siae)
	{
		self.siae[ siae.id ] = siae ;
	});

	// TODO: Icons
	var CustomIconBase = L.Icon.extend({
		options: {
			shadowUrl: 'js/images/marker-shadow.png',
			iconSize:     [42, 42],
			shadowSize:   [50, 64],
			iconAnchor:   [22, 94],
			shadowAnchor: [4, 62],
			popupAnchor:  [-3, -76]
		}
	});
	this.icons = {
		unspecified: new CustomIconBase({
			iconUrl: 'img/stop.png'
		})
	};

	// Map with right zoom control
	this.map = L.map( this.mapId, {zoomControl: false});          
	new L.Control.Zoom({ position: 'topright' }).addTo(this.map);

	// Background Maps

	var osmUrl='http://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png';
	var osmAttrib='Map data © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>, Map by <a href="http://openstreetmap.fr">OSM_Fr</a>';
	var osm = new L.TileLayer(osmUrl, {
		minZoom: 1, 
		maxZoom: 18, 
		attribution: osmAttrib
	});
	this.map.addLayer(osm);

	// create a L.Marker for each SIAE (options.data)

	this.markers = new L.MarkerClusterGroup().addTo(this.map);

	this.fitSiaeBounds = function()
	{
		var bounds = self.markers.getBounds();
		if( bounds.isValid() )
		{
			self.map.fitBounds( bounds );
		}
		else
			this.map.setView([47.365, 0.633], 10);
	}

	// Set Map's initial view: position & zoom
	this.fitSiaeBounds();

	/**
	 * Show a SIAE's marker
	 * - Create a L.Marker
	 * - Add marker's is to self.siaeIdToMarkerId
	 */
	this.showSiae = function( siaeId )
	{
		// Do not add SIAE twice
		if( self.siaeIdToMarkerId[ siaeId ] != null )
			return ;

		siae = self.siae[ siaeId ];
		if( siae.latlon == null )
		{
			console.log('ERROR, siae has no coord:');
			console.log(siae);
			return ;
		}

		var m = L.marker(
			[siae.latlon[0],siae.latlon[1]],
			{
				title: siae.name,
				siae: siae
			}
		);
		self.markers.addLayer( m );
		self.siaeIdToMarkerId[ siaeId ] = m._leaflet_id;

	}

	/**
	 * Hide a SIAE's marker
	 * - use self.siaeIdToMarkerId to retreive the SIAE's marker
	 * - remove the L.Marker
	 */
	this.hideSiae = function( siaeId )
	{
		var mId = self.siaeIdToMarkerId[ siaeId ];
		if( mId == null )
			return;

		var m = self.markers.getLayer(mId);
		self.markers.removeLayer( m );
		self.siaeIdToMarkerId[ siaeId ] = null ;
	}

	this.hideAll = function()
	{
		self.markers.clearLayers();
		self.siaeIdToMarkerId = [];
	}

	/**
	 * Manage markers popup
	 */
	this.markers.on('click', function(marker)
	{
		var d = marker.layer.options ;
		var pp = $('#'+self.popupTemplateId).clone();
		$('.siae_title', pp ).text( d.siae.name);
		$('.siae_address', pp ).text( d.siae.address);
		$('.siae_phone', pp ).text( d.siae.phone);
		$('.siae_mail', pp ).html( '<a href="mailto:'+d.siae.mail+'">'+d.siae.mail+'</a>');
		var metiers = $('.siae_metiers', pp );
		d.siae.romes.forEach(function(romeCode){
			// FIXME: remove use of "cartoSiae" global variable !
			var job = cartoSiae.getJobLabel(romeCode);
			metiers.append('<li class="siae_metier">'+job+'</li>');
		});
		pp.show();

		marker.layer.bindPopup(pp[0]).openPopup();

	});

	this.markers.on('clustermouseover', function (e)
	{
		// TODO: wants ToolTip
	    //console.log('cluster ' + e.layer.getAllChildMarkers().length);
	});

}
