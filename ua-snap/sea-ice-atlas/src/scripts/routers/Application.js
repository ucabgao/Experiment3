/*global client, Backbone, _ */
'use strict';

function showLocationBasedGraphics() {
        $('#thresholdGraphicControls').show('slow');
	$('#concentrationGraphControls').show('slow');
}

client.Routers.ApplicationRouter = Backbone.Router.extend({
	routes: {
		'' : 'index',
		'date/:year/:month': 'renderByDate',
		'location/:year/:month/:lat/:lon/:concentration': 'renderByLocation'
	},

	// Default view
	index: function() {
		this.checkIfRenderLayout();
		this.renderMap();
	},

	// This code resets the GUi when switching between the animation and map modes.
	// Start in an undefined state so that when restoring state from URL load, we can
	// always set up predictably here.
	mapMode: undefined,
	setMapMode: function(mode) {

		// Don't do any work if we're already in the desired mode.
		if(mode == this.mapMode) { return; }
		this.mapMode = mode;
		
		switch(mode) {

			case 'map':

				$('#mapControls').addClass('active');
				$('#mapAnimationControls').removeClass('active');

				this.mapView.activateClickHandler();

				// Binding handlers to respond to changes on the model.				
				this.mapModel.on('change:lat change:lon change:month',
					_.debounce(
						_.bind(this.chartView.render, this.chartView)
					, 500, true)
				, this.chartView);

				this.mapModel.on('change:lat change:lon change:concentration',
					_.debounce(
						_.bind(this.thresholdGraphicView.render, this.thresholdGraphicView)
					, 500, true)
				, this.thresholdGraphicView);

				this.mapModel.on('change:month change:year',
					_.debounce(
						_.bind(this.mapView.loadLayer, this.mapView)
					, 500, true)
				, this.mapView);
				
				// Unbind animation event handlers
				//this.mapAnimatorModel.off('change:layerIndex', animationMapWatchLayerIndex);

				break;
		
			case 'animation':
			
				// Scroll to map
				$.scrollTo( $('#mapGroupWrapper'), 500, {
					offset: -80
				});

				// Unbind observers related to chart/graph visualizations
				this.mapModel.off('change:month change:year change:lat change:lon change:concentration');

				// Remove lat/lon information
				this.mapModel.unset('lat');
				this.mapModel.unset('lon');

				// Swap around screen display for this mode
				$('#mapControls').removeClass('active');
				$('#mapAnimationControls').addClass('active');
				$('#concentrationGraphControls').hide('fast');
				$('#thresholdGraphicControls').hide('fast');
				$('#chartWrapper').hide('fast');
				$('#graphicWrapper').hide('fast');

				this.mapView.deactivateClickHandler();

				// Bind relevant observers
				this.mapAnimatorModel.on('change:layerIndex', function animationMapWatchLayerIndex() {
					this.mapModel.set({
						month: this.mapAnimatorModel.get('month'),
						year: this.mapAnimatorModel.get('year')
					});
				}, this);

				// When the user clicks on a Map control, swap the map mode
				$('#mapControls').on('click', _.bind(function setModeToMap() {
					
					// Stop animation
					this.mapAnimatorModel.stop();

					// Reset to map mode
					this.setMapMode('map');

				}, this));

				break;
		}
	},

	// User arrived via bookmark
	renderByLocation: function(year, month, lat, lon, concentration) {
		this.checkIfRenderLayout();
		this.mapModel.set({
			year: year,
			month: month,
			lat: lat,
			lon: lon,
			concentration: concentration
		}, {silent:true}); // silent because otherwise it triggers a change event, unwanted here.
		this.renderMap();
		this.setMapMode('map'); // force state reconstruction
		this.mapModel.trigger('change:lat'); // Force render to reveal charts
	},

	// User arrived via bookmark
	renderByDate: function(year, month) {
		this.checkIfRenderLayout();
		this.mapModel.set({
			year: year,
			month: month
		}, {silent:true}); // silent because otherwise it triggers a change event, unwanted here.
		this.renderMap();
		this.setMapMode('map'); // force state reconstruction
		this.mapModel.trigger('change:month'); // force render to reveal chart
	},

	checkIfRenderLayout: function() {
		if(false === this.hasRenderedLayout) {
			this.renderAppLayout();
			this.hasRenderedLayout = true;
		}
	},

	renderMap: function() {

		// mapView.render() returns a promise on initial run.  TODO: this may break if base map has already 
		// rendered, fix/defend.
		this.mapView.render().then(_.bind(function() {

			this.mapControlsView = new client.Views.MapControlsView({el: $('#mapControls'), model: this.mapModel});
			this.mapControlsView.render();

			this.mapAnimatorModel = new client.Models.MapAnimatorModel();
			this.mapAnimatorModel.mapModel = this.mapModel;

			this.mapAnimatorView = new client.Views.MapAnimatorView({
				el: $('#mapAnimationControls'),
				model: this.mapAnimatorModel,
				mapView: this.mapView
			});
			
			// For the animation, the model and view need to collaborate, so the view is assigned directly to the model
			this.mapAnimatorModel.view = this.mapAnimatorView;
			this.mapAnimatorView.render();

			this.mapView.loadLayer(this.mapModel.get('year'), this.mapModel.get('month'));

			$('#mapControls').show();
			$('#mapAnimationControls').show();
			$('#loadingMap').hide();

			// Complete event binding + rebuilding GUI.
			this.setMapMode('map');

		}, this));

	},

	// Flag to indicate if the main app layout has rendered or not
	hasRenderedLayout: false,

	renderAppLayout:  function() {
		this.appModel = new client.Models.ApplicationModel();
		this.appView = new client.Views.ApplicationView({el: $('#applicationWrapper'), model: this.appModel});

		this.mapModel = new client.Models.MapModel();
		this.mapView = new client.Views.MapView({model: this.mapModel});
		this.chartView = new client.Views.ChartView({model: this.mapModel});
		this.thresholdGraphicView = new client.Views.ThresholdGraphicView({model: this.mapModel});

		// When the user changes the controls, update the name of the layer being referenced
		this.mapModel.on('change', this.updateLocation, this);
		
		// Render initial layout
		this.appView.render();
		clampSidebarWidth();
	},

	// Updates URL for bookmarking
	updateLocation: function() {
		if( this.mapModel.get('lat') && this.mapModel.get('lon')) {
			this.navigate(_.template('location/<%= year %>/<%= month %>/<%= lat %>/<%= lon %>/<%= concentration %>', this.mapModel.toJSON()));
		} else {
			this.navigate('date/' + this.mapModel.get('year') + '/' + this.mapModel.get('month'));	
		}
	},
});

function clampSidebarWidth() {
	
	// This code is needed to ensure the affixed navbar retains the correct width.
	// https://github.com/twbs/bootstrap/issues/6350
	$('[data-clampedwidth]').each(function () {
	    var elem = $(this);
	    var parentPanel = elem.data('clampedwidth');
	    var resizeFn = function () {
	        var sideBarNavWidth = $(parentPanel).width() - parseInt(elem.css('paddingLeft')) - parseInt(elem.css('paddingRight')) - parseInt(elem.css('marginLeft')) - parseInt(elem.css('marginRight')) - parseInt(elem.css('borderLeftWidth')) - parseInt(elem.css('borderRightWidth'));
	        elem.css('width', sideBarNavWidth);
	    };

	    resizeFn();
	    $(window).resize(resizeFn);
	});

}