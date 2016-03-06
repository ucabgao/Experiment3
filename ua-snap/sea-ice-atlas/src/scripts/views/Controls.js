/*global client, Backbone, JST, _ */
'use strict';

client.Views.MapControlsView = Backbone.View.extend({

	events: {
		'change select' : 'updateDate'
	},
	initialize: function() {
		this.model.on('change', this.updateControls, this);
	},
	template: JST['src/scripts/templates/MapControls.ejs'],

	render: function() {

		this.$el.html(this.template());

		var range = _.range(1953, 2013);
		var yearSelect = $(this.$el.find('select.year')[0]);
		_.each(range, function(year) {
			yearSelect.append($('<option>', {
				value: year,
				text: year
			}));
		});

		this.updateControls();

	},

	updateControls: function() {

		this.$el.find('select.year').val(this.model.get('year'));
		this.$el.find('select.month').val(this.model.get('month'));

	},

	// If we need to do a lot of these, we should replace this with some proper model binding module
	// such as http://nytimes.github.io/backbone.stickit/
	updateDate: function(event) {
		event.stopImmediatePropagation();
		var attr = {};
		attr[event.target.name] = event.target.value;
		this.model.set(attr);
	}

});
