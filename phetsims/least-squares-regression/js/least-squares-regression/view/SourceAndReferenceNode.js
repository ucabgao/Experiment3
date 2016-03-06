// Copyright 2002-2015, University of Colorado Boulder

/**
 * Shows a dialog box about the source and references of the selected Data Set.
 *
 * @author Martin Veillette (Berea College)
 */
define( function( require ) {
  'use strict';

  // modules
  var Bounds2 = require( 'DOT/Bounds2' );
  var Circle = require( 'SCENERY/nodes/Circle' );
  var inherit = require( 'PHET_CORE/inherit' );
  var LayoutBox = require( 'SCENERY/nodes/LayoutBox' );
  var Line = require( 'SCENERY/nodes/Line' );
  var LSRConstants = require( 'LEAST_SQUARES_REGRESSION/least-squares-regression/LeastSquaresRegressionConstants' );
  var MultiLineText = require( 'SCENERY_PHET/MultiLineText' );
  var Node = require( 'SCENERY/nodes/Node' );
  var Panel = require( 'SUN/Panel' );
  var ScreenView = require( 'JOIST/ScreenView' );

  // strings
  var sourceString = require( 'string!LEAST_SQUARES_REGRESSION/source' );
  var colonPunctuationString = require( 'string!LEAST_SQUARES_REGRESSION/colonPunctuation' );

  /**
   * @param {Property.<DataSet>} selectedDataSetProperty
   * @constructor
   */
  function SourceAndReferenceNode( selectedDataSetProperty ) {

    /*
     * Use ScreenView, to help center and scale content. Renderer must be specified here because the window is added
     * directly to the scene, instead of to some other node that already has svg renderer.
     */
    ScreenView.call( this, { renderer: 'svg', layoutBounds: new Bounds2( 0, 0, 1024, 618 ) } );

    var screenView = this;

    var referenceText = new MultiLineText( '', { font: LSRConstants.REFERENCE_FONT, align: 'left' } );
    var sourceText = new MultiLineText( '', { font: LSRConstants.SOURCE_FONT, align: 'left' } );

    var children = [
      referenceText,
      sourceText
    ];

    // Create the content box
    var content = new LayoutBox( { align: 'left', spacing: 10, children: children } );

    // Create the panel that contains the source and reference
    var panel = new Panel( content, {
      centerX: this.layoutBounds.centerX,
      centerY: this.layoutBounds.centerY,
      xMargin: 20,
      yMargin: 20,
      fill: 'white',
      stroke: 'black'
    } );

    // Create the 'Closed Button" in the upper right corner with a circle and a cross inside it.
    // The button is not hooked to any listener since the closing of this node is handled in the main screenView
    var buttonSize = 15;
    var buttonLineWidth = 2;
    var circle = new Circle( buttonSize, {
      fill: 'black',
      stroke: 'white',
      lineWidth: buttonLineWidth,
      centerX: 0,
      centerY: 0
    } );
    var l = buttonSize / 3;
    var upSlopeLine = new Line( l, l, -l, -l, { stroke: 'white', lineWidth: buttonLineWidth, centerX: 0, centerY: 0 } );
    var downwardSlopeLine = new Line( l, -l, -l, l, {
      stroke: 'white',
      lineWidth: buttonLineWidth,
      centerX: 0,
      centerY: 0
    } );
    var button = new Node( { children: [ circle, upSlopeLine, downwardSlopeLine ] } );

    // Add a cursor when hovering (see https://github.com/phetsims/least-squares-regression/issues/10)
    button.cursor = 'pointer';

    // Add to this node
    this.addChild( panel );
    this.addChild( button );

    // Update the content of this node and the layout.
    selectedDataSetProperty.link( function( selectedDataSet ) {
      referenceText.text = selectedDataSet.reference;
      sourceText.text = sourceString + colonPunctuationString + selectedDataSet.source;
      panel.centerX = screenView.layoutBounds.centerX;
      panel.centerY = screenView.layoutBounds.centerY;
      button.centerX = panel.right;
      button.centerY = panel.top;
    } );
  }

  return inherit( ScreenView, SourceAndReferenceNode );
} );
