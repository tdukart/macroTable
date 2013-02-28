this.onmessage = function(e) {
  var filteredRows = [],
    lastSearchMatchHierarchy = [],

    arraySomeFilter = function(value) {
      return value.toLowerCase().indexOf(filter) !== -1;
    },
    i, j, k, len, searchRow, indexHierachy, indexCheck, realTableRow, tableData, searchIndex, filter;

  if(typeof e.data !== 'undefined' && e.data.hasOwnProperty('searchIndex') && e.data.searchIndex instanceof Array &&
      e.data.hasOwnProperty('tableData') && e.data.tableData instanceof Array && 
      e.data.hasOwnProperty('filter') && typeof e.data.filter === 'string') {

    filter = e.data.filter.toLowerCase(); //string to match against row data
    searchIndex = e.data.searchIndex; //indexed table data ready for searching
    tableData = e.data.tableData; //table's pure row object data


    //perform the filtering
    for(i = searchIndex.length - 1; i >= 0; i--) {
      searchRow = searchIndex[i];

      //found a main/root row
      if(searchRow.index.toString().indexOf(',') === -1) {
        //do not insert the main row if it has already been backfilled by a matching sub row descendant
        if(searchRow.values.some(arraySomeFilter) && (filteredRows.length === 0 || filteredRows[0].index.toString() !== searchRow.index.toString())) { //row matches filter

          filteredRows.unshift(JSON.parse(JSON.stringify(searchRow.data)));
          filteredRows[0].subRows = [];
          lastSearchMatchHierarchy = [filteredRows[0]];
        }

      //found a subrow
      } else {
        if(searchIndex[i].values.some(arraySomeFilter)) { //row matches filter

          //needs to be added to its parent's subRow array.
          //Its parent may not have matched, so it needs to be backfilled in that case
          indexHierachy = searchRow.index.toString().split(',');
          indexCheck = '';
          for(j = 0, len = indexHierachy.length; j < len; j++) {
            indexCheck += (j !== 0 ? ',' : '') + indexHierachy[j];
            if(typeof lastSearchMatchHierarchy[j] === 'undefined' || lastSearchMatchHierarchy[j].index != indexCheck) {

              //get the real table row object
              //TODO: maybe make this a convenience function -- give comma-delimited index, return the row object
              realTableRow = tableData[indexHierachy[0]];
              for(k = 1; k <= j; k++) {
                if(typeof realTableRow.subRows !== 'undeinfed') {
                  realTableRow = realTableRow.subRows[indexHierachy[k]];
                } else {
                  throw 'The index used does not align with the tableData structure'+indexCheck;
                }
              }

              //backfill table row objects and/or add the subrow to its parent
              if(j === 0) {
                filteredRows.unshift(JSON.parse(JSON.stringify(realTableRow)));
                filteredRows[0].subRows = [];
                lastSearchMatchHierarchy[j] = filteredRows[0];
              } else {
                filteredRows[0].subRows.unshift(JSON.parse(JSON.stringify(realTableRow)));
                filteredRows[0].subRows[0].subRows = [];
                lastSearchMatchHierarchy[j] = filteredRows[0].subRows[0];
              }
            } //if
          } //for
        } //if
      } //else
    } //for

  } else {
    throw 'Filter worker unexpected datastructure';
  }

  //return processed row data
  postMessage(filteredRows);
};