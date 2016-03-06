/*global client,Backbone */
'use strict';

window.client = {
    Models: {},
    Collections: {},
    Views: {},
    Routers: {},
    init: function () {
        window.appRouter = new client.Routers.ApplicationRouter();

        // Avoid pushState unless we configure the server to handle that properly.
        Backbone.history.start({pushState:false});
    }
};

/* Order and include as you please. */
require('build/templates.js');
require('src/scripts/views/*');
require('src/scripts/models/*');
require('src/scripts/collections/*');
require('src/scripts/routers/*');

$(document).ready(function () {
    client.init();
});