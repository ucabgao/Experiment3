/*global client, Backbone, JST, OpenLayers, proj4, moment, _, Q */
'use strict';

client.Views.MapAnimatorView = Backbone.View.extend({
	initialize: function() {

		_.bindAll(this, 'play', 'pause', 'setSequentialMode', 'setMonthlyMode',
			'render', 'showLayer', 'loadLayer', 'hideLayer', 'showBuffering', 'hideBuffering');
		// Set up some shortcuts
		this.map = this.options.mapView.map;
		this.model = this.options.model;

	},

	template: JST['src/scripts/templates/MapAnimator.ejs'],

	// Used for buffering layers for animation
	layers: {},

	// Will contain promises corresponding to the load status of each layer.
	promises: {},

	events: {
		'click' : 'focus',
		'click #mapAnimationSequential' : 'setSequentialMode',
		'click #mapAnimationMonthly' : 'setMonthlyMode',
		'click #mapAnimationPlay' : 'play',
		'click #mapAnimationPause' : 'pause'
	},

	focus: function(event) {
		$.scrollTo( $('#mapGroupWrapper'), 500, {
			offset: -80
		});
		window.appRouter.setMapMode('animation');
	},

	resetLayers: function() {
		console.log(this.map.layers);
		for( var i = 1; i < this.map.layers.length; i++ ) {
			// If the layer is defined and can be purged, destroy it.
			if(this.map.layers[i]) {
				this.map.layers[i].destroy();
			}
		}
	},

	play: function() {
		this.resetLayers();
		this.model.start();
	},

	pause: function() {
		this.model.stop();
	},

	setSequentialMode: function() {
		this.model.set({mode:'sequential'});
		this.model.enumerateLayers();
	},

	setMonthlyMode: function() {
		this.model.set({mode:'monthly'});
		this.model.enumerateLayers();
	},

	render: function() {
		this.$el.html(this.template());
	},

	showLayer: function(layerIndex) {
		if( 'undefined' === typeof this.layers[this.model.layers[layerIndex]]) {
			console.log('+++ Asked to show undefined layer: ' + layerIndex);
			return;
		}
		$('#mapTitle').text('Historical Sea Ice Concentration, ' + moment(this.model.layers[layerIndex], 'YYYY_MM').format('MMMM YYYY'));
		this.layers[this.model.layers[layerIndex]].setOpacity(1);
	},

	loadLayer: function(layerIndex) {

		this.promises[this.model.layers[layerIndex]] = Q.defer();

		this.layers[this.model.layers[layerIndex]] = new OpenLayers.Layer.WMS(
			'Cache WMS Sea Ice Atlas',
			'http://tiles.snap.uaf.edu/tilecache/tilecache.py/2.11.0/',
			{
				layers: 'seaice_conc_sic_mean_pct_weekly_ak_' + this.model.layers[layerIndex] + '_average',
				transparent: true,
				format: 'image/png'
			},
			{
				isBaseLayer: false,
				visibility: true, // Doesn't load unless visibility is true
				layerIndex: layerIndex, // passed in to the loadend event, used there
				buffer: 0 // don't load extra tiles around the main map
			}
		);
		this.layers[this.model.layers[layerIndex]].setOpacity(0); // Hide, but still load

		// When the "loadend" event is triggered on the layer, resolve its initial loading promise.
		this.layers[this.model.layers[layerIndex]].events.register('loadend', this, function(layer) {
			this.promises[this.model.layers[layer.object.layerIndex]].resolve(layer);
		});
		
		// Map loading only starts happening when the addLayer method is invoked.
		this.map.addLayer(this.layers[this.model.layers[layerIndex]]);

		return this.promises[this.model.layers[layerIndex]].promise;
	},

	hideLayer: function(layerIndex) {
		if( 'undefined' === typeof this.layers[this.model.layers[layerIndex]]) {
			console.log('--- Asked to HIDE undefined layer: ' + layerIndex);
			return;
		}
		// Hide, but don't destroy yet.
		// Timeout is to allow a bit of overlap with the newly-shown tile, to reduce flicker.
		setTimeout( this.layers[this.model.layers[layerIndex]].setOpacity(0), 1000);
	},

	showBuffering: function() {
		$('#animationBuffering').show();
	},

	hideBuffering: function() {
		$('#animationBuffering').hide();
	}
});
