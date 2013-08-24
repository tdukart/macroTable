(function($) {

  var types = ['DOMMouseScroll', 'mousewheel'];

  if ($.event.fixHooks) {
    for ( var i=types.length; i; ) {
      $.event.fixHooks[ types[--i] ] = $.event.mouseHooks;
    }
  }

  $.event.special.mousewheel = {
    setup: function() {
      if ( this.addEventListener ) {
        for ( var i=types.length; i; ) {
          this.addEventListener( types[--i], handler, false );
        }
      } else {
        this.onmousewheel = handler;
      }
    },
    teardown: function() {
      if ( this.removeEventListener ) {
        for ( var i=types.length; i; ) {
          this.removeEventListener( types[--i], handler, false );
        }
      } else {
        this.onmousewheel = null;
      }
    }
  };

  $.fn.extend({
    mousewheel: function(fn) {
      return fn ? this.bind("mousewheel", fn) : this.trigger("mousewheel");
    },

    unmousewheel: function(fn) {
      return this.unbind("mousewheel", fn);
    }
  });


  function handler(event) {
    var orgEvent = event || window.event, args = [].slice.call( arguments, 1 ), delta = 0, returnValue = true, deltaX = 0, deltaY = 0;
    event = $.event.fix(orgEvent);
    event.type = "mousewheel";

    // Old school scrollwheel delta
    if ( orgEvent.wheelDelta ) { delta = orgEvent.wheelDelta/120; }
    if ( orgEvent.detail     ) { delta = -orgEvent.detail/3; }

    // New school multidimensional scroll (touchpads) deltas
    deltaY = delta;

    // Gecko
    if ( orgEvent.axis !== undefined && orgEvent.axis === orgEvent.HORIZONTAL_AXIS ) {
      deltaY = 0;
      deltaX = -1*delta;
    }

    // Webkit
    if ( orgEvent.wheelDeltaY !== undefined ) { deltaY = orgEvent.wheelDeltaY/120; }
    if ( orgEvent.wheelDeltaX !== undefined ) { deltaX = -1*orgEvent.wheelDeltaX/120; }

    // Add event and delta to the front of the arguments
    args.unshift(event, delta, deltaX, deltaY);

    return ($.event.dispatch || $.event.handle).apply(this, args);
  }

})(jQuery);

(function($, window, document, undefined) {

  /** Truly Private functions */

  /**
   * Wrapper to create an inline-web worker out of a function in this thread
   * @param  {Function} onMessageFunction Function to be used as the web worker's onmessage function
   * @return {String}                     The object URL string to the new inline-web worker
   */
  function createBlobUrl(onMessageFunction) {
    var blob = new Blob(['onmessage = ' + onMessageFunction.toString()], {type : 'text/javascript'});
    return window.URL.createObjectURL(blob);
  }

  /**
   * Code for the web worker to be used for filtering rows.
   * To be serialized and created into an inline-worker via Blob/createObjectURL
   * @param {Event} e Mesage event
   */
  function SortWebWorker(e) {
    var direction, tableData, sortByField, columnSorter;

    /**
     * Wrapper for a generic sorting function giving it scope into which column field to use
     * Default means of sorting column values.
     * @param sortByField {String} column field name to sort table rows by
     */
    function dictionarySort(sortByField) {
      return function(a, b) {
        var aValue = a.data[sortByField],
          bValue = b.data[sortByField];

        aValue = typeof aValue === 'undefined' ? '' : aValue;
        bValue = typeof bValue === 'undefined' ? '' : bValue;

        return aValue == bValue ? 0 : (aValue > bValue ? 1 : -1);
      };
    }

    /**
     * Wrapper for a generic number sorting function giving it scope into which column field to use
     * @param sortByField {String} column field name to sort table rows by
     */
    function numberSort(sortByField) {
      return function(a, b) {
        var aValue = a.data[sortByField],
          bValue = b.data[sortByField];
        return aValue - bValue;
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
          sortTableData(tableData[i].subRows, columnSorter, direction);
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

    if(typeof e.data !== 'undefined' && e.data.hasOwnProperty('tableData') && e.data.tableData instanceof Array) {

      tableData = e.data.tableData; //table's row data

      switch(e.data.action) {
        case 'sort':
          if(e.data.hasOwnProperty('sortByField')) {

            sortByField = e.data.sortByField; //column field name to sort the data by

            direction = e.data.direction == -1 ? -1 : 1; //direction can only be 1 (ascending) and -1 (descending)

            columnSorter = e.data.columnSorter;

            if(columnSorter === 'numeric') {
              sortTableData(tableData, numberSort(sortByField), direction);

            } else if(columnSorter === 'dictionary' || columnSorter === 'string') {
              sortTableData(tableData, dictionarySort(sortByField), direction);

            } else {
              eval('columnSorter = ' + columnSorter); //de-serialize the user-defined column sorting function

              //user has defined custom column sorting function
              if(typeof columnSorter === 'function') {
                sortTableData(tableData, columnSorter, direction); //sortByField not needed, as it's assumed columnSorter knows what to do

              //no user-defined column sorter, use default string order
              } else  {
                sortTableData(tableData, dictionarySort(sortByField), direction);
              }
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

  }

  /**
   * Code for the web worker to be used for filtering rows.
   * To be serialized and created into an inline-worker via Blob/createObjectURL
   * @param {Event} e Mesage event
   */
  function FilterWebWorker(e) {
    var searchedRows = [],
      filteredRows = [],
      lastSearchMatchHierarchy = [],
      doHighlightMatches = false,

      arraySomeSearch = function(value) {
        return value.toString().toLowerCase().indexOf(searchText) !== -1;
      },
      i, j, k, len, searchRow, indexHierachy, indexCheck, realTableRow, tableData, searchIndex, searchText, escapedSearchText, rowString, columnOrder, columnFilters, filterOutRow;

    if(typeof e.data !== 'undefined' &&
        e.data.hasOwnProperty('searchIndex') && e.data.searchIndex instanceof Array &&
        e.data.hasOwnProperty('tableData') && e.data.tableData instanceof Array &&
        e.data.hasOwnProperty('columnOrder') && e.data.columnOrder instanceof Array &&
        e.data.hasOwnProperty('columnFilters') && e.data.columnFilters instanceof Array &&
        e.data.hasOwnProperty('searchText') && typeof e.data.searchText === 'string') {

      columnOrder = e.data.columnOrder;
      searchIndex = e.data.searchIndex; //indexed table data ready for searching
      columnFilters = e.data.columnFilters;

      if(!(e.data.searchedRows instanceof Array)) { //already have the cached searchedRows, all we want to do is filter it
        searchText = escapedSearchText = e.data.searchText.toLowerCase(); //string to match against row data
        doHighlightMatches = e.data.highlightMatches;
        if(doHighlightMatches) {
          escapedSearchText = searchText.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
        }
        tableData = e.data.tableData; //table's pure row object data

        //perform the filtering and search
        for(i = searchIndex.length; i--;) {
          searchRow = searchIndex[i];

          //found a main/root row
          if(searchRow.index.toString().indexOf(',') === -1) {
            //do not insert the main row if it has already been backfilled by a matching sub row descendant
            if(searchRow.formatted.some(arraySomeSearch) && (searchedRows.length === 0 || searchedRows[0].index.toString() !== searchRow.index.toString())) { //row matches filter

              rowString = JSON.parse(JSON.stringify(searchRow.tableData));

              if(doHighlightMatches) {
                Object.keys(rowString.data).forEach(function(field) {
                  var searchMatch = new RegExp('(' + escapedSearchText + ')', 'gi'),
                    index = columnOrder.indexOf(field),
                    replaceResult, rowData;

                  //the goal is to notify the row builder that this formatted cell matched the search filter or not
                  //if it did match, we want to render the cell with the text as built in this worker
                  //if it didn't match, we want to allow the formatter function to take care of it, so HTML isn't stripped out
                  rowData = searchRow.formatted[index].toString();
                  replaceResult = rowData.replace(searchMatch, '<span class="macro-table-filter-match">$1</span>');
                  if(rowData === replaceResult) {
                    replaceResult = searchRow.values[index]; //no match, default to internal value so the formatter can be applied durring rendering
                  }

                  rowString.data[field] = replaceResult;
                });
              }

              searchedRows.unshift(rowString);
              searchedRows[0].subRows = [];
              lastSearchMatchHierarchy = [searchedRows[0]];
            }

          //found a subrow
          } else {
            if(searchIndex[i].formatted.some(arraySomeSearch)) { //row matches filter

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
                    searchedRows.unshift(JSON.parse(JSON.stringify(realTableRow)));
                    searchedRows[0].subRows = [];
                    lastSearchMatchHierarchy[j] = searchedRows[0];
                  } else {
                    searchedRows[0].subRows.unshift(JSON.parse(JSON.stringify(realTableRow)));
                    searchedRows[0].subRows[0].subRows = [];
                    lastSearchMatchHierarchy[j] = searchedRows[0].subRows[0];
                  }
                } //if
              } //for
            } //if
          } //else
        } //for
      } else {
        searchedRows = e.data.searchedRows;
      }

      //filter out rows that don't pass the column filter definitions
      filteredRows = searchedRows.filter(function(row, index) {
        for(var i = columnFilters.length; i--;) {
          if(typeof columnFilters[i].field !== 'undefined' &&
              searchIndex[index].values[columnOrder.indexOf(columnFilters[i].field)] !== columnFilters[i].value) {
            return false;
          }
        }
        return true;
      });

    } else {
      throw 'Filter worker unexpected datastructure';
    }


    //return processed row data
    postMessage({
      searchedRows: searchedRows,
      filteredRows: filteredRows
    });
  }


  /**
   * convenience function to clear out the data content and rerender the appropriate rows based on the new scroll position
   * @param startRowIndex {Number} the index into the tableData where the rows should start rendering from (should ALWAYS be smaller than endRowIndex)
   * @param endRowIndex {Number} the index into the tableData where the last row is to be rendered number (should ALWAYS be larger than swtartRowIndex)
   * @param direction {Number} the number of rows the table was scrolled, positive for down, negative for up
   * @returns {Number} the actual number of rows rendered
   */
  function rebuildRows(startRowIndex, endRowIndex, direction) {
    var $tableContentWrapper = this.element.find('div.macro-table-data-container-wrapper'),
      $staticTableContainer = $tableContentWrapper.find('div.macro-table-static-data-container'),

      $tableBody = this.$dataContainer.find('tbody.macro-table-column-content'),
      $staticTableBody = $staticTableContainer.find('tbody.macro-table-static-column-content'),

      $rows,
      $staticRows,
      renderCount = 0,
      rowData,
      rowElements,
      staticHeight,
      dynamicHeight;

    startRowIndex = startRowIndex < 0 ? 0 : startRowIndex;
    direction = direction || 0; //default to "no scroll" for complete re-render

    //detach the table from the DOM for impending manipulation ideally, but need to know row heights, so can't...
    $rows = $tableBody.find('tr').remove();
    $staticRows = $staticTableBody.find('tr').remove();

    //append all new rows to the table, since we've exhausted the ones we can reuse already in the DOM
    while(startRowIndex + renderCount != endRowIndex) {
      rowData = this.expandedTableData[startRowIndex + renderCount];

      if(typeof rowData !== 'undefined') {

        rowElements = renderRow.call(this, rowData, (startRowIndex + renderCount));

        appendAndVerticallySizeRow(rowElements, $tableBody, $staticTableBody);

        renderCount += (endRowIndex > startRowIndex ? 1 : -1);

      //reached beginning or end of table
      } else {

        if(direction > 0) {
          renderCount++;
        }
        break;

      }
    }

    //add back previous selection of rows
    if(direction < 0) {
      $tableBody.append($rows.filter(':lt('+(this.maxTotalDomRows - renderCount)+')'));
      $staticTableBody.append($staticRows.filter(':lt('+(this.maxTotalDomRows - renderCount)+')'));
    } else if(direction > 0) {
      $tableBody.prepend($rows.filter(':gt('+(renderCount - 1)+')'));
      $staticTableBody.prepend($staticRows.filter(':gt('+(renderCount - 1)+')'));
    }

    return Math.abs(renderCount);
  }

  /**
   * helper to calculate the needed amount of margin to be added to the bottom of the table
   * in order to allow for scrolling into view the last row of the table
   * whether or not this function is appropriate to run is handled by the caller
   * (should only be called when in the last DOM window row of the table)
   * @return {Boolean} True if the scroll spacer was given margin-bottom compensation for the scrollbar (meriting a re-scroll so the last row isn't potentially cut off)
   */
  function calculateAndApplyBottomMargin() {
    var distanceFromBottomToNewLastDomRow = 0,
      $macroTable = this.element,
      $tableContainerWrapper = $macroTable.find('div.macro-table-data-container-wrapper'),
      $tableRows = this.$dataContainer.find('tbody.macro-table-column-content tr'),
      $tableScrollSpacer = $macroTable.find('div.macro-table-scroll-spacer'),
      $tableScrollWrappers = $tableContainerWrapper.find('div.macro-table-scroll-wrapper'),
      $reorderGuide = $macroTable.find('div.macro-table-reorder-guide'),
      spacerMultiplier = 0,
      tableContainerHeight = this.$dataContainer.height(),
      tableScrollSpacerMarginAdded = false;

    //loop through rows backwards to find the new, truly last row that will allow the last row to show
    $($tableRows.get().reverse()).each(function(i, element) {
      distanceFromBottomToNewLastDomRow += $(element).height();
      if(distanceFromBottomToNewLastDomRow > tableContainerHeight) {
        distanceFromBottomToNewLastDomRow -= $(element).height();

        if(distanceFromBottomToNewLastDomRow / i !== this.options.rowHeight) {
          //this is how many default rows-worth of space needs to be added to the bottom of the scroll spacer in order to scroll the final row into view
          spacerMultiplier = Math.max(0, this.displayRowWindow - i);
        }
        return false;
      }
    }.bind(this));

    if($tableScrollSpacer.css('padding-bottom') === '0px' && tableContainerHeight - distanceFromBottomToNewLastDomRow > 0) {
      tableScrollSpacerMarginAdded = true;
    }

    //add calculated margins to allow scrolling to bring last row into view
    //TODO: remove the padding/margin from these elements on _init
    $tableScrollSpacer.css('padding-bottom', spacerMultiplier * this.options.rowHeight);
    $tableScrollWrappers.css('margin-bottom', tableContainerHeight - distanceFromBottomToNewLastDomRow);
    $reorderGuide.css('bottom', tableContainerHeight - distanceFromBottomToNewLastDomRow);

    return tableScrollSpacerMarginAdded;
  }

  /**
   * function to handle the table container scrolling
   * will identify the case where a row swap needs to happen and will take care of it as well
   * @param {Number} direction number of rows to scroll (negative for up, positive for down)
   * @param {Boolean} rerender Override to force a full table row reload
   * @return {Boolean} true if the scroll process is over, false if re-scroll needs to happen for the added margin/padding
   */
  function scrollTableVertical(direction, rerender) {
    var reScrollNeeded = false,
      rowNumber = this.currentRow,
      visibleRowCount = this.expandedTableData.length,

      finalDomRowWindow = Math.max(0, visibleRowCount - this.maxTotalDomRows), //the final row window render starts at this row
      isInFinalDomWindow = this.currentRow > finalDomRowWindow,

      $tableContentWrapper = this.element.find('div.macro-table-data-container-wrapper'),

      $staticTableContainer = $tableContentWrapper.find('div.macro-table-static-data-container'),
      $tableBody = this.$dataContainer.find('tbody.macro-table-column-content'),
      $tableRows = $tableBody.find('tr'),
      newRenderCount = 0, //number of new rows we need to remove and re-add with new values
      scrollToRowIndex;

    //a huge scroll, passed the normal row swap threshold (grab the thumb with the mouse and whip it all the way in one direction)
    if(this.currentDomRow + direction >= this.maxTotalDomRows || this.currentDomRow + direction < 0 || rerender) {

      //final dom window should always render the maxTotalDomRows number of rows
      if(isInFinalDomWindow) {

        rebuildRows.call(this, visibleRowCount < this.maxTotalDomRows ? 0 : visibleRowCount - this.maxTotalDomRows, visibleRowCount);
        this.currentDomRow = visibleRowCount < this.maxTotalDomRows ? rowNumber : this.maxTotalDomRows - (visibleRowCount - rowNumber); //the DOM row index if all rows are the same height, which is determined in the next line...
        reScrollNeeded = calculateAndApplyBottomMargin.call(this); //at the bottom, make sure the scroll margins are in place

      //not in final dom window, proceed as normal
      } else {

        var topRowBuffer = rowNumber < this.displayRowWindow ? rowNumber : this.displayRowWindow; //account for when on the first rowBuffer number of rows
        rebuildRows.call(this, rowNumber - topRowBuffer, rowNumber - topRowBuffer + this.maxTotalDomRows);
        this.currentDomRow = topRowBuffer;
      }

      //console.log('re-render',rowNumber,'(DOM row)',currentDomRow);

      $tableRows = $tableBody.find('tr'); //refetch rows, since they've likely changed

    //more normal situations
    } else {

      //scrolling down
      if(direction > 0) {

        this.currentDomRow = Math.min(this.currentDomRow + direction, Math.max(this.maxTotalDomRows, visibleRowCount - this.maxTotalDomRows)); //the DOM row that the table would be at, if a detach weren't about to happen

        //convenience variables to make debugging the logic easier
        var remainingDomRows = $tableRows.filter(':gt('+(this.currentDomRow - 1)+')').length,
          moreRowRenderingNeeded = visibleRowCount - rowNumber > remainingDomRows && remainingDomRows <= this.maxTotalDomRows - this.displayRowWindow - 1;

        //render new rows appropriate to current DOM possition, or if a big jump landed into the final DOM window and need the remaining rows fleshed out
        if(!isInFinalDomWindow || moreRowRenderingNeeded) {

          if(this.currentDomRow >= this.triggerDownDomRow) {

            this.currentDomRow -= rebuildRows.call(this, rowNumber + this.maxTotalDomRows - this.currentDomRow, rowNumber + this.maxTotalDomRows - this.currentDomRow + this.replaceRowWindow, direction);
            console.log('scrolling down',rowNumber,'(DOM row)',this.currentDomRow);

            $tableRows = $tableBody.find('tr'); //refetch rows, since they've likely changed
          }

        //in the finalDomRowWindow, add margin to bottom of wrapper to allow scrolling the last row completely into the visible window
        } else {

          reScrollNeeded = calculateAndApplyBottomMargin.call(this);
        }

      //scrolling up
      } else if(direction < 0) {

        this.currentDomRow = Math.max(this.currentDomRow + direction, 0); //the DOM row that the table would be at, if a detach weren't about to happen

        if(this.currentDomRow <= this.triggerUpDomRow && rowNumber > this.replaceRowWindow) {

          this.currentDomRow += rebuildRows.call(this, rowNumber - this.currentDomRow - 1 - this.replaceRowWindow, rowNumber - this.currentDomRow, direction);
          console.log('scrolling up',rowNumber,'(DOM row)',this.currentDomRow);

          $tableRows = $tableBody.find('tr'); //refetch rows, since they've likely changed
        }

      } //scroll up
    } //else

    var scrollTop = $tableRows.length > 0 ? $tableRows.eq(this.currentDomRow).offset().top - $tableBody.offset().top : 0;
    //console.log('current dom row (top visible row)',currentDomRow,'currentRow',currentRow,'row index',expandedTableData[currentRow],'from top',scrollTop);
    this.$dataContainer.scrollTop(scrollTop);
    $staticTableContainer.scrollTop(scrollTop);

    if(reScrollNeeded && this.scrollToRowIndex !== null) {
      this.scrollToRow(this.scrollToRowIndex);
    }
    this.scrollToRowIndex = null;
  }

  /**
   * function to handle the table container scrolling horrizontal
   * will identify the case where a row swap needs to happen and will take care of it as well
   * determines the direction of scolling based on scroll container and data container scrollLeft differences
   */
  function scrollTableHorizontal() {
    var dataContainerScrollLeft = this.$dataContainer.scrollLeft(),
      scrollContainerScrollLeft = this.$scrollContainer.scrollLeft(),
      $domColumns = this.$dynamicHeader.find('th'),
      $currrentColumn = $domColumns.eq(this.currentColumn),
      columnIterator = -1,
      scrollByColumn = this.options.scrollByColumn,
      endColumn;

    //scroll right
    if(scrollContainerScrollLeft > dataContainerScrollLeft &&
        scrollContainerScrollLeft >= dataContainerScrollLeft + $currrentColumn.outerWidth()) {
      endColumn = $domColumns.length;
      columnIterator = this.currentColumn + 1;

    //scroll left
    } else if(scrollContainerScrollLeft < dataContainerScrollLeft &&
        scrollContainerScrollLeft <= dataContainerScrollLeft + $currrentColumn.outerWidth()) {
      endColumn = -1;
      columnIterator = this.currentColumn;
      if(scrollByColumn) {
        columnIterator--;
      }
    } else if(scrollByColumn) {
      return;
    }

    //loop through columns, searching for the offset range
    while(columnIterator != endColumn) {

      var $newColumn = $domColumns.eq(columnIterator),
        newColumnScrollLeft = $newColumn.position().left + dataContainerScrollLeft;

      if(scrollContainerScrollLeft >= newColumnScrollLeft &&
          scrollContainerScrollLeft < newColumnScrollLeft + $newColumn.outerWidth()) {

        this.currentColumn = columnIterator;

        //check user setting for horizontal scrolling style
        this.$dataContainer.scrollLeft(scrollByColumn ? newColumnScrollLeft : this.scrollLeft);
        this.$dynamicHeader.scrollLeft(scrollByColumn ? newColumnScrollLeft : this.scrollLeft);
        break;
      }

      columnIterator += (scrollContainerScrollLeft > dataContainerScrollLeft ? 1 : -1);
    }
  }

  /**
   * Convenience function for rendering the readable data for a column cell
   * @param  {Object}   column         Table column definition
   * @param  {Object}   row            Table row object
   * @param  {Boolean}  includeMarkup  Include with the returned result the wrapper and internal markup
   * @return {String}                  The column text that will appear in the rendered cell
   */
  function getColumnContent(column, row, includeMarkup) {
    var $columnContentContainer = $(document.createElement('span')).addClass('macro-table-cell-content'),
      columnContent = row.data[column.field],
      columnContentText;

    columnContent = typeof columnContent === 'undefined' || columnContent === null ? '' : columnContent;

    if(includeMarkup) {
      //we want to pass the wrapper of the cell content to the formatter function in case a user wants to mess with it
      if(typeof column.onCellClick === 'function') {
        $columnContentContainer.addClass('macro-table-cell-clickable');
      }
      if(column.textWrap === false) {
        $columnContentContainer.addClass('macro-table-no-wrap');
      }
    }

    if(typeof column.formatter === 'function' &&
        //always format if this column value isn't a match
        (typeof columnContent !== 'string' || columnContent.indexOf('macro-table-filter-match') === -1)) {
      //need to have $columnContentContainer defined here because the formatter may blow up if it doesn't get it
      columnContent = column.formatter(columnContent, row, $columnContentContainer);
    }

    $columnContentContainer.html(columnContent);

    columnContentText = $columnContentContainer.text();
    $columnContentContainer.prop('title', columnContentText);

    if(includeMarkup) {
      columnContent = $(document.createElement('div')).append($columnContentContainer).html();
    } else {
      //remove any html markup to help with future searching on formatted text
      columnContent = columnContentText;
    }

    $columnContentContainer = null;
    return columnContent;
  }

  /**
   * Build a table row containing a column for each field
   * Assumes the row object is not malformed (has "data" and "index" fields, etc.)
   * @param {Object} row A row of data to be rendered by field
   * @param {Number} index The row number being rendered in the expandedTableData datastructure
   */
  function renderRow(row, index) {
    var columns = this.options.columns,
      isRowsSelectable = this.options.rowsSelectable === true,
      rowHasChildren = typeof row.subRows !== 'undefined' && row.subRows.length,
      expanderCellClass = [],
      dynamicRowColumns = '',
      staticRowColumns = '',
      $dynamicRow = $(document.createElement('tr')).attr('data-row-index', index),
      $staticRow = $(document.createElement('tr')).attr('data-row-index', index),
      $rows = $dynamicRow.add($staticRow),
      timestamp = +new Date(),
      rowData, indexHierachy, tableDataSubRows, i, len;

    //give even rows a stripe color
    if(index % 2 === 0) {
      $rows.addClass('macro-table-row-stripe');
    }

    $rows.addClass('macro-table-row macro-table-row-'+index);

    //if selecting rows is enabled and this row has already been selected, style appropriately
    if(isRowsSelectable && row.selected) {
      $rows.addClass('macro-table-highlight  macro-table-selected-row');
    }

    if(row.focused) {
      $rows.addClass('macro-table-row-focused');
    }

    if(row.expanded === true) {
      $rows.addClass('macro-table-row-expanded');
    } else {
      $rows.addClass('macro-table-row-collapsed');
    }

    //build dynamically left-scrollable row
    for(i = 0, len = columns.length; i < len; i++) {
      var cellClass = [],
        columnContent = getColumnContent.call(this, columns[i], row, true);

      if(columns[i].resizable !== false) {
        cellClass.push('macro-table-column-resizable');
      }

      //if the cell is justified right or center, add the appropriate class
      switch(columns[i].align) {
        case 'right':
        case 'center':
          cellClass.push('macro-table-justify-'+columns[i].align);
          break;

        case 'left':
        default:
          break;
      }

      dynamicRowColumns += '<td'+(cellClass.length ? ' class="'+cellClass.join(' ')+'"' : '')+' data-column-index="'+i+'">'+columnContent+'</td>';
    }

    //build static row
    if(isRowsSelectable) {
      staticRowColumns += '<td class="macro-table-row-control-cell">' +
        '<input id="macro-table-select-'+index+'-'+timestamp+'" type="checkbox" class="macro-table-checkbox macro-table-row-selector macro-table-select-'+index+'" data-row-index="'+index+'" '+(row.selected === true ? 'checked="checked"' : '')+'/>' +
        '<label for="macro-table-select-'+index+'-'+timestamp+'" class="macro-table-checkbox-label"></label>' +
      '</td>';
    }

    //build row expand column
    if(rowHasChildren && row.expanded) {
      expanderCellClass.push('macro-table-subrow-hierarchy-vertical-line-bottom-half');
    } else if(row.index.toString().indexOf(',') !== -1) {
      expanderCellClass.push('macro-table-subrow-hierarchy-line-right'); //TODO: macro-table-subrow-hierarchy-line-right should be conditionally removed for subRows of subRows

      indexHierachy = row.index.split(',');

      for(i = this.renderRowDataSet.length; i--;) {
        if(this.renderRowDataSet[i].index == indexHierachy[0]) {
          tableDataSubRows = this.renderRowDataSet[i].subRows;
          break;
        }
      }
      for(i = tableDataSubRows.length; i--;) {
        if(tableDataSubRows[i].index == row.index) {
          break; //we know i is the ordered position of the subrow
        }
      }

      if(tableDataSubRows.length - 1 > i) { //FIXME: this will break for a subRow of a subRow, because we're looking directly at tableData (which is only top level rows)
        expanderCellClass.push('macro-table-subrow-hierarchy-vertical-line-full');
      } else {
        expanderCellClass.push('macro-table-subrow-hierarchy-vertical-line-top-half');
      }
    }

    staticRowColumns += '<td class="macro-table-row-control-cell macro-table-row-expander-cell' + (expanderCellClass.length > 0 ? ' '+expanderCellClass.join(' ') : '') + '">' +
      '<div class="macro-table-expand-toggle-container">' +
        (rowHasChildren ?
            '<input type="checkbox" id="macro-table-row-expander-'+index+'-'+timestamp+'" class="macro-table-checkbox macro-table-row-expander macro-table-row-expander-'+index+'" data-row-index="'+index+'" '+(row.expanded === true ? 'checked="checked"' : '')+'/>' +
            '<label for="macro-table-row-expander-'+index+'-'+timestamp+'" class="macro-table-checkbox-label macro-table-row-expander-label"></label>' : ''
        ) +
      '</div>'+
    '</td>';

    $dynamicRow.html(dynamicRowColumns);
    $staticRow.html(staticRowColumns);

    return {
      dynamicRow: $dynamicRow,
      staticRow: $staticRow
    };
  }

  /**
   * Helper function to append rows generated by the renderRow function to their appropriate containers
   * This function will also properly calculate the row height parity between the static and dynamic rows
   * @param  {Object} rowElements            Object containing the static and dynamic rows, as returned by renderRow
   * @param  {jQuery} $dynamictableContainer jQuery selected element for the dynamic table container  (optional)
   * @param  {jQuery} $staticTableContainer  jQuery selected element for the static table container (optional)
   */
  function appendAndVerticallySizeRow(rowElements, $dynamictableContainer, $staticTableContainer) {
    var staticHeight, dynamicHeight;

    //append row(s) to table
    if(typeof $dynamictableContainer !== 'undefined') {
      $dynamictableContainer.append(rowElements.dynamicRow);
    }
    if(typeof $staticTableContainer !== 'undefined') {
      $staticTableContainer.append(rowElements.staticRow);
    }

    //reconcile possible different heights between static and dynamic rows
    staticHeight = rowElements.staticRow.height()+1; //compensate for fractional pixel heights in FF
    dynamicHeight = rowElements.dynamicRow.height()+1; //compensate for fractional pixel heights in FF
    if(staticHeight > dynamicHeight) {
      rowElements.dynamicRow.height(staticHeight);
      rowElements.staticRow.height(staticHeight)
      .find('div.macro-table-expand-toggle-container').css('height', staticHeight-1);
    } else if(staticHeight < dynamicHeight) {
      rowElements.dynamicRow.height(dynamicHeight);
      rowElements.staticRow.height(dynamicHeight)
      .find('div.macro-table-expand-toggle-container').css('height', dynamicHeight-1);
    }
  }

  /**
   * Loop through defined columns and verify the proposed sort by column exists
   * @param columnField {String} field name of column to potentially sort by
   * @return the index of the column if it is sortable, -1 otherwise
   */
  function validateSortByColumn(columnField) {
    var columns = this.options.columns,
      i;

    if(columnField === '') {
      return -1;
    }
    if(this.options.tableData.length === 0) {
      console.warn('sortByColumn being ignored because there is no tableData');
      return -1;
    }

    for(i = columns.length; i--;) {

      if(columns[i].field == columnField && columns[i].sortable !== false) {
        return i;
      }
    }

    //console.warn('sortByColumn being ignored because a matching column field was not found');
    return -1;
  }

  /**
   * Loop through tableData and count the rows with sub rows
   * @return the count of rows with sub rows
   */
  function countRowsWithChildren() {
    var tableData = this.renderRowDataSet,
      count = 0;

    for(var i = tableData.length - 1; i >= 0; i--) {

      if(typeof tableData[i].subRows !== 'undefined' && tableData[i].subRows.length) {
        count++;
      }
    }

    return count;
  }


  /**
   * Spawn a web worker to perform the table sorting and renders the result when complete
   * unless filtering needs to be done and it hasn't already been cached. In that case,
   * spawn the filter web worker.
   * @param columnData {Object} the definition of the column by which the table data is to be sorted
   * @param $columnHeader {jQuery} column header for the sorted column
   * @param $columnSizers {jQuery} column sizers for the column being sorted, a col for the header and a col for the data body
   */
  function workerSortRow(columnData, $columnHeader, $columnSizers, callback) {
    var self = this,
      options = this.options,
      sortedColumn = options.sortByColumn,
      $veil = $('div.macro-table-data-veil', this.element),
      columnSorter, sortWorker, action;

    $veil.show();

    sortWorker = new Worker(this.sortWebWorkerUrl);

    sortWorker.onerror = function(e) {
      sortWorker.terminate();
      this.renderRowDataSet = options.tableData;

      if(typeof callback === 'function') {
        callback.bind(this)();
      }

      this._renderTableRows(this.renderRowDataSet);

      $veil.hide();
      console.error('Error sorting column.');
      this._trigger('columnsort', null, {
        error: true
      });
    }.bind(this);

    sortWorker.onmessage = function(e) {
      this.sortedRows[sortedColumn][''] = e.data;
      this.searchIndex = []; //postSortFilter will recalculate searchIndex with new order (TODO: maybe make this part of the worker)
      this.renderRowDataSet = this.sortedRows[sortedColumn]['']; //callback may contain references to this.renderRowDataSet, so it needs to be set to pre-filter state
      this.renderRowDataSet = postSortFilter.call(this, e.data, action, callback); //potentially changes self.renderRowDataSet if there is a filter active!

      if(typeof this.renderRowDataSet !== 'undefined') {
        this._renderTableRows(this.renderRowDataSet);

        $veil.hide();
      }

      $columnSizers.addClass('macro-table-highlight');

      $columnHeader.removeClass('macro-table-sort-loading')
      .addClass(columnData.direction < 0 ? 'macro-table-sort-descending' : 'macro-table-sort-ascending');

      sortWorker.terminate();
      //console.log('sorted data',e.data);
      this._trigger('columnsort', null, columnData);
    }.bind(this);

    if(typeof this.sortedRows[sortedColumn] === 'undefined') {
      this.sortedRows[sortedColumn] = {};
    }

    //the current data structure for the table data sorted by this column.
    //if it is undefined, it means the table has not yet been sorted by this column. if defined, it should
    //simply be reversed (no need to full sort again, we're just changing direction of the sort)
    this.renderRowDataSet = this.sortedRows[sortedColumn][''];

    //initialize the ordered tableData to use
    if(typeof this.renderRowDataSet === 'undefined') {

      //console.log('pre-sorted data',options.tableData);

      columnSorter = columnData.sortable; //could be boolean, 'numeric', a function, or anything else which will result in dictionary
      if(typeof columnData.sortable === 'function') {
        columnSorter = columnData.sortable.toString();
      }

      action = 'sort';

      sortWorker.postMessage({
        action: action,
        tableData: options.tableData,
        sortByField: sortedColumn,
        direction: columnData.direction,
        columnSorter: columnSorter
      });

    } else {

      //console.log('pre-sorted data',this.renderRowDataSet);
      action = 'order';
      sortWorker.postMessage({
        action: action,
        tableData: this.renderRowDataSet
      });
    }
  }

  /**
   * Filter the renderRowDataSet data after it has been sorted
   * This function will also trigger the building of the searchIndex
   * @param {Array}   renderRowDataSet      Original data set to be filtered and indexed
   * @param {String}  sortAction            Determine whether the data set needs to be ordered
   * @return {Array} The filtered renderRowDataSet array, should be set to this.renderRowDataSet
   */
  function postSortFilter(renderRowDataSet, sortAction, callback) {
    var options = this.options;

    if(renderRowDataSet.length !== 0 && this.searchIndex.length === 0) {
      //called whenever the first rendering of a new dataset occurs
      buildSearchIndex.call(this, renderRowDataSet);
    }

    if(options.columnFilters.length > 0) {
      workerFilterTableData.bind(this)(callback);
      return;
    } else if(options.searchTerm !== '') {
      renderRowDataSet = this.sortedRows[options.sortByColumn][options.searchTerm];
      if(typeof renderRowDataSet === 'undefined') {
        workerFilterTableData.bind(this)(callback);
        return;
      } else if(sortAction === 'order') {
        renderRowDataSet = this.sortedRows[options.sortByColumn][options.searchTerm] = this.sortedRows[options.sortByColumn][options.searchTerm].reverse();
      }
    }

    if(typeof callback === 'function') {
      callback.bind(this)();
    }
    return renderRowDataSet;
  }

  /**
   * Build the searchIndex data structure, an array of objects (one for each possible row)
   * in which the row's index and an ordered array of its column values are housed
   *
   * This function will run recursively for sub row cases
   * @param  {Array} tableData Array of rows
   */
  function buildSearchIndex(tableData) {
    var columns = this.options.columns,
      rowData, formattedRowData, i, j, rowsLength, columnsLength;

    for(i = 0, rowsLength = tableData.length; i < rowsLength; i++) {
      rowData = [];
      formattedRowData = [];

      for(j = 0, columnsLength = columns.length; j < columnsLength; j++) {
        if(typeof tableData[i].data !== 'undefined') {
          rowData.push(tableData[i].data[columns[j].field]);
          formattedRowData.push(getColumnContent.call(this, columns[j], tableData[i], false));
        }
      }

      this.searchIndex.push({
        index: tableData[i].index,
        tableData: tableData[i],
        values: rowData,
        formatted: formattedRowData
      });

      if(typeof tableData[i].subRows !== 'undefined') {
        buildSearchIndex.call(this, tableData[i].subRows);
      }
    }
  }

  /**
   * Rebuild portions/the entirety of the searchIndex based on the action being performed
   * For 'add', rebuild the search index from the ground up
   * For 'move' and 'delete', loop through the rows in searchIndex and rearrange the data value order
   * to reflect the current order of columns (to make removing columns easier down the road)
   * @param  {String} action    The rebuild action to take, e.g. 'add', 'move', and 'delete'
   * @param  {Number} fromIndex Index from which to move the column value
   * @param  {Number} toIndex   Index into which to move the column value
   */
  function rebuildSearchIndexColumns(action, fromIndex, toIndex) {
    var options, rowDataValues, rowDataFormatted, i;

    if(action === 'add') {
      options = this.options;
      this.searchIndex = [];
      buildSearchIndex.call(this, this.sortedRows[options.sortByColumn][options.searchTerm]);

    } else {

      for(i = this.searchIndex.length; i--;) {
        rowDataValues = this.searchIndex[i].values;
        rowDataFormatted = this.searchIndex[i].formatted;
        switch(action) {
          case 'move':
            //move the fromIndex value to the toIndex index
            Array.prototype.splice.apply(rowDataValues, [toIndex, 0].concat(rowDataValues.splice(fromIndex, 1)));
            Array.prototype.splice.apply(rowDataFormatted, [toIndex, 0].concat(rowDataFormatted.splice(fromIndex, 1)));
            break;

          case 'delete':
            rowData.splice(rowDataValues, 1);
            rowData.splice(rowDataFormatted, 1);
            break;

          default:
            break;
        }
      } //for
    } //else
  }


  /**
   * Spawn a web worker to perform the table filtering and renders the result when complete
   */
  function workerFilterTableData(callback) {
    var options = this.options,
      tableData = options.tableData,
      $veil = $('div.macro-table-data-veil', this.element),
      isFiltering = options.columnFilters.length > 0,
      isSearching = options.searchTerm !== '',
      filterWorker;

    $veil.show(); //probably already shown from workerSortRow

    filterWorker = new Worker(this.filterWebWorkerUrl);

    filterWorker.onerror = function(e) {
      filterWorker.terminate();
      options.searchTerm = '';
      options.columnFilters = [];
      this.renderRowDataSet = tableData;

      if(typeof callback === 'function') {
        callback.bind(this)();
      }

      this._renderTableRows(this.renderRowDataSet);
      $veil.hide();
      console.error('Error filtering rows.');

      if(isFiltering) {
        this._trigger('filter', null, {
          error: true
        });
      }
      if(isSearching) {
        this._trigger('search', null, {
          error: true
        });
      }
    }.bind(this);

    filterWorker.onmessage = function(e) {
      this.renderRowDataSet = e.data.filteredRows; //what we want to show
      this.sortedRows[options.sortByColumn][options.searchTerm] = e.data.searchedRows; //what we want to cache for future filters

      if(typeof callback === 'function') {
        callback.bind(this)();
      }

      this._renderTableRows(this.renderRowDataSet);

      $veil.hide();

      filterWorker.terminate();

      if(isFiltering) {
        this._trigger('filter', null, {
          columnFilters: options.columnFilters
        });
      }
      if(isSearching) {
        this._trigger('search', null, {
          searchTerm: options.searchTerm
        });
      }
    }.bind(this);

    filterWorker.postMessage({
      searchText: options.searchTerm,
      searchIndex: this.searchIndex,
      columnOrder: this.columnOrder,
      columnFilters: options.columnFilters,
      tableData: tableData,
      searchedRows: this.sortedRows[options.sortByColumn][options.searchTerm], //if not undefined, only gets filtered
      highlightMatches: options.highlightMatches
    });
  }


  $.widget('n.macroTable', {

    /** Subscribable events */

    /**
     * Callback run on completion of a table filter
     * called with the array of filters applied
     * could be used for storing users preferences, etc.
     */
    //filter

    /**
     * Callback run on completion of a table search
     * called with the search term used
     * could be used for storing users preferences, etc.
     */
    //search

    /**
     * Callback run on completion of a column sort
     * called with the newly ordered column key and the direction
     * could be used for storing users preferences, etc.
     */
    //columnsort

    /**
     * Callback run on reordering columns
     * called with the newly ordered columns array as a parameter
     * could be used for storing users preferences, etc.
     */
    //columnreorder

    /**
     * Callback run when a column is resized
     * called with the index of the column that was resized and its new width
     * could be used for storing users preferences, etc.
     */
    //columnresize

    /**
     * Callback run when a row is expanded or collapsed
     * called with an array of the row indexes that are expanded
     * could be used for storing users preferences, etc.
     */
    //rowexpand

    /**
     * Callback run on removing columns
     * called with the newly ordered columns array as a parameter
     * could be used for storing users preferences, etc.
     */
    //columnremove

    /**
     * Callback run on adding columns
     * called with the newly ordered columns array as a parameter
     * could be used for storing users preferences, etc.
     */
    //columnadd

    /**
     * callback run when a row is focused (clicked)
     * @type {Function}
     */
    //rowfocus

    /**
     * callback run when a row is selected
     * @type {Function}
     */
    //rowselect

    /**
     * callback run when a row is deselected
     * @type {Function}
     */
    //rowdeselect

    options: {
      height: undefined, //default height of table, if not defined will fit to parent
      width: undefined, //defailt width of table, if not defined will fit to parent (can be in pixels or percent, see proportionalColumnWidths)
      /**
       * The default value used for replaceRowWindow, the number of rows that are removed/appended when a scroll window has been triggered
       * This number will be overridden by displayRowWindow if it is a smaller value
       * @type {Number}
       */
      scrollRowWindow: 50,
      /**
       * Array of objects whose order directly correlates to the display order of columns
       * Column object has the following fields:
       * @field width {Number} the width in pixels the column should render at
       * @field align {String} the text justification for the column cells. Options are 'left' (default), 'center' and 'right'
       * @field title {String} the name to display for the column
       * @field field {String} the field name in the data object that will correlate with this column
       * @field formatter {Function} (optional) formats the provided data to be displayed in a row's column
       * @field className {String} (optional) class to be added to the column title element
       * @field resizable {Boolean} allow column to be resized. default true
       * @field sortable {Boolean/Function/String} if true allow column to be sorted via .sort() on a row's column value,
       *    if a string equal to 'numeric', will use a numeric sort, any other string will result in a dictionary sort
       *    if a function, the column will be sorted using .sort() with this function passed as a parameter. default true (dictionary)
       */
      columns: [],
      /**
       * Default column width in pixels that will be used in emergencies
       * @type {Number}
       */
      defaultColumnWidth: 100,
      /**
       * Size columns based on percents of the table's viewport rather than pixels
       * This affects the "width" option
       * @type {Boolean}
       */
      proportionalColumnWidths: false,
      /**
       * Controls horizontal scrolling style. By default will scroll by whole columns.
       * False will scroll by pixel, which will change exactly as the scroll bar moves.
       * @type {Boolean}
       */
      scrollByColumn: true,
      /**
       * Allow the columns to be re-ordered via drag and drop
       * @type {Boolean}
       */
      reorderable: true,
      /**
       * Allow columns to be removed via the 'X'
       * @type {Boolean}
       */
      removable: false,
      /**
       * Single row data structure for displaying in the summary row section
       * @type {Boolean}
       */
      summaryRow: false,
      /**
       * The rows of the table, using index, data, and subRow fields
       * @type {Array}
       */
      tableData: [],
      /**
       * Field name of the column by which to sort the tableData.
       * If not set (''), the original order of the data as it was initialized is shown
       */
      sortByColumn: '',
      /**
       * String to filter rows by. If '', will show all rows
       * @type {String}
       */
      searchTerm: '',
      /**
       * An array of objects containing a column "field" and a "filter" function
       * When there are multiple argument column filters, they are AND'd as opposed to OR'd
       * @type {Array}
       */
      columnFilters: [],
      /**
       * If set to true, any matches found against a filter will be wrapped with an element with class ".macro-table-filter-match"
       * @type {Boolean}
       */
      highlightMatches: false,
      /**
       * Show checkboxes next to rows to all fetching from the table rows that are current selected
       * @type {Boolean}
       */
      rowsSelectable: false,

      /**
       * Messages to show for an empty, initialized table and the case where a filtered table
       * has no matching rows
       * @type {String}
       */
      emptyInitializedMessage: 'No data to display',
      emptyFilteredMessage: 'No matching rows found',

      /* Stuff users really don't need to be changing, but shouldn't be magic numbers: */

      rowHeight: 30, //render height of a table row, in pixels

      /**
       * default the table to this height (in rows)
       * @type {Number}
       */
      defaultTableHeightInRows: 10
    },


    /** "Private" methods */

    /**
     * @method _setOption
     * @description Called when an option is changed via jQuery widget factory
     * @private
     */
    _setOption: function(key, value) {
      //$.Widget.prototype._setOption.apply( this, arguments );
      this._super(key, value);

      var options = this.options,
        columnIndex;

      //handle specific option cases here
      switch(key) {

        case 'width':
        case 'height':
          this.resizeTable(options.height, options.width);
          break;

        case 'rowHeight':
          break;

        case 'disabled':
          break;

        case 'columns':
          this.searchIndex = []; //reset search index
          this._setColumnOrder();
          this._reRender();
          break;

        case 'defaultColumnWidth':
          break;

        case 'sortByColumn':
          columnIndex = validateSortByColumn.call(this, value);
          if(columnIndex < 0) {
            options.sortByColumn = '';
          }
          this._sortTable(columnIndex);
          break;

        case 'reorderable':
          break;

        case 'removable':
          this._setRemovableColumnState();
          break;

        case 'tableData':
          this.renderRowDataSet = [];
          this.searchIndex = []; //reset search index
          this.sortedRows = null; //let _init reinitialize this
          //options.sortByColumn = '';
          //TODO call function here that will reset the column arrows indicating the sort order
          this._init(); //causes currentColumn and currentRow to reset to 0
          break;

        case 'searchTerm':
          this._init(); //causes currentColumn and currentRow to reset to 0
          break;

        case 'columnFilters':
          value = value instanceof Array ? value : [];
          this._super(key, value);

          this._init(); //causes currentColumn and currentRow to reset to 0

          //async filtering won't actually take place if there are no filters, so trigger the event here
          if(value.length === 0) {
            this._trigger('filter', null, {
              columnFilters: value
            });
          }
          break;

        case 'summaryRow':
          //TODO: make summaryRow not need to call init()
          this._init(); //causes currentColumn and currentRow to reset to 0
          break;

        case 'rowsSelectable':
          //TODO add class managment for macro-table-rwos-selectable too
          /*if(value === true) {
            this.element.addClass('macro-table-rows-selectable');
          } else {
            this.element.removeClass('macro-table-rows-selectable');
            //$('tr.macro-table-selected-row', this.element).removeClass('macro-table-highlight macro-table-selected-row'); //deselect any selected rows
          }*/ //macro-table-rows-selectable classes handled in _reRender now
          this._reRender();
          this.resizeTable(options.height, options.width); //fill space for hidden column / remove space for shown column
          break;
      }
    },

    /**
     * @method _create
     * @description Creates the datatable. This is called by the jQuery widget framework.
     * @private
     */
    _create: function() {
      var self = this,
        options = this.options,
        $macroTable = this.element,
        rowHeight = options.rowHeight,
        breakTableScroll = false,
        forceTableScrollRender = false;

      /**
       * The prefix to use for events.
       * @property widgetEventPrefix
       * @type String
       */
      this.widgetEventPrefix = 'macroTable';

      /**
       * the static width of the checkbox column for selecting rows
       * @type {Number}
       */
      this.rowSelectColumnWidth = 16;

      /**
       * the static width of the expand/collapse sub rows column
       * @type {Number}
       */
      this.expanderColumnWidth = 16;

      /**
       * Width of scrollbars if the browser supports styling
       * @type {Number}
       */
      this.styledScrollbarWidth = 12;

      /**
       * Width of scrollbars if the brwoser does not support styling
       * @type {Number}
       */
      this.unStyledScrollbarWidth = 16;

      /**
       * The actual scrollbar widths
       * @type {Number}
       */
      this.scrollBarWidth = null;

      /**
       * Min width a column can be resized
       * @type {Number}
       */
      this.resizeColumnMinWidth = 30;

      /**
       * the max number of rows that will show in the provided table height
       * @type {Number}
       */
      this.displayRowWindow = 0;

      /**
       * when a DOM row swap is triggered, this many rows will be removed and replaced at the other end of the table
       * @type {Number}
       */
      this.replaceRowWindow = 0;

      /**
       * Limit of number of columns to display in the DOM
       * TODO: not implemented, currently allowing any number of columns to show
       * @type {Number}
       */
      this.maxTotalDomColumns = Infinity;

      /**
       * 0-indexed, describes the left-most, visible data column (direct correlation with array index). default to first column
       * @type {Number}
       */
      this.currentColumn = 0;

      /**
       * 0-indexed, describes the left-most, visible DOM column. default to first column
       * TODO: this currently is not used, see definition for maxTotalDomColumns
       * @type {Number}
       */
      this.currentDomColumn = 0;

      //processedColumns: [], //once columns processed from options.columns, the elements and real widths go in here

      /**
       * real DOM row count would only be less than this if the amount of data is less than this number (don't need the extra DOM rows to display total data)
       * @type {Number}
       */
      this.maxTotalDomRows = 0;

      /**
       * Scroll position top of the table. default to top of table
       * @type {Number}
       */
      this.scrollTop = 0;

      /**
       * Scroll position left of the table. default to left edge of table
       * @type {Number}
       */
      this.scrollLeft = 0;

      /**
       * 0-indexed, describes the top-most, visible data row (direct correlation with array index). default to first row
       * @type {Number}
       */
      this.currentRow = 0;

      /**
       * 0-indexed, describes the top-most, visible DOM row. default to first row
       * @type {Number}
       */
      this.currentDomRow = 0;

      /**
       * when scrolling up, when on this DOM row, a row swap will trigger
       * @type {Number}
       */
      this.triggerUpDomRow = 0;

      /**
       * when scrolling down, when on this DOM row, a row swap will trigger
       * @type {Number}
       */
      this.triggerDownDomRow = 0;

      /**
       * counter to keep track of selected rows, used to optimize selecting behavior comparing currently selected to length of total rows
       * @type {Number}
       */
      this.selectedRowCount = 0;

      /**
       * counter to keep track of expanded rows, used to optimize selecting behavior comparing currently selected to length of total rows
       * @type {Number}
       */
      this.expandedRowCount = 0;

      /**
       * counter for the total number of rows that can be expanded
       * @type {Number}
       */
      this.rowsWithChildrenCount = 0;

      /**
       * Array matching the length of renderRowDataSet. Each index contains an array of values,
       * each index directly corresponding to the visibile columns in their current order.
       *
       * This array is used to quickly perform text searches in rows
       * @type {Array}
       */
      this.searchIndex = [];

      /**
       * object of sorted combinations of the table data, key 'default' contains the data ordered as it was initialized
       * @type {Object}
       */
      this.sortedRows = null;

      /**
       * data structure directly translating to the rows that are displayed in the table (flat, rather than hierarchical)
       * @type {Array}
       */
      this.expandedTableData = [];

      /**
       * keep track of the rows that are expanded for the onRowExpand callback
       * @type {Array}
       */
      this.expandedRowIndexes = [];

      /**
       * Current dataset the table will use to render its rows
       * @type {Array}
       */
      this.renderRowDataSet = [];

      /**
       * Field set when scrollToRow() is called
       *
       * Keeps track of the intended scrollTo row in case the padding/margin
       * hasn't yet been added to the table to handle larger rows in the final
       * scroll window or to buffer so that the final row can be scrolled into view
       *
       * When this margin/padding is added, scrollTableVertical will detect that it
       * needs to re-scroll to this value in order to take into account the new heights
       * @type {Number}
       */
      this.scrollToRowIndex = null;

      /**
       * Web Worker Blob object URLs
       * @type {String}
       */
      this.sortWebWorkerUrl = createBlobUrl(SortWebWorker);
      this.filterWebWorkerUrl = createBlobUrl(FilterWebWorker);

      //console.info('Sort Web Worker URL', this.sortWebWorkerUrl);
      //console.info('Filter Web Worker URL', this.filterWebWorkerUrl);

      this.scrollBarWidth = navigator.userAgent.indexOf(' AppleWebKit/') !== -1 ? this.styledScrollbarWidth : this.unStyledScrollbarWidth;

      $macroTable.hide()
      .empty()
      .html('<div class="macro-table-header-wrapper">'+
        '<div class="macro-table-static-header">'+
          '<table class="macro-table-static">'+
            '<colgroup class="macro-table-static-column-sizer"></colgroup>'+
            '<tr class="macro-table-static-header-row"></tr>'+
            '<tr class="macro-table-static-summary-row"></tr>'+
          '</table>'+
        '</div>'+
        '<div class="macro-table-header">'+
          '<div class="macro-table-scroll-wrapper">'+
            '<table class="macro-table-dynamic">'+
              '<colgroup class="macro-table-column-sizer"></colgroup>'+
              '<tr class="macro-table-header-row"></tr>'+
              '<tr class="macro-table-summary-row"></tr>'+
            '</table>'+
          '</div>'+
          '<div class="macro-table-column-controls">'+
            '<div class="macro-table-reorder-handle">'+
              '<i class="icon icon--vertical-handle"></i>'+
            '</div>'+
            '<button class="macro-table-remove-column">'+
              '<i class="icon icon--delete"></i>'+
            '</button>'+
          '</div>'+
        '</div>'+
        '<div class="macro-table-scroll-shim"></div>'+
      '</div>'+
      '<div class="macro-table-data-container-wrapper">'+
        '<div class="macro-table-message-wrapper">'+
          '<div class="macro-table-message"></div>'+
        '</div>'+
        '<div class="macro-table-static-data-container">'+
          '<div class="macro-table-scroll-wrapper">'+
            '<table class="macro-table-static">'+
              '<colgroup class="macro-table-static-column-sizer"></colgroup>'+
              '<tbody class="macro-table-static-column-content"></tbody>'+
            '</table>'+
          '</div>'+
        '</div>'+
        '<div class="macro-table-data-container">'+
          '<div class="macro-table-scroll-wrapper">'+
            '<table class="macro-table-dynamic">'+
              '<colgroup class="macro-table-column-sizer"></colgroup>'+
              '<tbody class="macro-table-column-content"></tbody>'+
            '</table>'+
            '<div class="macro-table-reorder-guide"></div>'+
          '</div>'+
        '</div>'+
      '</div>'+
      '<div class="macro-table-scroll-container">'+
        '<div class="macro-table-scroll-spacer"></div>'+
      '</div>'+
      '<div class="macro-table-resize-guide"></div>'+
      '<div class="macro-table-data-veil"></div>')
      .addClass('macro-table');

      //setup element shortcuts
      this.$scrollContainer = $macroTable.find('div.macro-table-scroll-container');
      this.$headerWrapper = $macroTable.find('div.macro-table-header-wrapper');
      this.$dynamicHeader = this.$headerWrapper.find('div.macro-table-header');
      this.$dynamicHeaderRow = this.$dynamicHeader.find('tr.macro-table-header-row');
      this.$dynamicSummaryRow = this.$dynamicHeader.find('tr.macro-table-summary-row');
      this.$staticHeader = $macroTable.find('div.macro-table-static-header');
      this.$staticHeaderRow = this.$staticHeader.find('tr.macro-table-static-header-row');
      this.$staticSummaryRow = this.$staticHeader.find('tr.macro-table-static-summary-row');
      this.$resizer = $macroTable.find('div.macro-table-resize-guide');
      this.$dataContainer = $macroTable.find('div.macro-table-data-container');
      this.$columnControls = $macroTable.find('div.macro-table-column-controls');
      this.$removeColumnButton = this.$columnControls.find('button.macro-table-remove-column');

      var $staticDataContainer = $macroTable.find('div.macro-table-static-data-container'),
        $reorderHandle = $macroTable.find('div.macro-table-reorder-handle'),
        $reorderGuide = $macroTable.find('div.macro-table-reorder-guide'),
        $headerTable = this.$dynamicHeader.find('table'),
        $dynamicTableBody = $macroTable.find('tbody.macro-table-column-content'),
        $staticTableBody = $macroTable.find('tbody.macro-table-static-column-content'),
        $columnToResize,

      //shortcut function to remove styling for when hovering over the resizer handle
      deselectResizeHandle = function() {
        if(typeof $columnToResize !== 'undefined') {
          $columnToResize.removeClass('macro-table-column-resize');
          $columnToResize = undefined;
        }
        this.$resizer.removeClass('macro-table-highlight');
      }.bind(this),

      //shortcut function for handling data structure changes when expanding or collapsing a row
      handleRowExpandToggle = function(index, isExpanded) {
        var $selectAllHeaderCheckbox = this.$staticHeaderRow.find('input.macro-table-select-toggle');

        this.expandedTableData[index].expanded = !!isExpanded;

        if(isExpanded) {
          this.expandedRowCount++;
          //apply + concat the subRows to remove to the argument array provides one-line solution to an otherwise loop-related solution
          Array.prototype.splice.apply(this.expandedTableData, [index + 1, 0].concat(this.expandedTableData[index].subRows));

          //newly expanded rows are never selected, so if the select all header checkbox is checked, put it into indeterminate state
          if($selectAllHeaderCheckbox.prop('checked')) {
            $selectAllHeaderCheckbox.prop('checked', false); //click the box again and it will select the newly expanded rows
            $selectAllHeaderCheckbox[0].indeterminate = true;
          }

        } else {
          this.expandedRowCount--;
          var removedRows = this.expandedTableData.splice(index + 1, this.expandedTableData[index].subRows.length);

          //clean up selected count from removed rows
          for(var i = 0, len = removedRows.length; i < len; i++) {
            if(removedRows[i].selected) {
              removedRows[i].selected = false;
              this.selectedRowCount--;
            }
          }

          //by hiding the sub rows, all remaining rows are selected, so make select toggle checkbox reflect that
          if(this.selectedRowCount == this.expandedTableData.length) {
            $selectAllHeaderCheckbox.prop('checked', true); //click the box again and it will deselect all rows
            $selectAllHeaderCheckbox[0].indeterminate = false;
          }
        }
      }.bind(this);

      /* Wire column header events */

      var columnMouseoverPid;
      $headerTable.delegate('tr.macro-table-header-row th', 'mouseover', function(e) {
        var $columnHeader = $(this);

        /* Handle reorder columns functionality */
        if(self.options.reorderable === true) {

          /* position reorder handle */

          $headerTable.find('th.macro-table-header-active-cell').removeClass('macro-table-header-active-cell');

          if($columnHeader.hasClass('macro-table-column-reorderable')) {

            clearTimeout(columnMouseoverPid);

            self.$dynamicHeader.addClass('macro-table-header-active');
            $columnHeader.addClass('macro-table-header-active-cell');
            $reorderHandle.css({
              top: (($columnHeader.height() - $reorderHandle.height()) / 2) + 'px',
              left: self.$dynamicHeader.scrollLeft() + $columnHeader.position().left + 2 + 'px'
            });
            self.$removeColumnButton.css({
              top: (($columnHeader.height() - self.$removeColumnButton.height()) / 2) + 'px',
              left: self.$dynamicHeader.scrollLeft() + $columnHeader.position().left + $columnHeader.outerWidth() - self.$removeColumnButton.width() + (-2) + 'px'
            });
          } else {
            self.$dynamicHeader.removeClass('macro-table-header-active');
          }

        }
      })

      //provide delay to hiding of reorder handle when mouseout'ing of header cell
      .delegate('tr.macro-table-header-row th', 'mouseout', function(e) {
        if($(e.relatedTarget).closest('div.macro-table-column-controls').length === 0) {
        //if(!$(e.relatedTarget).hasClass('macro-table-reorder-handle')) { //don't deselect column if hovering over the reorder handle
          columnMouseoverPid = setTimeout(function() {
            self.$dynamicHeader.removeClass('macro-table-header-active');
            $(e.target).removeClass('macro-table-header-active-cell');
          }, 500);
        }
      });
      //$headerTable.delegate('th.macro-table-column-sortable', 'click', function(e) {


      /* Wire column sort events */

      //row sorting listener
      $headerTable.delegate('th.macro-table-column-sortable', 'click', function(e) {
        if(!$macroTable.hasClass('macro-table-column-moving')) {
          self._sortTable($(this).index());
        }
      });


      /* Wire row focus events */

      //main function for row focusing (when they're clicked)
      function toggleRowFocus($rows) {
        console.log('clicking this row',$rows.data('row-index'));

        var dataRowIndex = $rows.data('row-index'),
          isRowUnFocusing = self.expandedTableData[dataRowIndex].focused; //row is focused and was clicked again to unfocus

        for(var i = self.expandedTableData.length - 1; i >= 0; i--) {
          self.expandedTableData[i].focused = false;
        }

        $staticDataContainer.find('tr.macro-table-row-focused').removeClass('macro-table-row-focused');
        self.$dataContainer.find('tr.macro-table-row-focused').removeClass('macro-table-row-focused');

        if(!isRowUnFocusing) {
          $rows.addClass('macro-table-row-focused');
          self.expandedTableData[dataRowIndex].focused = true;
        }

        self._trigger('rowfocus', null, {
          rowIndex: dataRowIndex,
          rowData: self.expandedTableData[dataRowIndex]
        });
      }

      //rows in the static container
      $staticDataContainer.delegate('tr', 'click', function(e) {
        //we don't want to focus the row when trying to expand or select (TODO: or do we?)
        if(!$(e.target).is('label, input')) {

          var $staticRow = $(this),
            $rows = $staticRow.add(
              self.$dataContainer.find('tr').eq($staticRow.index())
            );

          toggleRowFocus($rows);
        }
      });

      //rows in the dynamic container
      self.$dataContainer.delegate('tr', 'click', function(e) {
        var $dynamicRow = $(this),
          $rows = $dynamicRow.add(
            $staticDataContainer.find('tr').eq($dynamicRow.index())
          );

        toggleRowFocus($rows);
      })


      //click on a clickable cell
      .delegate('span.macro-table-cell-content.macro-table-cell-clickable', 'click', function(e) {
        var $column = $(this).closest('td'),
          $row = $column.closest('tr'),
          column = options.columns[$column.data('column-index')],
          row = options.tableData[$row.data('row-index')];

        e.stopPropagation();
        if(typeof column.onCellClick === 'function') {
          column.onCellClick.call(this, row.data[column.field], row);
        }
      });


      /* Wire row selector and expander events */

      //wire toggle all rows behavior (select and expand)
      this.$staticHeaderRow.delegate('input.macro-table-checkbox', 'click', function(e) {
        var tableData = self.options.tableData,
          $checkbox = $(this),
          $checkboxes, $tableRows, isToggled, thisCurrentRow;

        //select/deselect all rows
        if($checkbox.hasClass('macro-table-select-toggle')) {
          $checkboxes = $staticTableBody.find('input.macro-table-row-selector');
          $tableRows = $staticTableBody.find('tr').add($dynamicTableBody.find('tr'));

          //header checkbox selected or indeterminate (rows have already been individually selected)
          if(this.indeterminate === true || $checkbox.is(':checked')) {

            isToggled = true;
            $checkboxes.prop('checked', true);
            $tableRows.addClass('macro-table-highlight macro-table-selected-row');
            self.selectedRowCount = self.expandedTableData.length;

          //header checkbox deselected
          } else {

            isToggled = false;
            $checkboxes.prop('checked', false);
            $tableRows.removeClass('macro-table-highlight macro-table-selected-row');
            self.selectedRowCount = 0;
          }

          //set the row data structure to the appropriate selected state
          for(var i = 0, len = self.expandedTableData.length; i < len; i++) {
            self.expandedTableData[i].selected = isToggled;
          }

          self._trigger(isToggled ? 'rowselect' : 'rowdeselect', null, {
            selectedRows: self.getSelectedRows()
          });

        //expand/collapse all rows
        } else if($checkbox.hasClass('macro-table-expand-toggle')) {
          $checkboxes = $staticTableBody.find('input.macro-table-row-expander');

          //header checkbox selected or indeterminate (rows have already been individually expanded)
          if(this.indeterminate === true || $checkbox.is(':checked')) {

            isToggled = true;
            $checkboxes.prop('checked', true);

          //header checkbox deselected
          } else {

            isToggled = false;
            $checkboxes.prop('checked', false);
          }

          thisCurrentRow = self.expandedTableData[self.currentRow];

          //set the row data structure to the appropriate selected state
          self.expandedRowIndexes = [];
          for(var i = 0, subRowsModified = 0, len = self.expandedTableData.length; i < len + subRowsModified; i++) {

            if(typeof self.expandedTableData[i].subRows !== 'undefined' && self.expandedTableData[i].subRows.length) {

              if(isToggled) {
                self.expandedRowIndexes.push(self.expandedTableData[i].index);
              }

              if(self.expandedTableData[i].expanded != isToggled) {
                handleRowExpandToggle(i, isToggled);
                subRowsModified += (isToggled ? 1 : -1) * self.expandedTableData[i].subRows.length; //expandedTableData is changing, so need to modify the loop length
              }

              //(optimization) all expandable rows accounted for, stop the loop
              if(self.expandedRowCount == self.rowsWithChildrenCount) {
                break;
              }
            }
          }

          //handle the resizing of the scroll spacer, and make sure the row position doesn't change
          thisCurrentRow = self.expandedTableData.indexOf(thisCurrentRow) != -1 ?
            self.expandedTableData.indexOf(thisCurrentRow) : //scroll to the original row
            self.expandedTableData.indexOf(tableData[thisCurrentRow.index]); //scroll to the row's parent

          breakTableScroll = true; //when resizing the scroll spacer, a scroll even may be triggered (and we don't want it to)
          $macroTable.find('div.macro-table-scroll-spacer')
          .height(rowHeight * self.expandedTableData.length);

          //nested setTimeouts to allow for scroll event to trigger for the scroll-spacer resize, then re-render the current position
          setTimeout(function() {
            breakTableScroll = false;
            forceTableScrollRender = true;
            self.scrollToRow(thisCurrentRow);

            //reset the force re-render flag
            setTimeout(function() {
              forceTableScrollRender = false;
              self._trigger('rowexpand', null, {
                expandedRows: self.expandedRowIndexes
              });
            }, 0);
          }, 0);
        }
      });

      //wire row select and row expand checkbox event behavior
      $staticDataContainer.delegate('input.macro-table-checkbox', 'click', function(e) {
        e.stopPropagation(); //prevent a delegation to the tr which triggers a focus row event

        var $checkbox = $(this),
          $selectAllHeaderCheckbox = self.$staticHeaderRow.find('input.macro-table-select-toggle'),
          $expandAllHeaderCheckbox = self.$staticHeaderRow.find('input.macro-table-expand-toggle'),
          $checkboxRow = $checkbox.closest('tr'),
          domRowIndex = $checkboxRow.index(),
          dataRowIndex = $checkbox.data('row-index'),
          $dataRow = $dynamicTableBody.find('tr').eq(domRowIndex);

        //select/deselect a row
        if($checkbox.hasClass('macro-table-row-selector')) {

          if($checkbox.is(':checked')) {
            $checkboxRow.addClass('macro-table-highlight macro-table-selected-row');
            $dataRow.addClass('macro-table-highlight macro-table-selected-row');
            self.expandedTableData[dataRowIndex].selected = true;
            self.selectedRowCount++;
            self._trigger('rowselect', null, {
              selectedRows: self.getSelectedRows()
            });
          } else {
            $checkboxRow.removeClass('macro-table-highlight macro-table-selected-row');
            $dataRow.removeClass('macro-table-highlight macro-table-selected-row');
            self.expandedTableData[dataRowIndex].selected = false;
            self.selectedRowCount--;
            self._trigger('rowdeselect', null, {
              selectedRows: self.getSelectedRows()
            });
          }

          //set header checkbox state
          if(self.selectedRowCount === 0) { //no rows selected

            $selectAllHeaderCheckbox.prop('checked', false);
            $selectAllHeaderCheckbox[0].indeterminate = false;

          } else if(self.selectedRowCount == self.expandedTableData.length) { //all rows selected

            $selectAllHeaderCheckbox.prop('checked', true);
            $selectAllHeaderCheckbox[0].indeterminate = false;

          } else { //at least one row selected, but not all

            $selectAllHeaderCheckbox[0].indeterminate = true;
          }

        //expand/collapse a row
        } else if($checkbox.hasClass('macro-table-row-expander')) {

          if($checkbox.is(':checked')) {
            $dataRow.removeClass('macro-table-row-collapsed')
            .addClass('macro-table-row-expanded');

            $checkboxRow.removeClass('macro-table-row-collapsed')
            .addClass('macro-table-row-expanded');

            handleRowExpandToggle(dataRowIndex, true);

            //add the expanded row index to the array for the onRowExpand callback
            if(self.expandedRowIndexes.indexOf(dataRowIndex) == -1) {
              self.expandedRowIndexes.push(dataRowIndex);
            }
          } else {
            $dataRow.removeClass('macro-table-row-expanded')
            .addClass('macro-table-row-collapsed');

            $checkboxRow.removeClass('macro-table-row-expanded')
            .addClass('macro-table-row-collapsed');

            handleRowExpandToggle(dataRowIndex, false);

            //remove the collapsed row index from the array for the onRowExpand callback
            self.expandedRowIndexes.splice(self.expandedRowIndexes.indexOf(dataRowIndex), 1);
          }

          self._refreshRows();

          //set header checkbox state
          if(self.expandedRowCount === 0) { //no rows expanded

            $expandAllHeaderCheckbox.prop('checked', false);
            //$expandAllHeaderCheckbox[0].indeterminate = false;

          } else if(self.expandedRowCount == self.rowsWithChildrenCount) { //all expandable rows expanded

            $expandAllHeaderCheckbox.prop('checked', true);
            //$expandAllHeaderCheckbox[0].indeterminate = false;

          } //else { //at least one row expanded, but not all

            //$expandAllHeaderCheckbox[0].indeterminate = true;
          //}

          $macroTable.find('div.macro-table-scroll-spacer')
          .height(rowHeight * self.expandedTableData.length);

          self._trigger('rowexpand', null, {
            expandedRows: self.expandedRowIndexes.sort()
          });
        }
      });


      /* Wire resize column events */

      //helper function to return the width to resize a column to based on current cursor position
      function calculateReiszeColumnWidth(cursorPosition, $columnToResize) {
        var cursorOffset = cursorPosition - $macroTable.position().left,
          maxLeftPosition = $macroTable.outerWidth() - self.scrollBarWidth - self.$resizer.outerWidth(),
          minResizePosition = $columnToResize.position().left + self.resizeColumnMinWidth;

        //console.log('calculateReiszeColumnWidth:', $macroTable.outerWidth() - scrollBarWidth - self.$resizer.outerWidth(), cursorOffset, $columnToResize.offset().left + resizeColumnMinWidth);

        return Math.max(Math.min(maxLeftPosition, cursorOffset), minResizePosition);
      }

      //mousedown for the resizer, used when resizing columns
      var resizePositionStart;
      this.$resizer.bind('mousedown', function(e) {
        if(typeof resizePositionStart === 'undefined') { //prevent multiple mousedowns (if you mousedown, move cursor off of table, then move back and click)
          resizePositionStart = self.$resizer.position().left;

          //the resizer has been grabbed, attach listeners to the container to allow it to move around

          self.$resizer.addClass('macro-table-active');
          self.element.addClass('macro-table-resizing')
          .bind('mouseup', function resizeMouseup(e) {
            //the handle has been dragged around and has now been let go
            e.stopPropagation();

            var $columnToResize = $macroTable.find('.macro-table-column-resize'),
              $columnContainers = $macroTable.find('colgroup.macro-table-column-sizer'), //finds the header and content sizers (2 elements)
              $columns = $columnContainers.filter(':first').find('col'),
              columnNumber = $columnToResize.index(),
              $columnSizers = $columnContainers.find('col:nth-child('+(columnNumber + 1)+')'),
              widthDelta = self.$resizer.position().left - resizePositionStart,
              newWidth = $columnSizers.width() + widthDelta;

            //clean up the mousemove and mouseup events on the container
            self.element.unbind('mouseup', resizeMouseup) //don't want to unbind the reorder mouseup event
            .removeClass('macro-table-resizing');

            //calculate how much the column should be resized, and resize the columns
            $columnSizers.width(newWidth);
            self.options.columns[columnNumber].width = options.proportionalColumnWidths === true ? (newWidth * 100) / (options.width - self.scrollBarWidth - self.$staticHeader.width()) : newWidth; //set so subsequent table rerenders keeps the width

            self._renderTableHeader();
            self._resizeTable(); //resize table dimensions in case the header changed height, etc.
            self._refreshRows();

            //cleanup the resizer element
            self.$resizer.removeClass('macro-table-highlight macro-table-active');

            resizePositionStart = undefined;

            self._trigger('columnresize', null, {
              columnIndex: columnNumber,
              width: newWidth
            });
          }); //mouseup
        } //if(typeof resizePositionStart === 'undefined')
      });

      /* Remove column event */

      this.$removeColumnButton.bind('click', function(e) {
        e.preventDefault();

        var columnToRemoveIndex = $headerTable.find('th.macro-table-header-active-cell').filter(':first').index();

        self._removeColumn(columnToRemoveIndex);
      });


      /* Wire column reorder events */

      //mousedown, mouseup on the column headers, used for column ordering
      var columnGrabOffset;
      $reorderHandle.bind('mousedown', function(e) {
        e.preventDefault();

        if(e.which == 1) { //left click only

          var $selectedColumn = $headerTable.find('th.macro-table-header-active-cell'),
            tableOffset = $macroTable.offset().left,
            minimumOffset = self.$dataContainer.offset().left - tableOffset,
            thumbPosition = $selectedColumn.offset().left - tableOffset - //relative start position to macroTable container
                            Math.ceil(self.$resizer.outerWidth() / 2); //end position of the cell with resize guide compensation

          thumbPosition = thumbPosition < minimumOffset ? minimumOffset : thumbPosition;

          //trigger reordering mode
          $macroTable.addClass('macro-table-column-moving');

          columnGrabOffset = e.pageX - $selectedColumn.offset().left;

          $reorderGuide.width($selectedColumn.outerWidth())
          .css('left', self.$dataContainer.scrollLeft() + $selectedColumn.position().left);

          self.$resizer.css('left', thumbPosition + 'px');

          $macroTable.find('colgroup.macro-table-column-sizer col').filter(':nth-child('+($selectedColumn.index() + 1)+')')
          .addClass('macro-table-selected-column');

          console.log('offset column',$selectedColumn.offset().left,'position column',$selectedColumn.position().left,'resizer',self.$dataContainer.scrollLeft() + $selectedColumn.position().left - (self.$resizer.outerWidth() / 2));
        }
      });


      //mousemove event on the table root element, handling movement for column reordering and column resizing
      var lastPageX, //allow reorder guide to follow cursor without changing it's relative position from where it started
        scrollColumnTimer;
      $macroTable.bind('mousemove', function(e) {
        var $target = $(e.target),
          $element = $target.closest('th, td'),
          resizerWidth = self.$resizer.outerWidth(),
          cursorOffset = e.pageX - $macroTable.offset().left,
          cursorCellOffset;

        /* process enabling/disabling the resize handle when hovering */

        if(!$macroTable.hasClass('macro-table-resizing') && !$macroTable.hasClass('macro-table-column-moving')) {

          if($element.length === 0) {
            if(!$target.hasClass('macro-table-resize-guide')) {
              deselectResizeHandle();
            }
            return;
          }

          //if near the left edge of a cell, we want to resize the previous cell
          cursorCellOffset = e.pageX - $element.offset().left;
          if(cursorCellOffset <= 1) {
            $element = $element.prev();
          }

          if($element.hasClass('macro-table-column-resizable')) {

            if($element.length !== 0) {
              var thumbPosition = ($element.offset().left - $macroTable.offset().left) + //relative start position to macroTable container
                                  $element.outerWidth() - Math.ceil(resizerWidth / 2) + 1; //end position of the cell with resize guide compensation

              if(cursorOffset >= thumbPosition) {

                if(typeof $columnToResize !== 'undefined') {
                  $columnToResize.removeClass('macro-table-column-resize');
                }
                $columnToResize = $element;
                $columnToResize.addClass('macro-table-column-resize');
                self.$resizer.addClass('macro-table-highlight')
                .css('left', thumbPosition);

              } else {

                deselectResizeHandle();

              }
            }

          //in case the cursor is over a cell that isn't resizable
          } else if(!$target.hasClass('macro-table-resize-guide')) {
            deselectResizeHandle();
          }
        //the handle is grabbed and being dragged around
        } else if($macroTable.hasClass('macro-table-resizing')) {
          e.stopPropagation();

          //reposition the resizer, do it out of the thread for performance improvements
          setTimeout(function() {
            self.$resizer.css('left', calculateReiszeColumnWidth(e.pageX, $columnToResize) + 'px');
          }, 0);


        /* process reordering columns */

        } else if($macroTable.hasClass('macro-table-column-moving')) {
          e.stopPropagation();

          //reposition the reorder guide, do it out of the thread for performance improvements
          setTimeout(function setReorderGuidePosition() {
            var scrollOffset = self.$dataContainer.scrollLeft(),
              cursorDataContainerOffset = lastPageX - self.$dataContainer.offset().left,
              dataContainerOffset = self.$dataContainer.position().left,
              reorderGuidePosition = $reorderGuide.position().left,
              maxReorderGuidePosition = $headerTable.outerWidth() - $headerTable.find('th:last').outerWidth(),
              selectedColumnIndex = $macroTable.find('col.macro-table-selected-column').first().index(),
              newIndex,
              $newColumn;

            $visibleColumns = $headerTable.find('th'); //TODO: filter more intelligently (only look at columns visible in window)
            $visibleColumns.each(function(i, column) {
              var $column = $(column);
              if(cursorDataContainerOffset < $column.position().left + $column.outerWidth() || i == self.options.columns.length - 1) {
                $newColumn = $column;
                newIndex = $column.index();
                return false;
              }
            });

            $macroTable.find('colgroup.macro-table-column-sizer col').removeClass('macro-table-target-column')
            .filter(':nth-child('+(newIndex + 1)+')')
            .addClass('macro-table-target-column');

            //handle scrolling the columns if dragging the guide to the edges of the container
            var newColumnWidth = $newColumn.outerWidth(),
              newColumnPosition = $newColumn.position().left + dataContainerOffset,
              isScrollingRight = newColumnPosition + newColumnWidth > self.$dataContainer.outerWidth(),
              isScrollingLeft = newColumnPosition - dataContainerOffset === 0 && scrollOffset !== 0;

            if((isScrollingLeft || isScrollingRight) && $macroTable.hasClass('macro-table-column-moving')) {
              if(typeof scrollColumnTimer === 'undefined') {
                scrollColumnTimer = setTimeout(function() {
                  var currenColumnWidth = $headerTable.find('col').eq(self.currentColumn).outerWidth();
                  scrollColumnTimer = undefined;

                  self.$scrollContainer.scrollLeft(
                    scrollOffset + (currenColumnWidth * (isScrollingRight ? 1 : -1))
                  );

                  //force refresh, the recalculate position, reposition guide into new scroll window
                  setTimeout(function() {
                    //recalculate $reorderGuide.position().left because reorderGuidePosition is now stale
                    $reorderGuide.css('left', $reorderGuide.position().left + (newColumnWidth * (isScrollingRight ? 1 : -1)));
                    setReorderGuidePosition();
                  }, 0);
                }, 1000);
                return; //no reason to continue, since setReorderGuidePosition() will be called again in this set timeout
              }
            } else {
              clearTimeout(scrollColumnTimer);
              scrollColumnTimer = undefined;
            }

            //calculate what guide position should be, based on cursor position
            var newReorderGuidePosition;
            if(reorderGuidePosition === 0 && cursorDataContainerOffset <= newColumnWidth / 2) {

              //if on the first column, don't move the reorder guide to the right until cursor position is past half the column length
              newReorderGuidePosition = 0;
              columnGrabOffset = newColumnWidth / 2;

            } else if(reorderGuidePosition == maxReorderGuidePosition && cursorDataContainerOffset > $newColumn.position().left + (newColumnWidth / 2)) {

              //if on the last column, don't move the reorder guide to the left until cursor position is past half the column length
              newReorderGuidePosition = maxReorderGuidePosition;
              columnGrabOffset = newColumnWidth / 2;

            } else {

              //common case, position reorder guide based on cursor position, unless at first or last column
              newReorderGuidePosition = Math.max(
                0, //leftmost possible position
                Math.min(
                  cursorDataContainerOffset - columnGrabOffset + scrollOffset, //in-between position
                  maxReorderGuidePosition //rightmmost possible position
                )
              );
            }

            $reorderGuide.css('left', newReorderGuidePosition + 'px');

            //position the resizer guide to the boundary of the column to act as an indicator for where the column would be dropped
            self.$resizer.css('left', (
              newColumnPosition + 1 + //account for potential static row offset
              (newIndex > selectedColumnIndex ? newColumnWidth : 0)
            ) + 'px');
          }, 0);
        }

        lastPageX = e.pageX;
      })

      .bind('mouseup', function(e) {
        var columnToReorderIndex, newIndex, $selectedColumn;

        if(e.which == 1) { //left click only

          $selectedColumn = $macroTable.find('col.macro-table-selected-column');

          if($selectedColumn.length > 0) {

            columnToReorderIndex = $selectedColumn.removeClass('macro-table-selected-column')
            .filter(':first').index();

            newIndex = $headerTable.find('col.macro-table-target-column')
            .removeClass('macro-table-target-column').index();

            if(columnToReorderIndex != newIndex && newIndex >= 0) {
              self._moveColumn(columnToReorderIndex, newIndex);
            }

            $macroTable.removeClass('macro-table-column-moving');
          }
        }

        self.$dynamicHeader.removeClass('macro-table-header-active');
      });


      /* Wire table scrolling events */

      //mousewheel for table scrolling, wrapper for scrolling the scroll container, attached to .macro-table-data-container-wrapper
      //this.$dataContainer.parent()
      $macroTable.add($macroTable.find('div.macro-table-data-veil'))
      .bind('mousewheel', function(e, delta, deltaX, deltaY) {
        e.preventDefault();

        var horizontalPixelScroll = 5;

        deselectResizeHandle();

        if(deltaY < 0) {
          self.$scrollContainer.scrollTop(self.scrollTop + rowHeight);
        } else if(deltaY > 0) {
          self.$scrollContainer.scrollTop(self.scrollTop - rowHeight);
        }

        if(deltaX !== 0) {
          var $domColumns = self.$dynamicHeaderRow.find('th'),
            offset = $domColumns.length !== 0 ? Math.abs($domColumns.eq(0).position().left) : 0;

          if(deltaX < 0 && self.currentColumn + (options.scrollByColumn ? 0 : 1) > 0) {
            var lastOffset = Math.abs($domColumns.eq(self.currentColumn - 1).position().left);
            //console.log('left scroll',offset-lastOffset,'lastOffset',lastOffset,'offset',offset,'currentColumn',self.currentColumn);
            self.$scrollContainer.scrollLeft(offset - (options.scrollByColumn ? lastOffset : horizontalPixelScroll));
          } else if(deltaX > 0 && self.currentColumn < $domColumns.length - (options.scrollByColumn ? 1 : 0)) {
            var nextOffset = Math.abs($domColumns.eq(self.currentColumn + 1).position().left);
            //console.log('right scroll',offset-nextOffset,'nextOffset',nextOffset,'offset',offset,'currentColumn',self.currentColumn);
            self.$scrollContainer.scrollLeft(offset + (options.scrollByColumn ? nextOffset : horizontalPixelScroll));
          }
        }
        //console.log('Mousewheel .macro-table-data-container', scrollTop, rowHeight,self.$scrollContainer);
      });

      //scroll function for the scroll container, using the scrollbars
      this.$scrollContainer.scroll(function(e) {
        var lastScrollTop = self.scrollTop,
          lastTableScrollLeft = self.scrollLeft;

        self.scrollTop = $(this).scrollTop();
        self.scrollLeft = $(this).scrollLeft();

        var rowsToScroll = Math.abs(~~(self.scrollTop / rowHeight) - ~~(lastScrollTop / rowHeight));
        if(rowsToScroll > 0) {
          if(lastScrollTop < self.scrollTop) {

            self.currentRow += rowsToScroll;
            if(!breakTableScroll) {
              scrollTableVertical.call(self, rowsToScroll, forceTableScrollRender);
              //console.log('scrolling down to row',currentRow,'by',rowsToScroll,'rows');
            }

          } else if (lastScrollTop > self.scrollTop){

            self.currentRow -= rowsToScroll;
            if(!breakTableScroll) {
              scrollTableVertical.call(self, -rowsToScroll, forceTableScrollRender);
              //console.log('scrolling up to row',currentRow,'by',rowsToScroll,'rows');
            }
          }
        }

        if(self.scrollLeft != lastTableScrollLeft) {
          scrollTableHorizontal.call(self);
        }
        //console.log('Scrolling .macro-table-scroll-container: lastScrollTop',lastScrollTop,'scrollTop',scrollTop,'calculatedRow',calculatedRow,'lastCalculatedRow',lastCalculatedRow,'rowsToScroll',rowsToScroll);
      });

      this._initializeScrollBarOffsets();

      $macroTable.show();
    },

    /**
     * @method _init
     * @description Initializes the variables and populates the table with data. This is called by the jQuery widget framework.
     * @private
     */
    _init: function() {
      var options = this.options,
        isTableDataValid = this._validateTableData(options.tableData);

      options.height = options.height || this._getFallbackHeightToResize();
      options.width = options.width || this._getFallbackWidthToResize();

      this.scrollTop = 0;
      this.currentRow = 0;
      this.currentDomRow = 0;
      this.currentColumn = 0;
      this.currentDomColumn = 0;
      this.selectedRowCount = 0;
      this.expandedRowCount = 0;

      //sortedRows' keys go by column, then searchTerm
      if(this.sortedRows === null) {
        this.sortedRows = {
          '': {
            '': isTableDataValid ? options.tableData : []
          }
        };
      }

      this._setColumnOrder();

      if(isTableDataValid && options.tableData.length !== 0 && this.renderRowDataSet.length === 0) {
        this.renderRowDataSet = options.tableData;
      }

      this.$scrollContainer.add(this.$header).add(this.$dataContainer)
      .scrollTop(0)
      .scrollLeft(0);

      //initialize the global count for rows with children
      this.rowsWithChildrenCount = countRowsWithChildren.call(this);

      this._renderTableHeader();

      //resize the table, re-calculate the global variables and populate the data rows
      this._resizeTable(options.height, options.width);

      this._sortTable(options.sortByColumn, function() {

        if(this.renderRowDataSet.length > 0) {
          this.element.removeClass('macro-table-display-message');
        } else {
          this.element.addClass('macro-table-display-message');
          if(options.searchTerm === '') {
            this.element.find('div.macro-table-message').text(options.emptyInitializedMessage);
          } else {
            this.element.find('div.macro-table-message').text(options.emptyFilteredMessage);
          }
        }
      });

      this._setRemovableColumnState();

      console.log('replaceRowWindow',this.replaceRowWindow,'maxTotalDomRows',this.maxTotalDomRows,'maxTotalDomColumns',this.maxTotalDomColumns,'middleDomRow',~~(this.maxTotalDomRows / 2),'triggerUpDomRow',this.triggerUpDomRow,'triggerDownDomRow',this.triggerDownDomRow);
    },

    /**
     * Simple conveniece function to create/update a convenience map of the column order by field name
     */
    _setColumnOrder: function() {
      var columns = this.options.columns,
        i;

      this.columnOrder = [];
      for(i = columns.length; i--;) {
        this.columnOrder.unshift(columns[i].field);
      }
    },

    /**
     * Based on the current setting of the removable column option,
     * set the state of the remove column button in the column controls
     */
    _setRemovableColumnState: function() {
      if(this.options.removable) {
        this.$columnControls.addClass('macro-table-remove-column-enabled');
      } else {
        this.$columnControls.removeClass('macro-table-remove-column-enabled');
      }
    },

    /**
     * Return the width the table should fallback to. This method should be called if no other value is available
     * @return {Number} The width (in pixels) the table should fit its width to
     */
    _getFallbackWidthToResize: function() {
      var options = this.options,
        parentWidth = this.element.parent().width();

      return !options.width || options.width < 0 ? parentWidth : options.width;
    },

    /**
     * Return the height the table should fallback to. This method should be called if no other value is available.
     * First the user-defined height will be checked. If that fails, it will try the parent element's height,
     * and then a more or less hard-coded minimum default as a last resort.
     * @return {Number} The height (in pixels) the table should fit its height to
     */
    _getFallbackHeightToResize: function() {
      var options = this.options,
        parentHeight = this.element.parent().height(),
        minimumHeight = options.defaultTableHeightInRows * options.rowHeight;

      //if we can use the user-defined height, great
      if(options.height && options.height > minimumHeight) {
        return options.height;

      } else if(!parentHeight || parentHeight < minimumHeight) {
        minimumHeight += this.element.find('div.macro-table-scroll-shim').outerHeight() + this.scrollBarWidth;
        console.warn('_getFallbackHeightToResize:: No height desernable from parent, defaulting to '+options.defaultTableHeightInRows+' rows worth');
        return minimumHeight;

      } else {
        console.warn('_getFallbackHeightToResize:: Parent container element has a height, using that');
        return parentHeight;
      }
    },

    /**
     * @method _initializeScrollBarOffsets
     * convenience function for initializing element offsets for scrollbar widths
     * @private
     */
    _initializeScrollBarOffsets: function() {
      if(this.scrollBarWidth === this.styledScrollbarWidth) {
        this.element.addClass('has-styled-scrollbars');
      }

      this.$headerWrapper.css('margin-right', this.scrollBarWidth).end()
      .find('div.macro-table-scroll-shim').css({
        width: this.scrollBarWidth,
        right: -this.scrollBarWidth
      }).end()
      .find('div.macro-table-data-veil').css({
        right: this.scrollBarWidth,
        bottom: this.scrollBarWidth
      });
    },

    /**
     * @method _renderTableHeader
     * @description initialize the table's header section, i.e. summary row, column headers
     * @param tableData {Array} ordered table data, could be sorted or could be the initialized data
     * @private
     */
    _renderTableHeader: function() {
      var options = this.options,
        summaryRow = options.summaryRow,
        columns = options.columns,
        sortedColumn = validateSortByColumn.call(this, options.sortByColumn) >= 0 ? options.sortByColumn : '',

        $macroTable = this.element,
        $leftScrollWrapperHeader = this.$dynamicHeader.find('div.macro-table-scroll-wrapper'),
        $leftScrollWrapperBody = this.$dataContainer.find('div.macro-table-scroll-wrapper'),
        $columnSizers = $macroTable.find('colgroup.macro-table-column-sizer'), //one in header, one in body

        isMarginSet = false,
        additionalMargin = this.scrollBarWidth + this._renderHeaderRowControls(),
        marginAdded = additionalMargin,
        tableViewportWidth = ~~(options.width - additionalMargin),
        totalColumnWidth = 0,
        totalOverriddenColumnWidth = 0,
        totalOverriddenColumnWidthCount = 0,
        dynamicHeaderWidth = this.$dynamicHeader.width(), //gets ruined by hiding/emptying, so save now
        defaultColumnWidth, i, previousColumnWidth, thisColumn, columnWidth;

      this.$headerWrapper.hide();

      this.$dynamicHeaderRow.empty();
      this.$dynamicSummaryRow.empty();
      $columnSizers.empty();

      //nothing to do if there are no columns to show
      if(columns.length === 0) {
        return;
      }

      //calculate the width the columns should be set to in order to at least fill up all remaining width-space in the viewport
      //if the remaining space doesn't provide enough space for each unsized column to be at least options.defaultColumnWidth wide, default to options.defaultColumnWidth
      for(i = columns.length; i--;) {
        if(typeof columns[i].width !== 'undefined') {
          if(options.proportionalColumnWidths === true) {
            columnWidth = parseFloat(columns[i].width, 10); //percentages could be decimal...
            totalOverriddenColumnWidth += (columnWidth / 100) * tableViewportWidth;
          } else {
            totalOverriddenColumnWidthCount++;
          }
        } else {
          totalOverriddenColumnWidthCount++;
        }
      }
      defaultColumnWidth = (dynamicHeaderWidth - totalOverriddenColumnWidth) / totalOverriddenColumnWidthCount; //remaining width-space / # of unsized columns
      defaultColumnWidth = defaultColumnWidth < options.defaultColumnWidth ? options.defaultColumnWidth : defaultColumnWidth; //make sure at least options.defaultColumnWidth

      //build the column headers
      for(i = columns.length; i--;) {
        thisColumn = columns[i];
        if(typeof thisColumn.width !== 'undefined') {
          columnWidth = parseFloat(thisColumn.width, 10); //percentages could be decimal...
          columnWidth = options.proportionalColumnWidths === true ? (columnWidth / 100) * tableViewportWidth : ~~defaultColumnWidth;
        } else {
          columnWidth = ~~defaultColumnWidth;
        }

        if(i < this.maxTotalDomColumns) { //TODO: right now, this is always true because we show all columns in the DOM, always
          var $summaryColumn,
            $colSizer = $(document.createElement('col')).width(columnWidth),
            $headerColumn = $(document.createElement('th'))
          .html('<div class="macro-table-column-header-text" title="' + thisColumn.title + '">' + thisColumn.title + '</div>')
          .addClass(thisColumn.className);

          if(thisColumn.align === 'center' || thisColumn.align === 'right') {
            $headerColumn.addClass('macro-table-justify-'+thisColumn.align);
          }

          if(typeof summaryRow === 'object') {
            $summaryColumn = $(document.createElement('th')).addClass('macro-table-summary-row-cell');
            if(typeof summaryRow[thisColumn.field] !== 'undefined') {
              $summaryColumn.html(summaryRow[thisColumn.field]);
            }
            if(thisColumn.align === 'center' || thisColumn.align === 'right') {
              $summaryColumn.addClass('macro-table-justify-'+thisColumn.align);
            }
          }

          if(thisColumn.resizable !== false) {
            $headerColumn.addClass('macro-table-column-resizable');
            if(typeof summaryRow === 'object') {
              $summaryColumn.addClass('macro-table-column-resizable');
            }
          }

          if(options.reorderable === true) {
            $headerColumn.addClass('macro-table-column-reorderable');
          }

          if(thisColumn.sortable !== false) {
            $headerColumn.addClass('macro-table-column-sortable');
            if(thisColumn.field === sortedColumn) {
              $colSizer.addClass('macro-table-highlight');
              $headerColumn.addClass(thisColumn.direction < 0 ? 'macro-table-sort-descending' : 'macro-table-sort-ascending');
            }
          }

          this.$dynamicHeaderRow.prepend($headerColumn);
          $columnSizers.prepend($colSizer);
          if(typeof summaryRow === 'object') {
            this.$dynamicSummaryRow.prepend($summaryColumn);
          }
        }

        totalColumnWidth += columnWidth;
        if(!isMarginSet && totalColumnWidth > tableViewportWidth) {
          marginAdded += columnWidth + previousColumnWidth - (totalColumnWidth - tableViewportWidth);
          isMarginSet = true;
        }

        //if the viewport is too wide to allow scrolling to the currentColumn, reduce the currentColumn until we can scroll to it, until we hit 0
        if(!!i && i === this.currentColumn && totalColumnWidth < tableViewportWidth) {
          this.currentColumn--;
        }

        previousColumnWidth = columnWidth;
      }

      //if no margin has been added yet and the last column is resizable, give it a scroll so it can resize easily
      if(!isMarginSet && columns[columns.length - 1].resizable !== false) {
        //don't add extra space if there is already more than enough
        if(tableViewportWidth - totalColumnWidth <= previousColumnWidth) {
          marginAdded += previousColumnWidth + tableViewportWidth - totalColumnWidth;
        }
      }

      //size the scroll spacer to the theoretical max width of all the data + spacing margin
      $macroTable.find('div.macro-table-scroll-spacer')
      .width(totalColumnWidth + marginAdded);

      $leftScrollWrapperBody.width(totalColumnWidth + marginAdded);
      $leftScrollWrapperHeader.width(totalColumnWidth + marginAdded + this.scrollBarWidth);

      this.$headerWrapper.show(); //needs to be visible so column width calculation can be performed

      appendAndVerticallySizeRow({
        dynamicRow: this.$dynamicHeaderRow,
        staticRow: this.$staticHeaderRow
      });

      if(typeof summaryRow === 'object') {
        $macroTable.addClass('macro-table-display-summary-row');
        appendAndVerticallySizeRow({
          dynamicRow: this.$dynamicSummaryRow,
          staticRow: this.$staticSummaryRow
        });
      } else {
        $macroTable.removeClass('macro-table-display-summary-row');
      }

      this.$dynamicHeader.add(this.$dataContainer).scrollLeft(
        this.$dynamicHeader.scrollLeft() + this.$dynamicHeaderRow.find('th').filter(':nth-child('+(this.currentColumn + 1)+')').position().left //scroll position of old column
      );
    },

    /**
     * @method _renderHeaderRowControls
     * @description puts the static column header into the appropriate state for the tableData
     * @private
     * @returns {Number} The width of the static columns
     */
    _renderHeaderRowControls: function() {
      var options = this.options,
        timestamp = +new Date(),
        summaryRow = options.summaryRow,
        $macroTable = this.element,
        $staticColumnSizers = $macroTable.find('colgroup.macro-table-static-column-sizer'); //one in header, one in body

      $staticColumnSizers.empty();
      this.$staticHeaderRow.empty();
      this.$staticSummaryRow.empty();

      //set up table for rows to have checkbox columns, sizing handled in .resizeTable()
      if(options.rowsSelectable === true && this.renderRowDataSet.length > 0) {
        var $checboxColumnSizer = $(document.createElement('col')).addClass('macro-table-row-selector-column')
          .width(this.rowSelectColumnWidth),
          $checkboxColumn = $(document.createElement('th')).addClass('macro-table-row-control-cell')
          .html(
            '<input id="macro-table-select-toggle-'+timestamp+'" type="checkbox" class="macro-table-checkbox macro-table-select-toggle" />'+
            '<label for="macro-table-select-toggle-'+timestamp+'" class="macro-table-checkbox-label"></label>'
          );

        $staticColumnSizers.append($checboxColumnSizer);
        this.$staticHeaderRow.append($checkboxColumn);
        if(typeof summaryRow === 'object') {
          this.$staticSummaryRow.append($(document.createElement('th')).html('&nbsp;')); //space filler
        }

        $macroTable.addClass('macro-table-rows-selectable');
      } else {
        $macroTable.removeClass('macro-table-rows-selectable');
      }

      //WARNING: assuming at this point rowsWithChildrenCount has been initialized and is up to date

      //set up table for rows with expandable children
      if(this.rowsWithChildrenCount > 0) {
        var $expanderColumnSizer = $(document.createElement('col')).addClass('macro-table-row-expander-column')
          .width(this.expanderColumnWidth),
          $expanderColumn = $(document.createElement('th')).addClass('macro-table-row-control-cell macro-table-row-expander-cell')
          .html(
            '<input type="checkbox" id="macro-table-expand-toggle-'+timestamp+'" class="macro-table-checkbox macro-table-expand-toggle" />'+
            '<label for="macro-table-expand-toggle-'+timestamp+'" class="macro-table-checkbox-label macro-table-expand-toggle-label"></label>'
          );

        $staticColumnSizers.append($expanderColumnSizer);
        this.$staticHeaderRow.append($expanderColumn);
        if(typeof summaryRow === 'object') {
          this.$staticSummaryRow.append($(document.createElement('th')).html('&nbsp;')); //space filler
        }

        $macroTable.addClass('macro-table-rows-expandable');
      } else {
        $macroTable.removeClass('macro-table-rows-expandable');
      }

      //enable/disable static columns depending on settings
      if(this.renderRowDataSet.length > 0 && (options.rowsSelectable === true || this.rowsWithChildrenCount > 0 /*|| other.settings.that.enable.static.column */)) {
        $macroTable.addClass('macro-table-static-column-enabled');
      } else {
        $macroTable.removeClass('macro-table-static-column-enabled');
      }

      return this.$staticHeaderRow.width();
    },

    /**
     * @method _renderTableRows
     * @description initialize the table's data (rows) section and size the scroller appropriately
     *  the table will return to whatever scroll state it was in prior to this function being called
     * @param tableData {Array} ordered table data, could be sorted or could be the initialized data
     * @private
     */
    _renderTableRows: function(tableData) {
      var options = this.options,
        rowHeight = options.rowHeight,
        maxRenderCount = this.maxTotalDomRows,
        $macroTable = this.element,
        $dataContainerWrapper = $macroTable.find('div.macro-table-data-container-wrapper'),
        $staticDataContainer = $dataContainerWrapper.find('div.macro-table-static-data-container'),
        $tableBody = $dataContainerWrapper.find('tbody.macro-table-column-content'),
        $staticTableBody = $dataContainerWrapper.find('tbody.macro-table-static-column-content'),
        $currentRowElement, scrollPosition;

      this.expandedTableData = [];

      $dataContainerWrapper.hide();

      $tableBody.empty();
      $staticTableBody.empty();

      //populate table data into the table's DOM (and check for the presence of sub rows)
      $dataContainerWrapper.show(); //needs to be visible so row height calculation can be performed
      for(var i = 0, renderCount = 0, len = tableData.length; i < len; i++) {
        var row = tableData[i];

        //loop through the main row and any sub rows it has if it's expanded
        for(var j = 0, rowGroupLen = 1 + (row.expanded && typeof row.subRows !== 'undefined' ? row.subRows.length : 0); j < rowGroupLen; j++) {
          var rowData = rowGroupLen > 1 && j > 0 ? row.subRows[j - 1] : row;

          this.expandedTableData.push(rowData);
          if(rowData.selected) {
            this.selectedRowCount++;
          }

          //render the rows as long as we haven't gone over the DOM row threshold
          if(i >= this.currentRow - this.currentDomRow && renderCount < this.maxTotalDomRows && j < maxRenderCount) {
            var staticHeight, dynamicHeight,
              rowElements = renderRow.call(this, rowData, this.expandedTableData.length - 1);

            appendAndVerticallySizeRow(rowElements, $tableBody, $staticTableBody);

            renderCount++; //a row or subrow was rendered
          }
        }
      }

      //size the scroll spacer to the theoretical max height of all the data
      if(this.expandedTableData.length) {
        $macroTable.find('div.macro-table-scroll-spacer')
        .height(rowHeight * this.expandedTableData.length);
      }

      //return table to the old scoll position
      $currentRowElement = $tableBody.find('tr').filter(':nth-child('+(this.currentDomRow + 1)+')');
      scrollPosition = this.$dataContainer.scrollTop() + ($currentRowElement.length === 0 ? 0 : $currentRowElement.position().top);

      this.$dataContainer.add($staticDataContainer)
      .scrollTop(scrollPosition); //scroll position of old DOM row
    },

    /**
     * Move a column to a new position in the table
     * @param   {Number} columnToReorderIndex Index of column to reposition (0 offset)
     * @param   {Number} newIndex             Index to which the new column should be moved (0 offset)
     * @private
     */
    _moveColumn: function(columnToReorderIndex, newIndex) {
      console.log('_moveColumn',columnToReorderIndex,'to',newIndex);

      var columns = this.options.columns;
      newIndex = newIndex > columns.length - 1 ? columns.length - 1 : newIndex;
      columns.splice(newIndex, 0, columns.splice(columnToReorderIndex, 1)[0]);
      this._setOption('columns', columns);

      //may be called before the row/column position is scrolled back into original state due to setTimeout thread breaking
      this._trigger('columnreorder', null, {
        columns: columns
      });
      rebuildSearchIndexColumns.call(this, 'move', columnToReorderIndex, newIndex);
    },

    /**
     * Remove a column from display in the table
     * @param   {Number} columnToRemoveIndex The column index number (0 offset) to remove
     * @private
     */
    _removeColumn: function(columnToRemoveIndex) {
      var columns = this.options.columns;

      if(columnToRemoveIndex <= columns.length) {
        columns.splice(columnToRemoveIndex, 1);
      }
      this._setOption('columns', columns);

      //may be called before the row/column position is scrolled back into original state due to setTimeout thread breaking
      this._trigger('columnremove', null, {
        columns: columns
      });
      rebuildSearchIndexColumns.call(this, 'delete', columnToRemoveIndex);
    },

    /**
     * Add a column to display in the table
     * @param   {Object} columnToAdd Column object used to render row data
     * @param   {Number} newIndex    Index at which to insert the new column (0 offset)
     * @private
     */
    _addColumn: function(columnToAdd, newIndex) {
      var columns = this.options.columns;

      if(newIndex > columns.length) {
        newIndex = columns.length;
      } else if(newIndex < 0) {
        newIndex = 0;
      }

      columns.splice(newIndex, 0, columnToAdd);

      //may be called before the row/column position is scrolled back into original state due to setTimeout thread breaking
      this._trigger('columnadd', null, {
        columns: columns
      });
      rebuildSearchIndexColumns.call(this, 'add');
    },

    /**
     * @method _sortTable
     * @description sort the table by a particular column
     * @param {Number|String} columnToSort The column to sort by's index or field name
     * @param {Function}      callback     Callback function that executes upon completion of the sort/filter
     * @private
     */
    _sortTable: function(columnToSort, callback) {
      var options = this.options,
        renderRowDataSet, columnIndex;

      //columnToSort is an array index
      if(parseInt(columnToSort, 10).length === columnToSort.length) {

        if(columnToSort >= 0) {
          this._callSortWorkerWrapper(columnToSort, callback);
          return;

        } else {
          renderRowDataSet = this.sortedRows[''][''];
        }

      //columnToSort is a column field name
      } else {

        options.sortByColumn = columnToSort;

        if(typeof this.sortedRows[columnToSort] !== 'undefined') {
          //already exists, don't need to sort
          renderRowDataSet = this.sortedRows[columnToSort][''];

        } else {
          for(columnIndex = options.columns.length; columnIndex--;) {
            if(options.columns[columnIndex].field == columnToSort) {

              this._callSortWorkerWrapper(columnIndex, callback);
              return;
            }
          }

          //error case, no column found matching the sorter string
          renderRowDataSet = this.sortedRows[''][''];
        }
      }

      renderRowDataSet = postSortFilter.call(this, renderRowDataSet, null, callback); //possibly trigger webworker

      //the filter web worker wasn't needed, continue with cached version of renderRowDataSet
      if(typeof renderRowDataSet !== 'undefined') {
        this.renderRowDataSet = renderRowDataSet;
        this._renderTableRows(renderRowDataSet);
        if(typeof callback === 'function') {
          callback.bind(this)();
        }
      }
    },

    /**
     * Convenience wrapper to call the sort worker
     * @param {Number}   columnIndexToSort The column index number for which to sort
     * @param {Function} callback          Callback function that executes upon completion of the sort/filter
     */
    _callSortWorkerWrapper: function(columnIndexToSort, callback) {
      var options = this.options,
        columnData = options.columns[columnIndexToSort],
        $columnSizers = this.element.find('colgroup.macro-table-column-sizer col'),
        $columnHeader = this.$dynamicHeaderRow.find('th');

      options.sortByColumn = columnData.field;

      if(typeof callback === 'function') {
        columnData.direction = columnData.direction || 1; //initializing, so always start with ascending order
      } else {
        columnData.direction = typeof columnData.direction === 'undefined' ? 1 : columnData.direction * -1;
      }

      $columnSizers = $columnSizers.removeClass('macro-table-highlight')
      .filter(':nth-child('+(columnIndexToSort + 1)+')');

      $columnHeader = $columnHeader.removeClass('macro-table-sort-ascending macro-table-sort-descending')
      .filter(':nth-child('+(columnIndexToSort + 1)+')')
      .addClass('macro-table-sort-loading');

      workerSortRow.bind(this)(columnData, $columnHeader, $columnSizers, callback);
    },

    /**
     * @method _reRender
     * @description re-render the entire table and restore it to the original scroll position
     * @private
     */
    _reRender: function() {
      var scrollPositionLeft = this.currentColumn,
        scrollPositionTop = this.currentRow; //FIXME: this will be broken if looking at a subRow

      //this._init(); //causes currentColumn and currentRow to reset to 0
      this._renderTableHeader();
      this._sortTable(this.options.sortByColumn); //re-render table rows

      this.scrollToColumn(scrollPositionLeft);
      this.scrollToRow(scrollPositionTop);
    },

    /**
     * @method _refreshRows
     * @description removes all table rows and re-renders them
     * @private
     */
    _refreshRows: function() {
      scrollTableVertical.call(this, 0, true);
    },

    /**
     * Resize the table components to fit the supplied dimensions
     * if no dimension is given, fit to the parent container
     * Should be followed by a call to _sortTable
     * @param   {Number} height Height in pixels to resize table to
     * @param   {Number} width  Width in pixels to resize table to
     * @private
     */
    _resizeTable: function(height, width) {
      var $macroTable = this.element,
        options = this.options,
        rowHeight = options.rowHeight,
        rowSelectorOffset = options.rowsSelectable === true ? this.rowSelectColumnWidth : 0,
        headerHeight;

      //initialized undefined dimensions with parent dimensions
      height = height || this._getFallbackHeightToResize();
      width = width || this._getFallbackWidthToResize();

      //set table itself to correct height to prevent any accidental block sizing funniness
      $macroTable.height(height).width(width); //do this first because Firefox incorrectly calculates header shim height

      headerHeight = $macroTable.find('div.macro-table-scroll-shim').outerHeight();
      headerHeight = headerHeight > 0 ? headerHeight : rowHeight;

      //determine how many rows will fit in the provided height
      this.displayRowWindow = height < rowHeight ? options.defaultTableHeightInRows : ~~((height - headerHeight - this.scrollBarWidth) / rowHeight);

      //size the data container wrapper
      $macroTable.find('div.macro-table-data-container-wrapper')
      .height(height - headerHeight - this.scrollBarWidth) //-1 to account for bottom border of header
      .width(width - this.scrollBarWidth - 1); //-1 to account for left border

      //size the data container
      this.$dataContainer.add($macroTable.find('div.macro-table-static-data-container'))
      .height(height - headerHeight - this.scrollBarWidth);

      //size the scroll container
      this.$scrollContainer
      .outerHeight(height - headerHeight); //may have box-sizing: border-box; set (if not webkit)

      //add to the scroll spacer the amount of extra space available in the data container,
      //meaning vertical height not large enough to fit a full row of standard height (overflowed).
      //this will help when scrolling to the very bottom for some odd-sized cases
      this.$scrollContainer.find('div.macro-table-scroll-spacer')
      .css('margin-bottom', (((height - headerHeight - this.scrollBarWidth) / rowHeight) % 1) * rowHeight);

      //size the vertical drop guide for the resizing functionality
      this.$resizer.height(height - this.scrollBarWidth);

      //set globals based on new table dimensions
      this.replaceRowWindow = Math.max(this.displayRowWindow, options.scrollRowWindow);
      this.maxTotalDomRows = (this.replaceRowWindow * 2) + (this.displayRowWindow * 2);
      this.triggerUpDomRow = this.displayRowWindow; //this.displayRowWindow number of rows above the viewport, unseen
      this.triggerDownDomRow = this.replaceRowWindow * 2; //this.displayRowWindow number of rows bellow the viewport, unseen
    },

    /**
     * Loop through the tableData and make sure it isn't malformed
     * This function is called recursively because of the nature of tableData subrows (multi-levels deep)
     * @param  {Array} tableData Array of row objects that should contain "index" and "data" fields, as well as optional "subrow" arrays
     * @return {Boolean}         Returns true if tableData is valid
     */
    _validateTableData: function(tableData) {
      var isValid = true,
        row, i;

      for(i = tableData.length; i--;) {
        row = tableData[i];
        isValid = typeof row.index !== 'undefined' && typeof row.data !== 'undefined';
        if(typeof row.subrows !== 'undefined') {
          isValid = isValid && this._validateTableData(row.subrows);
        }
        if(!isValid) {
          console.warn('_validateTableData: Invalid row detected', row);
        }
      }

      return isValid;
    },

    /** Public methods */

    /**
     * @method getSelectedRows
     * @description fetch the rows that have been selected (via checkboxes). If rowsSelectable option is false, returns empty array.
     * @returns {Array} ordered list of selected rows
     */
    getSelectedRows: function() {
      var selectedRows = [];

      if(this.options.rowsSelectable === true && this.selectedRowCount !== 0) {

        for(var i = 0, len = this.expandedTableData.length; i < len; i++) {

          if(this.expandedTableData[i].selected) {
            selectedRows.push(this.expandedTableData[i]);
          }

          if(selectedRows.length == this.selectedRowCount) {
            break;
          }
        }
      }

      return selectedRows;
    },

    /**
     * @method getTableSnapshot
     * @description fetch all rows in the table with the column layout reflective of what is shown in the table
     * @returns {Array} ordered list of selected rows
     */
    getTableSnapshot: function() {
      var tableRows = [],
        options = this.options,
        columns = options.columns,
        tableData = this.renderRowDataSet,
        i, j, row;

      //loop the main and sub rows
      for(i = this.expandedTableData.length; i--;) {
        row = this.expandedTableData[i];
        tableRows[i] = [];

        //loop through the ordered columns datastructure so that order can be maintained in this output
        for(j = columns.length; j--;) {
          tableRows[i][j] = {};
          tableRows[i][j][columns[j].field] = row.data[columns[j].field];
        }
      }

      return tableRows;
    },

    /**
     * Resize the table components to fit the supplied dimensions
     * Public interface for calls to _resizeTable and _sortTable
     */
    resizeTable: function(height, width) {
      //if called from _setOption, these options are re-set, again. oh well.
      var options = this.options;
      options.height = 0;
      options.width = 0;
      this.element.width(options.width)
      .height(options.height);

      options.height = height || this._getFallbackHeightToResize();
      options.width = width || this._getFallbackWidthToResize();

      this._resizeTable(options.height, options.width);
      this._renderTableHeader();

      //maxTotalDomRows and the trigger rows have changed, so the table rows need to be re-rendered so that scrolling doesn't break
      this._sortTable(this.options.sortByColumn);
    },

    /**
     * Scroll the table to the desired row
     * @param scrollToRow {Number} the row or row index to scroll the table to
     * @param byIndex {Boolean} true if scrolling to the row index number rather
     *  than the true row number (which may differ if any sub rows are expanded)
     */
    scrollToRow: function(scrollToRow, byIndex) {
      var options = this.options,
        tableData = this.renderRowDataSet,
        rowsToScroll;

      if(byIndex && typeof tableData[scrollToRow] !== 'undefined') {
        scrollToRow = this.expandedTableData.indexOf(tableData[scrollToRow]);
      } else if(typeof scrollToRow === 'undefined') {
        scrollToRow = 0;
      }

      console.log('scroll to row',scrollToRow);

      rowsToScroll = scrollToRow - this.currentRow;
      if(rowsToScroll !== 0) {
        this.scrollToRowIndex = scrollToRow;
        this.$scrollContainer.scrollTop(this.scrollTop + (rowsToScroll * options.rowHeight));

      } else {
        this._refreshRows();
      }
    },

    /**
     * Scroll the table to the desired column
     * @param  {Number} scrollToColumn The column index
     */
    scrollToColumn: function(scrollToColumn) {
      console.log('scroll to column',scrollToColumn);

      var $column = this.$dynamicHeaderRow.find('th:nth-child('+(scrollToColumn + 1)+')'),
        columnOffset = $column.length > 0 ? $column.position().left : 0;

      this.scrollLeft = -1; //force a scroll

      this.$scrollContainer.scrollLeft(this.$scrollContainer.scrollLeft() + columnOffset);
    },

    /**
     * return the row object of the currently focused row
     * @return {Object} row object or undefined if no row is focused
     */
    getFocusedRow: function() {
      for(var i = this.expandedTableData.length - 1; i >= 0; i--) {
        if(this.expandedTableData[i].focused === true) {
          return {
            index: this.expandedTableData[i].id,
            data: JSON.parse(JSON.stringify(this.expandedTableData[i].data)) //cloned object
          };
        }
      }
    },

    /**
     * @method searchTable
     * @description search the displayed table rows to those that match the search term
     * @param {String} searchTerm The term for which to search table rows for a match. if undefined, all rows are matched
     * @return {Array}            An array of matching rows
     */
    searchTable: function(searchTerm) {
      searchTerm = typeof searchTerm !== 'string' ? '' : searchTerm;
      this._setOption('searchTerm', searchTerm);

      return this.renderRowDataSet;
    },

    /**
     * Filter the rows to be displayed by column and a verifying function
     * @param  {Array} columnFilters An array of objects containing a column "field" and a "filter" function
     *                               When there are multiple argument column filters, they are AND'd as opposed to OR'd
     * @return {Array}               An array of the filtered rows
     */
    filterTable: function(columnFilters) {
      this._setOption('columnFilters', columnFilters);
      return this.renderRowDataSet;
    },

    /**
     * change the values of a row's data columns
     * @param  {Number} index The row id
     * @param  {Object} data  Object corresponding to columns
     */
    editRow: function(index, data) {
      this.expandedTableData[index].data = data;
      this._refreshRows();
    },

    /**
     * @method destroy
     * @description destroy the macro table widget and revert state to before the widget was created
     */
     // Use the destroy method to clean up any modifications your widget has made to the DOM
    destroy: function() {
      this.element.empty()
      .removeClass('macro-table');

      //must release object URLs when we're done with them
      window.URL.revokeObjectURL(this.sortWebWorkerUrl);
      window.URL.revokeObjectURL(this.filterWebWorkerUrl);

      // In jQuery UI 1.8, you must invoke the destroy method from the base widget
      $.Widget.prototype.destroy.call( this );
      // In jQuery UI 1.9 and above, you would define _destroy instead of destroy and not call the base method
    }
  });
})(jQuery, window, document);