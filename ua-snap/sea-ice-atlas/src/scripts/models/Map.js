/*global client, Backbone*/

client.Models = client.Models || {};

(function() {
    'use strict';

    client.Models.MapModel = Backbone.Model.extend({
        defaults: {
            month: 12,
            year: 2012,
            concentration: 30
        }
    });

})();
