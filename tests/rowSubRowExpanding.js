(function() {
  var tableData, tableSnapshotFullyExpanded, tableSnapshotFirstRowExpanded, tableSnapshotFullyCollapsed;

  /**
   * Test Module for testing the ability to expand rows that have sub rows
   */
  module('Sub-Row Expansion', {
    setup: function() {
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

  test('Table Rows without Sub-Rows Do Not Have Expander Buttons', 4, function() {
    publicFunctions.initializeTable(3, {
      numColumns: 1
    });

    ok(!$('#table').hasClass('macro-table-rows-expandable'), 'Table rows not expandable');
    strictEqual($('#table input.macro-table-expand-toggle').length, 0, 'Header expand all toggle button not found');
    ok(!$('#table .macro-table-data-container-wrapper .macro-table-row-expander-cell').is(':visible'), 'No expander cells visible in table');
    strictEqual($('#table .macro-table-data-container-wrapper input.macro-table-row-expander').length, 0, 'No expander buttons found for rows');
  });

  asyncTest('Expand Row (By Click)', 11, function() {
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

    setTimeout(function() {
      deepEqual($('#table').macroTable('getTableSnapshot'), tableSnapshotFirstRowExpanded, 'Table first row expanded');
      ok($staticBody.find('tr.macro-table-row-0').hasClass('macro-table-row-expanded'), 'First table row style expanded');
      ok($staticBody.find('tr.macro-table-row-0 .macro-table-row-expander-cell').hasClass('macro-table-subrow-hierarchy-vertical-line-bottom-half'), 'First table row expander cell style expanded');
      ok($staticBody.find('tr.macro-table-row-1 .macro-table-row-expander-cell').hasClass('macro-table-subrow-hierarchy-vertical-line-full'), 'First subrow expander cell style expanded');
      ok($staticBody.find('tr.macro-table-row-2 .macro-table-row-expander-cell').hasClass('macro-table-subrow-hierarchy-vertical-line-top-half'), 'Last subrow expander cell style expanded');

      event = $.Event('click');
      event.target = $('#table input.macro-table-row-expander-0').next('label').click().end()[0];
      $staticBody.trigger(event);

      setTimeout(function() {
        deepEqual($('#table').macroTable('getTableSnapshot'), tableSnapshotFullyCollapsed, 'Table is fully collapsed again');
        ok($staticBody.find('tr.macro-table-row-0').hasClass('macro-table-row-collapsed'), 'First table row style not expanded again');
        ok(!$staticBody.find('tr.macro-table-row-0 .macro-table-row-expander-cell').hasClass('macro-table-subrow-hierarchy-vertical-line-bottom-half'), 'First table row expander cell style not expanded again');
        start();
      }, 100);
    }, 100);
  });

  asyncTest('Expand Row (Programmatically)', 8, function() {
    tableData[0].expanded = true;
    publicFunctions.initializeTable(tableData, {
      numColumns: 1
    });

    var $staticHeader = $('#table .macro-table-static-header'),
      $staticBody = $('#table .macro-table-static-data-container'),
      event;

    deepEqual($('#table').macroTable('getTableSnapshot'), tableSnapshotFirstRowExpanded, 'Table first row expanded');
    ok($staticBody.find('tr.macro-table-row-0').hasClass('macro-table-row-expanded'), 'First table row style expanded');
    ok($staticBody.find('tr.macro-table-row-0 .macro-table-row-expander-cell').hasClass('macro-table-subrow-hierarchy-vertical-line-bottom-half'), 'First table row expander cell style expanded');
    ok($staticBody.find('tr.macro-table-row-1 .macro-table-row-expander-cell').hasClass('macro-table-subrow-hierarchy-vertical-line-full'), 'First subrow expander cell style expanded');
    ok($staticBody.find('tr.macro-table-row-2 .macro-table-row-expander-cell').hasClass('macro-table-subrow-hierarchy-vertical-line-top-half'), 'Last subrow expander cell style expanded');

    event = $.Event('click');
    event.target = $('#table input.macro-table-row-expander-0').next('label').click().end()[0];
    $staticBody.trigger(event);

    setTimeout(function() {
      deepEqual($('#table').macroTable('getTableSnapshot'), tableSnapshotFullyCollapsed, 'Table is fully collapsed');
      ok($staticBody.find('tr.macro-table-row-0').hasClass('macro-table-row-collapsed'), 'First table row style not expanded');
      ok(!$staticBody.find('tr.macro-table-row-0 .macro-table-row-expander-cell').hasClass('macro-table-subrow-hierarchy-vertical-line-bottom-half'), 'First table row expander cell style not expanded');
      start();
    }, 100);
  });

})();