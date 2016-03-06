/*global client, Backbone, _, JST, OpenLayers, proj4 */
'use strict';

client.Views.ThresholdGraphicView = Backbone.View.extend({

	hasRendered: false,

	initialize: function() {
		_.bindAll(this, 'render', 'drawGraphic', 'loadData');
	},

	render: function() {

		if(
			false === _.isUndefined(this.model.get('lat'))
			&& false === _.isNaN(this.model.get('lat'))
			&& false === _.isUndefined(this.model.get('lon'))
			&& false === _.isNaN(this.model.get('lon'))
			) {

		$('#graphicWrapper').show();
		$('#thresholdGraphicControls').show();
		if( false === this.hasRendered ) {
		
			$("#thresholdSlider").slider({
				handle: 'round'
			});
			$("#thresholdSlider").on('slide', function(slideEvt) {
				$("#thresholdSliderLabel").text(slideEvt.value);
			});
			$("#thresholdSlider").on('slideStop', _.bind(function(slideEvt){
				this.model.set({concentration:slideEvt.value})
			},this));
			$('#thresholdGraphicControls').on('click', function() {
				$.scrollTo($('#graphicWrapper'), 500, {
					offset: -80
				} );
			});
			this.hasRendered==true
		
		}
		this.loadData()
	}
},

drawGraphic: function() {
	$('#thresholdTarget').empty()

	var tasks = []
	var datesUsed = {};
	var dateIndex = 1953;
	_.each(this.sourceData, function(e,i,l){
		var startDate = moment(e[0],'YYYY-MM-DD').toDate()
		var endDate = moment(e[1],'YYYY-MM-DD').toDate()
		var taskName = startDate.getFullYear()

		startDate.setFullYear(2013)
		endDate.setFullYear(2013)
		var rowObject = {
			startDate:startDate, endDate:endDate, taskName:taskName, status:'RUNNING'
		};
		
		// Push this entry onto a hash to keep track of possibly missing years
		if(!(datesUsed[taskName])) { datesUsed[taskName] = []; }
		datesUsed[taskName].push(rowObject);
		
	})

	for(var i = 1953; i <= 2012; i++ ) {
		if(!(datesUsed[i])) {
			var start = moment('01-01-2013','MM-DD-YYYY').toDate()
			var end = moment('01-01-2013','MM-DD-YYYY').toDate()
			tasks.push({startDate:start, endDate:end, taskName:i, status:'RUNNING'})
		}

		//otherwise, loop through existing events
		_.each(datesUsed[i], function(e, i, l) {
			tasks.push(e);
		});
	}



	var taskStatus = {
	    "SUCCEEDED" : "bar",
	};

	var taskNames = _.pluck(tasks, 'taskName')

	tasks.sort(function(a, b) {
	    return a.endDate - b.endDate;
	});
	var maxDate = tasks[tasks.length - 1].endDate;
	tasks.sort(function(a, b) {
	    return a.startDate - b.startDate;
	});
	var minDate = tasks[0].startDate;

	var format = "%b";

	var gantt = d3.gantt().taskTypes(taskNames).taskStatus(taskStatus).tickFormat(format);
	gantt(tasks);
	;

},

loadData: function() {

		this.sourceData = [];
		var getUrl = _.template('/data/openwater?lon=<%= lon %>&lat=<%= lat %>&concentration=<%= concentration %>', this.model.toJSON());
		$.getJSON(getUrl, _.bind(function(data) {
			this.sourceData = data
			
		}, this)).done(this.drawGraphic);
		
}

});
