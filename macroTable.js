(function($, window, document, undefined) {

  /** Truly Private functions */

  /**
   * Helper function to extract the mousewheel deta data for Firefox and Webkit
   * @param  {Event}  event The jQuery mousewheel event (which wraps either DOMMouseScroll or mousewheel)
   * @return {Object}       Returns an object containing the normalized deltaY and deltaX values
   */
  function getMouseWheelDelta(event) {
    var originalEvent = event.originalEvent,
      deltaX = 0,
      deltaY = 0,
      delta;

    // Old school scrollwheel delta
    if(originalEvent.wheelDelta) {
      delta = originalEvent.wheelDelta/120;
    }
    if(originalEvent.detail) {
      delta = -originalEvent.detail/3;
    }

    // New school multidimensional scroll (touchpads) deltas
    if(typeof delta !== 'undefined') {
      deltaY = delta;
    }

    // Gecko
    if(originalEvent.axis !== undefined && originalEvent.axis === originalEvent.HORIZONTAL_AXIS) {
      deltaY = 0;
      deltaX = -1 * delta;
    }

    if(originalEvent.deltaY) {
      deltaY = -originalEvent.deltaY / 120;
    }
    if(originalEvent.deltaX) {
      deltaX = originalEvent.deltaX / 120;
    }

    // Webkit
    if(originalEvent.wheelDeltaY !== undefined) {
      deltaY = originalEvent.wheelDeltaY / 120;
    }
    if(originalEvent.wheelDeltaX !== undefined) {
      deltaX = -1 * originalEvent.wheelDeltaX / 120;
    }

    return {
      deltaY: deltaY,
      deltaX: deltaX
    };
  }

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
      sortByField = e.data.sortByField; //column field name to sort the data by

      switch(e.data.action) {
        case 'sort':
          if(e.data.hasOwnProperty('sortByField')) {

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

        //case 'order':
        default:
          reverseTableData(tableData);
          break;
      }

    } else {
      throw 'tableData datastructure is not an Array';
    }

    //return process tableData
    postMessage({
      pid: e.data.pid,
      sortByField: sortByField, //passed through so the message listener knows where to cache
      tableData: tableData
    });

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

      /**
       * Convenience function for preparing a row to have its matching text highlighted
       * The "row" parameter is modified and changes are passed by reference back to the main loop
       * @param  {String} escapedSearchText The escaped string used for the regular expression
       * @param  {Object} row               The row object itself containing the formattedData field (to be deleted)
       *                                    and the data field, which will be overridden with the highlighted value markup
       * @param  {Object} searchRow         The indexed, meta-row object from the passed-in searchIndex
       */
      highlightMatch = function(escapedSearchText, row, searchRow) {
        delete row.formattedData; //we don't want the call to getColumnContent to used any cached values for this row
        Object.keys(row.data).forEach(function(field) {
          var searchMatch = new RegExp('(' + escapedSearchText + ')', 'gi'),
            index = columnOrder.indexOf(field),
            replaceResult, rowData;

          //contains data that isn't rendered in the table, so ignore it
          if(index === -1) {
            return;
          }

          //the goal is to notify the row builder that this formatted cell matched the search filter or not
          //if it did match, we want to render the cell with the text as built in this worker
          //if it didn't match, we want to allow the formatter function to take care of it, so HTML isn't stripped out
          rowData = searchRow.formatted[index].toString();
          replaceResult = rowData.replace(searchMatch, '<span class="macro-table-filter-match">$1</span>');
          if(rowData === replaceResult) {
            replaceResult = searchRow.values[index]; //no match, default to internal value so the formatter can be applied durring rendering
          }

          row.data[field] = replaceResult;
        });
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
                highlightMatch(escapedSearchText, rowString, searchRow);
              }

              rowString.expanded = true;
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
                      throw 'The index used does not align with the tableData structure '+indexCheck;
                    }
                  }

                  realTableRow = JSON.parse(JSON.stringify(realTableRow));

                  //backfill table row object
                  if(j === 0) {
                    realTableRow.expanded = true;
                    searchedRows.unshift(realTableRow);
                    searchedRows[0].subRows = [];
                    lastSearchMatchHierarchy[j] = searchedRows[0];

                  //add the subrow to its parent which is now definitely in the searchedRows object
                  } else {
                    if(doHighlightMatches) {
                      highlightMatch(escapedSearchText, realTableRow, searchRow);
                    }
                    searchedRows[0].subRows.unshift(realTableRow);
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
      filteredRows = JSON.parse(JSON.stringify(searchedRows)).filter(function filterCallback(row) {
        var i, searchIndexMatch;
        //we need to filter subrows too
        if(typeof row.subRows !== 'undefined') {
          row.subRows = row.subRows.filter(filterCallback);
        }
        //find the searchIndex that matches the row we're on
        for(i = searchIndex.length; i--;) {
          if(searchIndex[i].index == row.index) {
            searchIndexMatch = searchIndex[i];
            break;
          }
        }
        for(i = columnFilters.length; i--;) {
          if(typeof columnFilters[i].field !== 'undefined' &&
              searchIndexMatch.values[columnOrder.indexOf(columnFilters[i].field)] !== columnFilters[i].value &&
              (typeof row.subRows === 'undefined' || row.subRows.length === 0)) {
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
      pid: e.data.pid,
      sortByField: e.data.sortByField, //passed through so the message listener knows where to cache
      searchText: e.data.searchText, //passed through so the message listener knows where to cache
      searchedRows: searchedRows,
      filteredRows: filteredRows
    });
  }


  /**
   * convenience function to clear out the data content and rerender the appropriate rows based on the new scroll position
   * @param  {Number} startRowIndex The index into the tableData where the rows should start rendering from (should ALWAYS be smaller than endRowIndex)
   * @param  {Number} endRowIndex   The index into the tableData where the last row is to be rendered number (should ALWAYS be larger than swtartRowIndex)
   * @param  {Number} direction     The number of rows the table was scrolled, positive for down, negative for up
   * @param  {Event}  scrollEvent   Original event object for the scroll
   * @return {Number}               The actual number of rows rendered
   */
  function rebuildRows(startRowIndex, endRowIndex, direction, scrollEvent) {
    this._log('time', 'Time rebuildRows while');

    var $tableContentWrapper = this.$dataContainerWrapper,

      $tableBody = this.$tableBody,
      $staticTableBody = $tableContentWrapper.find('tbody.macro-table-static-column-content'),

      dynamicFragment = document.createDocumentFragment(),
      staticFragment = document.createDocumentFragment(),

      $rows,
      $staticRows,
      newRows = [],
      renderCount = 0,
      rowData,
      rowElements,
      insertBeforeNode,

    rebuildWrapUp = function(blockTrigger) {
      var time = +new Date();
      this._log('time', 'Time rebuildRows size');
      verticallySizeRows.call(this, newRows, true);

      newRows = null;
      this.verticalRowSizePid = null;

      //if shimScrollPending, that means the scroll to intended row failed because of non-standatd row heights
      //and an additional "shim-scroll" has been queued up to correct the miss now that the row heights are known.
      //this shim-scroll will trigger the scroll event instead (in the .scroll() handler)
      if(!blockTrigger && !this.shimScrollPending) {
        this._trigger('scroll', scrollEvent);
      }

      this._log('timeEnd', 'Time rebuildRows size');
    }.bind(this);

    startRowIndex = startRowIndex < 0 ? 0 : startRowIndex;
    direction = direction || 0; //default to "no scroll" for complete re-render

    //detach the table from the DOM for impending manipulation ideally, but need to know row heights, so can't...
    $tableContentWrapper.hide();
    $rows = $tableBody.children();
    $staticRows = $staticTableBody.children();

    $tableBody.empty();
    $staticTableBody.empty();

    //append all new rows to the table, since we've exhausted the ones we can reuse already in the DOM
    while(startRowIndex + renderCount != endRowIndex) {
      rowData = this.expandedTableData[startRowIndex + renderCount];

      if(typeof rowData !== 'undefined') {

        rowElements = buildRow.call(this, rowData, (startRowIndex + renderCount));

        dynamicFragment.appendChild(rowElements.dynamicRow[0]);
        staticFragment.appendChild(rowElements.staticRow[0]);

        newRows.push(rowElements);

        renderCount += (endRowIndex > startRowIndex ? 1 : -1);

      //reached beginning or end of table
      } else {

        if(direction > 0) {
          renderCount++;
        }
        break;

      }
    }
    rowData = null;
    rowElements = null;

    this._log('timeEnd', 'Time rebuildRows while');

    //add back previous selection of rows
    if(direction < 0) {
      $rows.filter(':lt('+(this.maxTotalDomRows - renderCount)+')').each(function(index, element) {
        dynamicFragment.appendChild(element);
      });
      $staticRows.filter(':lt('+(this.maxTotalDomRows - renderCount)+')').each(function(index, element) {
        staticFragment.appendChild(element);
      });
    } else if(direction > 0) {
      insertBeforeNode = dynamicFragment.firstChild;
      $rows.filter(':gt('+(renderCount - 1)+')').each(function(index, element) {
        dynamicFragment.insertBefore(element, insertBeforeNode);
      });
      insertBeforeNode = staticFragment.firstChild;
      $staticRows.filter(':gt('+(renderCount - 1)+')').each(function(index, element) {
        staticFragment.insertBefore(element, insertBeforeNode);
      });
      insertBeforeNode = null;
    }

    $tableBody[0].appendChild(dynamicFragment);
    $staticTableBody[0].appendChild(staticFragment);

    $tableContentWrapper.show();

    //resize the rows out of the thread, which is much faster and
    //more reliable because the rows have reflowed once this is executed
    clearTimeout(this.verticalRowSizePid);
    if(direction !== 0) {
      this.verticalRowSizePid = setTimeout(rebuildWrapUp, 0);
    } else {
      rebuildWrapUp(true);
    }

    return Math.abs(renderCount);
  }

  /**
   * helper to calculate the needed amount of margin to be added to the bottom of the table
   * in order to allow for scrolling into view the last row of the table
   * whether or not this function is appropriate to run is handled by the caller
   * (should only be called when in the last DOM window row of the table)
   * @param  {Boolean} forceUseOfSpacerMultiplier If we find that the bottom of the table needs space added,
   *                                              force the use of the spacerMultipler even if it looks like it's not needed.
   *                                              Use case is when there is only one row window and it has non-defulat row heights
   *                                              that cause the true last row to not be scrolled to.
   * @return {Boolean} True if the scroll spacer was given margin-bottom compensation for the scrollbar (meriting a re-scroll so the last row isn't potentially cut off)
   */
  function calculateAndApplyBottomMargin(forceUseOfSpacerMultiplier) {
    var distanceFromBottomToNewLastDomRow = 0,
      $macroTable = this.element,
      $tableContainerWrapper = this.$dataContainerWrapper,
      $tableRows = this.$dataContainer.find('tbody.macro-table-column-content tr'),
      $tableScrollSpacer = this.$scrollSpacer,
      $tableScrollWrappers = $tableContainerWrapper.find('div.macro-table-scroll-wrapper'),
      $reorderGuide = $macroTable.find('div.macro-table-reorder-guide'),
      spacerMultiplier = 0,
      tableContainerHeight = this.$dataContainer.height(),
      tableScrollSpacerMarginAdded = false;

    //loop through rows backwards to find the new, truly last row that will allow the last row to show
    $($tableRows.get().reverse()).each(function(i, element) {
      distanceFromBottomToNewLastDomRow += $(element).height();
      if(distanceFromBottomToNewLastDomRow >= tableContainerHeight) {
        distanceFromBottomToNewLastDomRow -= $(element).height();

        //if the remaining rows are not default height, then we need to add the space for some phantom rows
        //to increase the scroller height the normal use case is when the table has multiple row windows,
        //but in case there is only one row window, we should do this just to be safe
        if(distanceFromBottomToNewLastDomRow / i !== this.options.rowHeight || forceUseOfSpacerMultiplier) {
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
   * @param  {Number}  direction   Number of rows to scroll (negative for up, positive for down)
   * @param  {Boolean} rerender    Override to force a full table row reload
   * @param  {Event}   scrollEvent Original event object for the scroll
   * @return {Boolean}             True if the scroll process is over, false if re-scroll needs to happen for the added margin/padding
   */
  function scrollTableVertical(direction, rerender, scrollEvent) {
    var reScrollNeeded = false,
      rowNumber = this.currentRow,
      visibleRowCount = this.expandedTableData.length,

      finalDomRowWindow = Math.max(0, visibleRowCount - this.maxTotalDomRows), //the final row window render starts at this row
      isInFinalDomWindow = this.currentRow > finalDomRowWindow,

      $tableBody = this.$tableBody,
      $tableRows = $tableBody.children(),
      newRenderCount = 0, //number of new rows we need to remove and re-add with new values
      scrollToRowIndex;

    //a huge scroll, passed the normal row swap threshold (grab the thumb with the mouse and whip it all the way in one direction)
    if(this.currentDomRow + direction >= this.maxTotalDomRows || this.currentDomRow + direction < 0 || rerender) {

      //final dom window should always render the maxTotalDomRows number of rows
      if(isInFinalDomWindow) {

        rebuildRows.call(this, visibleRowCount < this.maxTotalDomRows ? 0 : visibleRowCount - this.maxTotalDomRows, visibleRowCount, 0, scrollEvent);
        this.currentDomRow = visibleRowCount < this.maxTotalDomRows ? rowNumber : this.maxTotalDomRows - (visibleRowCount - rowNumber); //the DOM row index if all rows are the same height, which is determined in the next line...
        reScrollNeeded = calculateAndApplyBottomMargin.call(this); //at the bottom, make sure the scroll margins are in place

      //not in final dom window, proceed as normal
      } else {

        var topRowBuffer = rowNumber < this.displayRowWindow ? rowNumber : this.displayRowWindow; //account for when on the first rowBuffer number of rows
        rebuildRows.call(this, rowNumber - topRowBuffer, rowNumber - topRowBuffer + this.maxTotalDomRows, 0, scrollEvent);
        this.currentDomRow = topRowBuffer;
      }

      this._log('debug', 're-render', rowNumber, '(DOM row)', this.currentDomRow);

      $tableRows = $tableBody.children(); //refetch rows, since they've likely changed

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

            this.currentDomRow -= rebuildRows.call(this, rowNumber + this.maxTotalDomRows - this.currentDomRow, rowNumber + this.maxTotalDomRows - this.currentDomRow + this.replaceRowWindow, direction, scrollEvent);
            this._log('debug', 'scrolling down', rowNumber, '(DOM row)', this.currentDomRow);

            $tableRows = $tableBody.children(); //refetch rows, since they've likely changed
          }

        //in the finalDomRowWindow, add margin to bottom of wrapper to allow scrolling the last row completely into the visible window
        } else if(visibleRowCount > this.maxTotalDomRows) {

          reScrollNeeded = calculateAndApplyBottomMargin.call(this);
        }

      //scrolling up
      } else if(direction < 0) {

        this.currentDomRow = Math.max(this.currentDomRow + direction, 0); //the DOM row that the table would be at, if a detach weren't about to happen

        if(this.currentDomRow <= this.triggerUpDomRow && rowNumber > this.currentDomRow) {

          this.currentDomRow += rebuildRows.call(this, rowNumber - this.currentDomRow - 1 - this.replaceRowWindow, rowNumber - this.currentDomRow, direction, scrollEvent);
          this._log('debug', 'scrolling up', rowNumber, '(DOM row)', this.currentDomRow);

          $tableRows = $tableBody.children(); //refetch rows, since they've likely changed
        }

      } //scroll up
    } //else

    var scrollTop = $tableRows.length > 0 ? $tableRows.eq(this.currentDomRow).offset().top - $tableBody.offset().top : 0;
    this._log('debug', 'current dom row (top visible row)', this.currentDomRow, 'currentRow', this.currentRow, 'row index', this.expandedTableData[this.currentRow], 'from top', scrollTop);
    this.$dataContainer.scrollTop(scrollTop);
    this.$staticDataContainer.scrollTop(scrollTop);

    scrollToRowIndex = this.scrollToRowIndex;
    this.scrollToRowIndex = null;
    if(reScrollNeeded && scrollToRowIndex !== null) {
      //if <, the row we want is in the viewport and _scrollToRow will call _refreshRows, which will set off another verticalRowSizePid
      //if >=, then a minor scroll needs to take place to make sure the intended row is visible, but no additional verticalRowSizePid will be called
      var currentDomRowOffset = (scrollToRowIndex >= this.expandedTableData.length ? this.expandedTableData.length - 1 : scrollToRowIndex) - this.currentRow,
        $intendedRow = $tableRows.eq(this.currentDomRow + currentDomRowOffset);
      if($intendedRow.offset().top + $intendedRow.height() < this.$dataContainer.offset().top + this.$dataContainer.height()) {
        clearTimeout(this.verticalRowSizePid);
        this.verticalRowSizePid = null;
      } else {
        this.shimScrollPending = true; //flag to let verticalRowSizePid that the upcoming call to _scrollToRow -> scroll event will be doing the _trigger
      }
      this._scrollToRow(scrollToRowIndex, null, true);
      return false;
    } else {
      this.shimScrollPending = false;
    }
    return true;
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
        newColumnScrollLeft = ~~($newColumn.position().left + dataContainerScrollLeft);

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
   * This function will cache the format so on subsequen renders it will return faster
   * @param  {Object}   column         Table column definition
   * @param  {Object}   row            Table row object
   * @param  {Boolean}  includeMarkup  Include with the returned result the wrapper and internal markup
   * @return {String}                  The column text that will appear in the rendered cell
   */
  function getColumnContent(column, row, includeMarkup) {
    if(!row.formattedData) {
      row.formattedData = {};
    } else if(row.formattedData[column.field]) {
      return row.formattedData[column.field][includeMarkup ? 'markup' : 'clean'];
    }

    var columnContentContainer = document.createElement('span'),
      columnContent = row.data[column.field],
      cssClass = 'macro-table-cell-content';

    row.formattedData[column.field] = {};
    columnContent = typeof columnContent === 'undefined' || columnContent === null ? '' : columnContent;

    //we want to pass the wrapper of the cell content to the formatter function in case a user wants to mess with it
    if(typeof column.onCellClick === 'function') {
      cssClass += ' macro-table-cell-clickable';
    }
    if(column.textWrap === false) {
      cssClass += ' macro-table-no-wrap';
    }

    columnContentContainer.className = cssClass;

    if(typeof column.formatter === 'function' &&
        //always format if this column value isn't a match
        (typeof columnContent !== 'string' || columnContent.indexOf('macro-table-filter-match') === -1)) {
      //need to have $columnContentContainer defined here because the formatter may blow up if it doesn't get it
      columnContent = column.formatter(columnContent, row, columnContentContainer);
    }

    columnContentContainer.innerHTML = columnContent;

    row.formattedData[column.field].clean = columnContentContainer.textContent;
    columnContentContainer.setAttribute('title', columnContentContainer.textContent);

    columnContent = document.createElement('div');
    columnContent.appendChild(columnContentContainer);
    row.formattedData[column.field].markup = columnContent.innerHTML;

    columnContentContainer = null;

    return row.formattedData[column.field][includeMarkup ? 'markup' : 'clean'];
  }

  /**
   * Build a table row containing a column for each field
   * Assumes the row object is not malformed (has "data" and "index" fields, etc.)
   * @param {Object} row A row of data to be rendered by field
   * @param {Number} rowIndex The row number being rendered in the expandedTableData datastructure
   */
  function buildRow(row, rowIndex) {
    var columns = this.options.columns,
      isRowsSelectable = this.options.rowsSelectable === true,
      rowHasChildren = typeof row.subRows !== 'undefined' && row.subRows.length,
      expanderCellClass = '',
      staticRowColumns = '',
      $dynamicRow = this.$dynamicRowTemplate.clone(true).attr('data-row-index', rowIndex),
      $staticRow = this.$staticRowTemplate.clone(true).attr('data-row-index', rowIndex),
      $rows = $dynamicRow.add($staticRow),
      rowClasses = '',
      timestamp = +new Date(),
      rowData, indexHierachy, tableDataSubRows, i;

    //give even rows a stripe color
    if(rowIndex % 2 === 0) {
      rowClasses += ' macro-table-row-stripe';
    }

    rowClasses += ' macro-table-row macro-table-row-'+rowIndex;

    //if selecting rows is enabled and this row has already been selected, style appropriately
    if(isRowsSelectable && row.selected) {
      rowClasses += ' macro-table-highlight macro-table-selected-row';
    }

    if(row.focused) {
      rowClasses += ' macro-table-row-focused';
    }

    if(row.expanded === true) {
      rowClasses += ' macro-table-row-expanded';
    } else {
      rowClasses += ' macro-table-row-collapsed';
    }

    $rows.addClass(rowClasses);

    //build dynamically left-scrollable row
    $dynamicRow.children().each(function(index, element) {
      element.innerHTML = getColumnContent.call(this, columns[index], row, true);
    }.bind(this));

    //determine static expanded cell styles if applicable
    if(rowHasChildren && row.expanded) {
      expanderCellClass += ' macro-table-subrow-hierarchy-vertical-line-bottom-half';
    } else if(row.index.toString().indexOf(',') !== -1) {
      expanderCellClass += ' macro-table-subrow-hierarchy-line-right'; //TODO: macro-table-subrow-hierarchy-line-right should be conditionally removed for subRows of subRows

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
        expanderCellClass += ' macro-table-subrow-hierarchy-vertical-line-full';
      } else {
        expanderCellClass += ' macro-table-subrow-hierarchy-vertical-line-top-half';
      }
    }

    //build static row
    $staticRow.children().each(function(index, element) {
      $cell = $(this);
      if($cell.hasClass('macro-table-row-expander-cell')) {
        $cell.addClass(expanderCellClass)
        .find('input').addClass('macro-table-row-expander-'+rowIndex)
        .attr({
          id: 'macro-table-row-expander-'+rowIndex+'-'+timestamp,
          'data-row-index': rowIndex
        })
        .prop({
          checked: !!row.expanded,
          disabled: !rowHasChildren //disable for safety
        })
        .end()
        .find('label').attr('for', 'macro-table-row-expander-'+rowIndex+'-'+timestamp);
      } else if($cell.hasClass('macro-table-row-selector-cell')) {
        $cell.find('input').addClass('macro-table-select-'+rowIndex)
        .attr({
          id: 'macro-table-select-'+rowIndex+'-'+timestamp,
          'data-row-index': rowIndex
        })
        .prop({
          checked: !!row.selected,
          disabled: !isRowsSelectable //disable for safety
        })
        .end()
        .find('label').attr('for', 'macro-table-select-'+rowIndex+'-'+timestamp);
      }
    });

    if(isRowsSelectable) {
      $staticRow.addClass('macro-table-row-selectable');
    }
    if(rowHasChildren) {
      $staticRow.addClass('macro-table-row-expandable');
    }

    //use cached height value if it exists and save time later in verticallySizeRows
    if(row.calculatedHeight) {
      $dynamicRow.css('height', row.calculatedHeight);
      $staticRow.css('height', row.calculatedHeight)
      .find('div.macro-table-expand-toggle-container').css('height', row.calculatedHeight - 1);
    }

    return {
      dynamicRow: $dynamicRow,
      staticRow: $staticRow,
      rowData: row //for use in verticallySizeRows
    };
  }

  /**
   * Helper function to handle rows that are taller than this.maxRowHeight
   * It wrapps cell content with a relatively positioned wrapper and positions the content absolute
   * to overcome stupid table shortcomings on max-height of rows.
   * It then loops through all cell content and for those cells too tall, it sets the height on the relative wrapper
   * so that the content will appear at the top of the cell and truncated where it is too tall
   * @param  {Object} $row         The row to be max-height adjusted
   * @param  {Number} maxRowHeight The height the row should max out at
   */
  function fitRowToMaxHeight($row, maxRowHeight) {
    //perform the adjustment of vertical position only on cells that are too tall, leave ones that fit within the max alone
    //and do it out of the thread for speed
    $row.find('span.macro-table-cell-content').each(function() {
      var $element = $(this);
      if($element.height() > maxRowHeight) {
        //wrap .macro-table-cell-content with a relatively positioned parent so that we can truncate the text that is too tall
        $element.wrap(
          $(document.createElement('div')).addClass('macro-table-column-cell-height-clip')
        ).parent().height(maxRowHeight);
      }
    });
  }

  /**
   * Helper function to properly calculate the row height parity between the static and dynamic rows
   * @param  {Object} rowElements Object containing the static and dynamic rows, as returned by renderRow
   */
  function verticallySizeRows(rowElements, enforceMaxHeight) {
    var options = this.options,
      defaultRowHeight = options.rowHeight,

      $currentRowElement, staticHeight, dynamicHeight, rowData, scrollTop, i, $cellContent;

    this._log('time', 'Time sized');

    //reconcile possible different heights between static and dynamic rows
    for(i = rowElements.length; i--;) {
      rowData = rowElements[i].rowData = rowElements[i].rowData || {};

      if(rowData.calculatedHeight) {
        delete rowElements[i].rowData; //already calculated, skip to save performance hit
        continue;
      }
      staticHeight = rowElements[i].staticRow.height();
      dynamicHeight = rowElements[i].dynamicRow.height();
      if(staticHeight >= dynamicHeight) {
        if(enforceMaxHeight && staticHeight > this.maxRowHeight) {
          rowData.calculatedHeight = this.maxRowHeight;
          fitRowToMaxHeight(rowElements[i].staticRow, this.maxRowHeight);
        } else {
          rowData.calculatedHeight = staticHeight;
        }
      } else { // if(staticHeight < dynamicHeight) {
        if(enforceMaxHeight && dynamicHeight > this.maxRowHeight) {
          rowData.calculatedHeight = this.maxRowHeight;
          fitRowToMaxHeight(rowElements[i].dynamicRow, this.maxRowHeight);
        } else {
          rowData.calculatedHeight = dynamicHeight;
        }
      }

      //compensate for fractional pixel heights in FF
      if(rowData.calculatedHeight > defaultRowHeight) {
        rowData.calculatedHeight++;
      }
    }

    //we have all the sizes we need, now hide everything to prevent reflows while we set them
    this.$dataContainerWrapper.hide();

    for(i = rowElements.length; i--;) {
      rowData = rowElements[i].rowData;
      if(typeof rowData === 'undefined') {
        continue;
      }
      rowElements[i].dynamicRow.height(rowData.calculatedHeight);
      rowElements[i].staticRow.height(rowData.calculatedHeight)
      .find('div.macro-table-expand-toggle-container').height(rowData.calculatedHeight - 1);
    }

    $currentRowElement = this.$tableBody.children().filter(':nth-child('+(this.currentDomRow + 1)+')');

    //all done, let the performance hit commence
    this.$dataContainerWrapper.show();

    //may need to fix the scrollTop if the heights moved the row positions enough
    scrollTop = $currentRowElement.length > 0 ? $currentRowElement.offset().top - this.$tableBody.offset().top : 0;
    this.$dataContainer.scrollTop(scrollTop);
    this.$staticDataContainer.scrollTop(scrollTop);

    this._log('timeEnd', 'Time sized');
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
      this._log('warn', 'sortByColumn being ignored because there is no tableData');
      return -1;
    }

    for(i = columns.length; i--;) {

      if(columns[i].field == columnField && columns[i].sortable !== false) {
        return i;
      }
    }

    this._log('warn', 'sortByColumn being ignored because a matching column field was not found');
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

    this.sortWorkerPid = +new Date();

    $veil.show();

    sortWorker = new Worker(this.sortWebWorkerUrl);

    sortWorker.onerror = function(e) {
      sortWorker.terminate();

      if(e.data.pid === this.sortWorkerPid) {
        this.sortWorkerPid = null;

        this.renderRowDataSet = options.tableData;

        if(typeof callback === 'function') {
          callback.bind(this)();
        }

        this._renderTableRows(this.renderRowDataSet);

        $veil.hide();
        this._log('error', 'Error sorting column.');
        this._trigger('columnsort', null, {
          error: true
        });
      }
    }.bind(this);

    sortWorker.onmessage = function(e) {
      sortWorker.terminate();
      this.sortedRows[e.data.sortByField][''] = e.data.tableData;

      if(e.data.pid === this.sortWorkerPid) {
        this.sortWorkerPid = null;

        this.searchIndex = []; //postSortFilter will recalculate searchIndex with new order (TODO: maybe make this part of the worker)
        this.renderRowDataSet = this.sortedRows[e.data.sortByField]['']; //callback may contain references to this.renderRowDataSet, so it needs to be set to pre-filter state
        this.renderRowDataSet = postSortFilter.call(this, e.data.tableData, action, callback); //potentially changes self.renderRowDataSet if there is a filter active!

        if(typeof this.renderRowDataSet !== 'undefined') {
          this._renderTableRows(this.renderRowDataSet);

          $veil.hide();
        }

        $columnSizers.addClass('macro-table-highlight');

        $columnHeader.removeClass('macro-table-sort-loading')
        .addClass('macro-table-sorted ' + (columnData.direction < 0 ? 'macro-table-sort-descending' : 'macro-table-sort-ascending'));

        this._log('info', 'sorted data',e.data);
        this._trigger('columnsort', null, columnData);
      }
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

      this._log('debug', 'pre-sorted data',options.tableData);

      this.renderRowDataSet = []; //keep things from going haywire if method calls are made while a worker is still running...

      columnSorter = columnData.sortable; //could be boolean, 'numeric', a function, or anything else which will result in dictionary
      if(typeof columnData.sortable === 'function') {
        columnSorter = columnData.sortable.toString();
      }

      action = 'sort';

      sortWorker.postMessage({
        pid: this.sortWorkerPid,
        action: action,
        tableData: options.tableData,
        sortByField: sortedColumn,
        direction: columnData.direction,
        columnSorter: columnSorter
      });

    } else {

      this._log('debug', 'pre-sorted data', this.renderRowDataSet);
      action = 'order';
      sortWorker.postMessage({
        pid: this.sortWorkerPid,
        action: action,
        tableData: this.renderRowDataSet,
        sortByField: sortedColumn
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

    this.filterWorkerPid = +new Date();

    $veil.show(); //probably already shown from workerSortRow

    filterWorker = new Worker(this.filterWebWorkerUrl);

    filterWorker.onerror = function(e) {
      filterWorker.terminate();

      if(e.data.pid === this.filterWorkerPid) {
        this.filterWorkerPid = null;

        options.searchTerm = '';
        options.columnFilters = [];
        this.renderRowDataSet = tableData;

        if(typeof callback === 'function') {
          callback.bind(this)();
        }

        this._renderTableRows(this.renderRowDataSet);
        $veil.hide();
        this._log('error', 'Error filtering rows.');

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
      }
    }.bind(this);

    filterWorker.onmessage = function(e) {
      filterWorker.terminate();
      this.renderRowDataSet = e.data.filteredRows; //what we want to show
      this.sortedRows[e.data.sortByField][e.data.searchText] = e.data.searchedRows; //what we want to cache for future filters

      if(e.data.pid === this.filterWorkerPid) {
        this.filterWorkerPid = null;

        if(typeof callback === 'function') {
          callback.bind(this)();
        }

        //the call to _init uses this as well, which can cause the expand column to disappear if filtering causes a flip between a dataset with and without subrows
        this.rowsWithChildrenCount = countRowsWithChildren.call(this);
        this._renderHeaderRowControls();

        this._renderTableRows(this.renderRowDataSet);

        $veil.hide();

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
      }
    }.bind(this);

    filterWorker.postMessage({
      pid: this.filterWorkerPid,
      sortByField: options.sortByColumn,
      searchText: options.searchTerm,
      searchIndex: this.searchIndex,
      columnOrder: this.columnOrder,
      columnFilters: options.columnFilters,
      tableData: tableData,
      searchedRows: this.sortedRows[options.sortByColumn][options.searchTerm], //if not undefined, only gets filtered
      highlightMatches: options.highlightMatches
    });
  }

  /**
   * Convenience function for translating log level keys to number
   * @param  {String} level The log level keyname
   * @return {Number}       Log level number
   */
  function translateLogLevel(level) {
    switch(level) {
      case 'debug':
        return 4;

      case 'time':
      case 'timeEnd':
      case 'info':
        return 3;

      case 'warn':
        return 2;

      case 'error':
        return 1;

      default:
        return 0;
    }
  }



  /**
   * Table Event Functions
   */

  /**
   * Event for the scrolling of the table ($scrollContainer a.k.a. div.macro-table-scroll-container)
   * @param  {Event} e The jQuery scroll event
   */
  var scrollEventFn = function(e) {
    var lastScrollTop = this.scrollTop,
      lastTableScrollLeft = this.scrollLeft,
      triggerScrollEvent = true,
      rowHeight = this.options.rowHeight,
      rowsToScroll;

    this.scrollTop = $(e.target).scrollTop();
    this.scrollLeft = $(e.target).scrollLeft();

    rowsToScroll = Math.abs(~~(this.scrollTop / rowHeight) - ~~(lastScrollTop / rowHeight));
    if(rowsToScroll > 0) {
      if(lastScrollTop < this.scrollTop) {

        this.currentRow += rowsToScroll;
        if(!this.breakTableScroll) {
          triggerScrollEvent = scrollTableVertical.call(this, rowsToScroll, this.forceTableScrollRender, e);
          this._log('debug', 'scrolling down to row', this.currentRow, 'by', rowsToScroll, 'rows');
        }

      } else if (lastScrollTop > this.scrollTop){

        this.currentRow -= rowsToScroll;
        if(!this.breakTableScroll) {
          triggerScrollEvent = scrollTableVertical.call(this, -rowsToScroll, this.forceTableScrollRender, e);
          this._log('debug', 'scrolling up to row', this.currentRow, 'by', rowsToScroll, 'rows');
        }
      }
    }

    if(this.scrollLeft != lastTableScrollLeft) {
      scrollTableHorizontal.call(this);
    }
    this._log('debug', 'Scrolling .macro-table-scroll-container: lastScrollTop', lastScrollTop, 'scrollTop', this.scrollTop, 'calculatedRow', this.calculatedRow, 'rowsToScroll', rowsToScroll);
    if(this.verticalRowSizePid === null && triggerScrollEvent) {
      this._trigger('scroll', e);
    }
  };


  $.widget('ui.macroTable', {

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
       * @field width {Number} the width in pixels (or percent, see proportionalColumnWidths) the column should render at
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
       * The direction (asc/desc) the sortByColumn should be sorted in
       * Depends on sortByColumn being valid
       * @type {Number} 1 for Ascending, -1 for Descending
       */
      sortByColumnDirection: 0,
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

      /**
       * Log level used for determining whether a log message should be output
       * @type {String} 'debug', 'info', 'warn', 'error'
       */
      debugLevel: 'error',

      /**
       * Logging functions to use for outputting console messages
       * @type {Object}
       */
      loggers: {
        context: console,
        debug: console.debug,
        info: console.info,
        warn: console.warn,
        error: console.error,
        time: console.time,
        timeEnd: console.timeEnd
      },

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
     * Log a console message
     * If the debug level is set accordingly, the message will appear in the browser console
     * @param   {String} type    The type of message to log
     * @param   {String} message The message to log
     * @private
     */
    _log: function() {
      var logLevel = this.options.debugLevel,
        logger = this.options.loggers,
        type = arguments[0],
        message = [].slice.call(arguments, 1);

      if(translateLogLevel(type) <= translateLogLevel(logLevel)) {
        switch(type) {
          case 'time':
            logger.time.apply(logger.context, message);
            break;

          case 'timeEnd':
            logger.timeEnd.apply(logger.context, message);
            break;

          case 'debug':
            logger.debug.apply(logger.context, message);
            break;

          case 'info':
            logger.info.apply(logger.context, message);
            break;

          case 'warn':
            logger.warn.apply(logger.context, message);
            break;

          case 'error':
            logger.error.apply(logger.context, message);
            break;

          default:
            break;
        }
      }
    },

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
          value = typeof value === 'string' ? value : '';
          this._super(key, value);

          this._init(); //causes currentColumn and currentRow to reset to 0

          //async searching won't actually take place if there is no search term, so trigger the event here
          if(value === '') {
            this._trigger('search', null, {
              searchTerm: value
            });
          }
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
     * Loop through the table data and process stuff we'll need to know before actually rendering the rows
     * Good place to set count variables, etc.
     * @private
     */
    _preprocessTableData: function() {
      var tableData = this.options.tableData,

        recursiveTraverser = function loop(rowGroup) {
          var row, i;

          for(i = rowGroup.length; i--;) {
            row = rowGroup[i];

            if(row.selected) {
              this.selectedRowCount++;
            }

            if(row.expanded) {
              this.expandedRowCount++;
            }

            if(row.subRows instanceof Array && row.subRows.length > 0) {
              loop(row.subRows);
            }
          }
        }.bind(this);

      this.selectedRowCount = 0;
      this.expandedRowCount = 0;

      recursiveTraverser(tableData);
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
        scrollDiv;

      /**
       * Discover the width of the system scrollbar
       */
      scrollDiv = document.createElement('div');
      scrollDiv.className = 'macro-table-measure-scrollbar';
      document.body.appendChild(scrollDiv);

      // Get the scrollbar width
      this.systemScrollbarWidth = scrollDiv.offsetWidth - scrollDiv.clientWidth;

      document.body.removeChild(scrollDiv);
      scrollDiv = null;


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
       * the static maximum height a row should ever reach, which is calculated as the
       * this.$dataContainerWrapper.height() - options.rowHeight
       * @type {Number}
       */
      this.maxRowHeight = Infinity;

      /**
       * the static width of the expand/collapse sub rows column
       * @type {Number}
       */
      this.expanderColumnWidth = 16;

      /**
       * The actual scrollbar widths
       * OS X hidden system scrollbars break the world, so hardcode default
       * @type {Number}
       */
      this.scrollBarWidth = this.systemScrollbarWidth === 0 ? 16 : this.systemScrollbarWidth;

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
       * Event handler instances
       */

       this.scrollEvent = scrollEventFn.bind(this);


      /**
       * Web Worker Blob object URLs
       * @type {String}
       */
      this.sortWebWorkerUrl = createBlobUrl(SortWebWorker);
      this.filterWebWorkerUrl = createBlobUrl(FilterWebWorker);

      this._log('info', 'Sort Web Worker URL', this.sortWebWorkerUrl);
      this._log('info', 'Filter Web Worker URL', this.filterWebWorkerUrl);

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
      this.$scrollSpacer = $macroTable.find('div.macro-table-scroll-spacer');
      this.$headerWrapper = $macroTable.find('div.macro-table-header-wrapper');
      this.$dynamicHeader = this.$headerWrapper.find('div.macro-table-header');
      this.$dynamicHeaderRow = this.$dynamicHeader.find('tr.macro-table-header-row');
      this.$dynamicSummaryRow = this.$dynamicHeader.find('tr.macro-table-summary-row');
      this.$staticHeader = $macroTable.find('div.macro-table-static-header');
      this.$staticHeaderRow = this.$staticHeader.find('tr.macro-table-static-header-row');
      this.$staticSummaryRow = this.$staticHeader.find('tr.macro-table-static-summary-row');
      this.$resizer = $macroTable.find('div.macro-table-resize-guide');
      this.$dataContainerWrapper = $macroTable.find('div.macro-table-data-container-wrapper');
      this.$dataContainer = this.$dataContainerWrapper.find('div.macro-table-data-container');
      this.$tableBody = this.$dataContainer.find('tbody.macro-table-column-content');
      this.$staticDataContainer = this.$dataContainerWrapper.find('div.macro-table-static-data-container');
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
              left: ~~(self.$dynamicHeader.scrollLeft() + $columnHeader.position().left + 2) + 'px'
            });
            self.$removeColumnButton.css({
              top: (($columnHeader.height() - self.$removeColumnButton.height()) / 2) + 'px',
              left: ~~(self.$dynamicHeader.scrollLeft() + $columnHeader.position().left + $columnHeader.outerWidth() - self.$removeColumnButton.width() + (-2)) + 'px'
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
      $headerTable.on('click', 'th.macro-table-column-sortable', function(e) {
        if(!$macroTable.hasClass('macro-table-column-moving') && this.options.tableData.length > 0) {
          var index = $(e.currentTarget).index(),
            lastSortedColumnIndex = $headerTable.find('th.macro-table-column-sortable.macro-table-sorted').index();

          if(lastSortedColumnIndex >= 0 && index !== lastSortedColumnIndex) {
            this.options.columns[lastSortedColumnIndex].direction = 0; //clear sort order since we're leaving this column
          }

          this._sortTable(index);
        }
      }.bind(this));


      /* Wire row focus events */

      //main function for row focusing (when they're clicked)
      function toggleRowFocus($rows) {
        self._log('debug', 'clicking this row',$rows.data('row-index'));

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
          row = self.renderRowDataSet[$row.data('row-index')];

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

          self.breakTableScroll = true; //when resizing the scroll spacer, a macrotablescroll event may be triggered (and we don't want it to)
          self.$scrollSpacer.height(rowHeight * self.expandedTableData.length); //may trigger 'scroll' on $scrollContainer

          //nested setTimeouts to allow for scroll event to trigger for the scroll-spacer resize, then re-render the current position
          setTimeout(function() {
            self.breakTableScroll = false;
            self.forceTableScrollRender = true;
            self.scrollToRow(thisCurrentRow);

            //reset the force re-render flag
            setTimeout(function() {
              self.forceTableScrollRender = false;
              self._trigger(isToggled ? 'rowexpand' : 'rowcollapse', null, {
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
          $checkboxRow = $checkbox.closest('tr'),
          domRowIndex = $checkboxRow.index(),
          dataRowIndex = $checkbox.data('row-index'),
          isChecked = $checkbox.is(':checked'),
          $dataRow = $dynamicTableBody.find('tr').eq(domRowIndex);

        //select/deselect a row
        if($checkbox.hasClass('macro-table-row-selector')) {

          if(isChecked) {
            $checkboxRow.addClass('macro-table-highlight macro-table-selected-row');
            $dataRow.addClass('macro-table-highlight macro-table-selected-row');
            self.expandedTableData[dataRowIndex].selected = true;
            self.selectedRowCount++;
          } else {
            $checkboxRow.removeClass('macro-table-highlight macro-table-selected-row');
            $dataRow.removeClass('macro-table-highlight macro-table-selected-row');
            self.expandedTableData[dataRowIndex].selected = false;
            self.selectedRowCount--;
          }

          self._updateSelectAllState();

          self._trigger(isChecked ? 'rowselect' : 'rowdeselect', null, {
            selectedRows: self.getSelectedRows()
          });

        //expand/collapse a row
        } else if($checkbox.hasClass('macro-table-row-expander')) {

          if(isChecked) {
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

          self._updateExpandAllState();

          self.$scrollSpacer.height(rowHeight * self.expandedTableData.length);

          self._trigger(isChecked ? 'rowexpand' : 'rowcollapse', null, {
            expandedRows: self.expandedRowIndexes.sort()
          });
        }
      });


      /* Wire resize column events */

      //helper function to return the width to resize a column to based on current cursor position
      function calculateReiszeColumnWidth(cursorPosition, $columnToResize) {
        var cursorOffset = ~~(cursorPosition - $macroTable.position().left),
          maxLeftPosition = $macroTable.outerWidth() - self.scrollBarWidth - self.$resizer.outerWidth(),
          minResizePosition = ~~($columnToResize.position().left + self.resizeColumnMinWidth);

        self._log('debug', 'calculateReiszeColumnWidth:', $macroTable.outerWidth() - self.scrollBarWidth - self.$resizer.outerWidth(), cursorOffset, $columnToResize.offset().left + self.resizeColumnMinWidth);

        return Math.max(Math.min(maxLeftPosition, cursorOffset), minResizePosition);
      }

      //mousedown for the resizer, used when resizing columns
      var resizePositionStart;
      this.$resizer.bind('mousedown', function(e) {
        e.preventDefault();
        if(typeof resizePositionStart === 'undefined') { //prevent multiple mousedowns (if you mousedown, move cursor off of table, then move back and click)
          resizePositionStart = ~~self.$resizer.position().left;

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
              widthDelta = ~~(self.$resizer.position().left - resizePositionStart),
              newWidth = $columnSizers.width() + widthDelta;

            //clean up the mousemove and mouseup events on the container
            self.element.unbind('mouseup', resizeMouseup) //don't want to unbind the reorder mouseup event
            .removeClass('macro-table-resizing');

            //calculate how much the column should be resized, and resize the columns
            $columnSizers.width(newWidth);
            self.options.columns[columnNumber].width = options.proportionalColumnWidths === true ? (newWidth * 100) / (options.width - self.scrollBarWidth - self.$staticHeader.width()) : newWidth; //set so subsequent table rerenders keeps the width

            //FIXME: this is really slow, need to time and improve
            self._renderTableHeader(); //resize table header dimensions in case the header changed height, etc.
            self._resizeTable(); //resize table dimensions in case the rows changed height, etc.
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
          .css('left', ~~(self.$dataContainer.scrollLeft() + $selectedColumn.position().left));

          self.$resizer.css('left', thumbPosition + 'px');

          $macroTable.find('colgroup.macro-table-column-sizer col').filter(':nth-child('+($selectedColumn.index() + 1)+')')
          .addClass('macro-table-selected-column');

          self._log('debug', 'offset column',$selectedColumn.offset().left,'position column',$selectedColumn.position().left,'resizer',self.$dataContainer.scrollLeft() + $selectedColumn.position().left - (self.$resizer.outerWidth() / 2));
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
              dataContainerOffset = ~~self.$dataContainer.position().left,
              reorderGuidePosition = $reorderGuide.position().left,
              maxReorderGuidePosition = $headerTable.outerWidth() - $headerTable.find('th:last').outerWidth(),
              selectedColumnIndex = $macroTable.find('col.macro-table-selected-column').first().index(),
              newIndex,
              $newColumn;

            $visibleColumns = $headerTable.find('th'); //TODO: filter more intelligently (only look at columns visible in window)
            $visibleColumns.each(function(i, column) {
              var $column = $(column);
              if(cursorDataContainerOffset < ~~($column.position().left + $column.outerWidth()) || i == self.options.columns.length - 1) {
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
              newColumnPosition = ~~($newColumn.position().left + dataContainerOffset),
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
                    $reorderGuide.css('left', ~~($reorderGuide.position().left + (newColumnWidth * (isScrollingRight ? 1 : -1))));
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

            } else if(reorderGuidePosition == maxReorderGuidePosition && cursorDataContainerOffset > ~~($newColumn.position().left + (newColumnWidth / 2))) {

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
      .on('DOMMouseScroll MozMousePixelScroll mousewheel', function(e) {
        e.preventDefault();

        var horizontalPixelScroll = 5,
          delta = getMouseWheelDelta(e);

        deselectResizeHandle();

        if(delta.deltaY < 0) {
          self.$scrollContainer.scrollTop(self.scrollTop + rowHeight);
        } else if(delta.deltaY > 0) {
          self.$scrollContainer.scrollTop(self.scrollTop - rowHeight);
        }

        if(delta.deltaX !== 0) {
          var $domColumns = self.$dynamicHeaderRow.find('th'),
            offset = $domColumns.length !== 0 ? ~~Math.abs($domColumns.eq(0).position().left) : 0;

          if(delta.deltaX < 0 && self.currentColumn + (options.scrollByColumn ? 0 : 1) > 0) {
            var lastOffset = ~~Math.abs($domColumns.eq(self.currentColumn - 1).position().left);
            self._log('debug', 'left scroll',offset-lastOffset,'lastOffset',lastOffset,'offset',offset,'currentColumn',self.currentColumn);
            self.$scrollContainer.scrollLeft(offset - (options.scrollByColumn ? lastOffset : horizontalPixelScroll));
          } else if(delta.deltaX > 0 && self.currentColumn < $domColumns.length - (options.scrollByColumn ? 1 : 0)) {
            var nextOffset = ~~Math.abs($domColumns.eq(self.currentColumn + 1).position().left);
            self._log('debug', 'right scroll',offset-nextOffset,'nextOffset',nextOffset,'offset',offset,'currentColumn',self.currentColumn);
            self.$scrollContainer.scrollLeft(offset + (options.scrollByColumn ? nextOffset : horizontalPixelScroll));
          }
        }
        self._log('debug', 'Mousewheel .macro-table-data-container', self.scrollTop, rowHeight, self.$scrollContainer);
      });

      //scroll function for the scroll container, using the scrollbars
      this.$scrollContainer.on('scroll', this.scrollEvent);

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
        columns = options.columns,
        sortByColumn = options.sortByColumn,
        isTableDataValid = this._validateTableData(options.tableData),
        i, column, cssClass, markup;

      options.height = options.height || this._getFallbackHeightToResize();
      options.width = options.width || this._getFallbackWidthToResize();

      this.scrollTop = 0;
      this.currentRow = 0;
      this.currentDomRow = 0;
      this.currentColumn = 0;
      this.currentDomColumn = 0;

      this.verticalRowSizePid = null;

      this.$dynamicRowTemplate = $(document.createElement('tr'));
      //build dynamically left-scrollable row
      for(i = columns.length; i--;) {
        column = columns[i];

        //initialize column sort order
        if(sortByColumn !== '') {
          if(column.field === sortByColumn) {
            column.direction = options.sortByColumnDirection ? options.sortByColumnDirection : 0;
          } else {
            column.direction = 0;
          }
        } else {
          column.direction = 0;
        }


        cssClass = 'macro-table-column-cell';

        if(column.resizable !== false) {
          cssClass += ' macro-table-column-resizable';
        }

        //if the cell is justified right or center, add the appropriate class
        switch(column.align) {
          case 'right':
          case 'center':
          case 'left':
            cssClass += ' macro-table-justify-'+column.align;
            break;

          default:
            cssClass += ' macro-table-justify-left';
            break;
        }

        markup = '<td class="'+ cssClass +'" data-column-index="'+i+'"></td>' + markup;
      }
      this.$dynamicRowTemplate.html(markup);

      this.$staticRowTemplate = $(document.createElement('tr')).html(
        '<td class="macro-table-column-cell macro-table-row-control-cell macro-table-row-selector-cell">' +
          '<input type="checkbox" class="macro-table-checkbox macro-table-row-selector" />' +
          '<label class="macro-table-checkbox-label"></label>' +
        '</td>' +
        '<td class="macro-table-column-cell macro-table-row-control-cell macro-table-row-expander-cell">' +
          '<div class="macro-table-expand-toggle-container">' +
            '<input type="checkbox" class="macro-table-checkbox macro-table-row-expander" />' +
            '<label class="macro-table-checkbox-label macro-table-row-expander-label"></label>' +
          '</div>'+
        '</td>'
      );

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

      this._preprocessTableData();

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

      this._log('debug', 'replaceRowWindow',this.replaceRowWindow,'maxTotalDomRows',this.maxTotalDomRows,'maxTotalDomColumns',this.maxTotalDomColumns,'middleDomRow',~~(this.maxTotalDomRows / 2),'triggerUpDomRow',this.triggerUpDomRow,'triggerDownDomRow',this.triggerDownDomRow);
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
        this._log('warn', '_getFallbackHeightToResize:: No height desernable from parent, defaulting to '+options.defaultTableHeightInRows+' rows worth');
        return minimumHeight;

      } else {
        this._log('warn', '_getFallbackHeightToResize:: Parent container element has a height, using that');
        return parentHeight;
      }
    },

    /**
     * @method _initializeScrollBarOffsets
     * convenience function for initializing element offsets for scrollbar widths
     * @private
     */
    _initializeScrollBarOffsets: function() {
      if(this.scrollBarWidth === 12) { //FIXME: //TODO: this needs to be eliminated!
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
        additionalMargin = this.scrollBarWidth + this._renderHeaderRowControls(), //TODO: call _renderHeaderRowControls and then use a different method to get the width
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
          columnWidth = options.proportionalColumnWidths === true ? (columnWidth / 100) * tableViewportWidth : ~~columnWidth;
        } else {
          columnWidth = ~~defaultColumnWidth;
        }

        if(i < this.maxTotalDomColumns) { //TODO: right now, this is always true because we show all columns in the DOM, always
          var $summaryColumn,
            $colSizer = $(document.createElement('col')).width(columnWidth),
            $headerColumn = $(document.createElement('th')).addClass('macro-table-column-cell')
          .html('<div class="macro-table-column-header-text" title="' + thisColumn.title + '">' + thisColumn.title + '</div>')
          .addClass(thisColumn.className);

          if(thisColumn.align === 'center' || thisColumn.align === 'right') {
            $headerColumn.addClass('macro-table-justify-'+thisColumn.align);
          }

          if(typeof summaryRow === 'object') {
            $summaryColumn = $(document.createElement('th')).addClass('macro-table-column-cell macro-table-summary-row-cell');
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
              $headerColumn.addClass('macro-table-sorted ' + (thisColumn.direction < 0 ? 'macro-table-sort-descending' : 'macro-table-sort-ascending'));
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
      this.$scrollSpacer.width(totalColumnWidth + marginAdded);

      $leftScrollWrapperBody.width(totalColumnWidth + marginAdded);
      $leftScrollWrapperHeader.width(totalColumnWidth + marginAdded + this.scrollBarWidth);

      this.$headerWrapper.show(); //needs to be visible so column width calculation can be performed

      verticallySizeRows.call(this, [{
        dynamicRow: this.$dynamicHeaderRow.css('height', ''),
        staticRow: this.$staticHeaderRow.css('height', '')
      }]);

      if(typeof summaryRow === 'object') {
        $macroTable.addClass('macro-table-display-summary-row');
        verticallySizeRows.call(this, [{
          dynamicRow: this.$dynamicSummaryRow.css('height', ''),
          staticRow: this.$staticSummaryRow.css('height', '')
        }]);
      } else {
        $macroTable.removeClass('macro-table-display-summary-row');
      }

      this.$dynamicHeader.add(this.$dataContainer).scrollLeft(
        ~~(this.$dynamicHeader.scrollLeft() + this.$dynamicHeaderRow.find('th').filter(':nth-child('+(this.currentColumn + 1)+')').position().left) //scroll position of old column
      );
    },

    /**
     * @method _renderHeaderRowControls
     * @description puts the static column header into the appropriate state for the tableData
     * @private
     * @returns {Number} The width of the static columns
     * TODO: the width should be fetchable via a getter, not as a side effect of running this method
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
          $checkboxColumn = $(document.createElement('th')).addClass('macro-table-column-cell macro-table-row-control-cell')
          .html(
            '<input id="macro-table-select-toggle-'+timestamp+'" type="checkbox" class="macro-table-checkbox macro-table-select-toggle" />'+
            '<label for="macro-table-select-toggle-'+timestamp+'" class="macro-table-checkbox-label"></label>'
          );

        $staticColumnSizers.append($checboxColumnSizer);
        this.$staticHeaderRow.append($checkboxColumn);
        if(typeof summaryRow === 'object') {
          this.$staticSummaryRow.append($(document.createElement('th')).addClass('macro-table-column-cell').html('&nbsp;')); //space filler
        }

        $macroTable.addClass('macro-table-rows-selectable');

        this._updateSelectAllState();

      } else {
        $macroTable.removeClass('macro-table-rows-selectable');
      }

      //WARNING: assuming at this point rowsWithChildrenCount has been initialized and is up to date

      //set up table for rows with expandable children
      if(this.rowsWithChildrenCount > 0) {
        var $expanderColumnSizer = $(document.createElement('col')).addClass('macro-table-row-expander-column')
          .width(this.expanderColumnWidth),
          $expanderColumn = $(document.createElement('th')).addClass('macro-table-column-cell macro-table-row-control-cell macro-table-row-expander-cell')
          .html(
            '<input type="checkbox" id="macro-table-expand-toggle-'+timestamp+'" class="macro-table-checkbox macro-table-expand-toggle" />'+
            '<label for="macro-table-expand-toggle-'+timestamp+'" class="macro-table-checkbox-label macro-table-expand-toggle-label"></label>'
          );

        $staticColumnSizers.append($expanderColumnSizer);
        this.$staticHeaderRow.append($expanderColumn);
        if(typeof summaryRow === 'object') {
          this.$staticSummaryRow.append($(document.createElement('th')).addClass('macro-table-column-cell').html('&nbsp;')); //space filler
        }

        $macroTable.addClass('macro-table-rows-expandable');

        this._updateExpandAllState();

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
     * Set the state of the select all header checkbox (checked/unchecked/indeterminate) based on the number of rows selected
     * @private
     */
    _updateSelectAllState: function() {
      var $selectAllHeaderCheckbox = this.$staticHeaderRow.find('input.macro-table-select-toggle');

      if(this.selectedRowCount === 0) { //no rows selected

        $selectAllHeaderCheckbox.prop('checked', false);
        $selectAllHeaderCheckbox[0].indeterminate = false;

      } else if(this.selectedRowCount == this.expandedTableData.length) { //all rows selected

        $selectAllHeaderCheckbox.prop('checked', true);
        $selectAllHeaderCheckbox[0].indeterminate = false;

      } else { //at least one row selected, but not all

        $selectAllHeaderCheckbox[0].indeterminate = true;
      }
    },

    /**
     * Set the state of the expand all header checkbox (checked/unchecked) based on the number of rows expanded
     * @private
     */
    _updateExpandAllState: function() {
      var $expandAllHeaderCheckbox = this.$staticHeaderRow.find('input.macro-table-expand-toggle');

      if(this.expandedRowCount === 0) { //no rows expanded
        $expandAllHeaderCheckbox.prop('checked', false);

      } else if(this.expandedRowCount === this.rowsWithChildrenCount) { //all expandable rows expanded
        $expandAllHeaderCheckbox.prop('checked', true);

      } else { //at least one row expanded, but not all
        if(this.expandedRowCount < this.rowsWithChildrenCount / 2) {
          $expandAllHeaderCheckbox.prop('checked', false);
        } else {
          $expandAllHeaderCheckbox.prop('checked', true);
        }
      }
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
        currentScrollPosition = this.$scrollContainer.scrollTop(),
        $macroTable = this.element,
        $dataContainerWrapper = this.$dataContainerWrapper,
        $staticDataContainer = $dataContainerWrapper.find('div.macro-table-static-data-container'),
        $tableBody = this.$tableBody,
        $staticTableBody = $dataContainerWrapper.find('tbody.macro-table-static-column-content'),

        dynamicFragment = document.createDocumentFragment(),
        staticFragment = document.createDocumentFragment(),
        newRows = [],
        $currentRowElement, scrollPosition, rowElements;

      this.expandedTableData = [];

      $dataContainerWrapper.hide();

      $tableBody.empty();
      $staticTableBody.empty();

      //populate table data into the table's DOM (and check for the presence of sub rows)
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
            rowElements = buildRow.call(this, rowData, this.expandedTableData.length - 1);

            dynamicFragment.appendChild(rowElements.dynamicRow[0]);
            staticFragment.appendChild(rowElements.staticRow[0]);

            newRows.push(rowElements);

            renderCount++; //a row or subrow was rendered
          }
        }
      }

      $tableBody[0].appendChild(dynamicFragment);
      $staticTableBody[0].appendChild(staticFragment);

      //size the scroll spacer to the theoretical max height of all the data
      if(this.expandedTableData.length) {
        this.$scrollContainer.off('scroll', this.scrollEvent);
        this.$scrollSpacer.height(rowHeight * this.expandedTableData.length);
        if(currentScrollPosition !== this.$scrollContainer.scrollTop()) {
          this.$scrollContainer.scrollTop(currentScrollPosition); //fix for firefox where the position would be remembered (undesirably) by the browser across page refreshes
        }
        this.$scrollContainer.on('scroll', this.scrollEvent);
      }

      //return table to the old scoll position
      $currentRowElement = $tableBody.children().filter(':nth-child('+(this.currentDomRow + 1)+')');
      scrollPosition = this.$dataContainer.scrollTop() + ($currentRowElement.length === 0 ? 0 : $currentRowElement.position().top);

      this.$dataContainer.add($staticDataContainer)
      .scrollTop(scrollPosition); //scroll position of old DOM row

      $dataContainerWrapper.show(); //needs to be visible so row height calculation can be performed

      verticallySizeRows.call(this, newRows, true);

      //there is only one row window, so we want to treat it like the last one in the case where there are multiple
      //(see use of calculateAndApplyBottomMargin in scrollTableVertical)
      if(this.expandedTableData.length < this.maxTotalDomRows) {
        calculateAndApplyBottomMargin.call(this, true);
      }
    },

    /**
     * Move a column to a new position in the table
     * @param   {Number} columnToReorderIndex Index of column to reposition (0 offset)
     * @param   {Number} newIndex             Index to which the new column should be moved (0 offset)
     * @private
     */
    _moveColumn: function(columnToReorderIndex, newIndex) {
      this._log('debug', '_moveColumn',columnToReorderIndex,'to',newIndex);

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
        columnData.direction = !columnData.direction ? 1 : columnData.direction * -1;
      }

      $columnSizers = $columnSizers.removeClass('macro-table-highlight')
      .filter(':nth-child('+(columnIndexToSort + 1)+')');

      $columnHeader = $columnHeader.removeClass('macro-table-sorted macro-table-sort-ascending macro-table-sort-descending')
      .filter(':nth-child('+(columnIndexToSort + 1)+')')
      .addClass('macro-table-sort-loading');

      //execute the sort worker if there is actually work to do, otherwise, bypass it
      if(this.renderRowDataSet.length === 0) {
        this._renderTableRows(this.renderRowDataSet);
        if(typeof callback === 'function') {
          callback.bind(this)();
        }
      } else {
        workerSortRow.bind(this)(columnData, $columnHeader, $columnSizers, callback);
      }
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
        tableData = options.tableData,
        rowHeight = options.rowHeight,
        rowSelectorOffset = options.rowsSelectable === true ? this.rowSelectColumnWidth : 0,
        headerHeight, i, scrollSpacerMarginBottom;

      //the cached height needs to be re-calculated because the realy heights probably changed
      for(i = tableData.length; i--;) {
        delete tableData[i].calculatedHeight;
      }

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
      this.$dataContainerWrapper
      .height(height - headerHeight - this.scrollBarWidth) //-1 to account for bottom border of header
      .width(width - this.scrollBarWidth - 1); //-1 to account for left border

      this.maxRowHeight = this.$dataContainerWrapper.height() - options.rowHeight;

      //size the data container
      this.$dataContainer.add($macroTable.find('div.macro-table-static-data-container'))
      .height(height - headerHeight - this.scrollBarWidth);

      //size the scroll container
      this.$scrollContainer.outerHeight(height - headerHeight); //may have box-sizing: border-box; set (if not webkit)

      //add to the scroll spacer the amount of extra space available in the data container,
      //meaning vertical height not large enough to fit a full row of standard height (overflowed).
      //this will help when scrolling to the very bottom for some odd-sized cases
      scrollSpacerMarginBottom = (((height - headerHeight - this.scrollBarWidth) / rowHeight) % 1) * rowHeight;

      //if OS X hidden scrollbars are being used, we need extra margin since the vertical scrollbar
      //ends below the data container (on the y plane) because the horizontal and vertical scrollbars intersect
      scrollSpacerMarginBottom += this.systemScrollbarWidth === 0 ? this.scrollBarWidth : 0;

      this.$scrollSpacer.css('margin-bottom', scrollSpacerMarginBottom);

      //size the vertical drop guide for the resizing functionality
      this.$resizer.height(height - this.scrollBarWidth);

      //set globals based on new table dimensions
      this.replaceRowWindow = options.scrollRowWindow; //Math.max(this.displayRowWindow, options.scrollRowWindow);
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
          this._log('warn', '_validateTableData: Invalid row detected', row);
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
      this._scrollToRow(scrollToRow, byIndex);
    },

    /**
     * Scroll the table to the desired row (internal use only)
     * @param {Number}  scrollToRowthe row or row index to scroll the table to
     * @param {Boolean} byIndex        true if scrolling to the row index number rather
     *                                 than the true row number (which may differ if any sub rows are expanded)
     * @param {Boolean} forceTrigger   If true, handle the _trigger call to scroll
     *                                 here rather than in the scroll handler if there are no rows to scroll
     * @param {Event}   scrollEvent    Original event object for the scroll
     */
    _scrollToRow: function(scrollToRow, byIndex, forceTrigger, scrollEvent) {
      var options = this.options,
        tableData = this.renderRowDataSet,
        rowsToScroll;

      if(byIndex && typeof tableData[scrollToRow] !== 'undefined') {
        scrollToRow = this.expandedTableData.indexOf(tableData[scrollToRow]);
      } else if(typeof scrollToRow === 'undefined') {
        scrollToRow = 0;
      }

      this._log('debug', 'scroll to row',scrollToRow);

      rowsToScroll = scrollToRow - this.currentRow;
      if(rowsToScroll !== 0) {
        this.scrollToRowIndex = scrollToRow;
        this.$scrollContainer.scrollTop(this.scrollTop + (rowsToScroll * options.rowHeight));

      } else {
        this._refreshRows();
        //needed when scrolling into the final window and it's discovered that rows aren't all default heights
        if(this.verticalRowSizePid === null && forceTrigger) {
          this._trigger('scroll', scrollEvent);
        }
      }
    },

    /**
     * Scroll the table to the desired column
     * @param  {Number} scrollToColumn The column index (0 offset)
     */
    scrollToColumn: function(scrollToColumn) {
      this._log('debug', 'scroll to column',scrollToColumn);

      var $column = this.$dynamicHeaderRow.find('th:nth-child('+(scrollToColumn + 1)+')'),
        columnOffset = $column.length > 0 ? ~~$column.position().left : 0;

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
      
      //release pointers
      this.searchIndex = [];
      this.$columnControls = null;
      this.$dataContainer = null;
      this.$dataContainerWrapper = null;
      this.$dynamicHeader = null;
      this.$dynamicHeaderRow = null;
      this.$dynamicRowTemplate = null;
      this.$dynamicSummaryRow = null;
      this.$headerWrapper = null;
      this.$removeColumnButton = null;
      this.$resizer = null;
      this.$scrollContainer = null;
      this.$scrollSpacer = null;
      this.$staticDataContainer = null;
      this.$staticHeader = null;
      this.$staticHeaderRow = null;
      this.$staticRowTemplate = null;
      this.$staticSummaryRow = null;
      this.$tableBody = null;

      // In jQuery UI 1.8, you must invoke the destroy method from the base widget
      $.Widget.prototype.destroy.call( this );
      // In jQuery UI 1.9 and above, you would define _destroy instead of destroy and not call the base method
    }
  });
})(jQuery, window, document);
