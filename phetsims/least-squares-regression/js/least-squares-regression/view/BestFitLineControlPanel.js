// Copyright 2002-2015, University of Colorado Boulder

/**
 * Accordion Box Node that displays check boxes associated with properties of Best Fit Line
 * This Node also displays the best Fit Line Equation and the sum of Squares Barometer Chart
 *
 * @author Martin Veillette (Berea College)
 */

define( function( require ) {
  'use strict';

  // modules
  var AccordionBox = require( 'SUN/AccordionBox' );
  var CheckBox = require( 'SUN/CheckBox' );
  var EquationNode = require( 'LEAST_SQUARES_REGRESSION/least-squares-regression/view/EquationNode' );
  var HStrut = require( 'SUN/HStrut' );
  var inherit = require( 'PHET_CORE/inherit' );
  var LayoutBox = require( 'SCENERY/nodes/LayoutBox' );
  var LSRConstants = require( 'LEAST_SQUARES_REGRESSION/least-squares-regression/LeastSquaresRegressionConstants' );
  var Panel = require( 'SUN/Panel' );
  var Property = require( 'AXON/Property' );
  var SumOfSquaredResidualsChart = require( 'LEAST_SQUARES_REGRESSION/least-squares-regression/view/SumOfSquaredResidualsChart' );
  var Text = require( 'SCENERY/nodes/Text' );

  // strings
  var bestFitLineString = require( 'string!LEAST_SQUARES_REGRESSION/bestFitLine' );
  var residualsString = require( 'string!LEAST_SQUARES_REGRESSION/residuals' );
  var squaredResidualsString = require( 'string!LEAST_SQUARES_REGRESSION/squaredResiduals' );

  /**
   * @param {Graph} graph - model of the graph
   * @param {Array.<DataPoint>} dataPoints
   * @param {Function} onEvent - listener function when points have been added to the graph
   * @param {Object} [options]
   * @constructor
   */
  function BestFitLineControlPanel( graph, dataPoints, onEvent, options ) {

    this.graph = graph;
    var thisControlPanel = this;

    // property of the accordion Box
    this.expandedProperty = new Property( false );

    // Create the chart (barometer) displaying the sum of the squares
    var sumOfSquaredResidualsChart = new SumOfSquaredResidualsChart(
      graph,
      dataPoints,
      graph.getBestFitLineSumOfSquaredResiduals.bind( graph ),
      onEvent,
      LSRConstants.BEST_FIT_LINE_COLOR.SUM_OF_SQUARES_COLOR,
      graph.bestFitLineSquaredResidualsVisibleProperty
    );

    // Create the 'Best Fit Line' equation
    // initial values set the spacing, the correct values for the slope and the intercept will be updated below
    var equationText = new EquationNode( -0.53, -0.53 );
    equationText.visible = false;
    this.equationText = equationText;
    var equationPanel = new Panel( equationText, {
      fill: 'white',
      stroke: 'black',
      cornerRadius: LSRConstants.SMALL_PANEL_CORNER_RADIUS,
      resize: false
    } );
    this.updateBestFitLineEquation();

    // Create the checkBoxes
    var lineCheckBox = CheckBox.createTextCheckBox( bestFitLineString, { font: LSRConstants.CHECK_BOX_TEXT_FONT }, graph.bestFitLineVisibleProperty );
    var residualsCheckBox = CheckBox.createTextCheckBox( residualsString, { font: LSRConstants.CHECK_BOX_TEXT_FONT }, graph.bestFitLineShowResidualsProperty );
    var squaredResidualsCheckBox = CheckBox.createTextCheckBox( squaredResidualsString, { font: LSRConstants.CHECK_BOX_TEXT_FONT }, graph.bestFitLineShowSquaredResidualsProperty );

    // Expand the touch Area
    lineCheckBox.touchArea = lineCheckBox.localBounds.dilatedXY( 8, 8 );
    residualsCheckBox.touchArea = residualsCheckBox.localBounds.dilatedXY( 8, 8 );
    squaredResidualsCheckBox.touchArea = squaredResidualsCheckBox.localBounds.dilatedXY( 8, 8 );

    // Update the control Panel upon a change of the status of the Best Fit Line CheckBox
    graph.bestFitLineVisibleProperty.link( function( enabled ) {
      // Set Equation to invisible if there is less than one point on the graph
      if ( graph.isLinearFitDefined() ) {
        equationText.visible = enabled;
      }
      equationPanel.opacity = enabled ? 1 : 0.3;
      residualsCheckBox.enabled = enabled;
      squaredResidualsCheckBox.enabled = enabled;
    } );

    // options for the accordion box
    options = _.extend( {
      buttonXMargin: 10,
      buttonYMargin: 10,
      expandedProperty: this.expandedProperty,
      titleNode: new Text( bestFitLineString, { font: LSRConstants.TEXT_FONT_BOLD } ),
      titleXMargin: 0,
      contentXMargin: 10,
      contentYMargin: 10
    }, options );

    AccordionBox.call( this, new LayoutBox( {
        spacing: 10,
        children: [
          lineCheckBox,
          new LayoutBox( { children: [ new HStrut( 20 ), equationPanel ], orientation: 'horizontal' } ),
          residualsCheckBox,
          squaredResidualsCheckBox,
          sumOfSquaredResidualsChart
        ],
        align: 'left'
      } ),
      options );

    // Handle the comings and goings of  dataPoints.
    dataPoints.addItemAddedListener( function( addedDataPoint ) {

      addedDataPoint.positionProperty.link( function() {
        thisControlPanel.updateBestFitLineEquation();
      } );
    } );

    // The title of the control Panel (Accordion Box)  is set to invisible when the control panel is expanded
    this.expandedProperty.link( function( expanded ) {
      options.titleNode.visible = !expanded;
    } );

  }

  return inherit( AccordionBox, BestFitLineControlPanel, {
      /**
       * Reset
       * @public
       */
      reset: function() {
        // Close the accordion Box
        this.expandedProperty.reset();
      },

      /**
       * Update the text of the best Fit Line Equation
       * @public
       */
      updateBestFitLineEquation: function() {
        if ( this.graph.isLinearFitDefined() ) {
          var linearFitParameters = this.graph.getLinearFit();
          this.equationText.setSlopeText( linearFitParameters.slope * this.graph.slopeFactor );
          this.equationText.setInterceptText( linearFitParameters.intercept * this.graph.interceptFactor + this.graph.interceptOffset );
          if ( this.graph.bestFitLineVisibleProperty.value ) {
            this.equationText.visible = true;
          }
        }
        else {
          this.equationText.visible = false;
        }
      }
    }
  )
    ;
} );