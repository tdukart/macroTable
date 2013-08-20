(function() {
  /**
   * Test Module for verifying table is rendering data rows correctly
   * This is a general test suite and not specifically testing a table option/feature
   */
  module('Render Data');

  test('Empty Data Message', 2, function() {
    var totalRows = 0,
      totalColumns = 6,
      emptyInitializedMessage = 'Empty initialized message.',

    tableData = publicFunctions.initializeTable(totalRows, {
      numColumns: totalColumns
    }, {
      emptyInitializedMessage: emptyInitializedMessage
    });

    strictEqual($('#table div.macro-table-message:visible').length, 1, 'Empty data message container is visible');
    strictEqual($('#table div.macro-table-message').text(), emptyInitializedMessage, 'Empty data message matches initialized value');
  });

  test('Render Row', 3, function() {
    var totalRows = 1,
      totalColumns = 3,
      formatted = '<em>(Formatted)</em>',
      tableDataTheoreticalDisplay = {},
      viewableData = {},

    tableData = publicFunctions.initializeTable(totalRows, {
      numColumns: totalColumns,
      columnFormatters: {
        0: function(text) {
          return text + formatted;
        }
      }
    });

    $.extend(tableDataTheoreticalDisplay, {}, tableData[0].data);
    tableDataTheoreticalDisplay['column0'] = tableData[0].data['column0'] + formatted;

    $('#table tr.macro-table-row-0 td .macro-table-cell-content').each(function(i) {
      viewableData['column'+i] = $(this).html();
    });

    deepEqual(viewableData, tableDataTheoreticalDisplay, 'Theoretical rendered display matches actual');
    strictEqual(tableData.length, totalRows, 'Correct number of rows returned');
    strictEqual($('#table tr.macro-table-row:visible').length, totalRows, 'Correct number of rows rendered');
  });

  test('Render Row with Subrow', 3, function() {
    var totalRows = 1,
      totalColumns = 3,
      formatted = '<em>(Formatted)</em>',
      tableDataTheoreticalDisplay = {},
      viewableData = {},

    tableData = publicFunctions.initializeTable(totalRows, {
      numColumns: totalColumns,
      columnFormatters: {
        0: function(text) {
          return text + formatted;
        }
      }
    }, {
      subRowsIndexes: {
        0: 1 //add subrow to row 0
      }
    });

    $.extend(tableDataTheoreticalDisplay, {}, tableData[0].data);
    tableDataTheoreticalDisplay['column0'] = tableData[0].data['column0'] + formatted;

    $('#table tr.macro-table-row-0 td .macro-table-cell-content').each(function(i) {
      viewableData['column'+i] = $(this).html();
    });

    deepEqual(viewableData, tableDataTheoreticalDisplay, 'Theoretical rendered display matches actual');
    strictEqual($('#table tr.macro-table-row:visible').length, totalRows * 2, 'Correct number of rows rendered');
    ok($('#table tbody.macro-table-static-column-content tr.macro-table-row-0 label.macro-table-row-expander-label').length > 0, 'Subrow expander present for row with subrow');
  });

  test('Render Subrow (Expand)', 2, function() {
    var totalRows = 1,
      totalColumns = 3,
      formatted = '<em>(Formatted)</em>',
      tableDataTheoreticalDisplay = {},
      viewableData = {},

    tableData = publicFunctions.initializeTable(totalRows, {
      numColumns: totalColumns,
      columnFormatters: {
        0: function(text) {
          return text + formatted;
        }
      }
    }, {
      subRowsIndexes: {
        0: 1 //add subrow to row 0
      }
    }),
    event = $.Event('click');

    //expand the subrow
    $('#table tbody.macro-table-static-column-content tr.macro-table-row-0 label.macro-table-row-expander-label').trigger('click'); //check the checkbox so we can trigger the delegate event listener
    event.target = $('#table tbody.macro-table-static-column-content tr.macro-table-row-0 input.macro-table-checkbox.macro-table-row-expander')[0]; //even though a user would click the label, the target must be the input
    $('#table div.macro-table-static-data-container').trigger(event);

    $.extend(tableDataTheoreticalDisplay, {}, tableData[0].subRows[0].data);
    tableDataTheoreticalDisplay['column0'] = tableData[0].subRows[0].data['column0'] + formatted;

    $('#table tr.macro-table-row-1 td .macro-table-cell-content').each(function(i) { //subrow
      viewableData['column'+i] = $(this).html().replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
    });

    deepEqual(viewableData, tableDataTheoreticalDisplay, 'Theoretical rendered subrow display matches actual');
    strictEqual($('#table div.macro-table-data-container-wrapper .macro-table-row').length, (tableData.length * 2) + (tableData[0].subRows.length * 2), 'Correct number of rows and subrows rendered');
  });

  test('Render Subrow (Expand, Multiple)', 7, function() {
    var totalRows = 2,
      totalSubrows = 3,
      totalColumns = 3,

    tableData = publicFunctions.initializeTable(totalRows, {
      numColumns: totalColumns
    }, {
      subRowsIndexes: {
        0: totalSubrows //add subrows to row 0
      }
    }),
    event = $.Event('click');

    //expand the subrow
    $('#table tbody.macro-table-static-column-content tr.macro-table-row-0 label.macro-table-row-expander-label').trigger('click'); //check the checkbox so we can trigger the delegate event listener
    event.target = $('#table tbody.macro-table-static-column-content tr.macro-table-row-0 input.macro-table-checkbox.macro-table-row-expander')[0]; //even though a user would click the label, the target must be the input
    $('#table div.macro-table-static-data-container').trigger(event);

    strictEqual($('#table td.macro-table-row-expander-cell').not('.macro-table-subrow-hierarchy-line-right').length, totalRows, 'Correct number of rows rendered');
    strictEqual($('#table tr.macro-table-row').length, (tableData.length * 2) + (tableData[0].subRows.length * 2), 'Correct number of rows and subrows rendered');
    strictEqual($('#table td.macro-table-subrow-hierarchy-line-right').length, totalSubrows, 'Correct number of subrow dotted hierarchy lines present');
    strictEqual($('#table td.macro-table-row-expander-cell').not('.macro-table-subrow-hierarchy-line-right').last().parent().index(), tableData.length + tableData[0].subRows.length - 1, 'Last row is correctly rendered as normal row (not subrow)');

    ok($('#table td.macro-table-subrow-hierarchy-vertical-line-top-half').length === 1, 'There is correctly a single last row');
    strictEqual($('#table td.macro-table-subrow-hierarchy-vertical-line-top-half').parent().index(), tableData.length + tableData[0].subRows.length - 2, 'Last subrow is correctly positioned above last regular row');

    strictEqual($('#table td.macro-table-row-expander-cell').not('.macro-table-subrow-hierarchy-line-right').last().parent().index(), tableData.length + tableData[0].subRows.length - 1, 'Last row is correctly positioned below last subrow');
  });

  test('Render Subrow (Collapse)', 4, function() {
    var totalRows = 2,
      totalColumns = 3,

    tableData = publicFunctions.initializeTable(totalRows, {
      numColumns: totalColumns
    }, {
      subRowsIndexes: {
        0: 3 //add subrows to row 0
      }
    }),
    event = $.Event('click');

    //expand the subrow
    $('#table tbody.macro-table-static-column-content tr.macro-table-row-0 label.macro-table-row-expander-label').trigger('click'); //check the checkbox so we can trigger the delegate event listener
    event.target = $('#table tbody.macro-table-static-column-content tr.macro-table-row-0 input.macro-table-checkbox.macro-table-row-expander')[0]; //even though a user would click the label, the target must be the input
    $('#table div.macro-table-static-data-container').trigger(event);

    strictEqual($('#table tr.macro-table-row').length, (tableData.length * 2) + (tableData[0].subRows.length * 2), 'Correct number of rows and subrows rendered');
    ok($('#table td.macro-table-subrow-hierarchy-line-right').length !== 0, 'Subrow dotted hierarchy lines present');

    $('#table tbody.macro-table-static-column-content tr.macro-table-row-0 label.macro-table-row-expander-label').trigger('click'); //uncheck the checkbox so we can trigger the delegate event listener
    event = $.Event('click');
    event.target = $('#table tbody.macro-table-static-column-content tr.macro-table-row-0 input.macro-table-checkbox.macro-table-row-expander')[0]; //even though a user would click the label, the target must be the input
    $('#table div.macro-table-static-data-container').trigger(event);

    strictEqual($('#table tr.macro-table-row').length, (tableData.length * 2), 'Correct number of rows rendered');
    ok($('#table td.macro-table-subrow-hierarchy-line-right').length === 0, 'No subrow dotted hierarchy lines present');
  });

  //TODO: test case for malformed rows (missing "data" and/or "index" fields, including subrows)
})();