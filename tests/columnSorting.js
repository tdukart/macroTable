(function() {
  var iteration, tableData, sortColumn0Ascending, sortColumn0Descending, sortColumn3DescendingNumeric, sortColumn3DescendingDictionary, sortColumn3DescendingCustom;

  /**
   * Test Module for testing the ability to sort rows by column
   */
  module('Column Sorting', {
    setup: function() {
      iteration = 0;

      tableData = [{
        index: 0,
        data: {
          column0: '1',
          column1: 'c',
          column2: 'B',
          column3: '111'
        }
      }, {
        index: 1,
        data: {
          column0: '2',
          column1: 'b',
          column2: 'A',
          column3: '2'
        }
      }, {
        index: 2,
        data: {
          column0: '3',
          column1: 'a',
          column2: 'C',
          column3: '33'
        },
        subRows: [{
          index: '2,0',
          data: {
            column0: '1',
            column1: 'c',
            column2: 'B',
            column3: '11'
          }
        }, {
          index: '2,1',
          data: {
            column0: '2',
            column1: 'b',
            column2: 'A',
            column3: '222'
          }
        }, {
          index: '2,2',
          data: {
            column0: '3',
            column1: 'a',
            column2: 'C',
            column3: '3'
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

      sortColumn0Ascending = [[
        {
          "column0": "1"
        },
        {
          "column1": "c"
        },
        {
          "column2": "B"
        }
      ],[
        {
          "column0": "2"
        },
        {
          "column1": "b"
        },
        {
          "column2": "A"
        }
      ],[
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
          "column0": "3"
        },
        {
          "column1": "a"
        },
        {
          "column2": "C"
        }
      ]];

      sortColumn3DescendingNumeric = [[
        {
          "column0": "1"
        },
        {
          "column1": "c"
        },
        {
          "column2": "B"
        },
        {
          "column3": "111"
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
        },
        {
          "column3": "33"
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
        },
        {
          "column3": "222"
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
        },
        {
          "column3": "11"
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
        },
        {
          "column3": "3"
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
        },
        {
          "column3": "2"
        }
      ]];

      sortColumn3DescendingDictionary = [[
        {
          "column0": "3"
        },
        {
          "column1": "a"
        },
        {
          "column2": "C"
        },
        {
          "column3": "33"
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
        },
        {
          "column3": "3"
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
        },
        {
          "column3": "222"
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
        },
        {
          "column3": "11"
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
        },
        {
          "column3": "2"
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
        },
        {
          "column3": "111"
        }
      ]];

      sortColumn3DescendingCustom = [
      [
        {
          "column0": "1"
        },
        {
          "column1": "c"
        },
        {
          "column2": "B"
        },
        {
          "column3": "111"
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
        },
        {
          "column3": "33"
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
        },
        {
          "column3": "222"
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
        },
        {
          "column3": "11"
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
        },
        {
          "column3": "3"
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
        },
        {
          "column3": "2"
        }
      ]];
    }
  });

  asyncTest('Columns Sortable for Empty Table (Click)', 2, function() {
    $('#table').on('macrotablecolumnsort', function(e) {
      switch(iteration++) {
        case 0:
          ok($firstColumnHeader.hasClass('macro-table-sort-ascending'), 'Column is ordered ascending');

          var event = $.Event('click');
          event.target = $firstColumnHeader[0];
          $headerTable.trigger(event);
          break;

        case 1:
          ok($firstColumnHeader.hasClass('macro-table-sort-descending'), 'Column is ordered descending');
          start();
          break;

        default:
          break;
      }
    });

    publicFunctions.initializeTable(0, {
      numColumns: 3
    });

    var $firstColumnHeader = $('#table th.macro-table-column-sortable').first(),
      $headerTable = $('div.macro-table-header-wrapper div.macro-table-header table'),
      event;

    event = $.Event('click');
    event.target = $firstColumnHeader[0];
    $headerTable.trigger(event);
  });

  asyncTest('Columns Sortable for Empty Table Ascending (Programmatically)', 1, function() {
    $('#table').on('macrotablecolumnsort', function(e) {
      ok($firstColumnHeader.hasClass('macro-table-sort-ascending'), 'Column is ordered ascending');
      start();
    });

    publicFunctions.initializeTable(tableData, {
      numColumns: 3
    }, {
      sortByColumn: 'column0'
    });

    var $firstColumnHeader = $('#table th.macro-table-column-sortable').first();
  });

  asyncTest('Columns Sortable for Empty Table Descending (Programmatically)', 1, function() {
    $('#table').on('macrotablecolumnsort', function(e) {
      ok($firstColumnHeader.hasClass('macro-table-sort-descending'), 'Column is ordered descending');
      start();
    });

    publicFunctions.initializeTable(tableData, {
      numColumns: 3
    }, {
      sortByColumnDirection: -1,
      sortByColumn: 'column0'
    });

    var $firstColumnHeader = $('#table th.macro-table-column-sortable').first();
  });

  asyncTest('Initialize Table with Descending Ordered Column', 2, function() {
    $('#table').on('macrotablecolumnsort', function(e) {
      switch(iteration++) {
        case 0:
          $('#table').macroTable('option', 'tableData', tableData);
          break;

        case 1:
          ok($firstColumnHeader.hasClass('macro-table-sort-descending'), 'Column is ordered descending');
          deepEqual($('#table').macroTable('getTableSnapshot'), sortColumn0Descending, 'Table snapshot ordered first column descending');
          start();
          break;

        default:
          break;
      }
    });

    tableData[2].expanded = true;
    publicFunctions.initializeTable(0, {
      numColumns: 3
    }, {
      sortByColumnDirection: -1,
      sortByColumn: 'column0'
    });

    var $firstColumnHeader = $('#table th.macro-table-column-sortable').first();
  });

  asyncTest('Reinitialize Table with Descending Ordered Column (Sorted by Click)', 4, function() {
    $('#table').on('macrotablecolumnsort', function(e) {
      switch(iteration++) {
        case 0:
          var event = $.Event('click');
          event.target = $firstColumnHeader[0];
          $headerTable.trigger(event);
          break;

        case 1:
          ok($firstColumnHeader.hasClass('macro-table-sort-descending'), 'Column is ordered descending');
          deepEqual($('#table').macroTable('getTableSnapshot'), sortColumn0Descending, 'Table snapshot ordered first column descending');

          $('#table').macroTable('option', 'tableData', tableData);
          $firstColumnHeader = $('#table th.macro-table-column-sortable').first();
          break;

        case 2:
          ok($firstColumnHeader.hasClass('macro-table-sort-ascending'), 'Column is reset to ordered ascending');
          deepEqual($('#table').macroTable('getTableSnapshot'), sortColumn0Ascending, 'Table snapshot ordered first column still descending after data reload');
          start();
          break;

        default:
          break;
      }
    });

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
  });

  asyncTest('Reinitialize Table with Descending Ordered Column (Sorted Programmatically)', 4, function() {
   $('#table').on('macrotablecolumnsort', function(e) {
      switch(iteration++) {
        case 0:
          ok($firstColumnHeader.hasClass('macro-table-sort-descending'), 'Column is ordered descending');
          deepEqual($('#table').macroTable('getTableSnapshot'), sortColumn0Descending, 'Table snapshot ordered first column descending');

          $('#table').macroTable('option', 'tableData', tableData);
          break;

        case 1:
          ok($firstColumnHeader.hasClass('macro-table-sort-descending'), 'Column is still ordered descending');
          deepEqual($('#table').macroTable('getTableSnapshot'), sortColumn0Descending, 'Table snapshot ordered first column still descending after data reload');
          start();
          break;

        default:
          break;
      }
    });

    tableData[2].expanded = true;
    publicFunctions.initializeTable(tableData, {
      numColumns: 3
    }, {
      sortByColumnDirection: -1,
      sortByColumn: 'column0'
    });

    var $firstColumnHeader = $('#table th.macro-table-column-sortable').first();
  });

  asyncTest('Numeric Sorting', 1, function() {
    $('#table').on('macrotablecolumnsort', function(e) {
      deepEqual($('#table').macroTable('getTableSnapshot'), sortColumn3DescendingNumeric, 'Table snapshot ordered fourth column descending numeric');
      start();
    });

    tableData[2].expanded = true;
    publicFunctions.initializeTable(tableData, {
      numColumns: 4,
      columnsSortable: {
        3: 'numeric'
      }
    }, {
      sortByColumnDirection: -1,
      sortByColumn: 'column3'
    });
  });

  asyncTest('Dictionary Sorting ("dictionary")', 1, function() {
    $('#table').on('macrotablecolumnsort', function(e) {
      deepEqual($('#table').macroTable('getTableSnapshot'), sortColumn3DescendingDictionary, 'Table snapshot ordered fourth column descending numeric');
      start();
    });

    tableData[2].expanded = true;
    publicFunctions.initializeTable(tableData, {
      numColumns: 4,
      columnsSortable: {
        3: 'dictionary'
      }
    }, {
      sortByColumnDirection: -1,
      sortByColumn: 'column3'
    });
  });

  asyncTest('Dictionary Sorting ("string")', 1, function() {
    $('#table').on('macrotablecolumnsort', function(e) {
      deepEqual($('#table').macroTable('getTableSnapshot'), sortColumn3DescendingDictionary, 'Table snapshot ordered fourth column descending numeric');
      start();
    });

    tableData[2].expanded = true;
    publicFunctions.initializeTable(tableData, {
      numColumns: 4,
      columnsSortable: {
        3: 'string'
      }
    }, {
      sortByColumnDirection: -1,
      sortByColumn: 'column3'
    });
  });

  asyncTest('Dictionary Sorting (true)', 1, function() {
    $('#table').on('macrotablecolumnsort', function(e) {
      deepEqual($('#table').macroTable('getTableSnapshot'), sortColumn3DescendingDictionary, 'Table snapshot ordered fourth column descending numeric');
      start();
    });

    tableData[2].expanded = true;
    publicFunctions.initializeTable(tableData, {
      numColumns: 4,
      columnsSortable: {
        3: true
      }
    }, {
      sortByColumnDirection: -1,
      sortByColumn: 'column3'
    });
  });

  asyncTest('Dictionary Sorting (default)', 1, function() {
    $('#table').on('macrotablecolumnsort', function(e) {
      deepEqual($('#table').macroTable('getTableSnapshot'), sortColumn3DescendingDictionary, 'Table snapshot ordered fourth column descending numeric');
      start();
    });

    tableData[2].expanded = true;
    publicFunctions.initializeTable(tableData, {
      numColumns: 4
    }, {
      sortByColumnDirection: -1,
      sortByColumn: 'column3'
    });
  });

  asyncTest('Custom Sorting', 1, function() {
    $('#table').on('macrotablecolumnsort', function(e) {
      deepEqual($('#table').macroTable('getTableSnapshot'), sortColumn3DescendingCustom, 'Table snapshot ordered fourth column descending numeric');
      start();
    });

    tableData[2].expanded = true;
    publicFunctions.initializeTable(tableData, {
      numColumns: 4,
      columnsSortable: {
        3: function(a, b) {
          var aValue = a.data[sortByField] || '',
            bValue = b.data[sortByField] || '';
          return aValue.length - bValue.length;
        }
      }
    }, {
      sortByColumnDirection: -1,
      sortByColumn: 'column3'
    });
  });

/*
  asyncTest('web worker sort', function() {
    expect(1);

    setTimeout(function() {
      ok(true, "Passed and ready to resume!");
      start();
    }, 1000);
  });

*/
})();