(function() {
  var iteration;

  /**
   * Test Module for verifying table is scrolling correctly with varying sets of data
   * This is a general test suite and not specifically testing a table option/feature
   */
  module('Scrolling', {
    setup: function() {
      iteration = 0;
    }
  });

  asyncTest('Table Scrolls to Row', 3, function() {
    $('#table').on('macrotablescroll', function(e) {
      switch(iteration++) {
        case 0:
          strictEqual($dataContainerWraper.find('table.macro-table-dynamic tr.macro-table-row[data-row-index='+scroll1+']').offset().top, containerOffsetTop, 'First scroll row scrolled to correctly');

          $scrollContainer.scrollTop(scroll2 * rowHeight);
          break;

        case 1:
          strictEqual($dataContainerWraper.find('table.macro-table-dynamic tr.macro-table-row[data-row-index='+scroll2+']').offset().top, containerOffsetTop, 'Second scroll row scrolled to correctly');

          $scrollContainer.scrollTop(0);
          break;

        case 2:
          strictEqual($dataContainerWraper.find('table.macro-table-dynamic tr.macro-table-row[data-row-index=0]').offset().top, containerOffsetTop, 'Scrolled to top correctly');
          start();
          break;

        default:
          break;
      }
    });

    var totalRows = 500,
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
  });

  asyncTest('Table Scrolls to Row Via API', 3, function() {
    $('#table').on('macrotablescroll', function(e) {
      switch(iteration++) {
        case 0:
          strictEqual($dataContainerWraper.find('table.macro-table-dynamic tr.macro-table-row[data-row-index='+scroll1+']').offset().top, containerOffsetTop, 'First scroll row scrolled to correctly');

          $('#table').macroTable('scrollToRow', scroll2, true);
          break;

        case 1:
          strictEqual($dataContainerWraper.find('table.macro-table-dynamic tr.macro-table-row[data-row-index='+scroll2+']').offset().top, containerOffsetTop, 'Second scroll row scrolled to correctly');

          $('#table').macroTable('scrollToRow', 0, true);
          break;

        case 2:
          strictEqual($dataContainerWraper.find('table.macro-table-dynamic tr.macro-table-row[data-row-index=0]').offset().top, containerOffsetTop, 'Scrolled to top correctly');
          start();
          break;

        default:
          break;
      }
    });

    var totalRows = 500,
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
  });

  asyncTest('Table Scrolls to Row with Expanded Subrows', 5, function() {
    $('#table').on('macrotablescroll', function(e) {
      switch(iteration++) {
        case 0:
          strictEqual($dataContainerWraper.find('table.macro-table-dynamic tr.macro-table-row[data-row-index='+(scroll1 * (1 + numSubRows))+']').offset().top, containerOffsetTop, 'First scroll row scrolled to correctly');

          $('#table').macroTable('scrollToRow', scroll2, true);
          break;

        case 1:
          strictEqual($dataContainerWraper.find('table.macro-table-dynamic tr.macro-table-row[data-row-index='+(scroll2 * (1 + numSubRows))+']').offset().top, containerOffsetTop, 'Second scroll row scrolled to correctly');

          $('#table').macroTable('scrollToRow', 0, true);
          break;

        case 2:
          strictEqual($dataContainerWraper.find('table.macro-table-dynamic tr.macro-table-row[data-row-index=0]').offset().top, containerOffsetTop, 'Scrolled to top correctly');

          $('#table').macroTable('scrollToRow', scroll1, false);
          break;

        case 3:
          strictEqual($dataContainerWraper.find('table.macro-table-dynamic tr.macro-table-row[data-row-index='+scroll1+']').offset().top, containerOffsetTop, 'First scroll subrow scrolled to correctly');

          $('#table').macroTable('scrollToRow', scroll2, false);
          break;

        case 4:
          strictEqual($dataContainerWraper.find('table.macro-table-dynamic tr.macro-table-row[data-row-index='+scroll2+']').offset().top, containerOffsetTop, 'Second scroll subrow scrolled to correctly');
          start();
          break;

        default:
          break;
      }
    });

    var totalRows = 50,
      numSubRows = 10,
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
  });

  asyncTest('Table without Summary Row Scrolls to Last Row', 5, function() {
    $('#table').on('macrotablescroll', function(e) {
      switch(iteration++) {
        case 0:
          strictEqual($dataContainerWraper.find('table.macro-table-dynamic tr.macro-table-row[data-row-index='+scrollToRow+']').offset().top, containerOffsetTop, 'Intermediate row scrolled to correctly');

          $scrollContainer.scrollTop(totalRows * rowHeight);
          break;

        case 1:
          //scrolling by hand to the last scroll position won't necessarily reveal the last row because the padding/margin needs to be added
          //which doesn't happen automatically in this case...
          var currentRow = totalRows - ~~($dataContainerWraper.height() / rowHeight);
          strictEqual($dataContainerWraper.find('table.macro-table-dynamic tr.macro-table-row[data-row-index='+currentRow+']').offset().top, containerOffsetTop, 'Intermediate "current row" scrolled to correctly');

          //...so you'd have to scroll again
          //this is expected behavior; if you want automatic, use the scrollToRow API call
          $scrollContainer.scrollTop(totalRows * rowHeight);
          break;

        case 2:
          var $lastRow = $dataContainerWraper.find('table.macro-table-dynamic tr.macro-table-row').last();
          equal($lastRow.attr('data-row-index'), totalRows - 1, 'Last row is last in the current row window');
          ok($lastRow.offset().top <  + $dataContainerWraper.height(), 'Top of last row visible in table viewport');
          ok($lastRow.offset().top + $lastRow.height() < containerOffsetTop + $dataContainerWraper.height(), 'Bottom of last row visible in table viewport');
          start();
          break;

        default:
          break;
      }
    });

    var totalRows = 200,
      columnOptions = {
        numColumns: 6
      },
      scrollToRow = 130, //won't render padding/margin to bottom yet
      containerWidth = 300,
      tableData, $dataContainerWraper, $scrollContainer, rowHeight, containerOffsetTop;

    $(window).scrollTop(0);
    $('#qunit-fixture .wrapper').width(containerWidth + 'px');

    tableData = publicFunctions.initializeTable(0, columnOptions, {
      scrollRowWindow: 25
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
  });

  asyncTest('Table with Summary Row Scrolls to Last Row', 5, function() {
    $('#table').on('macrotablescroll', function(e) {
      switch(iteration++) {
        case 0:
          strictEqual($dataContainerWraper.find('table.macro-table-dynamic tr.macro-table-row[data-row-index='+scrollToRow+']').offset().top, containerOffsetTop, 'Intermediate row scrolled to correctly');

          $scrollContainer.scrollTop(totalRows * rowHeight);
          break;

        case 1:
          //scrolling by hand to the last scroll position won't necessarily reveal the last row because the padding/margin needs to be added
          //which doesn't happen automatically in this case...
          var currentRow = totalRows - ~~($dataContainerWraper.height() / rowHeight);
          strictEqual($dataContainerWraper.find('table.macro-table-dynamic tr.macro-table-row[data-row-index='+currentRow+']').offset().top, containerOffsetTop, 'Intermediate "current row" scrolled to correctly');

          //...so you'd have to scroll again
          //this is expected behavior; if you want automatic, use the scrollToRow API call
          $scrollContainer.scrollTop(totalRows * rowHeight);
          break;

        case 2:
          var $lastRow = $dataContainerWraper.find('table.macro-table-dynamic tr.macro-table-row').last();
          equal($lastRow.attr('data-row-index'), totalRows - 1, 'Last row is last in the current row window');
          ok($lastRow.offset().top <  + $dataContainerWraper.height(), 'Top of last row visible in table viewport');
          ok($lastRow.offset().top + $lastRow.height() < containerOffsetTop + $dataContainerWraper.height(), 'Bottom of last row visible in table viewport');
          start();
          break;

        default:
          break;
      }
    });

    var totalRows = 200,
      columnOptions = {
        numColumns: 6
      },
      scrollToRow = 132, //won't render padding/margin to bottom yet
      containerWidth = 300,
      tableData, $dataContainerWraper, $scrollContainer, rowHeight, containerOffsetTop;

    $(window).scrollTop(0);
    $('#qunit-fixture .wrapper').width(containerWidth + 'px');

    tableData = publicFunctions.initializeTable(0, columnOptions, {
      summaryRow: true,
      scrollRowWindow: 25
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
  });

  asyncTest('Table without Summary Row Scrolls to Last Row Via API', 3, function() {
    //shows 10 rows worth of height + header, and fits width to 100%

    $('#table').on('macrotablescroll', function(e) {
      var $lastRow = $dataContainerWraper.find('table.macro-table-dynamic tr.macro-table-row').last();
      equal($lastRow.attr('data-row-index'), totalRows - 1, 'Last row is last in the current row window');
      ok($lastRow.offset().top < $dataContainerWraper.offset().top + $dataContainerWraper.height(), 'Top of last row visible in table viewport');
      ok($lastRow.offset().top + $lastRow.height() < $dataContainerWraper.offset().top + $dataContainerWraper.height(), 'Bottom of last row visible in table viewport');
      start();
    });

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
  });

  asyncTest('Table with Summary Row Scrolls to Last Row Via API', 3, function() {
    //shows 10 rows worth of height + header, and fits width to 100%

    $('#table').on('macrotablescroll', function(e) {
      var $lastRow = $dataContainerWraper.find('table.macro-table-dynamic tr.macro-table-row').last();
      equal($lastRow.attr('data-row-index'), totalRows - 1, 'Last row is last in the current row window');
      ok($lastRow.offset().top < $dataContainerWraper.offset().top + $dataContainerWraper.height(), 'Top of last row visible in table viewport');
      ok($lastRow.offset().top + $lastRow.height() < $dataContainerWraper.offset().top + $dataContainerWraper.height(), 'Bottom of last row visible in table viewport');
      start();
    });

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
  });
})();