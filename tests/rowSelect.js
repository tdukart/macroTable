(function() {
  var iteration;

  /**
   * Test Module for testing the ability to select rows
   */
  module('Select Rows', {
    setup: function() {
      iteration = 0;
    }
  });

  asyncTest('Rows are Selectable', 14, function() {
    $('#table').on('macrotablerowselect', function(e, data) {
      var event;

      switch(iteration++) {
        case 0:
          strictEqual(data.selectedRows.length, 1, 'Row select event returns first row correctly');
          ok($('#table .macro-table-data-container tr.macro-table-row-0').hasClass('macro-table-selected-row'), 'Dynamic row has selected DOM class');
          ok($('#table .macro-table-static-data-container tr.macro-table-row-0').hasClass('macro-table-selected-row'), 'Static row has selected DOM class');
          strictEqual($('#table').macroTable('getSelectedRows').length, 1, 'Row selected successfully');

          event = $.Event('click');
          event.target = $('#table input.macro-table-select-1').next('label').click().end()[0];
          $staticBody.trigger(event);
          break;

        case 1:
          strictEqual(data.selectedRows.length, 2, 'Row select event returns both rows correctly');
          strictEqual($('#table').macroTable('getSelectedRows').length, 2, 'Rows selected successfully');

          event = $.Event('click');
          event.target = $('#table input.macro-table-select-0').next('label').click().end()[0];
          $staticBody.trigger(event);
          event = $.Event('click');
          event.target = $('#table input.macro-table-select-1').next('label').click().end()[0];
          $staticBody.trigger(event);
          break;

        default:
          break;
      }
    }).on('macrotablerowdeselect', function(e, data) {
      switch(iteration++) {
        case 2:
          strictEqual(data.selectedRows.length, 1, 'Row deselect event returns second row correctly');
          break;

        case 3:
          strictEqual(data.selectedRows.length, 0, 'Row deselect event returns no rows');
          strictEqual($('#table').macroTable('getSelectedRows').length, 0, 'Rows successfully deselected');
          start();
          break;

        default:
          break;
      }
    });

    var tableData = publicFunctions.initializeTable(2, {
        numColumns: 1
      }),
      $staticHeader = $('#table .macro-table-static-header'),
      $staticBody = $('#table .macro-table-static-data-container'),
      event;

    strictEqual($('#table').macroTable('getSelectedRows').length, 0, 'No rows currently selected');

    ok(!$staticHeader.is(':visible'), 'Static header not visible');
    ok(!$staticBody.is(':visible'), 'Static body not visible');

    $('#table').macroTable('option', 'rowsSelectable', true);

    ok($staticHeader.is(':visible'), 'Static header is visible');
    ok($staticBody.is(':visible'), 'Static body is visible');

    event = $.Event('click');
    event.target = $('#table input.macro-table-select-0').next('label').click().end()[0];
    $staticBody.trigger(event);
  });

  asyncTest('Select All Rows', 20, function() {
    $('#table').on('macrotablerowselect', function(e, data) {
      var event;

      switch(iteration++) {
        case 0:
          strictEqual(data.selectedRows.length, totalRows, 'Row select event returns all rows correctly');
          ok($selectAll[0].indeterminate === false, 'Select all is not indeterminate after toggle all');
          ok($selectAll.is(':checked') === true, 'Select all is checked after toggle all');
          strictEqual($('#table').macroTable('getSelectedRows').length, totalRows, 'All rows currently selected after toggle all');

          event = $.Event('click');
          event.target = $selectAll.next('label').click().end()[0];
          $staticHeaderRow.trigger(event);
          break;

        case 2:
          strictEqual(data.selectedRows.length, 1, 'Row select event returns single row correctly');
          ok($selectAll[0].indeterminate === true, 'Select all is indeterminate with one row selected');
          ok($selectAll.is(':checked') === false, 'Select all is not checked with one row selected');

          event = $.Event('click');
          event.target = $selectAll.next('label').click().end()[0];
          $staticHeaderRow.trigger(event);
          break;

        case 3:
          strictEqual(data.selectedRows.length, totalRows, 'Row select event returns all rows again, correctly');
          ok($selectAll[0].indeterminate === false, 'Select all is not indeterminate after toggle all clicked with one row selected');
          ok($selectAll.is(':checked') === true, 'Select all is checked after toggle all clicked with one row selected');
          strictEqual($('#table').macroTable('getSelectedRows').length, totalRows, 'All rows currently selected after toggle all clicked with one row selected');

          event = $.Event('click');
          event.target = $('#table input.macro-table-select-1').next('label').click().end()[0];
          $staticBody.trigger(event);
          break;

        default:
          break;
      }
    }).on('macrotablerowdeselect', function(e, data) {
      var event;

      switch(iteration++) {
        case 1:
          strictEqual(data.selectedRows.length, 0, 'Row deselect event returns no rows');
          strictEqual($('#table').macroTable('getSelectedRows').length, 0, 'No rows currently selected after deselecting toggle all');

          event = $.Event('click');
          event.target = $('#table input.macro-table-select-0').next('label').click().end()[0];
          $staticBody.trigger(event);
          break;

        case 4:
          strictEqual(data.selectedRows.length, totalRows - 1, 'Row deselect event returns all rows but deselected one');
          ok($selectAll[0].indeterminate === true, 'Select all is indeterminate with 2/3 rows selected');

          event = $.Event('click');
          event.target = $selectAll.next('label').click().end()[0];
          $staticHeaderRow.trigger(event);
          break;

        case 5:
          ok($selectAll[0].indeterminate === false, 'Select all is not indeterminate after toggle all clicked with 2/3 rows selected');
          ok($selectAll.is(':checked') === false, 'Select all is not checked after toggle all clicked with 2/3 rows selected');
          strictEqual($('#table').macroTable('getSelectedRows').length, 0, 'No rows currently selected after toggle all clicked with 2/3 rows selected');
          start();
          break;

        default:
          break;
      }
    });

    var totalRows = 3,
      tableData = publicFunctions.initializeTable(totalRows, {
        numColumns: 1
      }, {
        rowsSelectable: true
      }),
      $selectAll = $('#table input.macro-table-select-toggle'),
      $staticHeaderRow = $('#table .macro-table-static-header tr.macro-table-static-header-row'),
      $staticBody = $('#table .macro-table-static-data-container'),
      event;

    ok($selectAll[0].indeterminate === false, 'Select all is not indeterminate');
    ok($selectAll.is(':checked') === false, 'Select all is not checked');

    event = $.Event('click');
    event.target = $selectAll.next('label').click().end()[0];
    $staticHeaderRow.trigger(event);
  });

  test('Initialize Row as Selected', 4, function() {
    var totalRows = 1,
      tableData = publicFunctions.initializeTable([{
        index: 0,
        data: {
          column0: 'test'
        },
        selected: true
      }], {
        numColumns: 1
      }, {
        rowsSelectable: true
      });

    ok($('#table input.macro-table-select-0').is(':checked'), 'Initialized row checkbox is checked');
    ok($('#table .macro-table-data-container tr.macro-table-row-0').hasClass('macro-table-selected-row'), 'Initialized dynamic row has selected DOM class');
    ok($('#table .macro-table-static-data-container tr.macro-table-row-0').hasClass('macro-table-selected-row'), 'Initialized static row has selected DOM class');
    strictEqual($('#table').macroTable('getSelectedRows').length, 1, 'Row initialized as selected');
  });

  asyncTest('Toggle Selectable Row Feature', 4, function() {
    //toggle rowsSelectable off and on with a row selected and check the getSelectedRows call

    $('#table').on('macrotablerowselect', function() {
      var event;

      switch(iteration++) {
        case 1:
          $('#table').macroTable('option', 'rowsSelectable', false);

          strictEqual($('#table').macroTable('getSelectedRows').length, 0, 'Row not selectable after row toggle off/on');

          $('#table').macroTable('option', 'rowsSelectable', true);

          event = $.Event('click');
          event.target = $('#table input.macro-table-select-0').next('label').click().end()[0];
          $staticBody.trigger(event);
          break;

        default:
          break;
      }
    }).on('macrotablerowdeselect', function() {
      switch(iteration++) {
        case 0:
          var event = $.Event('click');
          event.target = $('#table input.macro-table-select-0').next('label').click().end()[0];
          $staticBody.trigger(event);
          break;

        default:
          break;
      }
    });

    var totalRows = 1,
      tableData = publicFunctions.initializeTable([{
        index: 0,
        data: {
          column0: 'test'
        },
        selected: true
      }], {
        numColumns: 1
      }),
      $staticBody = $('#table .macro-table-static-data-container').delegate('input.macro-table-select-0', 'click', function() {
        switch(iteration++) {
          case 5:
            strictEqual($('#table').macroTable('getSelectedRows').length, 0, 'Row not selectable after off/on/off toggle and reenable selectable rows');
            start();
            break;

          default:
            break;
        }
      }),
      event;

    strictEqual($('#table').macroTable('getSelectedRows').length, 0, 'Row not currently selected after initializing as selected');

    $('#table').macroTable('option', 'rowsSelectable', true);

    strictEqual($('#table').macroTable('getSelectedRows').length, 1, 'Initialized row currently selected after selectable rows turned on');

    event = $.Event('click');
    event.target = $('#table input.macro-table-select-0').next('label').click().end()[0];
    $staticBody.trigger(event);
  });
})();