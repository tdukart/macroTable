(function() {
  module('Widget DOM Rendering');

  test('Table Uses Default Dimensions', 2, function() {
    //shows 10 rows worth of height + header, and fits width to 100%

    var totalRows = 11,
      totalColumns = 6,

    tableData = publicFunctions.initializeTable(totalRows, {
      numColumns: totalColumns
    });

    strictEqual($('#table').outerWidth(), $('#qunit-fixture .wrapper').width(), 'Table width fits the width of the container');
    strictEqual($('#table .macro-table-data-container-wrapper').height(), $('#table').macroTable('option', 'defaultTableHeightInRows') * $('#table').macroTable('option', 'rowHeight'), 'Table height fits the height of the container');
  });

  test('Table Fits to Dimensioned Container', 2, function() {
    var totalRows = 0,
      totalColumns = 6,
      containerWidth = 200,
      containerHeight = 500,
      tableData;

    $('#qunit-fixture .wrapper').height(containerHeight + 'px')
    .width(containerWidth + 'px');

    tableData = publicFunctions.initializeTable(totalRows, {
      numColumns: totalColumns
    });

    strictEqual($('#table').outerWidth(), $('#qunit-fixture .wrapper').width(), 'Table width fits the width of the container');
    strictEqual($('#table').outerHeight(), $('#qunit-fixture .wrapper').height(), 'Table height fits the height of the container');
  });

  test('Table Renders to User-Defined Dimensions in Non-Dimensioned Container', 2, function() {
    var totalRows = 0,
      totalColumns = 6,
      tableWidth = 200,
      tableHeight = 500,

    tableData = publicFunctions.initializeTable(totalRows, {
      numColumns: totalColumns
    }, {}, false, tableHeight, tableWidth);

    strictEqual($('#table').outerWidth(), tableWidth, 'Table width matches user-defined value');
    strictEqual($('#table').outerHeight(), tableHeight, 'Table height matches user-defined value');
  });

  test('Table Renders to User-Defined Dimensions in Larger, Dimensioned Container', 2, function() {
    var totalRows = 0,
      totalColumns = 6,
      tableWidth = 200,
      tableHeight = 500,
      containerWidth = 300,
      containerHeight = 600,
      tableData;

    $('#qunit-fixture .wrapper').height(containerHeight + 'px')
    .width(containerWidth + 'px');

    tableData = publicFunctions.initializeTable(totalRows, {
      numColumns: totalColumns
    }, {}, false, tableHeight, tableWidth);

    strictEqual($('#table').outerWidth(), tableWidth, 'Table width matches user-defined value');
    strictEqual($('#table').outerHeight(), tableHeight, 'Table height matches user-defined value');
  });

  test('Table Renders to User-Defined Dimensions in Smaller, Dimensioned Container', 2, function() {
    var totalRows = 0,
      totalColumns = 6,
      tableWidth = 200,
      tableHeight = 500,
      containerWidth = 100,
      containerHeight = 400,
      tableData;

    $('#qunit-fixture .wrapper').css('overflow', 'auto')
    .height(containerHeight + 'px')
    .width(containerWidth + 'px');

    tableData = publicFunctions.initializeTable(totalRows, {
      numColumns: totalColumns
    }, {}, false, tableHeight, tableWidth);

    strictEqual($('#table').outerWidth(), tableWidth, 'Table width matches user-defined value');
    strictEqual($('#table').outerHeight(), tableHeight, 'Table height matches user-defined value');
  });



  module('Column Formatting');

  test('Cell alignment', 10, function() {
    var tableData = publicFunctions.initializeTable(1, {
      numColumns: 5,
      align: {
        0: 'right',
        1: 'center',
        2: 'left',
        3: 'blarg!'
        //last column should be defaulted left
      }
    }),
    $headers = $('#table table.macro-table-dynamic th'),
    $cells = $('#table table.macro-table-dynamic td');

    strictEqual($headers.filter(':nth-child(1)').css('text-align'), 'right', 'First header right aligned');
    strictEqual($cells.filter(':nth-child(1)').css('text-align'), 'right', 'First column right aligned');
    strictEqual($headers.filter(':nth-child(2)').css('text-align'), 'center', 'Second header center aligned');
    strictEqual($cells.filter(':nth-child(2)').css('text-align'), 'center', 'Second column center aligned');
    strictEqual($headers.filter(':nth-child(3)').css('text-align'), 'left', 'Third header left aligned');
    strictEqual($cells.filter(':nth-child(3)').css('text-align'), 'left', 'Third column left aligned');
    strictEqual($headers.filter(':nth-child(4)').css('text-align'), 'left', 'Fourth header left aligned');
    strictEqual($cells.filter(':nth-child(4)').css('text-align'), 'left', 'Fourth column left aligned');
    strictEqual($headers.filter(':nth-child(5)').css('text-align'), 'left', 'Fifth header left aligned');
    strictEqual($cells.filter(':nth-child(5)').css('text-align'), 'left', 'Fifth column left aligned');
  });


  module('Snapshot', {});

  test('Snapshot for Empty Data', 1, function() {
    var totalRows = 0,
      totalColumns = 6,
      viewableData,

    tableData = publicFunctions.initializeTable(totalRows, {
      numColumns: totalColumns
    });

    viewableData = $('#table').macroTable('getTableSnapshot');

    strictEqual(totalRows, viewableData.length, 'Snapshot row count matches initialized row count');
  });

  test('Snapshot for Total Rows within Scroll Window', 2, function() {
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

  test('Snapshot for Total Rows Larger than Scroll Window', 2, function() {
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
    ok($('#table tbody.macro-table-static-column-content tr.macro-table-row0 label.macro-table-row-expander-label').length > 0, 'Subrow expander present for row with subrow');
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
    $('#table tbody.macro-table-static-column-content tr.macro-table-row0 label.macro-table-row-expander-label').trigger('click'); //check the checkbox so we can trigger the delegate event listener
    event.target = $('#table tbody.macro-table-static-column-content tr.macro-table-row0 input.macro-table-checkbox.macro-table-row-expander')[0]; //even though a user would click the label, the target must be the input
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
    $('#table tbody.macro-table-static-column-content tr.macro-table-row0 label.macro-table-row-expander-label').trigger('click'); //check the checkbox so we can trigger the delegate event listener
    event.target = $('#table tbody.macro-table-static-column-content tr.macro-table-row0 input.macro-table-checkbox.macro-table-row-expander')[0]; //even though a user would click the label, the target must be the input
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
    $('#table tbody.macro-table-static-column-content tr.macro-table-row0 label.macro-table-row-expander-label').trigger('click'); //check the checkbox so we can trigger the delegate event listener
    event.target = $('#table tbody.macro-table-static-column-content tr.macro-table-row0 input.macro-table-checkbox.macro-table-row-expander')[0]; //even though a user would click the label, the target must be the input
    $('#table div.macro-table-static-data-container').trigger(event);

    strictEqual($('#table tr.macro-table-row').length, (tableData.length * 2) + (tableData[0].subRows.length * 2), 'Correct number of rows and subrows rendered');
    ok($('#table td.macro-table-subrow-hierarchy-line-right').length !== 0, 'Subrow dotted hierarchy lines present');

    $('#table tbody.macro-table-static-column-content tr.macro-table-row0 label.macro-table-row-expander-label').trigger('click'); //uncheck the checkbox so we can trigger the delegate event listener
    event = $.Event('click');
    event.target = $('#table tbody.macro-table-static-column-content tr.macro-table-row0 input.macro-table-checkbox.macro-table-row-expander')[0]; //even though a user would click the label, the target must be the input
    $('#table div.macro-table-static-data-container').trigger(event);

    strictEqual($('#table tr.macro-table-row').length, (tableData.length * 2), 'Correct number of rows rendered');
    ok($('#table td.macro-table-subrow-hierarchy-line-right').length === 0, 'No subrow dotted hierarchy lines present');
  });

  //TODO: test case for malformed rows (missing "data" and/or "index" fields, including subrows)



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
  module('Scrolling');

  asyncTest('Table Scrolls to Row', 3, function() {
    var totalRows = 100,
      scroll1 = 2,
      scroll2 = totalRows / 2,

      $dataContainerWraper, $scrollContainer, containerOffsetTop, rowHeight,

    tableData = publicFunctions.initializeTable(totalRows, {
      numColumns: 6
    });

    $(window).scrollTop(0);
    rowHeight = $('#table').macroTable('option', 'rowHeight');
    $dataContainerWraper = $('#table div.macro-table-data-container-wrapper');
    containerOffsetTop = $dataContainerWraper.offset().top;

    $scrollContainer = $('#table div.macro-table-scroll-container').scrollTop(scroll1 * rowHeight);

    setTimeout(function() {
      strictEqual($dataContainerWraper.find('table.macro-table-dynamic tr.macro-table-row[data-row-index='+scroll1+']').offset().top, containerOffsetTop, 'First scroll row scrolled to correctly');

      $scrollContainer.scrollTop(scroll2 * rowHeight);

      setTimeout(function() {
        strictEqual($dataContainerWraper.find('table.macro-table-dynamic tr.macro-table-row[data-row-index='+scroll2+']').offset().top, containerOffsetTop, 'Second scroll row scrolled to correctly');

        $scrollContainer.scrollTop(0);

        setTimeout(function() {
          strictEqual($dataContainerWraper.find('table.macro-table-dynamic tr.macro-table-row[data-row-index=0]').offset().top, containerOffsetTop, 'Scrolled to top correctly');
          start();
        }, 0);
      }, 0);
    }, 0);
  });

  asyncTest('Table Scrolls to Row Via API', 3, function() {
    var totalRows = 100,
      scroll1 = 2,
      scroll2 = totalRows / 2,

      $dataContainerWraper, containerOffsetTop,

    tableData = publicFunctions.initializeTable(totalRows, {
      numColumns: 6
    });

    $(window).scrollTop(0);
    $dataContainerWraper = $('#table div.macro-table-data-container-wrapper');
    containerOffsetTop = $dataContainerWraper.offset().top;
    $('#table').macroTable('scrollToRow', scroll1, true);

    setTimeout(function() {
      strictEqual($dataContainerWraper.find('table.macro-table-dynamic tr.macro-table-row[data-row-index='+scroll1+']').offset().top, containerOffsetTop, 'First scroll row scrolled to correctly');

      $('#table').macroTable('scrollToRow', scroll2, true);

      setTimeout(function() {
        strictEqual($dataContainerWraper.find('table.macro-table-dynamic tr.macro-table-row[data-row-index='+scroll2+']').offset().top, containerOffsetTop, 'Second scroll row scrolled to correctly');

        $('#table').macroTable('scrollToRow', 0, true);

        setTimeout(function() {
          strictEqual($dataContainerWraper.find('table.macro-table-dynamic tr.macro-table-row[data-row-index=0]').offset().top, containerOffsetTop, 'Scrolled to top correctly');
          start();
        }, 0);
      }, 0);
    }, 0);
  });

  asyncTest('Table Scrolls to Row with Expanded Subrows', 5, function() {
    var totalRows = 50,
      numSubRows = 3,
      scroll1 = 2,
      scroll2 = totalRows / 2,
      columnOptions = {
        numColumns: 6
      },

      $dataContainerWraper, containerOffsetTop;

    $(window).scrollTop(0);
    publicFunctions.initializeTable(totalRows, columnOptions);

    //load the data with expanded subrows
    $('#table').macroTable('option', {
      tableData: publicFunctions.generateTableData(totalRows, columnOptions, {
        'all': numSubRows
      }, null, true)
    });

    $dataContainerWraper = $('#table div.macro-table-data-container-wrapper');
    containerOffsetTop = $dataContainerWraper.offset().top;

    $('#table').macroTable('scrollToRow', scroll1, true);

    setTimeout(function() {
      strictEqual($dataContainerWraper.find('table.macro-table-dynamic tr.macro-table-row[data-row-index='+(scroll1 * (1 + numSubRows))+']').offset().top, containerOffsetTop, 'First scroll row scrolled to correctly');

      $('#table').macroTable('scrollToRow', scroll2, true);

      setTimeout(function() {
        strictEqual($dataContainerWraper.find('table.macro-table-dynamic tr.macro-table-row[data-row-index='+(scroll2 * (1 + numSubRows))+']').offset().top, containerOffsetTop, 'Second scroll row scrolled to correctly');

        $('#table').macroTable('scrollToRow', 0, true);

        setTimeout(function() {
          strictEqual($dataContainerWraper.find('table.macro-table-dynamic tr.macro-table-row[data-row-index=0]').offset().top, containerOffsetTop, 'Scrolled to top correctly');

          $('#table').macroTable('scrollToRow', scroll1, false);

          setTimeout(function() {
            strictEqual($dataContainerWraper.find('table.macro-table-dynamic tr.macro-table-row[data-row-index='+scroll1+']').offset().top, containerOffsetTop, 'First scroll subrow scrolled to correctly');

            $('#table').macroTable('scrollToRow', scroll2, false);

            setTimeout(function() {
              strictEqual($dataContainerWraper.find('table.macro-table-dynamic tr.macro-table-row[data-row-index='+scroll2+']').offset().top, containerOffsetTop, 'Second scroll subrow scrolled to correctly');
              start();
            }, 0);
          }, 0);
        }, 0);
      }, 0);
    }, 0);
  });

  asyncTest('Table without Summary Row Scrolls to Last Row', 5, function() {

    var totalRows = 200,
      columnOptions = {
        numColumns: 6
      },
      scrollToRow = 170, //won't render padding/margin to bottom yet
      containerWidth = 300,
      tableData, $dataContainerWraper, $scrollContainer, rowHeight, containerOffsetTop;

    $(window).scrollTop(0);
    $('#qunit-fixture .wrapper').width(containerWidth + 'px');

    tableData = publicFunctions.initializeTable(totalRows, columnOptions);

    $('#table').macroTable('option', {
      tableData: publicFunctions.generateTableData(totalRows, columnOptions, {
        1: 9,
        10: 30
      }, {
        10: {
          2: 'jhgfjhgfjhgf'
        },
        192: {
          1: 'ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh'
        },
        193: {
          1: 'ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh'
        },
        194: {
          1: 'ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh'
        },
        195: {
          1: 'ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh'
        },
        196: {
          1: 'ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh'
        },
        197: {
          1: 'ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh'
        },
        198: {
          1: 'ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh'
        },
        199: {
          1: 'ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh'
        }
      })
    });

    rowHeight = $('#table').macroTable('option', 'rowHeight');
    $dataContainerWraper = $('#table div.macro-table-data-container-wrapper');
    containerOffsetTop = $dataContainerWraper.offset().top;
    $scrollContainer = $('#table div.macro-table-scroll-container').scrollTop(scrollToRow * rowHeight);

    //need to wait for the scroll events to complete
    setTimeout(function() {
      strictEqual($dataContainerWraper.find('table.macro-table-dynamic tr.macro-table-row[data-row-index='+scrollToRow+']').offset().top, containerOffsetTop, 'Intermediate row scrolled to correctly');

      $scrollContainer.scrollTop(totalRows * rowHeight);

      //need to wait for the scroll events to complete
      setTimeout(function() {
        //scrolling by hand to the last scroll position won't necessarily reveal the last row because the padding/margin needs to be added
        //which doesn't happen automatically in this case...
        var currentRow = totalRows - ~~($dataContainerWraper.height() / rowHeight);
        strictEqual($dataContainerWraper.find('table.macro-table-dynamic tr.macro-table-row[data-row-index='+currentRow+']').offset().top, containerOffsetTop, 'Intermediate "current row" scrolled to correctly');

        //...so you'd have to scroll again
        //this is expected behavior; if you want automatic, use the scrollToRow API call
        $scrollContainer.scrollTop(totalRows * rowHeight);

        //need to wait for the scroll events to complete
        setTimeout(function() {
          var $lastRow = $dataContainerWraper.find('table.macro-table-dynamic tr.macro-table-row').last();
          equal($lastRow.attr('data-row-index'), totalRows - 1, 'Last row is last in the current row window');
          ok($lastRow.offset().top <  + $dataContainerWraper.height(), 'Top of last row visible in table viewport');
          ok($lastRow.offset().top + $lastRow.height() < containerOffsetTop + $dataContainerWraper.height(), 'Bottom of last row visible in table viewport');
          start();
        }, 0);
      }, 0);
    }, 0);
  });

  asyncTest('Table with Summary Row Scrolls to Last Row', 5, function() {

    var totalRows = 200,
      columnOptions = {
        numColumns: 6
      },
      scrollToRow = 173, //won't render padding/margin to bottom yet
      containerWidth = 300,
      tableData, $dataContainerWraper, $scrollContainer, rowHeight, containerOffsetTop;

    $(window).scrollTop(0);
    $('#qunit-fixture .wrapper').width(containerWidth + 'px');

    tableData = publicFunctions.initializeTable(totalRows, columnOptions, {
      summaryRow: true
    });

    $('#table').macroTable('option', {
      tableData: publicFunctions.generateTableData(totalRows, columnOptions, {
        1: 9,
        10: 30
      }, {
        10: {
          2: 'jhgfjhgfjhgf'
        },
        192: {
          1: 'ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh'
        },
        193: {
          1: 'ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh'
        },
        194: {
          1: 'ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh'
        },
        195: {
          1: 'ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh'
        },
        196: {
          1: 'ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh'
        },
        197: {
          1: 'ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh'
        },
        198: {
          1: 'ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh'
        },
        199: {
          1: 'ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh'
        }
      })
    });

    rowHeight = $('#table').macroTable('option', 'rowHeight');
    $dataContainerWraper = $('#table div.macro-table-data-container-wrapper');
    containerOffsetTop = $dataContainerWraper.offset().top;
    $scrollContainer = $('#table div.macro-table-scroll-container').scrollTop(scrollToRow * rowHeight);

    //need to wait for the scroll events to complete
    setTimeout(function() {
      strictEqual($dataContainerWraper.find('table.macro-table-dynamic tr.macro-table-row[data-row-index='+scrollToRow+']').offset().top, containerOffsetTop, 'Intermediate row scrolled to correctly');

      $scrollContainer.scrollTop(totalRows * rowHeight);

      //need to wait for the scroll events to complete
      setTimeout(function() {
        //scrolling by hand to the last scroll position won't necessarily reveal the last row because the padding/margin needs to be added
        //which doesn't happen automatically in this case...
        var currentRow = totalRows - ~~($dataContainerWraper.height() / rowHeight);
        strictEqual($dataContainerWraper.find('table.macro-table-dynamic tr.macro-table-row[data-row-index='+currentRow+']').offset().top, containerOffsetTop, 'Intermediate "current row" scrolled to correctly');

        //...so you'd have to scroll again
        //this is expected behavior; if you want automatic, use the scrollToRow API call
        $scrollContainer.scrollTop(totalRows * rowHeight);

        //need to wait for the scroll events to complete
        setTimeout(function() {
          var $lastRow = $dataContainerWraper.find('table.macro-table-dynamic tr.macro-table-row').last();
          equal($lastRow.attr('data-row-index'), totalRows - 1, 'Last row is last in the current row window');
          ok($lastRow.offset().top <  + $dataContainerWraper.height(), 'Top of last row visible in table viewport');
          ok($lastRow.offset().top + $lastRow.height() < containerOffsetTop + $dataContainerWraper.height(), 'Bottom of last row visible in table viewport');
          start();
        }, 0);
      }, 0);
    }, 0);
  });

  asyncTest('Table without Summary Row Scrolls to Last Row Via API', 3, function() {
    //shows 10 rows worth of height + header, and fits width to 100%

    var totalRows = 200,
      columnOptions = {
        numColumns: 6
      },
      containerWidth = 300,
      tableData, $dataContainerWraper;

    $(window).scrollTop(0);
    $('#qunit-fixture .wrapper').width(containerWidth + 'px');

    tableData = publicFunctions.initializeTable(totalRows, columnOptions);

    $('#table').macroTable('option', {
      tableData: publicFunctions.generateTableData(totalRows, columnOptions, {
        1: 9,
        10: 30
      }, {
        10: {
          2: 'jhgfjhgfjhgf'
        },
        192: {
          1: 'ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh'
        },
        193: {
          1: 'ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh'
        },
        194: {
          1: 'ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh'
        },
        195: {
          1: 'ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh'
        },
        196: {
          1: 'ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh'
        },
        197: {
          1: 'ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh'
        },
        198: {
          1: 'ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh'
        },
        199: {
          1: 'ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh'
        }
      })
    }).macroTable('scrollToRow', totalRows, true);

    $dataContainerWraper = $('#table div.macro-table-data-container-wrapper');

    //need to wait for the scroll events to complete
    setTimeout(function() {
      var $lastRow = $dataContainerWraper.find('table.macro-table-dynamic tr.macro-table-row').last();
      equal($lastRow.attr('data-row-index'), totalRows - 1, 'Last row is last in the current row window');
      ok($lastRow.offset().top < $dataContainerWraper.offset().top + $dataContainerWraper.height(), 'Top of last row visible in table viewport');
      ok($lastRow.offset().top + $lastRow.height() < $dataContainerWraper.offset().top + $dataContainerWraper.height(), 'Bottom of last row visible in table viewport');
      start();
    }, 200); //long wait because of 2x scroll events for margin/padding re-scroll calculation
  });

  asyncTest('Table with Summary Row Scrolls to Last Row Via API', 3, function() {
    //shows 10 rows worth of height + header, and fits width to 100%

    var totalRows = 200,
      totalColumns = 6,
      columnOptions = {
        numColumns: 6
      },
      containerWidth = 300,
      tableData, $dataContainerWraper;

    $(window).scrollTop(0);
    $('#qunit-fixture .wrapper').width(containerWidth + 'px');

    tableData = publicFunctions.initializeTable(totalRows, columnOptions, {
      summaryRow: true
    });

    $('#table').macroTable('option', {
      tableData: publicFunctions.generateTableData(totalRows, columnOptions, {
        1: 9,
        10: 30
      }, {
        10: {
          2: 'jhgfjhgfjhgf'
        },
        192: {
          1: 'ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh'
        },
        193: {
          1: 'ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh'
        },
        194: {
          1: 'ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh'
        },
        195: {
          1: 'ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh'
        },
        196: {
          1: 'ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh'
        },
        197: {
          1: 'ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh'
        },
        198: {
          1: 'ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh'
        },
        199: {
          1: 'ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh ahh'
        }
      })
    }).macroTable('scrollToRow', totalRows, true);

    $dataContainerWraper = $('#table div.macro-table-data-container-wrapper');

    //need to wait for the scroll events to complete
    setTimeout(function() {
      var $lastRow = $dataContainerWraper.find('table.macro-table-dynamic tr.macro-table-row').last();
      equal($lastRow.attr('data-row-index'), totalRows - 1, 'Last row is last in the current row window');
      ok($lastRow.offset().top < $dataContainerWraper.offset().top + $dataContainerWraper.height(), 'Top of last row visible in table viewport');
      ok($lastRow.offset().top + $lastRow.height() < $dataContainerWraper.offset().top + $dataContainerWraper.height(), 'Bottom of last row visible in table viewport');
      start();
    }, 200); //long wait because of 2x scroll events for margin/padding re-scroll calculation
  });

  module('Element Dimension Consistency');

//  module('column manipulation');
})();