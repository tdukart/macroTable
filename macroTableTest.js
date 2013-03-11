(function() {

  module('snapshot', {});

  test('snapshot for total rows within scroll windw', 2, function() {
    var totalRows = 10,
      totalColumns = 6,
      viewableData,

    tableData = publicFunctions.initializeTable(totalRows, {
      numColumns: totalColumns
    }, {
      summaryRow: false,
      rowsSelectable: false
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
    }, {
      summaryRow: false,
      rowsSelectable: false
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

/*
  module('scrolling');


  module('column manipulation');
*/
})();