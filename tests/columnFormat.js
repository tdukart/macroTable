(function() {
  /**
   * Test Module for testing the formatting options for column cells
   */
  module('Column Formatting');

  test('Cell Alignment', 10, function() {
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
})();