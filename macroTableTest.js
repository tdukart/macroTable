(function() {
  module('render data');

  test('empty data message', 2, function() {
    var totalRows = 0,
      totalColumns = 6,
      emptyInitializedMessage = 'Empty initialized message.',
      viewableData,

    tableData = publicFunctions.initializeTable(totalRows, {
      numColumns: totalColumns
    }, {
      emptyInitializedMessage: emptyInitializedMessage
    });

    strictEqual($('#table div.macro-table-message:visible').length, 1, 'Empty data message container is visible');
    strictEqual($('#table div.macro-table-message').text(), emptyInitializedMessage, 'Empty data message matches initialized value');
  });




  module('summary row');

  test('display summary row', 6, function() {
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

  test('remove summary row', 6, function() {
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

  test('display static summary row', 3, function() {
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

  test('remove static summary row', 3, function() {
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




  module('snapshot', {});

  test('snapshot for empty data', 1, function() {
    var totalRows = 0,
      totalColumns = 6,
      viewableData,

    tableData = publicFunctions.initializeTable(totalRows, {
      numColumns: totalColumns
    });

    viewableData = $('#table').macroTable('getTableSnapshot');

    strictEqual(totalRows, viewableData.length, 'Snapshot row count matches initialized row count');
  });

  test('snapshot for total rows within scroll window', 2, function() {
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

  test('snapshot for total rows larger than scroll windw', 2, function() {
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

  /*module('sorting', {
    setup: function() {
      publicFunctions.initializeTable(50, columnOptions, {
        summaryRow: false,
        rowsSelectable: false
      });
    }  
  });

  asyncTest('web worker sort', function() {
    expect(1);

    setTimeout(function() {
      ok(true, "Passed and ready to resume!");
      start();
    }, 1000);
  });

  test('sort by column', 1, function() {
    var event = $.Event('mousedown');
    event.which = 1;
    $(document).trigger(event);
  });

*/
  module('scrolling');



//  module('column manipulation');
})();