(function() {
  var tableData, iteration, tableSnapshotFullyExpanded, tableSnapshotFirstRowExpanded, tableSnapshotFullyCollapsed;

  /**
   * Test Module for testing the ability to expand rows that have sub rows
   */
  module('Sub-Row Expansion', {
    setup: function() {
      iteration = 0;

      tableData = [{
        index: 0,
        data: {
          column0: '1',
        },
        subRows: [{
          index: '0,0',
          data: {
            column0: '1 Sub 1',
          }
        }, {
          index: '0,1',
          data: {
            column0: '1 Sub 2',
          }
        }]
      }, {
        index: 1,
        data: {
          column0: '2',
        },
        subRows: [{
          index: '1,0',
          data: {
            column0: '2 Sub 1',
          }
        }]
      }, {
        index: 2,
        data: {
          column0: '3',
        },
        subRows: [{
          index: '2,0',
          data: {
            column0: '3 Sub 1',
          }
        }]
      }];

      tableSnapshotFullyCollapsed = [[
        {
          'column0': '1'
        },
      ],
      [
        {
          'column0': '2'
        },
      ],
      [
        {
          'column0': '3'
        },
      ]];


      tableSnapshotFirstRowExpanded = [[
        {
          'column0': '1'
        },
      ],
      [
        {
          'column0': '1 Sub 1'
        },
      ],
      [
        {
          'column0': '1 Sub 2'
        },
      ],
      [
        {
          'column0': '2'
        },
      ],
      [
        {
          'column0': '3'
        },
      ]];

      tableSnapshotFullyExpanded = [[
        {
          'column0': '1'
        },
      ],
      [
        {
          'column0': '1 Sub 1'
        },
      ],
      [
        {
          'column0': '1 Sub 2'
        },
      ],
      [
        {
          'column0': '2'
        },
      ],
      [
        {
          'column0': '2 Sub 1'
        },
      ],
      [
        {
          'column0': '3'
        },
      ],
      [
        {
          'column0': '2 Sub 1'
        },
      ]];
    }
  });

  test('Table Rows with Sub-Rows Have Expander Buttons', 4, function() {
    publicFunctions.initializeTable(tableData, {
      numColumns: 1
    });

    ok($('#table').hasClass('macro-table-rows-expandable'), 'Table rows expandable');
    strictEqual($('#table input.macro-table-expand-toggle').length, 1, 'Header expand all toggle button found');
    ok($('#table .macro-table-data-container-wrapper .macro-table-row-expander-cell').is(':visible'), 'Expander cells visible in table');
    strictEqual($('#table .macro-table-data-container-wrapper input.macro-table-row-expander').length, tableData.length, 'Expander buttons found for rows');
  });

  test('Table Rows without Sub-Rows Do Not Have Expander Buttons', 3, function() {
    publicFunctions.initializeTable(3, {
      numColumns: 1
    });

    ok(!$('#table').hasClass('macro-table-rows-expandable'), 'Table rows not expandable');
    strictEqual($('#table input.macro-table-expand-toggle').length, 0, 'Header expand all toggle button not found');
    ok(!$('#table .macro-table-data-container-wrapper .macro-table-row-expander-cell').is(':visible'), 'No expander cells visible in table');
  });

  asyncTest('Expand Row (By Click)', 11, function() {
    $('#table').on('macrotablerowexpand', function(e, data) {
      deepEqual($('#table').macroTable('getTableSnapshot'), tableSnapshotFirstRowExpanded, 'Table first row expanded');
      ok($staticBody.find('tr.macro-table-row-0').hasClass('macro-table-row-expanded'), 'First table row style expanded');
      ok($staticBody.find('tr.macro-table-row-0 .macro-table-row-expander-cell').hasClass('macro-table-subrow-hierarchy-vertical-line-bottom-half'), 'First table row expander cell style expanded');
      ok($staticBody.find('tr.macro-table-row-1 .macro-table-row-expander-cell').hasClass('macro-table-subrow-hierarchy-vertical-line-full'), 'First subrow expander cell style expanded');
      ok($staticBody.find('tr.macro-table-row-2 .macro-table-row-expander-cell').hasClass('macro-table-subrow-hierarchy-vertical-line-top-half'), 'Last subrow expander cell style expanded');

      var event = $.Event('click');
      event.target = $('#table input.macro-table-row-expander-0').next('label').click().end()[0];
      $staticBody.trigger(event);
    }).on('macrotablerowcollapse', function(e, data) {
      deepEqual($('#table').macroTable('getTableSnapshot'), tableSnapshotFullyCollapsed, 'Table is fully collapsed again');
      ok($staticBody.find('tr.macro-table-row-0').hasClass('macro-table-row-collapsed'), 'First table row style not expanded again');
      ok(!$staticBody.find('tr.macro-table-row-0 .macro-table-row-expander-cell').hasClass('macro-table-subrow-hierarchy-vertical-line-bottom-half'), 'First table row expander cell style not expanded again');
      start();
    });

    publicFunctions.initializeTable(tableData, {
      numColumns: 1
    });

    var $staticBody = $('#table .macro-table-static-data-container'),
      event;

    deepEqual($('#table').macroTable('getTableSnapshot'), tableSnapshotFullyCollapsed, 'Table is fully collapsed');
    ok($staticBody.find('tr.macro-table-row-0').hasClass('macro-table-row-collapsed'), 'First table row style not expanded');
    ok(!$staticBody.find('tr.macro-table-row-0 .macro-table-row-expander-cell').hasClass('macro-table-subrow-hierarchy-vertical-line-bottom-half'), 'First table row expander cell style not expanded');

    event = $.Event('click');
    event.target = $('#table input.macro-table-row-expander-0').next('label').click().end()[0];
    $staticBody.trigger(event);
  });

  asyncTest('Expand Row (Programmatically)', 8, function() {
    $('#table').on('macrotablerowcollapse', function(e, data) {
      deepEqual($('#table').macroTable('getTableSnapshot'), tableSnapshotFullyCollapsed, 'Table is fully collapsed');
      ok($staticBody.find('tr.macro-table-row-0').hasClass('macro-table-row-collapsed'), 'First table row style not expanded');
      ok(!$staticBody.find('tr.macro-table-row-0 .macro-table-row-expander-cell').hasClass('macro-table-subrow-hierarchy-vertical-line-bottom-half'), 'First table row expander cell style not expanded');
      start();
    });

    tableData[0].expanded = true;
    publicFunctions.initializeTable(tableData, {
      numColumns: 1
    });

    var $staticBody = $('#table .macro-table-static-data-container'),
      event;

    deepEqual($('#table').macroTable('getTableSnapshot'), tableSnapshotFirstRowExpanded, 'Table first row expanded');
    ok($staticBody.find('tr.macro-table-row-0').hasClass('macro-table-row-expanded'), 'First table row style expanded');
    ok($staticBody.find('tr.macro-table-row-0 .macro-table-row-expander-cell').hasClass('macro-table-subrow-hierarchy-vertical-line-bottom-half'), 'First table row expander cell style expanded');
    ok($staticBody.find('tr.macro-table-row-1 .macro-table-row-expander-cell').hasClass('macro-table-subrow-hierarchy-vertical-line-full'), 'First subrow expander cell style expanded');
    ok($staticBody.find('tr.macro-table-row-2 .macro-table-row-expander-cell').hasClass('macro-table-subrow-hierarchy-vertical-line-top-half'), 'Last subrow expander cell style expanded');

    event = $.Event('click');
    event.target = $('#table input.macro-table-row-expander-0').next('label').click().end()[0];
    $staticBody.trigger(event);
  });

  asyncTest('Expand All Rows', 17, function() {
    $('#table').on('macrotablerowexpand', function(e, data) {
      var event;

      switch(iteration++) {
        case 0:
          strictEqual(data.expandedRows.length, tableData.length, 'Row expand event returns all rows correctly');
          ok($expandAll.is(':checked') === true, 'Expand all is checked after toggle all');
          strictEqual($staticBody.find('tr').length, tableSnapshotFullyExpanded.length, 'All rows expanded and displaying after toggle all');

          event = $.Event('click');
          event.target = $expandAll.next('label').click().end()[0];
          $staticHeaderRow.trigger(event);
          break;

        case 2:
          strictEqual(data.expandedRows.length, 1, 'Row expand event returns single row correctly');
          ok($expandAll.is(':checked') === false, 'Expand all is not checked with one row selected');

          event = $.Event('click');
          event.target = $expandAll.next('label').click().end()[0];
          $staticHeaderRow.trigger(event);
          break;

        case 3:
          strictEqual(data.expandedRows.length, tableData.length, 'Row expand event returns all rows again, correctly');
          ok($expandAll.is(':checked') === true, 'Expand all is checked after toggle all clicked with one row expanded');
          strictEqual($staticBody.find('tr').length, tableSnapshotFullyExpanded.length, 'All rows currently expanded after toggle all clicked with one row expanded');

          event = $.Event('click');
          event.target = $('#table input.macro-table-row-expander-3').next('label').click().end()[0];
          $staticBody.trigger(event);
          break;

        default:
          break;
      }
    }).on('macrotablerowcollapse', function(e, data) {
      var event;

      switch(iteration++) {
        case 1:
          strictEqual(data.expandedRows.length, 0, 'Row deselect event returns no rows');
          ok($expandAll.is(':checked') === false, 'Expand all is unchecked after toggle none');
          strictEqual($('#table').macroTable('getSelectedRows').length, 0, 'No rows currently expanded after deselecting toggle all');

          event = $.Event('click');
          event.target = $('#table input.macro-table-row-expander-0').next('label').click().end()[0];
          $staticBody.trigger(event);
          break;

        case 4:
          strictEqual(data.expandedRows.length, tableData.length - 1, 'Row deselect event returns all rows but deselected one');
          ok($expandAll.is(':checked') === true, 'Expand all is checked with majority of rows expanded');

          event = $.Event('click');
          event.target = $expandAll.next('label').click().end()[0];
          $staticHeaderRow.trigger(event);
          break;

        case 5:
          ok($expandAll.is(':checked') === false, 'Expand all is not checked after toggle all clicked with 2/3 rows selected');
          strictEqual($('#table').macroTable('getSelectedRows').length, 0, 'No rows currently selected after toggle all clicked with 2/3 rows selected');
          start();
          break;

        default:
          break;
      }
    });

    publicFunctions.initializeTable(tableData, {
      numColumns: 1
    });

    var $expandAll = $('#table input.macro-table-expand-toggle'),
      $staticHeaderRow = $('#table .macro-table-static-header tr.macro-table-static-header-row'),
      $staticBody = $('#table .macro-table-static-data-container'),
      event;

    ok($expandAll[0].indeterminate === false, 'Expand all is not indeterminate');
    ok($expandAll.is(':checked') === false, 'Expand all is not checked');

    event = $.Event('click');
    event.target = $expandAll.next('label').click().end()[0];
    $staticHeaderRow.trigger(event);
  });

  test('Expand All Toggle Initializes Collapsed', 1, function() {
    var columnOptions = {
      numColumns: 1
    };

    publicFunctions.initializeTable(0, columnOptions);

    $('#table').macroTable('option', {
      tableData: publicFunctions.generateTableData(3, columnOptions, {
        0: 1,
        1: 1,
        2: 1
      }, null, false)
    });

    ok(!$('#table .macro-table-static-header-row input.macro-table-expand-toggle').is(':checked'), 'Expand all is collapsed');
  });

  test('Expand All Toggle Initializes Collapsed under Expanded Threshold', 1, function() {
    var columnOptions = {
      numColumns: 1
    },
    tableData = publicFunctions.generateTableData(3, columnOptions, {
      0: 1,
      1: 1,
      2: 1
    });

    tableData[0].expanded = true;

    publicFunctions.initializeTable(0, columnOptions);

    $('#table').macroTable('option', {
      tableData: tableData
    });

    ok(!$('#table .macro-table-static-header-row input.macro-table-expand-toggle').is(':checked'), 'Expand all is collapsed');
  });

  test('Expand All Toggle Initializes Expanded at Expanded Threshold', 1, function() {
    var columnOptions = {
      numColumns: 1
    },
    tableData = publicFunctions.generateTableData(3, columnOptions, {
      0: 1,
      1: 1,
      2: 1
    }, null, true);

    tableData[0].expanded = false;

    publicFunctions.initializeTable(0, columnOptions);

    $('#table').macroTable('option', {
      tableData: tableData
    });

    ok($('#table .macro-table-static-header-row input.macro-table-expand-toggle').is(':checked'), 'Expand all is expanded');

  });

  test('Expand All Toggle Initializes Expanded with All Rows Expanded', 1, function() {
    var columnOptions = {
      numColumns: 1
    };

    publicFunctions.initializeTable(0, columnOptions);

    $('#table').macroTable('option', {
      tableData: publicFunctions.generateTableData(3, columnOptions, {
        0: 1,
        1: 1,
        2: 1
      }, null, true)
    });

    ok($('#table .macro-table-static-header-row input.macro-table-expand-toggle').is(':checked'), 'Expand all is expanded');

  });

})();