(function() {
  /**
   * Test Module for verifying table is sizing and rendering correctly
   * This is a general test suite and not specifically testing a table option/feature
   */
  module('Widget DOM Rendering');

  test('Table Uses Default Dimensions', 2, function() {
    //shows 10 rows worth of height + header, and fits width to 100%

    var totalRows = 11,
      totalColumns = 6,

    tableData = publicFunctions.initializeTable(totalRows, {
      numColumns: totalColumns
    });

    strictEqual($('#table').outerWidth(), $('#qunit-fixture .wrapper').width(), 'Table width fits the width of the container');
    strictEqual($('#table .macro-table-data-container-wrapper').height(), $('#table').macroTable('option', 'defaultTableHeightInRows') * $('#table').macroTable('option', 'rowHeight'), 'Table data container height matches theoretical default (max rows in viewport * default row height) size');
  });

  test('Table Fits to Dimensioned Container', 2, function() {
    var totalRows = 0,
      totalColumns = 6,
      containerWidth = 200,
      containerHeight = 500,
      tableData;

    $('#qunit-fixture .wrapper').height(containerHeight + 'px')
    .width(containerWidth + 'px');

    tableData = publicFunctions.initializeTable(totalRows, {
      numColumns: totalColumns
    });

    strictEqual($('#table').outerWidth(), $('#qunit-fixture .wrapper').width(), 'Table width fits the width of the container');
    strictEqual($('#table').outerHeight(), $('#qunit-fixture .wrapper').height(), 'Table height fits the height of the container');
  });

  test('Table Renders to User-Defined Dimensions in Non-Dimensioned Container', 2, function() {
    var totalRows = 0,
      totalColumns = 6,
      tableWidth = 200,
      tableHeight = 500,

    tableData = publicFunctions.initializeTable(totalRows, {
      numColumns: totalColumns
    }, {}, false, tableHeight, tableWidth);

    strictEqual($('#table').outerWidth(), tableWidth, 'Table width matches user-defined value');
    strictEqual($('#table').outerHeight(), tableHeight, 'Table height matches user-defined value');
  });

  test('Table Renders to User-Defined Dimensions in Larger, Dimensioned Container', 2, function() {
    var totalRows = 0,
      totalColumns = 6,
      tableWidth = 200,
      tableHeight = 500,
      containerWidth = 300,
      containerHeight = 600,
      tableData;

    $('#qunit-fixture .wrapper').height(containerHeight + 'px')
    .width(containerWidth + 'px');

    tableData = publicFunctions.initializeTable(totalRows, {
      numColumns: totalColumns
    }, {}, false, tableHeight, tableWidth);

    strictEqual($('#table').outerWidth(), tableWidth, 'Table width matches user-defined value');
    strictEqual($('#table').outerHeight(), tableHeight, 'Table height matches user-defined value');
  });

  test('Table Renders to User-Defined Dimensions in Smaller, Dimensioned Container', 2, function() {
    var totalRows = 0,
      totalColumns = 6,
      tableWidth = 200,
      tableHeight = 500,
      containerWidth = 100,
      containerHeight = 400,
      tableData;

    $('#qunit-fixture .wrapper').css('overflow', 'auto')
    .height(containerHeight + 'px')
    .width(containerWidth + 'px');

    tableData = publicFunctions.initializeTable(totalRows, {
      numColumns: totalColumns
    }, {}, false, tableHeight, tableWidth);

    strictEqual($('#table').outerWidth(), tableWidth, 'Table width matches user-defined value');
    strictEqual($('#table').outerHeight(), tableHeight, 'Table height matches user-defined value');
  });
})();