;(function(Agent) {

  Agent.onChange = function(object, callback) {
    callback = _.bind(callback, this);

    var _onChange = function(prop, action, difference, oldvalue) {
      if (difference && !_.isEmpty(difference.added)) {
        unwatch(this, difference.added, _onChange);
      }

      var args = _.toArray(arguments);
      callback.apply(this, [this].concat(args));
    }

    watch(object, _onChange, 0, true);
  };

}(Agent));