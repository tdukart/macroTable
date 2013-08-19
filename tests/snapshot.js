(function() {
  /**
   * Test Module for testing the snapshot table feature
   */
  module('Snapshot', {});

  test('Snapshot for Empty Data', 1, function() {
    var totalRows = 0,
      totalColumns = 6,
      viewableData,

    tableData = publicFunctions.initializeTable(totalRows, {
      numColumns: totalColumns
    });

    viewableData = $('#table').macroTable('getTableSnapshot');

    strictEqual(totalRows, viewableData.length, 'Snapshot row count matches initialized row count');
  });

  test('Snapshot for Total Rows within Scroll Window', 2, function() {
    var totalRows = 10,
      totalColumns = 6,
      viewableData,

    tableData = publicFunctions.initializeTable(totalRows, {
      numColumns: totalColumns
    });

    viewableData = $('#table').macroTable('getTableSnapshot');

    strictEqual(totalRows, viewableData.length, 'Snapshot row count matches initialized row count');
    strictEqual(totalColumns, viewableData[0].length, 'Snapshot column count matches initialized column count');
  });

  test('Snapshot for Total Rows Larger than Scroll Window', 2, function() {
    var totalRows = 50,
      totalColumns = 6,
      viewableData,

    tableData = publicFunctions.initializeTable(totalRows, {
      numColumns: totalColumns
    });

    viewableData = $('#table').macroTable('getTableSnapshot');

    strictEqual(totalRows, viewableData.length, 'Snapshot row count matches initialized row count');
    strictEqual(totalColumns, viewableData[0].length, 'Snapshot column count matches initialized column count');
  });
})();