/**
 * carto-siae.js
 * 
 * The project GUI
 */

function CartoSIAE(options)
{

	/**
	 * used in event context
	 */
	var self = this;
	/**
	 * Configuration & options
	 */
	this.config = {
		// The leaflet map id
		mapId: options.mapId,
		// The JSTree tree id
		treeId: options.treeId
	};

	/**
	 * The SiaeMap instance
	 */
	this.siaeMap ;

	/**
	 * An index array to find SIAE(s) by ROME code
	 */
	this.siaeByRome ;
	/**
	 * An index array to find job label by ROME code
	 */
	this.romeToJob ;

	/**
	 * Constructor called at the end of CartoSIAE definition
	 */
	this._construct = function()
	{

		this._makeSaieMap();

	}

	this._makeSaieMap = function()
	{
		$.getJSON( options.dataUrl, function(data)
		{
			self.siaeByRome = data.siaeByRome;
			self.romeToJob = data.romeToJob ;

			self.siaeMap = new SiaeMap(
			{
				mapId: self.config.mapId,
				// Markers popup template
				popupTemplateId: options.mapPopupTemplateId,
				data: data.siae
			});

			self._makeSiaeTree();
		});
	}

	this._makeSiaeTree = function()
	{
		this.siaeTree = new SiaeTree(
		{
			treeId: this.config.treeId,
			// Url for tree data
			treeDataUrl: options.treeDataUrl,
			// Search Textbox
			treeSearchId: options.treeSearchId,
			treeSearchClear: options.treeSearchClear,
			// Select All button
			treeSelectAllId: options.treeSelectAllId,
			// Select None button
			treeSelectNoneId: options.treeSelectNoneId
		});

		$(this.siaeTree).on('cartosiae.nodes_selected', function( siaeTree, romes )
		{
			romes.forEach(function(rome){
				self.siaeByRome[ rome.rome ].forEach(function(siaeId)
				{
				    self.siaeMap.showSiae( siaeId );
				});
			});

			self.siaeMap.fitSiaeBounds();

		})
		.on('cartosiae.nodes_deselected', function( siaeTree, romes )
		{
			romes.forEach(function(rome){
				self.siaeByRome[ rome.rome ].forEach(function(siaeId)
				{
				    self.siaeMap.hideSiae( siaeId );
				});
			});

			self.siaeMap.fitSiaeBounds();
			
		})
		.on('cartosiae.nodes_all_deselected', function( siaeTree, rome )
		{
			self.siaeMap.hideAll();
			self.siaeMap.fitSiaeBounds();
		});

	}

	this.getJobLabel = function( romeCode )
	{
		return self.romeToJob[romeCode];
	}

	// Call constructor
	this._construct();
}
