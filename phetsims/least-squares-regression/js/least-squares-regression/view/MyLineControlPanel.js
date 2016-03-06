// Copyright 2002-2015, University of Colorado Boulder

/**
 * Scenery Node representing a Control Panel with check Boxes and Sliders that controls properties of My Line
 *
 * @author Martin Veillette (Berea College)
 */

define( function( require ) {
  'use strict';

  // modules
  var CheckBox = require( 'SUN/CheckBox' );
  var Dimension2 = require( 'DOT/Dimension2' );
  var EquationNode = require( 'LEAST_SQUARES_REGRESSION/least-squares-regression/view/EquationNode' );
  var HStrut = require( 'SUN/HStrut' );
  var HSlider = require( 'SUN/HSlider' );
  var inherit = require( 'PHET_CORE/inherit' );
  var LayoutBox = require( 'SCENERY/nodes/LayoutBox' );
  var LSRConstants = require( 'LEAST_SQUARES_REGRESSION/least-squares-regression/LeastSquaresRegressionConstants' );
  var Node = require( 'SCENERY/nodes/Node' );
  var Panel = require( 'SUN/Panel' );
  var Range = require( 'DOT/Range' );
  var SumOfSquaredResidualsChart = require( 'LEAST_SQUARES_REGRESSION/least-squares-regression/view/SumOfSquaredResidualsChart' );
  var Text = require( 'SCENERY/nodes/Text' );

  // strings
  var aString = require( 'string!LEAST_SQUARES_REGRESSION/a' );
  var bString = require( 'string!LEAST_SQUARES_REGRESSION/b' );
  var xString = require( 'string!LEAST_SQUARES_REGRESSION/symbol.x' );
  var yString = require( 'string!LEAST_SQUARES_REGRESSION/symbol.y' );
  var plusString = '\u002B'; // we want a large + sign
  var myLineString = require( 'string!LEAST_SQUARES_REGRESSION/myLine' );
  var residualsString = require( 'string!LEAST_SQUARES_REGRESSION/residuals' );
  var squaredResidualsString = require( 'string!LEAST_SQUARES_REGRESSION/squaredResiduals' );

  // constants
  var SLIDER_OPTIONS = {
    trackFill: 'black',
    trackSize: new Dimension2( 190, 2 ),
    thumbSize: new Dimension2( 15, 30 )
  };
  var TICK_COLOR = 'black';
  var TICK_LENGTH = 8;
  var TICK_WIDTH = 2;

  /**
   * Create a vertical slider with a central tick
   * @param {Property.<number>} property parameter to track.
   * @param {Range} range - Possible range for property.
   * @param {Object} options for slider node.
   * @constructor
   */
  function VerticalSlider( property, range, options ) {
    var sliderNode = new HSlider( property, range, options );

    // make vertical slider by rotating it
    sliderNode.rotate( -Math.PI / 2 );

    //add central tick
    sliderNode.addTick( 0, '', TICK_LENGTH, TICK_COLOR, TICK_WIDTH ); // left side tick
    sliderNode.addTick( 0, '', -TICK_LENGTH - 2 * SLIDER_OPTIONS.trackSize.height, TICK_COLOR, TICK_WIDTH ); // right side tick

    return sliderNode;
  }

  /**
   *
   * @param {Graph} graph
   * @param {Array.<DataPoint>} dataPoints
   * @param {Function} onEvent - listener function when event is trigger
   * @param {Object} [options]
   * @constructor
   */
  function MyLineControlPanel( graph, dataPoints, onEvent, options ) {


    // Create a mutable equation y = {1} x + {2} , the slope and intercept are updated later
    // initial values set the spacing
    var equationText = new EquationNode( -0.53, -0.53 );

    /**
     * Function that updates the value of the current slope (based on the angle of the line)
     * @param {number} angle
     */
    function updateTextSlope( angle ) {
      var slope = graph.slope( angle );
      equationText.setSlopeText( slope * graph.slopeFactor );
    }

    /**
     * Function that updates the value of the intercept
     * @param {number} intercept
     */
    function updateTextIntercept( intercept ) {
      equationText.setInterceptText( intercept * graph.interceptFactor + graph.interceptOffset );
    }

    updateTextIntercept( 0 );
    updateTextSlope( 0 );


    // Create an immutable equation y = a x + b
    var blackOptions = { font: LSRConstants.TEXT_FONT, fill: 'black' };
    var blueOptions = { font: LSRConstants.TEXT_FONT_BOLD, fill: 'blue' };

    var yText = new Text( yString, blackOptions ); // 'y'
    var equalText = new Text( '=', blackOptions ); // the '=' sign
    var aText = new Text( aString, blueOptions ); // a number
    var xText = new Text( xString, blackOptions ); // 'x'
    var signInterceptText = new Text( plusString, blackOptions );// '+'
    var bText = new Text( bString, blueOptions );// a number

    var immutableEquationText = new Node( {
      children: [
        yText,
        equalText,
        aText,
        xText,
        signInterceptText,
        bText
      ]
    } );

    // Layout the immutable equation
    yText.left = equationText.yText.left;
    equalText.left = equationText.equalText.left;
    aText.center = equationText.valueSlopeText.center;
    xText.left = equationText.xText.left;
    signInterceptText.left = equationText.signInterceptText.left;
    bText.center = equationText.valueInterceptText.center;

    // create the equation panel with white background
    var equationPanel = new Panel( equationText, {
      fill: 'white',
      cornerRadius: LSRConstants.SMALL_PANEL_CORNER_RADIUS,
      resize: false
    } );

    // Create two sliders: The aSlider controls the angle of the line and by proxy the slope, the bSlider controls the intercept
    var sliderInterceptRange = new Range( -1.5 * graph.bounds.maxY, 1.5 * graph.bounds.maxY );
    var maxSlope = 10; // determines the maximum slope (using the graph bounds as reference, i.e. the unit square)

    var aSlider = new VerticalSlider( graph.angleProperty, new Range( -Math.atan( maxSlope ), Math.atan( maxSlope ) ), SLIDER_OPTIONS );
    var bSlider = new VerticalSlider( graph.interceptProperty, sliderInterceptRange, SLIDER_OPTIONS );

    // Create label below the sliders
    var aSliderText = new Text( aString, blueOptions );
    var bSliderText = new Text( bString, blueOptions );

    // collect the immutable equation, the mutable equation and the sliders in one node
    var rightAlignedNode = new Node();
    var hStrut = new HStrut( 20 );
    rightAlignedNode.addChild( equationPanel );
    rightAlignedNode.addChild( immutableEquationText );
    rightAlignedNode.addChild( aSlider );
    rightAlignedNode.addChild( bSlider );
    rightAlignedNode.addChild( aSliderText );
    rightAlignedNode.addChild( bSliderText );
    rightAlignedNode.addChild( hStrut );

    // Create three check boxes
    var lineCheckBox = CheckBox.createTextCheckBox( myLineString, { font: LSRConstants.CHECK_BOX_TEXT_FONT }, graph.myLineVisibleProperty );
    var residualsCheckBox = CheckBox.createTextCheckBox( residualsString, { font: LSRConstants.CHECK_BOX_TEXT_FONT }, graph.myLineShowResidualsProperty );
    var squaredResidualsCheckBox = CheckBox.createTextCheckBox( squaredResidualsString, { font: LSRConstants.CHECK_BOX_TEXT_FONT }, graph.myLineShowSquaredResidualsProperty );

    // Expand the touch Area
    lineCheckBox.touchArea = lineCheckBox.localBounds.dilatedXY( 8, 8 );
    residualsCheckBox.touchArea = residualsCheckBox.localBounds.dilatedXY( 8, 8 );
    squaredResidualsCheckBox.touchArea = squaredResidualsCheckBox.localBounds.dilatedXY( 8, 8 );

    // Create the barometer chart for the sum of the squares
    var sumOfSquaredResiduals = new SumOfSquaredResidualsChart(
      graph,
      dataPoints,
      graph.getMyLineSumOfSquaredResiduals.bind( graph ),
      onEvent,
      LSRConstants.MY_LINE_COLOR.SUM_OF_SQUARES_COLOR,
      graph.myLineSquaredResidualsVisibleProperty );

    // assemble all the previous nodes in a vertical box
    var mainBox = new LayoutBox( {
      spacing: 10, children: [
        lineCheckBox,
        rightAlignedNode,
        residualsCheckBox,
        squaredResidualsCheckBox,
        sumOfSquaredResiduals
      ], align: 'left'
    } );

    // layout the internal nodes of the right Aligned Node
    equationPanel.left = hStrut.right;
    equationPanel.top = lineCheckBox.bottom;
    immutableEquationText.top = equationPanel.bottom + 12;
    immutableEquationText.left = equationPanel.left + 5;
    aSlider.top = immutableEquationText.bottom + 10;
    bSlider.top = immutableEquationText.bottom + 10;
    aSlider.centerX = immutableEquationText.left + aText.centerX;
    bSlider.centerX = immutableEquationText.left + bText.centerX;
    aSliderText.top = aSlider.bottom + 8;
    bSliderText.top = bSlider.bottom + 8;
    aSliderText.centerX = aSlider.centerX;
    bSliderText.centerX = bSlider.centerX;

    // call the superconstructor
    Panel.call( this, mainBox, options );

    // Trigger the opacity/non-opacity when checking the myLine checkbox
    graph.myLineVisibleProperty.link( function( enabled ) {
      equationText.visible = enabled;
      aSlider.pickable = enabled ? true : false; // enable/disable slider
      bSlider.pickable = enabled ? true : false;// enable/disable slider
      residualsCheckBox.enabled = enabled;
      squaredResidualsCheckBox.enabled = enabled;
      rightAlignedNode.opacity = enabled ? 1 : 0.3;
    } );

    // update the text (slope) of the equation when the aSlider is moving
    graph.angleProperty.link( function( angle ) {
      updateTextSlope( angle );
    } );

    // update the text (intercept) of the equation when the bSlider is moving
    graph.interceptProperty.link( function( intercept ) {
      updateTextIntercept( intercept );
    } );

    // Trigger an update after all the points have been added in bulk to the model
    // Update the equation text
    onEvent( 'DataPointsAdded', function() {
      updateTextSlope( graph.angle );
      updateTextIntercept( graph.intercept );
    } );

  }

  return inherit( Panel, MyLineControlPanel );
} );