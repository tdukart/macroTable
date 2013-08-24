(function() {
  var iteration;

  /**
   * Test Module for testing the Search and Filter features of the table and their interactions with each other
   */
  module('Search and Filter', {
    setup: function() {
      iteration = 0;
    }
  });

  asyncTest('Search Table', 9, function() {
    $('#table').on('macrotablesearch', function(e) {
      switch(iteration++) {
        case 0:
          strictEqual($rowContainer.find('tr').length, 1, 'Correct number of rows rendered due to search term matching one of them');
          strictEqual($rowContainer.find('.macro-table-filter-match').length, 1, 'Correctly found one search match highlight');
          strictEqual($rowContainer.find('.macro-table-filter-match').text(), search1, 'Search term correctly highlighted');

          $('#table').macroTable('searchTable', search2);
          break;

        case 1:
          strictEqual($rowContainer.find('tr').length, totalRows, 'All rows rendered with search term matching all of them');
          strictEqual($rowContainer.find('.macro-table-filter-match').length, 3, 'Correctly found three search match highlights');
          strictEqual($rowContainer.find('.macro-table-filter-match').eq(0).text(), search2, 'First search term correctly highlighted');
          strictEqual($rowContainer.find('.macro-table-filter-match').eq(1).text(), search2, 'Second search term correctly highlighted');
          strictEqual($rowContainer.find('.macro-table-filter-match').eq(2).text(), search2, 'Third search term correctly highlighted');

          $('#table').macroTable('searchTable', search3);
          break;

        case 2:
          strictEqual($rowContainer.find('tr').length, 0, 'No rows rendered for lack of matching search term');
          start();
          break;

        default:
          break;
      }
    });

    var totalRows = 3,
      tableData = publicFunctions.initializeTable(totalRows, {
        numColumns: 3
      }, {
        highlightMatches: true
      }),
      search1 = '0(0)',
      search2 = '(0)',
      search3 = 'fake search',
      $rowContainer = $('#table .macro-table-data-container');

    $('#table').macroTable('searchTable', search1);
  });

  asyncTest('Search Table without Highlight', 5, function() {
    $('#table').on('macrotablesearch', function(e) {
      switch(iteration++) {
        case 0:
          strictEqual($rowContainer.find('tr').length, 1, 'Correct number of rows rendered due to search term matching one of them');
          strictEqual($rowContainer.find('.macro-table-filter-match').length, 0, 'No highlighting found, as intended');

          $('#table').macroTable('searchTable', search2);
          break;

        case 1:
          strictEqual($rowContainer.find('tr').length, totalRows, 'All rows rendered with search term matching all of them');
          strictEqual($rowContainer.find('.macro-table-filter-match').length, 0, 'No highlighting found for any matching row, as intended');

          $('#table').macroTable('searchTable', search3);
          break;

        case 2:
          strictEqual($rowContainer.find('tr').length, 0, 'No rows rendered for lack of matching search term');
          start();
          break;

        default:
          break;
      }
    });

    var totalRows = 3,
      tableData = publicFunctions.initializeTable(totalRows, {
        numColumns: 3
      }),
      search1 = '0(0)',
      search2 = '(0)',
      search3 = 'fake search',
      $rowContainer = $('#table .macro-table-data-container');

    $('#table').macroTable('searchTable', search1);
  });

  asyncTest('Single-Filter Table', 9, function() {
    $('#table').on('macrotablefilter', function(e) {
      switch(iteration++) {
        case 0:
          strictEqual($rowContainer.find('tr').length, 1, 'Correct number of rows filtered');
          strictEqual($rowContainer.find('td').first().text(), filterValue1, 'Correct filtered row rendered');

          $('#table').macroTable('filterTable');
          break;

        case 1:
          strictEqual($rowContainer.find('tr').length, totalRows, 'Correct number of original rows returned');

          $('#table').macroTable('option', 'columnFilters', [{
            field: filterColumn2,
            value: filterValue2
          }]);
          break;

        case 2:
          strictEqual($rowContainer.find('tr').length, 1, 'Correct number of rows filtered via setting "options"');
          strictEqual($rowContainer.find('td').filter(':nth-child(2)').text(), filterValue2, 'Correct filtered row rendered via setting "options"');

          $('#table').macroTable('option', 'columnFilters', []);
          break;

        case 3:
          strictEqual($rowContainer.find('tr').length, totalRows, 'Correct number of original rows returned via setting "options"');

          $('#table').macroTable('option', 'columnFilters', [{
            field: filterColumn3,
            value: filterValue3
          }]);
          break;

        case 4:
          strictEqual($rowContainer.find('tr').length, 0, 'No rows rendered for lack of matching filter');

          $('#table').macroTable('option', 'columnFilters', [{
            field: filterColumn4,
            value: filterValue4
          }]);
          break;

        case 5:
          strictEqual($rowContainer.find('tr').length, 0, 'No rows rendered for lacking column data at provided field');
          start();
          break;

        default:
          break;
      }
    });

    var totalRows = 3,
      tableData = publicFunctions.initializeTable(totalRows, {
        numColumns: 3
      }),
      filterColumn1 = 'column0',
      filterValue1 = '0(0)',
      filterColumn2 = 'column1',
      filterValue2 = '1(1)',
      filterColumn3 = 'column2',
      filterValue3 = 'fake result',
      filterColumn4 = 'fake column field',
      filterValue4 = 'fake result',
      $rowContainer = $('#table .macro-table-data-container');

    strictEqual($rowContainer.find('tr').length, totalRows, 'Correct number of rows initialized');

    $('#table').macroTable('filterTable', [{
      field: filterColumn1,
      value: filterValue1
    }]);
  });

  asyncTest('Multi-Filter Table', 4, function() {
    $('#table').on('macrotablefilter', function(e) {
      switch(iteration++) {
        case 0:
          strictEqual($rowContainer.find('tr').length, 1, 'Correct number of rows filtered');
          strictEqual($rowContainer.find('td').first().text(), filterValue1, 'Correct filtered row rendered');

          $('#table').macroTable('filterTable', [{
            field: filterColumn1,
            value: filterValue1
          }, {
            field: filterColumn2,
            value: filterValue2
          }, {
            field: filterColumn3,
            value: filterValue3
          }]);
          break;

        case 1:
          strictEqual($rowContainer.find('tr').length, 0, 'No rows rendered for lack of matching filter');
          start();
          break;

        default:
          break;
      }
    });

    var totalRows = 3,
      tableData = publicFunctions.initializeTable(totalRows, {
        numColumns: 3
      }),
      filterColumn1 = 'column0',
      filterValue1 = '0(0)',
      filterColumn2 = 'column1',
      filterValue2 = '0(1)',
      filterColumn3 = 'column2',
      filterValue3 = 'fake result',
      $rowContainer = $('#table .macro-table-data-container');

    strictEqual($rowContainer.find('tr').length, totalRows, 'Correct number of rows initialized');

    $('#table').macroTable('filterTable', [{
      field: filterColumn1,
      value: filterValue1
    }, {
      field: filterColumn2,
      value: filterValue2
    }]);
  });

  asyncTest('Search and Filter Table', 6, function() {
    /**
     * When a searchTable and a filterTable are called in succession with valid values, the event associated with the first call will fire twice.
     * Once for the call itself, and another for the subsequent call, which will fire both events
     * @type {Number}
     */
    iteration = -2; //we want the events to fire 3 times before starting the test

    $('#table').on('macrotablefilter macrotablesearch', function(e) {
      switch(iteration++) {
        case 0: //only want this reachable once initial search and filter events fired
          strictEqual($rowContainer.find('tr').length, 1, 'Correct number of rows rendered due to search term matching the filtered row');

          $('#table').macroTable('filterTable', [{
            field: filterColumn2,
            value: filterValue2
          }]); //will fire macrotablesearch and macrotablefilter
          break;

        case 2:
          strictEqual($rowContainer.find('tr').length, 0, 'No rows rendered for lack of matching search term to filtered row');

          $('#table').macroTable('searchTable', search2); //will fire macrotablesearch and macrotablefilter
          break;

        case 4:
          strictEqual($rowContainer.find('tr').length, 1, 'Correct number of rows rendered due to search term matching the filtered row');

          $('#table').macroTable('filterTable', []); //only fires macrotablefilter (once)
          break;

        case 5:
          strictEqual($rowContainer.find('tr').length, 3, 'All rows rendered due to search term matching all and filter turned off');

          $('#table').macroTable('filterTable', [{
            field: filterColumn2,
            value: filterValue2
          }]); //will fire macrotablesearch and macrotablefilter
          break;

        case 7: //have to wait for pending filter worker before we can reliably trigger the search worker (race condition with two workers running at the same time)
          $('#table').macroTable('searchTable', search3); //will fire macrotablesearch and macrotablefilter
          break;

        case 9: //only want this reachable once both search and filter events fired
          strictEqual($rowContainer.find('tr').length, 0, 'No rows rendered for lack of matching search term to filtered row (or any row)');

          $('#table').macroTable('filterTable', []); //only fires macrotablefilter (once)
          break;

        case 10:
          strictEqual($rowContainer.find('tr').length, 0, 'No rows rendered for lack of matching search term to any row');
          start();
          break;

        default:
          break;
      }
    });

    var totalRows = 3,
      tableData = publicFunctions.initializeTable(totalRows, {
        numColumns: 3
      }),
      search1 = '0(1)',
      search2 = '(0)',
      search3 = 'fake search',
      filterColumn1 = 'column0',
      filterValue1 = '0(0)',
      filterColumn2 = 'column1',
      filterValue2 = '1(1)',
      $rowContainer = $('#table .macro-table-data-container');

    $('#table').macroTable('searchTable', search1); //only fires macrotablesearch (once)
    $('#table').macroTable('filterTable', [{
      field: filterColumn1,
      value: filterValue1
    }]); //will fire macrotablesearch and macrotablefilter
  });
})();