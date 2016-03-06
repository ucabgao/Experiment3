// Copyright 2002-2015, University of Colorado Boulder

/**
 * Combo box for selecting a dataSet.
 *
 * @author Martin Veillette (Berea College)
 */
define( function( require ) {
  'use strict';

  // modules
  var ComboBox = require( 'SUN/ComboBox' );
  var inherit = require( 'PHET_CORE/inherit' );
  var LSRConstants = require( 'LEAST_SQUARES_REGRESSION/least-squares-regression/LeastSquaresRegressionConstants' );
  var Node = require( 'SCENERY/nodes/Node' );
  var Text = require( 'SCENERY/nodes/Text' );

  /**
   * @param {Array.<DataSet>} dataSets
   * @param {Property.<DataSet>} selectedDataSetProperty
   * @param {Node} dataSetListParent
   * @constructor
   */

  function DataSetComboBox( dataSets, selectedDataSetProperty, dataSetListParent ) {

    // items
    var items = [];
    for ( var i = 0; i < dataSets.length; i++ ) {
      var dataSet = dataSets[ i ];
      items[ i ] = createItem( dataSet );
    }

    ComboBox.call( this, items, selectedDataSetProperty, dataSetListParent, {
      listPosition: 'below',
      itemYMargin: 2,
      itemHighlightFill: LSRConstants.ITEM_HIGHLIGHT_FILL,
      buttonLineWidth: 1,
      buttonCornerRadius: LSRConstants.SMALL_PANEL_CORNER_RADIUS
    } );
  }

  /**
   * Creates an item for the combo box.
   * @param {DataSet} dataSet
   * @returns {*|{node: *, value: *}}
   */
  var createItem = function( dataSet ) {
    var node = new Node();
    // label
    var textNode = new Text( dataSet.name, { font: LSRConstants.TEXT_FONT } );
    node.addChild( textNode );
    return ComboBox.createItem( node, dataSet );
  };

  return inherit( ComboBox, DataSetComboBox );
} );