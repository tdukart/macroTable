(function() {
  var tableData, sortColumn0Descending, sortColumn3DescendingNumeric, sortColumn3DescendingDictionary, sortColumn3DescendingCustom;

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

  asyncTest('Numeric Sorting', 1, function() {
    tableData[2].expanded = true;
    publicFunctions.initializeTable(tableData, {
      numColumns: 4,
      direction: {
        3: -1 //sort descending for column0
      },
      columnsSortable: {
        3: 'numeric'
      }
    }, {
      sortByColumn: 'column3'
    });

    setTimeout(function() {
      deepEqual($('#table').macroTable('getTableSnapshot'), sortColumn3DescendingNumeric, 'Table snapshot ordered fourth column descending numeric');
      start();
    }, 100);
  });

  asyncTest('Dictionary Sorting ("dictionary")', 1, function() {
    tableData[2].expanded = true;
    publicFunctions.initializeTable(tableData, {
      numColumns: 4,
      direction: {
        3: -1 //sort descending for column0
      },
      columnsSortable: {
        3: 'dictionary'
      }
    }, {
      sortByColumn: 'column3'
    });

    setTimeout(function() {
      deepEqual($('#table').macroTable('getTableSnapshot'), sortColumn3DescendingDictionary, 'Table snapshot ordered fourth column descending numeric');
      start();
    }, 100);
  });

  asyncTest('Dictionary Sorting ("string")', 1, function() {
    tableData[2].expanded = true;
    publicFunctions.initializeTable(tableData, {
      numColumns: 4,
      direction: {
        3: -1 //sort descending for column0
      },
      columnsSortable: {
        3: 'string'
      }
    }, {
      sortByColumn: 'column3'
    });

    setTimeout(function() {
      deepEqual($('#table').macroTable('getTableSnapshot'), sortColumn3DescendingDictionary, 'Table snapshot ordered fourth column descending numeric');
      start();
    }, 100);
  });

  asyncTest('Dictionary Sorting (true)', 1, function() {
    tableData[2].expanded = true;
    publicFunctions.initializeTable(tableData, {
      numColumns: 4,
      direction: {
        3: -1 //sort descending for column0
      },
      columnsSortable: {
        3: true
      }
    }, {
      sortByColumn: 'column3'
    });

    setTimeout(function() {
      deepEqual($('#table').macroTable('getTableSnapshot'), sortColumn3DescendingDictionary, 'Table snapshot ordered fourth column descending numeric');
      start();
    }, 100);
  });

  asyncTest('Dictionary Sorting (default)', 1, function() {
    tableData[2].expanded = true;
    publicFunctions.initializeTable(tableData, {
      numColumns: 4,
      direction: {
        3: -1 //sort descending for column0
      }
    }, {
      sortByColumn: 'column3'
    });

    setTimeout(function() {
      deepEqual($('#table').macroTable('getTableSnapshot'), sortColumn3DescendingDictionary, 'Table snapshot ordered fourth column descending numeric');
      start();
    }, 100);
  });

  asyncTest('Custom Sorting', 1, function() {
    tableData[2].expanded = true;
    publicFunctions.initializeTable(tableData, {
      numColumns: 4,
      direction: {
        3: -1 //sort descending for column0
      },
      columnsSortable: {
        3: function(a, b) {
          var aValue = a.data[sortByField] || '',
            bValue = b.data[sortByField] || '';
          return aValue.length - bValue.length;
        }
      }
    }, {
      sortByColumn: 'column3'
    });

    setTimeout(function() {
      deepEqual($('#table').macroTable('getTableSnapshot'), sortColumn3DescendingCustom, 'Table snapshot ordered fourth column descending numeric');
      start();
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

*/
})();