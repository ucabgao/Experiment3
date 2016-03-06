/**
 * jQuery Combinate 0.1a
 * by Francis San Juan
 * ftsanjuan.com
 *
 * Revision 2012-08-20
 */
;(function($){

  /**
   * combines form values of a set of input textfields
   * into a single string and inserts it into a target/new hidden input textfield.
   */
  $.fn.combinate = function(options) {

    return this.each(function() {

      /**
       *  Settings
       *
       * 'combineClass'       : (css class) designates the fields to combine (default: 'combinate')
       * 'resultElement'      : (css selector) designates the element to insert the combined string into (default: a new hidden <input> elmement)
       * 'exclude'            : (css selector) designates elements to exclude from combination
       * 'debug'              : (boolean) if true, displays console log messages (default: false)
       */
      var settings = $.extend({
            'combineClass' : 'combinate',
            'resultElement' : '',
            'exclude' : '',
            'debug' : false
          }, options || {});

      var element = $(this),
          combined = '',
          fields = element.find(':input'),
          parts = [];

      // filter and retrieve all fields with class = combineClass
      $.each(fields, function(i, field){
        if ( $(field).hasClass(settings.combineClass) ) {
          parts.push(field);
        }
      });

      // exclude specified fields
      parts = $(parts).not(settings.exclude);

      // retrieve the field values and combine them
      $.each(parts, function(i, part) {
        combined += $(part).val();
      });

      // display combined string in debug mode
      if ( settings.debug ) console.log(combined);

      // insert a new hidden input element containing the combined string value
      // or assign value to an existing input element
      if ( settings.resultElement != '' ) {
        $(settings.resultElement).val(combined);
      } else {
        element.append('<input type="hidden" name="' + element.attr('id') + '-combined' + '" value="' + combined + '"/>');
      }
    });
  }

  /*
   * Decombines the string contained within the specified element and inserts its
   * characters into specified input fields.
   *
   * Essentially does the reverse of the combinate function above.
   */
  $.fn.decombinate = function(options) {
    return this.each(function() {
      /**
       *  Settings
       *
       * 'resultClass'        : (css class) designates the fields to insert the resultant decombined string into (default: 'combinate')
       * 'pieceLength'        : (integer) the number of characters to insert per result field (i.e. each 'piece') (default:  0)
       * 'exclude'            : (css selector) designates elements to exclude from decombination
       * 'debug'              : (boolean) if true, displays console log messages (default: false)
       */
      var settings = $.extend({
            'resultClass' : 'combinate',
            'pieceLength' : 0,
            'exclude' : '',
            'debug' : false
          }, options || {});

      var element = $(this),
          fields = $('.' + settings.resultClass),
          parts = [];

      var combined = element.val();
      if ( settings.debug ) console.log('combined: ' + combined);

      // filter and retrieve all fields with class = resultClass
      $.each(fields, function(i, field){
        if ( $(field).hasClass(settings.resultClass) ) {
          parts.push(field);
        }
      });

      // exclude specified fields
      parts = $(parts).not(settings.exclude);

      // assign appropriate # of chars per field
      $.each(parts, function(i, part) {

        /**
         * determine how many characters to insert (l), prioritized as follows:
         * 1) the specified pieceLength ( assuming it's valid )
         * 2) the piece's (field's) maxlength ( if specified )
         * 3) default pieceLength ( = 1 )
         */

        var l = 1,
            p = $(part),
            pMax = $(part).attr('maxlength');

        // try to use user-defined pieceLength
        if ( settings.pieceLength != 0 ) {
          l = settings.pieceLength;
        }

        // get pMax (piece/field's maxlength)
        // verify that pieceLength is valid
        if ( typeof pMax != 'undefined' ) {
          pMax = Math.abs( parseInt( pMax ) );
          if ( settings.pieceLength > pMax || settings.pieceLength == 0 ) {
            l = pMax;
          }
        }

        // get the piece, revise the combined string
        var piece = combined.slice(0, l);
        combined = combined.slice(l);
        if ( settings.debug ) console.log('[' + i + '] l = ' + l + ' : ' + piece);

        // assign substring to input field
        p.val( piece );
      });
    });
  }

})(jQuery);