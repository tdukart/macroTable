(function() {
  var tableData, sortColumn0Descending;

  /**
   * Test Module for testing the ability to sort rows by column
   */
  module('Column Sorting', {
    setup: function() {
      tableData = [{
        index: 0,
        data: {
          column0: '1',
          column1: 'c',
          column2: 'B'
        }
      }, {
        index: 1,
        data: {
          column0: '2',
          column1: 'b',
          column2: 'A'
        }
      }, {
        index: 2,
        data: {
          column0: '3',
          column1: 'a',
          column2: 'C'
        },
        subRows: [{
          index: '2,0',
          data: {
            column0: '1',
            column1: 'c',
            column2: 'B'
          }
        }, {
          index: '2,1',
          data: {
            column0: '2',
            column1: 'b',
            column2: 'A'
          }
        }, {
          index: '2,2',
          data: {
            column0: '3',
            column1: 'a',
            column2: 'C'
          }
        }]
      }];

      sortColumn0Descending = [[
        {
          "column0": "3"
        },
        {
          "column1": "a"
        },
        {
          "column2": "C"
        }
      ],
      [
        {
          "column0": "3"
        },
        {
          "column1": "a"
        },
        {
          "column2": "C"
        }
      ],
      [
        {
          "column0": "2"
        },
        {
          "column1": "b"
        },
        {
          "column2": "A"
        }
      ],
      [
        {
          "column0": "1"
        },
        {
          "column1": "c"
        },
        {
          "column2": "B"
        }
      ],
      [
        {
          "column0": "2"
        },
        {
          "column1": "b"
        },
        {
          "column2": "A"
        }
      ],
      [
        {
          "column0": "1"
        },
        {
          "column1": "c"
        },
        {
          "column2": "B"
        }
      ]];
    }
  });

  asyncTest('Columns Sortable for Empty Table (Click)', 2, function() {
    publicFunctions.initializeTable(0, {
      numColumns: 3
    });

    var $firstColumnHeader = $('#table th.macro-table-column-sortable').first(),
      $headerTable = $('div.macro-table-header-wrapper div.macro-table-header table'),
      event;

    event = $.Event('click');
    event.target = $firstColumnHeader[0];
    $headerTable.trigger(event);

    setTimeout(function() {
      ok($firstColumnHeader.hasClass('macro-table-sort-ascending'), 'Column is ordered ascending');

      event = $.Event('click');
      event.target = $firstColumnHeader[0];
      $headerTable.trigger(event);

      setTimeout(function() {
        ok($firstColumnHeader.hasClass('macro-table-sort-descending'), 'Column is ordered descending');
        start();
      }, 100);
    }, 100);
  });

  asyncTest('Columns Sortable for Empty Table Ascending (Programmatically)', 1, function() {
    publicFunctions.initializeTable(tableData, {
      numColumns: 3
    }, {
      sortByColumn: 'column0'
    });

    var $firstColumnHeader = $('#table th.macro-table-column-sortable').first();

    setTimeout(function() {
      ok($firstColumnHeader.hasClass('macro-table-sort-ascending'), 'Column is ordered ascending');
      start();
    }, 100);
  });

  asyncTest('Columns Sortable for Empty Table Descending (Programmatically)', 1, function() {
    publicFunctions.initializeTable(tableData, {
      numColumns: 3,
      direction: {
        0: -1 //sort descending for column0
      }
    }, {
      sortByColumn: 'column0'
    });

    var $firstColumnHeader = $('#table th.macro-table-column-sortable').first();

    setTimeout(function() {
      ok($firstColumnHeader.hasClass('macro-table-sort-descending'), 'Column is ordered descending');
      start();
    }, 100);
  });

  asyncTest('Initialize Table with Descending Ordered Column', 2, function() {
    tableData[2].expanded = true;
    publicFunctions.initializeTable(0, {
      numColumns: 3,
      direction: {
        0: -1 //sort descending for column0
      }
    }, {
      sortByColumn: 'column0'
    });

    var $firstColumnHeader = $('#table th.macro-table-column-sortable').first();

    setTimeout(function() {
      $('#table').macroTable('option', 'tableData', tableData);

      setTimeout(function() {
        ok($firstColumnHeader.hasClass('macro-table-sort-descending'), 'Column is ordered descending');
        deepEqual($('#table').macroTable('getTableSnapshot'), sortColumn0Descending, 'Table snapshot ordered first column descending');
        start();
      }, 100);
    }, 100);
  });

  asyncTest('Reinitialize Table with Descending Ordered Column (Sorted by Click)', 4, function() {
    tableData[2].expanded = true;
    publicFunctions.initializeTable(tableData, {
      numColumns: 3
    });

    var $firstColumnHeader = $('#table th.macro-table-column-sortable').first(),
      $headerTable = $('div.macro-table-header-wrapper div.macro-table-header table'),
      event;

    event = $.Event('click');
    event.target = $firstColumnHeader[0];
    $headerTable.trigger(event);

    setTimeout(function() {
      event = $.Event('click');
      event.target = $firstColumnHeader[0];
      $headerTable.trigger(event);

      setTimeout(function() {
        ok($firstColumnHeader.hasClass('macro-table-sort-descending'), 'Column is ordered descending');
        deepEqual($('#table').macroTable('getTableSnapshot'), sortColumn0Descending, 'Table snapshot ordered first column descending');

        $('#table').macroTable('option', 'tableData', tableData);

        setTimeout(function() {
          ok($firstColumnHeader.hasClass('macro-table-sort-descending'), 'Column is still ordered descending');
          deepEqual($('#table').macroTable('getTableSnapshot'), sortColumn0Descending, 'Table snapshot ordered first column still descending after data reload');
          start();
        }, 100);
      }, 100);
    }, 100);
  });

  asyncTest('Reinitialize Table with Descending Ordered Column (Sorted Programmatically)', 4, function() {
    tableData[2].expanded = true;
    publicFunctions.initializeTable(tableData, {
      numColumns: 3,
      direction: {
        0: -1 //sort descending for column0
      }
    }, {
      sortByColumn: 'column0'
    });

    var $firstColumnHeader = $('#table th.macro-table-column-sortable').first();

    setTimeout(function() {
      ok($firstColumnHeader.hasClass('macro-table-sort-descending'), 'Column is ordered descending');
      deepEqual($('#table').macroTable('getTableSnapshot'), sortColumn0Descending, 'Table snapshot ordered first column descending');

      $('#table').macroTable('option', 'tableData', tableData);

      setTimeout(function() {
        ok($firstColumnHeader.hasClass('macro-table-sort-descending'), 'Column is still ordered descending');
        deepEqual($('#table').macroTable('getTableSnapshot'), sortColumn0Descending, 'Table snapshot ordered first column still descending after data reload');
        start();
      }, 100);
    }, 100);
  });

/*
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
})();