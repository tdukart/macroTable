(function() {
  /**
   * Test Module for verifying table is scrolling correctly with varying sets of data
   * This is a general test suite and not specifically testing a table option/feature
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
})();