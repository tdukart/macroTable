(function() {
  /**
   * Test Module for verifying table is rendering the optional summary row correctly
   * This is a general test suite and not specifically testing a table option/feature
   */
  module('Summary Row');

  test('Display Summary Row', 6, function() {
    var totalRows = 10,
      columnOptions = {
        numColumns: 6
      },
      staticSummaryRowSelector = '#table tr.macro-table-static-summary-row:visible',
      dynamicSummaryRowSelector = '#table tr.macro-table-summary-row:visible',
      viewableData,

    tableData = publicFunctions.initializeTable(totalRows, columnOptions, {
      summaryRow: false,
      rowsSelectable: true //so static column is visible
    });

    strictEqual($(staticSummaryRowSelector).length, 0, 'Static summary row is not visible');
    strictEqual($(dynamicSummaryRowSelector).length, 0, 'Dynamic summary row is not visible');

    $('#table').macroTable('option', 'summaryRow', publicFunctions.generateTableData(1, columnOptions)[0].data); //add summary row

    strictEqual($(staticSummaryRowSelector).length, 1, 'Static summary row is present and visible');
    strictEqual($(dynamicSummaryRowSelector).length, 1, 'Dynamic summary row is present and visible');

    $('#table').macroTable('option', 'summaryRow', false); //remove summary row

    strictEqual($(staticSummaryRowSelector).length, 0, 'Static summary row has been removed');
    strictEqual($(dynamicSummaryRowSelector).length, 0, 'Dynamic summary row has been removed');
  });

  test('Remove Summary Row', 6, function() {
    var totalRows = 10,
      columnOptions = {
        numColumns: 6
      },
      staticSummaryRowSelector = '#table tr.macro-table-static-summary-row:visible',
      dynamicSummaryRowSelector = '#table tr.macro-table-summary-row:visible',
      summaryRow = publicFunctions.generateTableData(1, columnOptions)[0].data,
      viewableData,

    tableData = publicFunctions.initializeTable(totalRows, columnOptions, {
      summaryRow: summaryRow,
      rowsSelectable: true //so static column is visible
    });

    strictEqual($(staticSummaryRowSelector).length, 1, 'Static summary row is present and visible');
    strictEqual($(dynamicSummaryRowSelector).length, 1, 'Dynamic summary row is present and visible');

    $('#table').macroTable('option', 'summaryRow', false); //remove summary row

    strictEqual($(staticSummaryRowSelector).length, 0, 'Static summary row has been removed');
    strictEqual($(dynamicSummaryRowSelector).length, 0, 'Dynamic summary row has been removed');

    $('#table').macroTable('option', 'summaryRow', summaryRow); //add summary row back

    strictEqual($(staticSummaryRowSelector).length, 1, 'Static summary row has been added back');
    strictEqual($(dynamicSummaryRowSelector).length, 1, 'Dynamic summary row has been added back');
  });

  test('Display Static Summary Row', 3, function() {
    var totalRows = 10,
      columnOptions = {
        numColumns: 6
      },
      staticSummaryRowSelector = '#table tr.macro-table-static-summary-row:visible',
      summaryRow = publicFunctions.generateTableData(1, columnOptions)[0].data,
      viewableData,

    tableData = publicFunctions.initializeTable(totalRows, columnOptions, {
      summaryRow: summaryRow
    });

    strictEqual($(staticSummaryRowSelector).length, 0, 'Static summary row is not visible');

    $('#table').macroTable('option', 'rowsSelectable', true); //add the static column

    strictEqual($(staticSummaryRowSelector).length, 1, 'Static summary row is present and visible');

    $('#table').macroTable('option', 'rowsSelectable', false); //remove the statuc column

    strictEqual($(staticSummaryRowSelector).length, 0, 'Static summary row has been removed');
  });

  test('Remove Static Summary Row', 3, function() {
    var totalRows = 10,
      columnOptions = {
        numColumns: 6
      },
      staticSummaryRowSelector = '#table tr.macro-table-static-summary-row:visible',
      summaryRow = publicFunctions.generateTableData(1, columnOptions)[0].data,
      viewableData,

    tableData = publicFunctions.initializeTable(totalRows, columnOptions, {
      summaryRow: summaryRow,
      rowsSelectable: true //so static column is visible
    });

    strictEqual($(staticSummaryRowSelector).length, 1, 'Static summary row is present and visible');

    $('#table').macroTable('option', 'rowsSelectable', false); //remove the statuc column

    strictEqual($(staticSummaryRowSelector).length, 0, 'Static summary row has been removed');

    $('#table').macroTable('option', 'rowsSelectable', true); //add the static column

    strictEqual($(staticSummaryRowSelector).length, 1, 'Static summary row has been added back');
  });
})();