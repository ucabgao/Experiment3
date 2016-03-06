// Copyright 2002-2015, University of Colorado Boulder

/**
 * Main View for the simulation screen of Least Squares Regression.
 *
 * @author Martin Veillette (Berea College)
 */
define( function( require ) {
  'use strict';

  // modules
  var BestFitLineControlPanel = require( 'LEAST_SQUARES_REGRESSION/least-squares-regression/view/BestFitLineControlPanel' );
  var Bounds2 = require( 'DOT/Bounds2' );
  var BucketFront = require( 'SCENERY_PHET/bucket/BucketFront' );
  var BucketHole = require( 'SCENERY_PHET/bucket/BucketHole' );
  var CheckBox = require( 'SUN/CheckBox' );
  var DataPointCreatorNode = require( 'LEAST_SQUARES_REGRESSION/least-squares-regression/view/DataPointCreatorNode' );
  var DynamicDataPointNode = require( 'LEAST_SQUARES_REGRESSION/least-squares-regression/view/DynamicDataPointNode' );
  var DataSet = require( 'LEAST_SQUARES_REGRESSION/least-squares-regression/model/DataSet' );
  var DataSetComboBox = require( 'LEAST_SQUARES_REGRESSION/least-squares-regression/view/DataSetComboBox' );
  var Dimension2 = require( 'DOT/Dimension2' );
  var EraserButton = require( 'SCENERY_PHET/buttons/EraserButton' );
  var GraphAxesNode = require( 'LEAST_SQUARES_REGRESSION/least-squares-regression/view/GraphAxesNode' );
  var GraphNode = require( 'LEAST_SQUARES_REGRESSION/least-squares-regression/view/GraphNode' );
  var GridIcon = require( 'LEAST_SQUARES_REGRESSION/least-squares-regression/view/GridIcon' );
  var inherit = require( 'PHET_CORE/inherit' );
  var LSRConstants = require( 'LEAST_SQUARES_REGRESSION/least-squares-regression/LeastSquaresRegressionConstants' );
  var ModelViewTransform2 = require( 'PHETCOMMON/view/ModelViewTransform2' );
  var MyLineControlPanel = require( 'LEAST_SQUARES_REGRESSION/least-squares-regression/view/MyLineControlPanel' );
  var Node = require( 'SCENERY/nodes/Node' );
  var PearsonCorrelationCoefficientNode = require( 'LEAST_SQUARES_REGRESSION/least-squares-regression/view/PearsonCorrelationCoefficientNode' );
  var Plane = require( 'SCENERY/nodes/Plane' );
  var ResetAllButton = require( 'SCENERY_PHET/buttons/ResetAllButton' );
  var ScreenView = require( 'JOIST/ScreenView' );
  var SourceAndReferenceNode = require( 'LEAST_SQUARES_REGRESSION/least-squares-regression/view/SourceAndReferenceNode' );
  var StaticDataPointNode = require( 'LEAST_SQUARES_REGRESSION/least-squares-regression/view/StaticDataPointNode' );
  var TextPushButton = require( 'SUN/buttons/TextPushButton' );
  var Vector2 = require( 'DOT/Vector2' );

  // strings
  var questionMarkString = require( 'string!LEAST_SQUARES_REGRESSION/questionMark' );

  // constants
  var GRAPH_BOUNDS = new Dimension2( 480, 480 ); // Size of the graph Node
  var GRAPH_OFFSET = new Vector2( 10, 0 ); // Offset Vector from the center of the screen
  var IDENTITY_TRANSFORM = ModelViewTransform2.createIdentity();
  var DATA_POINT_CREATOR_OFFSET_POSITIONS = [
    // Offsets used for initial position of point, relative to bucket hole center. Empirically determined.
    new Vector2( -35, -5 ),
    new Vector2( -25, -9 ),
    new Vector2( -20, -4 ),
    new Vector2( -15, -14 ),
    new Vector2( -10, -4 ),
    new Vector2( -5, -17 ),
    new Vector2( -0, -5 ),
    new Vector2( 5, -14 ),
    new Vector2( 10, -3 ),
    new Vector2( 15, -7 ),
    new Vector2( 25, -4 )
  ];

  /**
   * @param {LeastSquaresRegressionModel} model
   * @constructor
   */
  function LeastSquaresRegressionScreenView( model ) {

    ScreenView.call( this, { renderer: 'svg', layoutBounds: new Bounds2( 0, 0, 1024, 618 ) } );

    var thisView = this;

    // Bounds of the graph (excluding the axes and labels) in scenery coordinates
    var viewGraphBounds = new Bounds2(
      this.layoutBounds.centerX - GRAPH_BOUNDS.width / 2 + GRAPH_OFFSET.x,
      this.layoutBounds.centerY - GRAPH_BOUNDS.height / 2 + GRAPH_OFFSET.y,
      this.layoutBounds.centerX + GRAPH_BOUNDS.width / 2 + GRAPH_OFFSET.x,
      this.layoutBounds.centerY + GRAPH_BOUNDS.height / 2 + GRAPH_OFFSET.y
    );
    var modelViewTransform = ModelViewTransform2.createRectangleInvertedYMapping( model.graph.bounds, viewGraphBounds );

    // Options for the two panels
    var panelOptions = {
      resize: false,
      cornerRadius: LSRConstants.CONTROL_PANEL_CORNER_RADIUS,
      fill: LSRConstants.CONTROL_PANEL_BACKGROUND_COLOR,
      align: 'left',
      xMargin: 10,
      yMargin: 10
    };
    // Create the "Best Fit Line" Control Panel (located to the right of the graph)
    var bestFitLineControlPanel = new BestFitLineControlPanel( model.graph, model.dataPoints, model.on.bind( model ), panelOptions );

    // Create the "My Line" Control Panel (located to the left of the graph)
    var myLineControlPanel = new MyLineControlPanel( model.graph, model.dataPoints, model.on.bind( model ), panelOptions );

    // Create the Graph Node which is responsible for 'My Line', 'Best Fit Line' and the Residuals representation
    var graphNode = new GraphNode( model.graph, viewGraphBounds, modelViewTransform );

    // Create the Graph Axes, including the tick marks, labels and axis titles
    var graphAxesNode = new GraphAxesNode( model.selectedDataSet, modelViewTransform, model.showGridProperty );

    // Create the dataSet combo box that appears on top of the graph
    var dataSetListParent = new Node();
    var dataSetComboBox = new DataSetComboBox( model.dataSets, model.selectedDataSetProperty, dataSetListParent );

    // Create a Push Button (next to the ComboBox) that can activate a dialog Node (Source and Reference Node) associated with each dataSet.
    var sourceAndReferenceNode = new SourceAndReferenceNode( model.selectedDataSetProperty, this.layoutBounds );
    var sourceAndReferencePushButton = new TextPushButton( questionMarkString, {
      baseColor: 'gray',
      font: LSRConstants.TEXT_FONT_BOLD,
      listener: function() {
        thisView.updateSourceAndReferenceNodeVisibility( sourceAndReferenceNode );
      }
    } );

    // Create the nodes that will be used to layer things visually.
    var backLayer = new Node();
    // Create the layer where the points will be placed. They are maintained in a separate layer so that they are over
    // all of the point placement graphs in the z-order.
    var dataPointsLayer = new Node( { layerSplit: true } ); // Force the moving dataPoint into a separate layer for performance reasons.
    var bucketFrontLayer = new Node();

    // Add the bucket view elements
    var bucketFront = new BucketFront( model.bucket, IDENTITY_TRANSFORM );
    bucketFrontLayer.addChild( bucketFront );
    var bucketHole = new BucketHole( model.bucket, IDENTITY_TRANSFORM );
    backLayer.addChild( bucketHole );

    // Add the dataPoint creator nodes. These must be added on the backLayer but after the bucket hole for proper layering.
    DATA_POINT_CREATOR_OFFSET_POSITIONS.forEach( function( offset ) {
      backLayer.addChild( new DataPointCreatorNode(
        model.addUserCreatedDataPoint.bind( model ),
        modelViewTransform, {
          left: bucketHole.centerX + offset.x,
          top:  bucketHole.centerY + offset.y
        } ) );
    } );

    // Create the button that allows the graph to be cleared of all dataPoints.
    var eraserButton = new EraserButton( {
      right: bucketFront.right - 3,
      top:   bucketFront.bottom + 5,
      iconWidth: 25,
      listener: function() {
        model.returnAllDataPointsToBucket();
      }
    } );

    // Create the Pearson Correlation coefficient panel
    var pearsonCorrelationCoefficientNode = new PearsonCorrelationCoefficientNode( model.graph, panelOptions );

    // Create grid check box with grid icon
    var gridCheckBox = new CheckBox( new GridIcon(), model.showGridProperty );

    // Add the graphAxesNode
    this.addChild( graphAxesNode );

    // Link the comboBox selectedDataSet to the Scene Graph
    model.selectedDataSetProperty.link( function( selectedDataSet ) {

      // Remove graphAxesNode from the scene graph if it exists
      if ( graphAxesNode ) {
        graphAxesNode.dispose();
        thisView.removeChild( graphAxesNode );
      }

      // Create and add the GraphAxesNode corresponding to the selected DataSet
      var dataSetBounds = new Bounds2( selectedDataSet.xRange.min, selectedDataSet.yRange.min, selectedDataSet.xRange.max, selectedDataSet.yRange.max );
      // GraphAxesNode require a special modelView Transform that is set by the dataSet
      var modelViewTransformAxes = ModelViewTransform2.createRectangleInvertedYMapping( dataSetBounds, viewGraphBounds );
      graphAxesNode = new GraphAxesNode( selectedDataSet, modelViewTransformAxes, model.showGridProperty );
      thisView.addChild( graphAxesNode );
      graphAxesNode.moveToBack(); //

      // Update the graphNode (will populate it with the new dataPoints)
      graphNode.update();

      // Update the Pearson Correlation Coefficient Panel
      pearsonCorrelationCoefficientNode.update();

      // Update the Best fit Line Equation in the best Fit Line Control Panel, (regardless of the status of the node visibility )
      bestFitLineControlPanel.updateBestFitLineEquation();

      // The bucket, eraser button must be present when custom data set is selected whereas the pushButton next to the comboBox box must be set to invisible
      if ( selectedDataSet === DataSet.CUSTOM ) {
        bucketFront.visible = true;
        eraserButton.visible = true;
        backLayer.visible = true;
        sourceAndReferencePushButton.visible = false;
      }
      else {
        bucketFront.visible = false;
        eraserButton.visible = false;
        backLayer.visible = false;
        sourceAndReferencePushButton.visible = true;
      }
    } );

    // Handle the comings and goings of dataPoints.
    model.dataPoints.addItemAddedListener( function( addedDataPoint ) {

      if ( model.selectedDataSet === DataSet.CUSTOM ) {
        // Create and add the view representation for this dataPoint.
        // DataPoints are movable
        var dynamicDataPointNode = new DynamicDataPointNode( addedDataPoint, modelViewTransform );
        dataPointsLayer.addChild( dynamicDataPointNode );

        // Listener for position
        var positionPropertyListener = function() {
          graphNode.update();
          pearsonCorrelationCoefficientNode.update();
        };

        // Update graph upon a change of position of a dataPoint
        addedDataPoint.positionProperty.link( positionPropertyListener );

        // Listener for userControlled
        var userControlledPropertyListener = function( userControlled ) {
          if ( userControlled ) {
            dynamicDataPointNode.moveToFront();
          }
        };

        // Move the dataPoint to the front of this layer when grabbed by the user.
        addedDataPoint.userControlledProperty.link( userControlledPropertyListener );

        // Add the removal listener for if and when this dataPoint is removed from the model.
        model.dataPoints.addItemRemovedListener( function removalListener( removedDataPoint ) {
          if ( removedDataPoint === addedDataPoint ) {

            // unlink the listeners on removedDataPoint
            removedDataPoint.positionProperty.unlink( positionPropertyListener );
            removedDataPoint.userControlledProperty.unlink( userControlledPropertyListener );
            dynamicDataPointNode.dispose();
            // remove the representation of the dataPoint from the scene graph
            dataPointsLayer.removeChild( dynamicDataPointNode );
            model.dataPoints.removeItemRemovedListener( removalListener );
          }
        } );
      }
      // For all other DataSets than CUSTOM, the dataPoints are static
      else {
        // Create and add the view representation for this dataPoint.
        // The dataPoints are static (not movable)
        var staticDataPointNode = new StaticDataPointNode( addedDataPoint, modelViewTransform );
        dataPointsLayer.addChild( staticDataPointNode );

        // Add the removal listener for if and when this dataPoint is removed from the model.
        model.dataPoints.addItemRemovedListener( function removalListener( removedDataPoint ) {
          if ( removedDataPoint === addedDataPoint ) {
            staticDataPointNode.dispose();
            dataPointsLayer.removeChild( staticDataPointNode );
            model.dataPoints.removeItemRemovedListener( removalListener );
          }
        } );
      }
    } );

    // Create the 'Reset All' Button at the bottom right, which resets the model and some view elements
    var resetAllButton = new ResetAllButton( {
      listener: function() {
        model.reset();
        graphNode.reset();
        pearsonCorrelationCoefficientNode.reset();
        bestFitLineControlPanel.reset();
      },
      right:  this.layoutBounds.maxX - 10,
      bottom: this.layoutBounds.maxY - 10
    } );

    // Add nodes to the scene graph. Order is irrelevant for the following nodes
    this.addChild( pearsonCorrelationCoefficientNode );
    this.addChild( gridCheckBox );
    this.addChild( eraserButton );
    this.addChild( resetAllButton );
    this.addChild( bestFitLineControlPanel );
    this.addChild( myLineControlPanel );
    this.addChild( dataSetComboBox );
    this.addChild( sourceAndReferencePushButton );
    this.addChild( backLayer );
    this.addChild( graphNode );

    // Order matters here. These must come last
    this.addChild( bucketFrontLayer ); //must come after back layer
    this.addChild( dataPointsLayer ); // after everything but dataSetLisParent
    this.addChild( dataSetListParent ); // last, so that dataSet box list is on top of dataPoint and the graph

    // Layout all the other nodes
    {
      myLineControlPanel.right = this.layoutBounds.maxX - 10;
      myLineControlPanel.top = 20;
      bestFitLineControlPanel.left = 15;
      bestFitLineControlPanel.top = myLineControlPanel.top;
      dataSetComboBox.centerX = viewGraphBounds.centerX;
      dataSetComboBox.top = myLineControlPanel.top;
      gridCheckBox.left = myLineControlPanel.left + 10;
      gridCheckBox.top = myLineControlPanel.bottom + 10;
      pearsonCorrelationCoefficientNode.centerX = bestFitLineControlPanel.centerX;
      pearsonCorrelationCoefficientNode.centerY = viewGraphBounds.centerY;
      sourceAndReferencePushButton.centerY = dataSetComboBox.centerY;
      sourceAndReferencePushButton.left = dataSetComboBox.right + 10;
    }

  }

  return inherit( ScreenView, LeastSquaresRegressionScreenView, {

    /**
     * This is taken from MoleculesAndLightScreenView with modifications.
     *
     * Update the Source and Reference 'Dialog-like' Node visibility.  This node has behavior which is identical to the about dialog
     * window, and this code is heavily borrowed from AboutDialog.js.
     *
     * @param {SourceAndReferenceNode} sourceAndReferenceNode - The SourceAndReferenceNode whose visibility should be updated.
     * @private
     */
    updateSourceAndReferenceNodeVisibility: function( sourceAndReferenceNode ) {
      // Renderer must be specified here because the plane is added directly to the scene (instead of to some other node
      // that already has svg renderer)
      var plane = new Plane( { fill: 'black', opacity: 0.3, renderer: 'svg' } );
      this.addChild( plane );
      this.addChild( sourceAndReferenceNode );

      var sourceAndReferenceListener = {
        up: function() {
          sourceAndReferenceNode.removeInputListener( sourceAndReferenceListener );
          plane.addInputListener( sourceAndReferenceListener );
          sourceAndReferenceNode.detach();
          plane.detach();
        }
      };

      sourceAndReferenceNode.addInputListener( sourceAndReferenceListener );
      plane.addInputListener( sourceAndReferenceListener );

    }
  } );
} );