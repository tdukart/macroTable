this.onmessage = function(e) {
  var direction, tableData, sortByField, columnSorter;

  if(typeof e.data !== 'undefined' && e.data.hasOwnProperty('tableData') && e.data.tableData instanceof Array) {

    tableData = e.data.tableData; //table's row data

    switch(e.data.action) {
      case 'sort':
        if(e.data.hasOwnProperty('sortByField')) {

          sortByField = e.data.sortByField; //column field name to sort the data by

          direction = e.data.direction == -1 ? -1 : 1; //direction can only be 1 (ascending) and -1 (descending)

          eval('columnSorter = ' + e.data.columnSorter); //de-serialize the user-defined column sorting function

          //user has defined custom column sorting function
          if(typeof columnSorter === 'function') {

            sortTableData(tableData, columnSorter); //sortByField not needed, as it's assumed columnSorter knows what to do

          //no user-defined column sorter, use default string order
          } else {

            sortTableData(tableData, defaultSort(sortByField));

          }
        }
        break;

      case 'order':
      default:
        reverseTableData(tableData);
        break;
    }

  } else {
    throw 'tableData datastructure is not an Array';
  }

  //return process tableData
  postMessage(tableData);

};

/**
 * Wrapper for a generic sorting function giving it scope into which column field to use
 * Default means of sorting column values.
 * @param sortByField {String} column field name to sort table rows by
 */
function defaultSort(sortByField) {
  return function(a, b) {
    var aValue = a.data[sortByField],
      bValue = b.data[sortByField];
    return aValue == bValue ? 0 : (aValue > bValue ? 1 : -1);
  };
}


/**
 * Perform recusive sort on table data
 * Using recursion because, theoretically, any row can have a sub row, even sub rows
 * @param tableData {Array} table's row data. Sort changes value in caller's scope (pass by reference)
 * @param columnSorter {Function} Array.sort() parameter functino for handling the array sort
 * @param direction {Number} 1 for ascending order, -1 for descending order
 */
function sortTableData(tableData, columnSorter, direction) {

  tableData.sort(columnSorter);

  if(direction < 0) {
    tableData.reverse();
  }

  //recursively walk the subRows tree to account for any subRows of subRows, etc.
  for(var i = tableData.length - 1; i >= 0; i--) {
    if(typeof tableData[i].subRows !== 'undefined') {
      sortTableData(tableData[i].subRows, columnSorter);
    }
  }
}

/**
 * Perform recusive Array.reverse() on table data
 * Using recursion because, theoretically, any row can have a sub row, even sub rows
 * @param tableData {Array} table's row data. Sort changes value in caller's scope (pass by reference)
 */
function reverseTableData(tableData) {

  tableData.reverse();

  //recursively walk the subRows tree to account for any subRows of subRows, etc.
  for(var i = tableData.length - 1; i >= 0; i--) {
    if(typeof tableData[i].subRows !== 'undefined') {
      reverseTableData(tableData[i].subRows);
    }
  }
}