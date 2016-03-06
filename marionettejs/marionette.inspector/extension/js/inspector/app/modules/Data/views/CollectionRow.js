define([
  'marionette',
  'text!templates/devTools/data/collection-row.html',
  'util/Radio',
], function(Marionette, tpl, Radio) {
  return Marionette.ItemView.extend({
    template: tpl,

    tagName: 'tr',

    className: 'collection-row',

    ui: {
      moreInfoLink: "[data-action='info']",
    },

    events: {
      "click @ui.moreInfoLink": "onClickInfo"
    },

    onClickInfo: function() {
      this.highlightRow();

      if (!this.model.has('cid')) {
        return;
      }

      Radio.command('data', 'show:info', {
        type: 'collection',
        instance: this.model
      });
    },

    highlightRow: function() {
      Radio.command('data', 'unhighlight-rows');
      this.$el.addClass('bg-info');
    },

    unhighlightRow: function() {
      this.$el.removeClass('bg-info');
    },

    serializeData: function() {
      var data = {};
      _.extend(data, this.serializeModel(this.model));
      return data;
    }
  });
})