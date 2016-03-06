/*global client, Backbone, moment, _, Q */
'use strict';

client.Models = client.Models || {};
// Utility functions

function pad(n) {
    return n < 10 ? '0' + n : n;
}

// This needs to be replaced with a little value object, shim for demo.

function parseToDate(idx) {
    var d = idx.split('_');
    return {
        year: d[0],
        month: d[1]
    };
}

(function() {

    client.Models.MapAnimatorModel = Backbone.Model.extend({

        defaults: {
            mode: 'sequential' // can be 'sequential' or 'monthly'
        },

        // List of layer names (dates) to iterate/animate over
        layers: [],

        initialize: function() {

            _.bindAll(this, 'enumerateLayers', 'buffer', 'start', 'startPlaying', 'stop');

        },

        enumerateLayers: function() {

            var startYear = this.mapModel.get('year');
            var startMonth = this.mapModel.get('month');
            this.layers = [];
            var i;
            switch (this.get('mode')) {
                case 'monthly':
                    for (i = 1953; i <= startYear; i++) {
                        this.layers.push(i + '_' + startMonth);
                    }
                    this.layerIndex = this.layers.length;
                    break;

                case 'sequential': // deliberate default fallthru
                    for (i = 1953; i <= startYear; i++) {
                        for (var j = 1; j <= 12; j++) {
                            this.layers.push(i + '_' + pad(j));
                        }
                    }
                    this.layerIndex = this.layers.length;
                    break;

                default:
                    break;
            }
            console.log(this.layers);
        },

        buffer: function() {

            // Array of promises which, when all resolved, mean the buffer is populated with valid layers.
            this.layerBuffer = [];
            var bufferIndex = this.layerIndex;

            // Trigger layer loading for the first 10 layers, obtain promises + act when they're all resolved;
            // Throttle this to fire one request every 100 milliseconds to avoid flooding the server.
            var bufferInterval = setInterval(_.bind(function() {
                this.layerBuffer.push(this.view.loadLayer(--bufferIndex));
                if (12 <= (this.layerIndex - bufferIndex)) {
                    clearInterval(bufferInterval);
                }
            }, this), 100);

        },

        // Populates the buffer, then initiates playing.
        start: function() {

            this.enumerateLayers();
            this.buffer();
            this.view.showBuffering();

            // Todo: this was firing too quickly, fix this by removing the setTimeout around this
            // and also causing the buffering to _immediately_ assign the promises instead of
            // delaying the first by 100ms (that delay means this code needs to be delayed as well)
            setTimeout(_.bind(function() {
                // Wait until the buffer is full, then start cycling.
                Q.allSettled(this.layerBuffer).then(_.bind(function startUpdater(results) {
                    this.view.hideBuffering();
                    this.startPlaying();
                }, this));
            }, this), 1000);

        },

        startPlaying: function() {

            // Once the next ten layers are loaded, start switching between the layers
            this.updater = setInterval(_.bind(function switchToPreviousLayer() {
                var oldLayerIndex = this.layerIndex;
                --this.layerIndex;

                if (this.layerIndex < 0) {
                    this.stop();
                }

                // Set properties so other objects know that the layers have changed
                this.set(_.extend({
                    layerIndex: this.layerIndex
                }, parseToDate(this.layers[this.layerIndex])));

                this.view.showLayer(this.layerIndex);
                this.view.hideLayer(oldLayerIndex);
                this.view.loadLayer(this.layerIndex - 10);

            }, this), 1500);
        },

        stop: function() {
            clearInterval(this.updater);
        }

    });

})();
