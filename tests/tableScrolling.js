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

    $scrollContainer = $('#table div.macro-table-scroll-container');
    $scrollContainer.scrollTop(scroll1 * rowHeight)
    .trigger('scroll'); //force a scroll trigger for firefox
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

  asyncTest('Table without Summary Row Scrolls to Last Row', 6, function() {
    $('#table').on('macrotablescroll', function(e) {
      switch(iteration++) {
        case 0:
          strictEqual($dataContainerWraper.find('table.macro-table-dynamic tr.macro-table-row[data-row-index='+scrollToRow+']').offset().top, containerOffsetTop, 'Intermediate row scrolled to correctly');

          //$scrollContainer.scrollTop((totalRows - 15) * rowHeight);
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
          var $lastRowStatic = $dataContainerWraper.find('table.macro-table-static tr.macro-table-row').last();
          equal($lastRow.attr('data-row-index'), totalRows - 1, 'Last row is last in the current row window');
          ok($lastRow.offset().top <  + $dataContainerWraper.height(), 'Top of last row visible in table viewport');
          ok($lastRow.offset().top + $lastRow.height() < containerOffsetTop + $dataContainerWraper.height(), 'Bottom of last row visible in table viewport');
          strictEqual($lastRow.height(), $lastRowStatic.height(), 'Dynamic and static components of last row are the same height');
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
    $scrollContainer = $('#table div.macro-table-scroll-container');
    $scrollContainer.scrollTop(scrollToRow * rowHeight);
  });

  asyncTest('Table with Summary Row Scrolls to Last Row', 6, function() {
    $('#table').on('macrotablescroll', function(e) {
      switch(iteration++) {
        case 0:
          strictEqual($dataContainerWraper.find('table.macro-table-dynamic tr.macro-table-row[data-row-index='+scrollToRow+']').offset().top, containerOffsetTop, 'Intermediate row scrolled to correctly');

          $scrollContainer.scrollTop(totalRows * rowHeight)
          .trigger('scroll'); //force a scroll trigger for firefox
          break;

        case 1:
          //scrolling by hand to the last scroll position won't necessarily reveal the last row because the padding/margin needs to be added
          //which doesn't happen automatically in this case...
          var currentRow = totalRows - ~~($dataContainerWraper.height() / rowHeight);
          strictEqual($dataContainerWraper.find('table.macro-table-dynamic tr.macro-table-row[data-row-index='+currentRow+']').offset().top, containerOffsetTop, 'Intermediate "current row" scrolled to correctly');

          //...so you'd have to scroll again
          //this is expected behavior; if you want automatic, use the scrollToRow API call
          $scrollContainer.scrollTop(totalRows * rowHeight)
          .trigger('scroll');
          break;

        case 2:
          var $lastRow = $dataContainerWraper.find('table.macro-table-dynamic tr.macro-table-row').last();
          var $lastRowStatic = $dataContainerWraper.find('table.macro-table-static tr.macro-table-row').last();
          equal($lastRow.attr('data-row-index'), totalRows - 1, 'Last row is last in the current row window');
          ok($lastRow.offset().top <  + $dataContainerWraper.height(), 'Top of last row visible in table viewport');
          ok($lastRow.offset().top + $lastRow.height() < containerOffsetTop + $dataContainerWraper.height(), 'Bottom of last row visible in table viewport');
          strictEqual($lastRow.height(), $lastRowStatic.height(), 'Dynamic and static components of last row are the same height');
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
    $scrollContainer = $('#table div.macro-table-scroll-container');
    $scrollContainer.scrollTop(scrollToRow * rowHeight)
    .trigger('scroll'); //force a scroll trigger for firefox
  });

  asyncTest('Table without Summary Row Scrolls to Last Row Via API', 4, function() {
    //shows 10 rows worth of height + header, and fits width to 100%

    $('#table').on('macrotablescroll', function(e) {
      var $lastRow = $dataContainerWraper.find('table.macro-table-dynamic tr.macro-table-row').last();
      var $lastRowStatic = $dataContainerWraper.find('table.macro-table-static tr.macro-table-row').last();
      equal($lastRow.attr('data-row-index'), totalRows - 1, 'Last row is last in the current row window');
      ok($lastRow.offset().top < $dataContainerWraper.offset().top + $dataContainerWraper.height(), 'Top of last row visible in table viewport');
      ok($lastRow.offset().top + $lastRow.height() < $dataContainerWraper.offset().top + $dataContainerWraper.height(), 'Bottom of last row visible in table viewport');
      strictEqual($lastRow.height(), $lastRowStatic.height(), 'Dynamic and static components of last row are the same height');
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

  asyncTest('Table Rows Irregular Heights Match After Scrolling', 10, function() {

    $('#table').on('macrotablescroll', function(e) {
      switch(iteration++) {
        case 0:
          $('#table').macroTable('scrollToRow', totalRows, true);
          break;

        case 1:
          var $lastRow = $dataContainerWraper.find('table.macro-table-dynamic tr.macro-table-row').last();
          var $lastRowStatic = $dataContainerWraper.find('table.macro-table-static tr.macro-table-row').last();
          equal($lastRow.attr('data-row-index'), totalRows - 1, 'Last row is last in the current row window');
          ok($lastRow.offset().top < $dataContainerWraper.offset().top + $dataContainerWraper.height(), 'Top of last dynamic row visible in table viewport');
          ok($lastRowStatic.offset().top < $dataContainerWraper.offset().top + $dataContainerWraper.height(), 'Top of last static row visible in table viewport');
          ok($lastRow.offset().top + $lastRow.height() < $dataContainerWraper.offset().top + $dataContainerWraper.height(), 'Bottom of last dynamic row visible in table viewport');
          ok($lastRowStatic.offset().top + $lastRowStatic.height() < $dataContainerWraper.offset().top + $dataContainerWraper.height(), 'Bottom of last static row visible in table viewport');
          strictEqual($lastRow.height(), $lastRowStatic.height(), 'Dynamic and static components of last row are the same height');

          $('#table').macroTable('option', {
            summaryRow: false
          });
          /*break;

        case 2:*/
          var $firstRow = $dataContainerWraper.find('table.macro-table-dynamic tr.macro-table-row').first();
          var $firstRowStatic = $dataContainerWraper.find('table.macro-table-static tr.macro-table-row').first();
          equal($firstRow.attr('data-row-index'), 0, '0th row is first in the current row window');
          strictEqual($firstRow.offset().top, $dataContainerWraper.offset().top, 'First dynamic row is at 0-offset');
          strictEqual($firstRowStatic.offset().top, $dataContainerWraper.offset().top, 'First static row is at 0-offset');
          strictEqual($firstRow.height(), $firstRowStatic.height(), 'Dynamic and static components of first row are the same height');
          start();
          break;

        default:
          break;
      }
    });

    var totalRows = 200,
      firstScroll = 177,
      totalColumns = 6,
      columnOptions = {
        numColumns: 6
      },
      tableData, $dataContainerWraper;

    $(window).scrollTop(0);

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
    }).macroTable('scrollToRow', firstScroll, true);

    $dataContainerWraper = $('#table div.macro-table-data-container-wrapper');
  });


  asyncTest('Table Scrolls to Column', 4, function() {
    $('#table').on('macrotablescroll', function(e) {
      switch(iteration++) {
        case 0:
          strictEqual($columnContainer.find('th.macro-table-column-cell:nth-child('+scroll1+')').position().left, 0, 'First scroll column scrolled to correctly');

          $scrollContainer.scrollLeft($columnContainer.scrollLeft() + $columnContainer.find('th.macro-table-column-cell:nth-child('+scroll2+')').position().left);
          break;

        case 1:
          strictEqual($columnContainer.find('th.macro-table-column-cell:nth-child('+scroll2+')').position().left, 0, 'Second scroll column scrolled to correctly');

          $scrollContainer.scrollLeft($columnContainer.scrollLeft() + $columnContainer.find('th.macro-table-column-cell:nth-child('+scroll3+')').position().left);
          break;

        case 2:
          strictEqual($columnContainer.find('th.macro-table-column-cell:nth-child('+scroll3+')').position().left, 0, 'Third scroll column scrolled to correctly, exposed extra left margin');

          $scrollContainer.scrollLeft(0);
          break;

        case 3:
          strictEqual($columnContainer.find('th.macro-table-column-cell:nth-child(1)').position().left, 0, 'Scrolled to top correctly');
          start();
          break;

        default:
          break;
      }
    });

    var numColumns = 10,
      scroll1 = 2,
      scroll2 = 4,
      scroll3 = 7,
      containerWidth = 600,
      $scrollContainer, $columnContainer, containerOffsetTop, tableData;

    $('#qunit-fixture .wrapper').width(containerWidth + 'px');

    tableData = publicFunctions.initializeTable(1, {
      numColumns: numColumns,
      width: {
        2: 400
      }
    });

    $(window).scrollTop(0);
    containerOffsetLeft = $('#table div.macro-table-data-container-wrapper').offset().left;

    $columnContainer = $('#table div.macro-table-header');
    $scrollContainer = $('#table div.macro-table-scroll-container');
    $scrollContainer.scrollLeft($columnContainer.find('th.macro-table-column-cell:nth-child('+scroll1+')').position().left)
    .trigger('scroll'); //force a scroll trigger for firefox
  });

  asyncTest('Table Scrolls to Column Via API', 4, function() {
    $('#table').on('macrotablescroll', function(e) {
      switch(iteration++) {
        case 0:
          strictEqual($columnContainer.find('th.macro-table-column-cell:nth-child('+scroll1+')').position().left, 0, 'First scroll column scrolled to correctly');

          $('#table').macroTable('scrollToColumn', scroll2 - 1);
          break;

        case 1:
          strictEqual($columnContainer.find('th.macro-table-column-cell:nth-child('+scroll2+')').position().left, 0, 'Second scroll column scrolled to correctly');

          $('#table').macroTable('scrollToColumn', scroll3 - 1);
          break;

        case 2:
          strictEqual($columnContainer.find('th.macro-table-column-cell:nth-child('+scroll3+')').position().left, 0, 'Third scroll column scrolled to correctly, exposed extra left margin');

          $('#table').macroTable('scrollToColumn', 0);
          break;

        case 3:
          strictEqual($columnContainer.find('th.macro-table-column-cell:nth-child(1)').position().left, 0, 'Scrolled to top correctly');
          start();
          break;

        default:
          break;
      }
    });

    var numColumns = 10,
      scroll1 = 2,
      scroll2 = 4,
      scroll3 = 7,
      containerWidth = 600,
      $columnContainer, containerOffsetTop, tableData;

    $('#qunit-fixture .wrapper').width(containerWidth + 'px');

    tableData = publicFunctions.initializeTable(1, {
      numColumns: numColumns,
      width: {
        2: 400
      }
    });

    $(window).scrollTop(0);
    containerOffsetLeft = $('#table div.macro-table-data-container-wrapper').offset().left;

    $columnContainer = $('#table div.macro-table-header');
    $('#table').macroTable('scrollToColumn', scroll1 - 1);
  });

})();