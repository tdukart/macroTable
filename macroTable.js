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
   * convenience function to clear out the data content and rerender the appropriate rows based on the new scroll position
   * @param startRowIndex {Number} the index into the tableData where the rows should start rendering from (should ALWAYS be smaller than endRowIndex)
   * @param endRowIndex {Number} the index into the tableData where the last row is to be rendered number (should ALWAYS be larger than swtartRowIndex)
   * @param direction {Number} the number of rows the table was scrolled, positive for down, negative for up
   * @returns {Number} the actual number of rows rendered
   */
  function rebuildRows(startRowIndex, endRowIndex, direction) {
    var $tableContentWrapper = this.element.find('div.macro-table-data-container-wrapper'),
      $tableContainer = $tableContentWrapper.find('div.macro-table-data-container'),
      $staticTableContainer = $tableContentWrapper.find('div.macro-table-static-data-container'),

      $tableBody = $tableContainer.find('tbody.macro-table-column-content'),
      $staticTableBody = $staticTableContainer.find('tbody.macro-table-static-column-content'),

      $rows,
      $staticRows,
      renderCount = 0,
      rowData,
      rowElements,
      staticHeight,
      dynamicHeight;

    direction = direction || 0; //default to "no scroll" for complete re-render

    //detach the table from the DOM for impending manipulation ideally, but need to know row heights, so can't...
    $rows = $tableBody.find('tr').remove();
    $staticRows = $staticTableBody.find('tr').remove();

    //append all new rows to the table, since we've exhausted the ones we can reuse already in the DOM
    while(startRowIndex + renderCount != endRowIndex) {
      rowData = this.expandedTableData[startRowIndex + renderCount];

      if(typeof rowData !== 'undefined') {

        rowElements = renderRow.call(this, rowData, (startRowIndex + renderCount));

        //append new rows to table
        $tableBody.append(rowElements.dynamicRow);
        $staticTableBody.append(rowElements.staticRow);

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
    var newLastDomRow,
      distanceFromBottomToNewLastDomRow = 0,
      $macroTable = this.element,
      $tableContainerWrapper = $macroTable.find('div.macro-table-data-container-wrapper'),
      $tableContainer = $tableContainerWrapper.find('div.macro-table-data-container'),
      $tableRows = $tableContainer.find('tbody.macro-table-column-content tr'),
      $tableScrollSpacer = $macroTable.find('div.macro-table-scroll-spacer'),
      $tableScrollWrappers = $tableContainerWrapper.find('div.macro-table-scroll-wrapper'),
      $reorderGuide = $macroTable.find('div.macro-table-reorder-guide'),
      spacerMultiplier = 0,
      tableContainerHeight = $tableContainer.height(),
      tableScrollSpacerMarginAdded = false;

    //loop through rows backwards to find the new, truly last row that will allow the last row to show
    $($tableRows.get().reverse()).each(function(i, element) {
      distanceFromBottomToNewLastDomRow += $(element).height();
      if(distanceFromBottomToNewLastDomRow > tableContainerHeight) {
        distanceFromBottomToNewLastDomRow -= $(element).height();
        newLastDomRow = $tableRows.length - i;

        if(distanceFromBottomToNewLastDomRow / i !== this.options.rowHeight) {
          //this is how many default rows-worth of space needs to be added to the bottom of the scroll spacer in order to scroll the final row into view
          spacerMultiplier = Math.max(0, newLastDomRow - this.options.rowBuffer - this.displayRowWindow);
        }
        return false;
      }
    }.bind(this));

    if($tableScrollSpacer.css('margin-bottom') === '0px' && tableContainerHeight - distanceFromBottomToNewLastDomRow > 0) {
      tableScrollSpacerMarginAdded = true;
    }

    //add calculated margins to allow scrolling to bring last row into view
    $tableScrollSpacer.css('padding-bottom', spacerMultiplier * this.options.rowHeight)
    .css('margin-bottom', tableContainerHeight - distanceFromBottomToNewLastDomRow);
    $tableScrollWrappers.css('padding-bottom', tableContainerHeight - distanceFromBottomToNewLastDomRow);
    $reorderGuide.css('bottom', tableContainerHeight - distanceFromBottomToNewLastDomRow);

    return tableScrollSpacerMarginAdded;
  }

  /**
   * function to handle the table container scrolling
   * will identify the case where a row swap needs to happen and will take care of it as well
   * @param direction {Number} number of rows to scroll (negative for up, positive for down)
   */
  function scrollTableVertical(direction, rerender) {
    var rowBuffer = this.options.rowBuffer,
      reScrollNeeded = false,
      rowNumber = this.currentRow,
      visibleRowCount = this.expandedTableData.length,

      finalDomRowWindow = Math.max(0, visibleRowCount - rowBuffer - rowBuffer - this.displayRowWindow), //the final row window render starts at this row
      isInFinalDomWindow = this.currentRow > finalDomRowWindow,

      $tableContentWrapper = this.element.find('div.macro-table-data-container-wrapper'),
      $tableContainer = $tableContentWrapper.find('div.macro-table-data-container'),

      $staticTableContainer = $tableContentWrapper.find('div.macro-table-static-data-container'),
      $tableBody = $tableContainer.find('tbody.macro-table-column-content'),
      $tableRows = $tableBody.find('tr'),
      newRenderCount = 0; //number of new rows we need to remove and re-add with new values

    //a huge scroll, passed the normal row swap threshold (grab the thumb with the mouse and whip it all the way in one direction)
    if(this.currentDomRow + direction > this.maxTotalDomRows || this.currentDomRow + direction <= 0 || rerender) {

      //final dom window should always render the maxTotalDomRows number of rows
      if(isInFinalDomWindow) {

        rebuildRows.call(this, visibleRowCount < this.maxTotalDomRows ? 0 : visibleRowCount - this.maxTotalDomRows, visibleRowCount);
        this.currentDomRow = visibleRowCount < this.maxTotalDomRows ? rowNumber : this.maxTotalDomRows - (visibleRowCount - rowNumber);
        reScrollNeeded = calculateAndApplyBottomMargin.call(this); //at the bottom, make sure the scroll margins are in place

      //not in final dom window, proceed as normal
      } else {

        var topRowBuffer = rowNumber < rowBuffer ? rowNumber : rowBuffer; //account for when on the first rowBuffer number of rows
        rebuildRows.call(this, rowNumber - topRowBuffer, rowNumber - topRowBuffer + this.maxTotalDomRows);
        this.currentDomRow = topRowBuffer;
      }

      //console.log('re-render',rowNumber,'(DOM row)',currentDomRow);

      $tableRows = $tableBody.find('tr'); //refetch rows, since they've likely changed

    //more normal situations
    } else {

      //scrolling down
      if(direction > 0) {

        this.currentDomRow = Math.min(this.currentDomRow + direction, Math.max(rowBuffer + rowBuffer + this.displayRowWindow, visibleRowCount - this.maxTotalDomRows)); //the DOM row that the table would be at, if a detach weren't about to happen

        //convenience variables to make debugging the logic easier
        var remainingDomRows = $tableRows.filter(':gt('+(this.currentDomRow - 1)+')').length,
          moreRowRenderingNeeded = visibleRowCount - rowNumber > remainingDomRows && remainingDomRows <= this.maxTotalDomRows - rowBuffer - 1;

        //render new rows appropriate to current DOM possition, or if a big jump landed into the final DOM window and need the remaining rows fleshed out
        if(!isInFinalDomWindow || moreRowRenderingNeeded) {

          if(this.currentDomRow >= this.triggerDownDomRow) {

            newRenderCount = this.currentDomRow - rowBuffer;
            if(newRenderCount <= 0) {
              console.warn('newRenderCount should never be less than 1 but it is',newRenderCount,'Probably due to overloaded scroll listener');
            } else {

              this.currentDomRow -= rebuildRows.call(this, rowNumber + this.maxTotalDomRows - this.currentDomRow, rowNumber + this.maxTotalDomRows - this.currentDomRow + newRenderCount, direction);
              //console.log('scrolling down',rowNumber,'(DOM row)',currentDomRow);

              $tableRows = $tableBody.find('tr'); //refetch rows, since they've likely changed
            }
          }

        //in the finalDomRowWindow, add margin to bottom of wrapper to allow scrolling the last row completely into the visible window
        } else {

          reScrollNeeded = calculateAndApplyBottomMargin.call(this);
        }

      //scrolling up
      } else if(direction < 0) {

        this.currentDomRow = Math.max(this.currentDomRow + direction, 0); //the DOM row that the table would be at, if a detach weren't about to happen

        if(this.currentDomRow <= this.triggerUpDomRow && rowNumber > this.replaceRowWindow) {

          newRenderCount = this.maxTotalDomRows - this.currentDomRow - this.displayRowWindow - rowBuffer;
          if(newRenderCount <= 0) {
            console.warn('newRenderCount should never be less than 1 but it is',newRenderCount,'Probably due to overloaded scroll listener');
          } else {

            this.currentDomRow += rebuildRows.call(this, rowNumber - this.currentDomRow - 1 - newRenderCount, rowNumber - this.currentDomRow, direction);
            //console.log('scrolling up',rowNumber,'(DOM row)',currentDomRow);

            $tableRows = $tableBody.find('tr'); //refetch rows, since they've likely changed
          }
        }

      } //scroll up
    } //else

    var scrollTop = $tableRows.length > 0 ? $tableRows.eq(this.currentDomRow).offset().top - $tableBody.offset().top : 0;
    //console.log('current dom row (top visible row)',currentDomRow,'currentRow',currentRow,'row index',expandedTableData[currentRow],'from top',scrollTop);
    $tableContainer.scrollTop(scrollTop);
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
    var $tableContainer = $('div.macro-table-data-container', this.element),
      dataContainerScrollLeft = $tableContainer.scrollLeft(),
      scrollContainerScrollLeft = $('div.macro-table-scroll-container', this.element).scrollLeft(),
      $domColumns = $('div.macro-table-header th', this.element),
      $currrentColumn = $domColumns.eq(this.currentColumn),
      columnIterator = -1,
      endColumn;

    //scroll right
    if(scrollContainerScrollLeft > dataContainerScrollLeft &&
        scrollContainerScrollLeft >= dataContainerScrollLeft + $currrentColumn.outerWidth()) {
      columnIterator = this.currentColumn + 1;
      endColumn = $domColumns.length;

    //scroll left
    } else if(scrollContainerScrollLeft < dataContainerScrollLeft &&
        scrollContainerScrollLeft <= dataContainerScrollLeft + $currrentColumn.outerWidth()) {
      columnIterator = this.currentColumn;
      endColumn = -1;
    } else {
      //console.log('no scroll left needed');
      return; //no scroll necessary
    }

    //loop through columns, searching for the offset range
    while(columnIterator != endColumn) {

      var $newColumn = $domColumns.eq(columnIterator),
        newColumnScrollLeft = $newColumn.position().left + dataContainerScrollLeft;

      if(scrollContainerScrollLeft >= newColumnScrollLeft &&
          scrollContainerScrollLeft < newColumnScrollLeft + $newColumn.outerWidth()) {

        this.currentColumn = columnIterator;
        $tableContainer.scrollLeft(newColumnScrollLeft);
        this.element.find('div.macro-table-header').scrollLeft(newColumnScrollLeft);
        break;

      }

      columnIterator += (scrollContainerScrollLeft > dataContainerScrollLeft ? 1 : -1);

    }
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
      expanderCellClass = '',
      dynamicRowColumns = '',
      staticRowColumns = '',
      $dynamicRow = $(document.createElement('tr')).attr('data-row-index', index),
      $staticRow = $(document.createElement('tr')).attr('data-row-index', index),
      rowData, indexHierachy, tableDataSubRows, i, len;

    //give even rows a stripe color
    if(index % 2 === 0) {
      $dynamicRow.addClass('macro-table-row-stripe');
      $staticRow.addClass('macro-table-row-stripe');
    }

    $dynamicRow.addClass('macro-table-row macro-table-row-'+index);
    $staticRow.addClass('macro-table-row macro-table-row'+index);

    //if selecting rows is enabled and this row has already been selected, style appropriately
    if(isRowsSelectable && row.selected) {
      $dynamicRow.addClass('macro-table-highlight macro-table-selected-row');
      $staticRow.addClass('macro-table-highlight  macro-table-selected-row');
    }

    if(row.focused) {
      $dynamicRow.addClass('macro-table-row-focused');
      $staticRow.addClass('macro-table-row-focused');
    }

    if(row.expanded === true) {
      $dynamicRow.addClass('macro-table-row-expanded');
      $staticRow.addClass('macro-table-row-expanded');
    } else {
      $dynamicRow.addClass('macro-table-row-collapsed');
      $staticRow.addClass('macro-table-row-collapsed');
    }

    //build dynamically left-scrollable row
    for(i = 0, len = columns.length; i < len; i++) {
      var columnContent = row.data[columns[i].field],
        $columnContentContainer = $(document.createElement('span')).addClass('macro-table-cell-content');
      columnContent = typeof columnContent === 'undefined' ? '' : columnContent;

      //we want to pass the wrapper of the cell content to the formatter function in case a user wants to mess with it
      if(typeof columns[i].onCellClick === 'function') {
        $columnContentContainer.addClass('macro-table-cell-clickable');
      }
      if(typeof columns[i].formatter === 'function') {
        columnContent = columns[i].formatter(columnContent, row, $columnContentContainer);
      }

      //we need the markup from the $ object because we don't put together all the rows/cells until the end
      $columnContentContainer.html(columnContent);
      columnContent = $(document.createElement('div')).append($columnContentContainer).html();
      $columnContentContainer = null;

      dynamicRowColumns += '<td'+(columns[i].resizable !== false ? ' class="macro-table-column-resizable"' : '')+' data-column-index="'+i+'">'+columnContent+'</td>';
    }

    //build static row
    if(isRowsSelectable) {
      staticRowColumns += '<td><input type="checkbox" class="macro-table-checkbox macro-table-row-selector" data-row-index="'+index+'" '+(row.selected === true ? 'checked="checked"' : '')+'/></td>';
    }

    //build row expand column
    if(rowHasChildren && row.expanded) {
      expanderCellClass = 'macro-table-subrow-hierarchy-vertical-line-bottom-half';
    } else if(row.index.toString().indexOf(',') !== -1) {
      expanderCellClass = 'macro-table-subrow-hierarchy-line-right '; //TODO: macro-table-subrow-hierarchy-line-right should be conditionally removed for subRows of subRows

      indexHierachy = row.index.split(',');
      tableDataSubRows = this.options.tableData;

      //loop through entire subRows hierarchy and stop 1 level above "row"
      for(i = 0, len = indexHierachy.length - 1; i < len; i++) {
        tableDataSubRows = tableDataSubRows[indexHierachy[i]].subRows;
      }

      if(tableDataSubRows.length - 1 > indexHierachy[i]) { //FIXME: this will break for a subRow of a subRow, because we're looking directly at tableData (which is only top level rows)
        expanderCellClass += 'macro-table-subrow-hierarchy-vertical-line-full';
      } else {
        expanderCellClass += 'macro-table-subrow-hierarchy-vertical-line-top-half';
      }
    }

    var timestamp = +new Date();
    staticRowColumns += '<td class="macro-table-row-expander-cell' + (expanderCellClass !== '' ? ' '+expanderCellClass : '') + '">' +
      '<div class="macro-table-expand-toggle-container">' +
        (rowHasChildren ?
            '<input type="checkbox" id="macro-table-row-expander-'+timestamp+'" class="macro-table-checkbox macro-table-row-expander" data-row-index="'+index+'" '+(row.expanded === true ? 'checked="checked"' : '')+'/>' +
            '<label for="macro-table-row-expander-'+timestamp+'" class="macro-table-row-expander-label"></label>' : ''
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
   * Loop through defined columns and verify the proposed sort by column exists
   * @param columnField {String} field name of column to potentially sort by
   * @return the index of the column if it is sortable, -1 otherwise
   */
  function validateSortByColumn(columnField) {
    var columns = this.options.columns;

    if(columnField === '') {
      return -1;
    }

    for(var i = columns.length - 1; i >= 0; i--) {

      if(columns[i].field == columnField && columns[i].sortable) {
        return i;
      }
    }

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
   */
  function workerSortRow(columnData, $columnHeader, callback) {
    var self = this,
      options = this.options,
      $veil = $('div.macro-table-data-veil', this.element),
      columnSorter, sortWorker, action;

    $veil.show();

    sortWorker = new Worker('macroTableSort.js');

    sortWorker.onerror = (function(e) {
      sortWorker.terminate();
      this.renderRowDataSet = options.tableData;

      if(typeof callback === 'function') {
        callback.bind(this)();
      }

      this._renderTableRows(this.renderRowDataSet);

      $veil.hide();
      console.error('Error sorting column.');
    }).bind(this);

    sortWorker.onmessage = (function(e) {
      this.sortedRows[options.sortByColumn][''] = e.data;

      this.renderRowDataSet = postSortFilter.bind(this)(e.data, action, callback); //potentially changes self.renderRowDataSet if there is a filter active!

      if(typeof self.renderRowDataSet !== 'undefined') {
        this._renderTableRows(this.renderRowDataSet);

        $veil.hide();
      }

      $columnHeader.removeClass('macro-table-sort-loading')
      .addClass(columnData.direction > 0 ? 'macro-table-sort-ascending' : 'macro-table-sort-descending');

      sortWorker.terminate();
      //console.log('sorted data',e.data);
    }).bind(this);

    if(typeof this.sortedRows[options.sortByColumn] === 'undefined') {
      this.sortedRows[options.sortByColumn] = {};
    }

    //the current data structure for the table data sorted by this column.
    //if it is undefined, it means the table has not yet been sorted by this column. if defined, it should
    //simply be reversed (no need to full sort again, we're just changing direction of the sort)
    this.renderRowDataSet = this.sortedRows[options.sortByColumn][''];

    //initialize the ordered tableData to use
    if(typeof this.renderRowDataSet === 'undefined') {

      //console.log('pre-sorted data',options.tableData);

      if(typeof columnData.sortable === 'function') {
        columnSorter = columnData.sortable.toString();
      }

      action = 'sort';

      sortWorker.postMessage({
        action: action,
        tableData: options.tableData,
        sortByField: options.sortByColumn,
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
   * @param {Array} renderRowDataSet Original data set to be filtered and indexed
   * @return {Array} The filtered renderRowDataSet array, should be set to this.renderRowDataSet
   */
  function postSortFilter(renderRowDataSet, sortAction, callback) {
    var options = this.options;

    if(renderRowDataSet.length !== 0 && this.searchIndex.length === 0) {
      //called whenever the first rendering of a new dataset occurs
      (buildSearchIndex.bind(this))(renderRowDataSet);
    }

    if(options.filterTerm !== '') {
      renderRowDataSet = this.sortedRows[options.sortByColumn][options.filterTerm];
      if(typeof renderRowDataSet === 'undefined') {
        workerFilterTableData.bind(this)(callback);
        return;
      } else if(sortAction === 'order') {
        renderRowDataSet = this.sortedRows[options.sortByColumn][options.filterTerm] = this.sortedRows[options.sortByColumn][options.filterTerm].reverse();
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
      rowData, i, j, rowsLength, columnsLength;

    for(i = 0, rowsLength = tableData.length; i < rowsLength; i++) {
      rowData = [];

      for(j = 0, columnsLength = columns.length; j < columnsLength; j++) {
        if(typeof tableData[i].data !== 'undefined') {
          rowData.push(tableData[i].data[columns[j].field]);
        }
      }

      this.searchIndex.push({
        index: tableData[i].index,
        data: tableData[i],
        values: rowData
      });

      if(typeof tableData[i].subRows !== 'undefined') {
        (buildSearchIndex.bind(this))(tableData[i].subRows);
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
    var options, rowData, i;

    if(action === 'add') {
      options = this.options;
      this.searchIndex = [];
      (buildSearchIndex.bind(this))(this.sortedRows[options.sortByColumn][options.filterTerm]);

    } else {

      for(i = this.searchIndex.length - 1; i >= 0; i--) {
        rowData = this.searchIndex[i].values;
        switch(action) {
          case 'move':
            //move the fromIndex value to the toIndex index
            Array.prototype.splice.apply(rowData, [toIndex, 0].concat(rowData.splice(fromIndex, 1)));
            break;

          case 'delete':
            rowData.splice(fromIndex, 1);
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
      filterWorker;

    $veil.show(); //probably already shown from workerSortRow

    filterWorker = new Worker('macroTableFilter.js'),

    filterWorker.onerror = (function(e) {
      filterWorker.terminate();
      options.filterTerm = '';
      this.renderRowDataSet = tableData;

      if(typeof callback === 'function') {
        callback.bind(this)();
      }

      this._renderTableRows(this.renderRowDataSet);
      $veil.hide();
      console.error('Error filtering rows.');
    }).bind(this);

    filterWorker.onmessage = (function(e) {
      this.renderRowDataSet = this.sortedRows[options.sortByColumn][options.filterTerm] = e.data;

      if(typeof callback === 'function') {
        callback.bind(this)();
      }

      this._renderTableRows(this.renderRowDataSet);

      $veil.hide();

      filterWorker.terminate();
    }).bind(this);

    filterWorker.postMessage({
      filter: options.filterTerm,
      searchIndex: this.searchIndex,
      tableData: tableData
    });
  }


  $.widget('n.macroTable', {

    /**
     * The prefix to use for events.
     * @property widgetEventPrefix
     * @type String
     */
    widgetEventPrefix: 'macroTable',

    /**
     * the static width of the checkbox column for selecting rows
     * @type {Number}
     */
    rowSelectColumnWidth: 16,

    /**
     * the static width of the expand/collapse sub rows column
     * @type {Number}
     */
    expanderColumnWidth: 16,

    /**
     * Width of scrollbars if the browser supports styling
     * @type {Number}
     */
    styledScrollbarWidth: 12,

    /**
     * Width of scrollbars if the brwoser does not support styling
     * @type {Number}
     */
    unStyledScrollbarWidth: 16,

    /**
     * The actual scrollbar widths
     * @type {Number}
     */
    scrollBarWidth: null,

    /**
     * Min width a column can be resized
     * @type {Number}
     */
    resizeColumnMinWidth: 30,

    /**
     * the max number of rows that will show in the provided table height
     * @type {Number}
     */
    displayRowWindow: 0,

    /**
     * when a DOM row swap is triggered, this many rows will be removed and replaced at the other end of the table
     * @type {Number}
     */
    replaceRowWindow: 0,

    /**
     * Limit of number of columns to display in the DOM
     * TODO: not implemented, currently allowing any number of columns to show
     * @type {Number}
     */
    maxTotalDomColumns: Infinity,

    /**
     * 0-indexed, describes the left-most, visible data column (direct correlation with array index). default to first column
     * @type {Number}
     */
    currentColumn: 0,

    /**
     * 0-indexed, describes the left-most, visible DOM column. default to first column
     * TODO: this currently is not used, see definition for maxTotalDomColumns
     * @type {Number}
     */
    currentDomColumn: 0,

    //processedColumns: [], //once columns processed from options.columns, the elements and real widths go in here

    /**
     * real DOM row count would only be less than this if the amount of data is less than this number (don't need the extra DOM rows to display total data)
     * @type {Number}
     */
    maxTotalDomRows: 0,

    /**
     * Scroll position top of the table. default to top of table
     * @type {Number}
     */
    scrollTop: 0,

    /**
     * Scroll position left of the table. default to left edge of table
     * @type {Number}
     */
    scrollLeft: 0,

    /**
     * 0-indexed, describes the top-most, visible data row (direct correlation with array index). default to first row
     * @type {Number}
     */
    currentRow: 0,

    /**
     * 0-indexed, describes the top-most, visible DOM row. default to first row
     * @type {Number}
     */
    currentDomRow: 0,

    /**
     * when scrolling up, when on this DOM row, a row swap will trigger
     * @type {Number}
     */
    triggerUpDomRow: 0,

    /**
     * when scrolling down, when on this DOM row, a row swap will trigger
     * @type {Number}
     */
    triggerDownDomRow: 0,

    /**
     * counter to keep track of selected rows, used to optimize selecting behavior comparing currently selected to length of total rows
     * @type {Number}
     */
    selectedRowCount: 0,

    /**
     * counter to keep track of expanded rows, used to optimize selecting behavior comparing currently selected to length of total rows
     * @type {Number}
     */
    expandedRowCount: 0,

    /**
     * counter for the total number of rows that can be expanded
     * @type {Number}
     */
    rowsWithChildrenCount: 0,

    /**
     * Array matching the length of renderRowDataSet. Each index contains an array of values,
     * each index directly corresponding to the visibile columns in their current order.
     *
     * This array is used to quickly perform text searches in rows
     * @type {Array}
     */
    searchIndex: [],

    /**
     * object of sorted combinations of the table data, key 'default' contains the data ordered as it was initialized
     * @type {Object}
     */
    sortedRows: null,

    /**
     * data structure directly translating to the rows that are displayed in the table (flat, rather than hierarchical)
     * @type {Array}
     */
    expandedTableData: [],

    /**
     * keep track of the rows that are expanded for the onRowExpand callback
     * @type {Array}
     */
    expandedRowIndexes: [],

    /**
     * Current dataset the table will use to render its rows
     * @type {Array}
     */
    renderRowDataSet: [],

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
    scrollToRowIndex: null,

    /** Subscribable events */

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

    options: {
      height: undefined, //default height of table, if not defined will fit to parent
      width: undefined, //defailt width of table, if not defined will fit to parent
      rowBuffer: 5, //the max number of DOM rows that can be above and below the displaying row window
      /**
       * Array of objects whose order directly correlates to the display order of columns
       * Column object has the following fields:
       * @field title {String} the name to display for the column
       * @field field {String} the field name in the data object that will correlate with this column
       * @field formatter {Function} (optional) formats the provided data to be displayed in a row's column
       * @field className {String} (optional) class to be added to the column title element
       * @field resizable {Boolean} allow column to be resized. default true
       * @field sortable {Boolean/Function} if true allow column to be sorted via .sort() on a row's column value,
       *    if a function, the column will be sorted using .sort() with this function passed as a parameter. default true
       */
      columns: [],
      defaultColumnWidth: 100,
      /**
       * Allow the columns to be re-ordered via drag and drop
       */
      reorderable: true,
      /**
       * Single row data structure for displaying in the summary row section
       */
      summaryRow: false,
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
      filterTerm: '',
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
      // In jQuery UI 1.8, you have to manually invoke the _setOption method from the base widget
      $.Widget.prototype._setOption.apply( this, arguments );
      // In jQuery UI 1.9 and above, you use the _super method instead
      //this._super( "_setOption", key, value );

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

        case 'rowBuffer':
          break;

        case 'disabled':
          break;

        case 'columns':
          this.searchIndex = []; //reset search index
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

        case 'tableData':
          this.renderRowDataSet = [];
          this.searchIndex = []; //reset search index
          this.sortedRows = null; //let _init reinitialize this
          options.sortByColumn = '';
          //TODO call function here that will reset the column arrows indicating the sort order
        case 'filterTerm':
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

      var $scroll = $macroTable.find('div.macro-table-scroll-container'),
        $dataContainer = $macroTable.find('div.macro-table-data-container'),
        $staticDataContainer = $macroTable.find('div.macro-table-static-data-container'),
        $resizer = $macroTable.find('div.macro-table-resize-guide'),
        $reorderHandle = $macroTable.find('div.macro-table-reorder-handle'),
        $removeColumn = $macroTable.find('button.macro-table-remove-column'),
        $reorderGuide = $macroTable.find('div.macro-table-reorder-guide'),
        $headerWrapper = $macroTable.find('div.macro-table-header'),
        $header = $headerWrapper.find('table'),
        $dynamicTableBody = $macroTable.find('tbody.macro-table-column-content'),
        $staticHeaderRow = $macroTable.find('div.macro-table-static-header tr.macro-table-static-header-row'),
        $staticTableBody = $macroTable.find('tbody.macro-table-static-column-content'),
        $columnToResize;

      //shortcut function to remove styling for when hovering over the resizer handle
      function deselectResizeHandle() {
        if(typeof $columnToResize !== 'undefined') {
          $columnToResize.removeClass('macro-table-column-resize');
          $columnToResize = undefined;
        }
        $resizer.removeClass('macro-table-highlight');
      }

      //shortcut function for handling data structure changes when expanding or collapsing a row
      function handleRowExpandToggle(index, isExpanded) {
        var $selectAllHeaderCheckbox = $staticHeaderRow.find('input.macro-table-select-toggle');

        self.expandedTableData[index].expanded = !!isExpanded;

        if(isExpanded) {
          self.expandedRowCount++;
          //apply + concat the subRows to remove to the argument array provides one-line solution to an otherwise loop-related solution
          Array.prototype.splice.apply(self.expandedTableData, [index + 1, 0].concat(self.expandedTableData[index].subRows));

          //newly expanded rows are never selected, so if the select all header checkbox is checked, put it into indeterminate state
          if($selectAllHeaderCheckbox.attr('checked')) {
            $selectAllHeaderCheckbox.attr('checked', false); //click the box again and it will select the newly expanded rows
            $selectAllHeaderCheckbox[0].indeterminate = true;
          }

        } else {
          self.expandedRowCount--;
          var removedRows = self.expandedTableData.splice(index + 1, self.expandedTableData[index].subRows.length);

          //clean up selected count from removed rows
          for(var i = 0, len = removedRows.length; i < len; i++) {
            if(removedRows[i].selected) {
              removedRows[i].selected = false;
              self.selectedRowCount--;
            }
          }

          //by hiding the sub rows, all remaining rows are selected, so make select toggle checkbox reflect that
          if(self.selectedRowCount == self.expandedTableData.length) {
            $selectAllHeaderCheckbox.attr('checked', true); //click the box again and it will deselect all rows
            $selectAllHeaderCheckbox[0].indeterminate = false;
          }
        }
      }

      /* Wire column header events */

      var columnMouseoverPid;
      $header.delegate('tr.macro-table-header-row th', 'mouseover', function(e) {
        var $columnHeader = $(this);

        /* Handle reorder columns functionality */
        if(self.options.reorderable === true) {

          /* position reorder handle */

          $header.find('th.macro-table-header-active-cell').removeClass('macro-table-header-active-cell');

          if($columnHeader.hasClass('macro-table-column-reorderable')) {

            clearTimeout(columnMouseoverPid);

            $headerWrapper.addClass('macro-table-header-active');
            $columnHeader.addClass('macro-table-header-active-cell');
            $reorderHandle.css({
              top: (($columnHeader.height() - $reorderHandle.height()) / 2) + 'px',
              left: $headerWrapper.scrollLeft() + $columnHeader.position().left + 2 + 'px'
            });
            $removeColumn.css({
              top: (($columnHeader.height() - $removeColumn.height()) / 2) + 'px',
              left: $headerWrapper.scrollLeft() + $columnHeader.position().left + $columnHeader.outerWidth() - $removeColumn.width() + (-2) + 'px'
            });
          } else {
            $headerWrapper.removeClass('macro-table-header-active');
          }

        }
      })

      //provide delay to hiding of reorder handle when mouseout'ing of header cell
      .delegate('tr.macro-table-header-row th', 'mouseout', function(e) {
        if($(e.relatedTarget).closest('div.macro-table-column-controls').length === 0) {
        //if(!$(e.relatedTarget).hasClass('macro-table-reorder-handle')) { //don't deselect column if hovering over the reorder handle
          columnMouseoverPid = setTimeout(function() {
            $headerWrapper.removeClass('macro-table-header-active');
            $(e.target).removeClass('macro-table-header-active-cell');
          }, 500);
        }
      });
      //$header.delegate('th.macro-table-column-sortable', 'click', function(e) {


      /* Wire column sort events */

      //row sorting listener
      $header.delegate('th.macro-table-column-sortable', 'click', function(e) {
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
        $dataContainer.find('tr.macro-table-row-focused').removeClass('macro-table-row-focused');

        if(!isRowUnFocusing) {
          $rows.addClass('macro-table-row-focused');
          self.expandedTableData[dataRowIndex].focused = true;
        }

        self.element.trigger('rowfocus', dataRowIndex, self.expandedTableData[dataRowIndex]);
      }

      //rows in the static container
      $staticDataContainer.delegate('tr', 'click', function(e) {
        //we don't want to focus the row when trying to expand or select (TODO: or do we?)
        if(!$(e.target).is('label, input')) {

          var $staticRow = $(this),
            $rows = $staticRow.add(
              $dataContainer.find('tr').eq($staticRow.index())
            );

          toggleRowFocus($rows);
        }
      });

      //rows in the dynamic container
      $dataContainer.delegate('tr', 'click', function(e) {
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
      $staticHeaderRow.delegate('input.macro-table-checkbox', 'click', function(e) {
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
            $checkboxes.attr('checked', true);
            $tableRows.addClass('macro-table-highlight macro-table-selected-row');
            self.selectedRowCount = self.expandedTableData.length;

          //header checkbox deselected
          } else {

            isToggled = false;
            $checkboxes.attr('checked', false);
            $tableRows.removeClass('macro-table-highlight macro-table-selected-row');
            self.selectedRowCount = 0;
          }

          //set the row data structure to the appropriate selected state
          for(var i = 0, len = self.expandedTableData.length; i < len; i++) {
            self.expandedTableData[i].selected = isToggled;
          }

        //expand/collapse all rows
        } else if($checkbox.hasClass('macro-table-expand-toggle')) {
          $checkboxes = $staticTableBody.find('input.macro-table-row-expander');

          //header checkbox selected or indeterminate (rows have already been individually selected)
          if(this.indeterminate === true || $checkbox.is(':checked')) {

            isToggled = true;
            $checkboxes.attr('checked', true);

          //header checkbox deselected
          } else {

            isToggled = false;
            $checkboxes.attr('checked', false);
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
              self.element.trigger('rowexpand', self.expandedRowIndexes);
            }, 0);
          }, 0);
        }
      });

      //wire row select and row expand checkbox event behavior
      $staticDataContainer.delegate('input.macro-table-checkbox', 'click', function(e) {
        e.stopPropagation(); //prevent a delegation to the tr which triggers a focus row event

        var $checkbox = $(this),
          $selectAllHeaderCheckbox = $staticHeaderRow.find('input.macro-table-select-toggle'),
          $expandAllHeaderCheckbox = $staticHeaderRow.find('input.macro-table-expand-toggle'),
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
          } else {
            $checkboxRow.removeClass('macro-table-highlight macro-table-selected-row');
            $dataRow.removeClass('macro-table-highlight macro-table-selected-row');
            self.expandedTableData[dataRowIndex].selected = false;
            self.selectedRowCount--;
          }

          //set header checkbox state
          if(self.selectedRowCount === 0) { //no rows selected

            $selectAllHeaderCheckbox.attr('checked', false);
            $selectAllHeaderCheckbox[0].indeterminate = false;

          } else if(self.selectedRowCount == self.expandedTableData.length) { //all rows selected

            $selectAllHeaderCheckbox.attr('checked', true);
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

            $expandAllHeaderCheckbox.attr('checked', false);
            //$expandAllHeaderCheckbox[0].indeterminate = false;

          } else if(self.expandedRowCount == self.rowsWithChildrenCount) { //all expandable rows expanded

            $expandAllHeaderCheckbox.attr('checked', true);
            //$expandAllHeaderCheckbox[0].indeterminate = false;

          } //else { //at least one row expanded, but not all

            //$expandAllHeaderCheckbox[0].indeterminate = true;
          //}

          $macroTable.find('div.macro-table-scroll-spacer')
          .height(rowHeight * self.expandedTableData.length);

          self.element.trigger('rowexpand', self.expandedRowIndexes.sort());
        }
      });


      /* Wire resize column events */

      //helper function to return the width to resize a column to based on current cursor position
      function calculateReiszeColumnWidth(cursorPosition, $columnToResize) {
        var cursorOffset = cursorPosition - $macroTable.offset().left;

        //console.log('calculateReiszeColumnWidth:', $macroTable.outerWidth() - scrollBarWidth - $resizer.outerWidth(), cursorOffset, $columnToResize.offset().left + resizeColumnMinWidth);

        return Math.max(
          Math.min(
            $macroTable.outerWidth() - self.scrollBarWidth - $resizer.outerWidth(), //max left position
            cursorOffset //current cursor position
          ),
          $columnToResize.offset().left + self.resizeColumnMinWidth //min resize position
        );
      }

      //mousedown for the resizer, used when resizing columns
      var resizePositionStart;
      $resizer.bind('mousedown', function(e) {
        if(typeof resizePositionStart === 'undefined') { //prevent multiple mousedowns (if you mousedown, move cursor off of table, then move back and click)
          resizePositionStart = $resizer.position().left;

          //the resizer has been grabbed, attach listeners to the container to allow it to move around

          $resizer.addClass('macro-table-active');
          self.element.addClass('macro-table-resizing')
          .bind('mouseup', function resizeMouseup(e) {
            //the handle has been dragged around and has now been let go
            e.stopPropagation();

            var $columnToResize = $macroTable.find('.macro-table-column-resize'),
              $columnContainers = $macroTable.find('colgroup.macro-table-column-sizer'), //finds the header and content sizers (2 elements)
              $columns = $columnContainers.filter(':first').find('col'),
              columnNumber = $columnToResize.index(),
              $columnSizers = $columnContainers.find('col:nth-child('+(columnNumber + 1)+')'),
              widthDelta = $resizer.position().left - resizePositionStart,
              marginAdded = 0,
              totalColumnWidth = 0,
              tableViewportWidth = self._getFallbackWidthToResize() - self.scrollBarWidth,
              newWidth = $columnSizers.width() + widthDelta,
              $dynamicRows =  $dataContainer.find('tr'),
              $staticRows = $staticDataContainer.find('tr'),
              i;

            //clean up the mousemove and mouseup events on the container
            self.element.unbind('mouseup', resizeMouseup) //don't want to unbind the reorder mouseup event
            .removeClass('macro-table-resizing');

            //calculate how much the column should be resized, and resize the columns
            $columnSizers.width(newWidth);
            self.options.columns[columnNumber].width = newWidth; //set so subsequent table rerenders keeps the width

            //TODO reconcile all the static row heights to match the possibly new heights of dynamic rows after this resize
            self._refreshRows();
            /*for(i = $dynamicRows.length; i >= 1; i--) {

              staticHeight = $staticRows.filter(':nth-child('+i+')').css('height','auto').height();
              dynamicHeight = $dynamicRows.filter(':nth-child('+i+')').css('height','auto').height();

              if(staticHeight > dynamicHeight) {

                $dynamicRows.filter(':nth-child('+i+')').height(staticHeight);

              } else if(staticHeight < dynamicHeight) {

                $staticRows.filter(':nth-child('+i+')').height(dynamicHeight);
              }
            }*/

            //calculate the needed margin to add to the right for whole column scrolling
            for(i = $columns.length - 1; i >= 0; i--) {

              var columnWidth = $columns.eq(i).outerWidth();
              totalColumnWidth += columnWidth;

              if(totalColumnWidth > tableViewportWidth) {

                marginAdded = tableViewportWidth - (totalColumnWidth - columnWidth);
                break;
              }
            }

            //now resize the wrapper and scroller to allow for any changes to the column offset
            //for the last columns when scrolling all the way right
            var newTotalColumnWidth = $macroTable.find('div.macro-table-header table').outerWidth();

            $dataContainer.find('div.macro-table-scroll-wrapper')
            .width(newTotalColumnWidth + marginAdded);

            $macroTable.find('div.macro-table-header div.macro-table-scroll-wrapper')
            .width(newTotalColumnWidth + marginAdded + self.scrollBarWidth);

            $macroTable.find('div.macro-table-scroll-spacer')
            .width(newTotalColumnWidth + marginAdded);


            //cleanup the resizer element
            $resizer.removeClass('macro-table-highlight macro-table-active');

            resizePositionStart = undefined;

            self.element.trigger('columnresize', columnNumber, newWidth);
          }); //mouseup
        } //if(typeof resizePositionStart === 'undefined')
      });

      /* Remove column event */

      $removeColumn.bind('click', function(e) {
        e.preventDefault();

        var columnToRemoveIndex = $header.find('th.macro-table-header-active-cell').filter(':first').index();

        self._removeColumn(columnToRemoveIndex);
      });


      /* Wire column reorder events */

      //mousedown, mouseup on the column headers, used for column ordering
      var columnGrabOffset;
      $reorderHandle.bind('mousedown', function(e) {
        e.preventDefault();

        if(e.which == 1) { //left click only

          var $selectedColumn = $header.find('th.macro-table-header-active-cell'),
            thumbPosition = ($selectedColumn.offset().left - $macroTable.offset().left) - //relative start position to macroTable container
                            Math.ceil($resizer.outerWidth() / 2); //end position of the cell with resize guide compensation

          //trigger reordering mode
          $macroTable.addClass('macro-table-column-moving');

          columnGrabOffset = e.pageX - $selectedColumn.offset().left;

          $reorderGuide.width($selectedColumn.outerWidth())
          .css('left', $dataContainer.scrollLeft() + $selectedColumn.position().left);

          $resizer.css('left', thumbPosition + 'px');

          $macroTable.find('colgroup.macro-table-column-sizer col').filter(':nth-child('+($selectedColumn.index() + 1)+')')
          .addClass('macro-table-selected-column');

          console.log('offset column',$selectedColumn.offset().left,'position column',$selectedColumn.position().left,'resizer',$dataContainer.scrollLeft() + $selectedColumn.position().left - ($resizer.outerWidth() / 2));
        }
      });


      //mousemove event on the table root element, handling movement for column reordering and column resizing
      var lastPageX, //allow reorder guide to follow cursor without changing it's relative position from where it started
        scrollColumnTimer;
      $macroTable.bind('mousemove', function(e) {
        var $element = $(e.target).closest('th, td'),
          resizerWidth = $resizer.outerWidth(),
          cursorOffset = e.pageX - $macroTable.offset().left,
          cursorCellOffset;

        if($element.length === 0) {
          return;
        }

        /* process enabling/disabling the resize handle when hovering */

        if(!$macroTable.hasClass('macro-table-resizing') && !$macroTable.hasClass('macro-table-column-moving')) {

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
                $resizer.addClass('macro-table-highlight')
                .css('left', thumbPosition);

              } else {

                deselectResizeHandle();

              }
            }

          } else if(!$element.hasClass('macro-table-resize-guide')) {

            deselectResizeHandle();

          }
        //the handle is grabbed and being dragged around
        } else if($macroTable.hasClass('macro-table-resizing')) {
          e.stopPropagation();

          //reposition the resizer, do it out of the thread for performance improvements
          setTimeout(function() {
            $resizer.css('left', calculateReiszeColumnWidth(e.pageX, $columnToResize) + 'px');
          }, 0);


        /* process reordering columns */

        } else if($macroTable.hasClass('macro-table-column-moving')) {
          e.stopPropagation();

          //reposition the reorder guide, do it out of the thread for performance improvements
          setTimeout(function setReorderGuidePosition() {
            var scrollOffset = $dataContainer.scrollLeft(),
              cursorDataContainerOffset = lastPageX - $dataContainer.offset().left,
              dataContainerOffset = $dataContainer.position().left,
              reorderGuidePosition = $reorderGuide.position().left,
              maxReorderGuidePosition = $header.outerWidth() - $header.find('th:last').outerWidth(),
              selectedColumnIndex = $macroTable.find('col.macro-table-selected-column').first().index(),
              newIndex,
              $newColumn;

            $visibleColumns = $header.find('th'); //TODO: filter more intelligently (only look at columns visible in window)
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
              isScrollingRight = newColumnPosition + newColumnWidth > $dataContainer.outerWidth(),
              isScrollingLeft = newColumnPosition - dataContainerOffset === 0 && scrollOffset !== 0;

            if((isScrollingLeft || isScrollingRight) && $macroTable.hasClass('macro-table-column-moving')) {
              if(typeof scrollColumnTimer === 'undefined') {
                scrollColumnTimer = setTimeout(function() {
                  var currenColumnWidth = $header.find('col').eq(self.currentColumn).outerWidth();
                  scrollColumnTimer = undefined;

                  $scroll.scrollLeft(
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
            $resizer.css('left', (
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

            newIndex = $header.find('col.macro-table-target-column')
            .removeClass('macro-table-target-column').index();

            if(columnToReorderIndex != newIndex && newIndex >= 0) {
              self._moveColumn(columnToReorderIndex, newIndex);
            }

            $macroTable.removeClass('macro-table-column-moving');
          }
        }

        $headerWrapper.removeClass('macro-table-header-active');
      });


      /* Wire table scrolling events */

      //mousewheel for table scrolling, wrapper for scrolling the scroll container, attached to .macro-table-data-container-wrapper
      //$dataContainer.parent()
      $macroTable.add($macroTable.find('div.macro-table-data-veil'))
      .bind('mousewheel', function(e, delta, deltaX, deltaY) {
        e.preventDefault();
        if(deltaY < 0) {
          $scroll.scrollTop(self.scrollTop + rowHeight);
        } else if(deltaY > 0) {
          $scroll.scrollTop(self.scrollTop - rowHeight);
        }

        if(deltaX !== 0) {
          var $domColumns = $header.find('th'),
            offset = $domColumns.length !== 0 ? Math.abs($domColumns.eq(0).position().left) : 0;

          if(deltaX < 0 && self.currentColumn > 0) {
            var lastOffset = Math.abs($domColumns.eq(self.currentColumn - 1).position().left);
            console.log('left scroll',offset-lastOffset,'lastOffset',lastOffset,'offset',offset,'currentColumn',self.currentColumn);
            $scroll.scrollLeft(offset - lastOffset);
          } else if(deltaX > 0 && self.currentColumn < $domColumns.length - 1) {
            var nextOffset = Math.abs($domColumns.eq(self.currentColumn + 1).position().left);
            console.log('right scroll',offset-nextOffset,'nextOffset',nextOffset,'offset',offset,'currentColumn',self.currentColumn);
            $scroll.scrollLeft(offset + nextOffset);
          }
        }
        //console.log('Mousewheel .macro-table-data-container', scrollTop, rowHeight,$scroll);
      });

      //scroll function for the scroll container, using the scrollbars
      $scroll.scroll(function(e) {
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

      //validate sortByColumn
      if(validateSortByColumn.call(this, options.sortByColumn) < 0) {
        options.sortByColumn = '';
      }

      this.scrollTop = 0;
      this.currentRow = 0;
      this.currentDomRow = 0;
      this.currentColumn = 0;
      this.currentDomColumn = 0;
      this.selectedRowCount = 0;
      this.expandedRowCount = 0;

      //sortedRows' keys go by column, then filterTerm
      if(this.sortedRows === null) {
        this.sortedRows = {
          '': {
            '': isTableDataValid ? options.tableData : []
          }
        };
      }

      if(isTableDataValid && options.tableData.length !== 0 && this.renderRowDataSet.length === 0) {
        this.renderRowDataSet = options.tableData;
      }

      this.element.find('div.macro-table-scroll-container, div.macro-table-data-container, div.macro-table-header')
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
          if(options.filterTerm === '') {
            this.element.find('div.macro-table-message').text(options.emptyInitializedMessage);
          } else {
            this.element.find('div.macro-table-message').text(options.emptyFilteredMessage);
          }
        }
      });

      console.log('replaceRowWindow',this.replaceRowWindow,'maxTotalDomRows',this.maxTotalDomRows,'maxTotalDomColumns',this.maxTotalDomColumns,'middleDomRow',~~(this.maxTotalDomRows / 2),'triggerUpDomRow',this.triggerUpDomRow,'triggerDownDomRow',this.triggerDownDomRow);
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

      this.element.find('div.macro-table-header-wrapper').css('margin-right', this.scrollBarWidth).end()
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

        $macroTable = this.element,
        $headerWrapper = $macroTable.find('div.macro-table-header-wrapper'),
        $header = $headerWrapper.find('div.macro-table-header'),
        $headerRow = $header.find('tr.macro-table-header-row'),
        $summaryRow = $header.find('tr.macro-table-summary-row'),

        $dataContainer = $macroTable.find('div.macro-table-data-container'),
        $leftScrollWrapperHeader = $header.find('div.macro-table-scroll-wrapper'),
        $leftScrollWrapperBody = $dataContainer.find('div.macro-table-scroll-wrapper'),
        $columnSizers = $macroTable.find('colgroup.macro-table-column-sizer'), //one in header, one in body

        tableViewportWidth = this._getFallbackWidthToResize() - this.scrollBarWidth - this._renderHeaderRowControls(),
        marginAdded = 0,
        totalColumnWidth = 0,
        totalOverriddenColumnWidth = 0,
        totalOverriddenColumnWidthCount = 0,
        defaultColumnWidth, i;

      $headerWrapper.hide();

      $headerRow.empty();
      $summaryRow.empty();
      $columnSizers.empty();

      //nothing to do if there are no columns to show
      if(columns.length === 0) {
        return;
      }

      //calculate the width the columns should be set to in order to at least fill up all remaining width-space in the viewport
      //if the remaining space doesn't provide enough space for each unsized column to be at least options.defaultColumnWidth wide, default to options.defaultColumnWidth
      for(i = columns.length; i--;) {
        if(typeof columns[i].width !== 'undefined') {
          totalOverriddenColumnWidth += parseInt(columns[i].width, 10);
        } else {
          totalOverriddenColumnWidthCount++;
        }
      }
      defaultColumnWidth = ($dataContainer.width() - totalOverriddenColumnWidth) / totalOverriddenColumnWidthCount; //remaining width-space / # of unsized columns
      defaultColumnWidth = defaultColumnWidth < options.defaultColumnWidth ? options.defaultColumnWidth : defaultColumnWidth; //make sure at least options.defaultColumnWidth

      //build the column headers
      for(i = columns.length; i--;) {
        var columnWidth = typeof columns[i].width !== 'undefined' ? parseInt(columns[i].width, 10) : defaultColumnWidth;

        if(i < this.maxTotalDomColumns) { //TODO: right now, this is always true because we show all columns in the DOM, always
          var $summaryColumn,
            $colSizer = $(document.createElement('col')).width(columnWidth),
            $headerColumn = $(document.createElement('th'))
          .html(columns[i].title)
          .addClass(columns[i].className);

          if(typeof summaryRow === 'object') {
            $summaryColumn = $(document.createElement('th')).addClass('macro-table-summary-row-cell');
            if(typeof summaryRow[columns[i].field] !== 'undefined') {
              $summaryColumn.html(summaryRow[columns[i].field]);
            }
          }

          if(columns[i].resizable !== false) {
            $headerColumn.addClass('macro-table-column-resizable');
            if(typeof summaryRow === 'object') {
              $summaryColumn.addClass('macro-table-column-resizable');
            }
          }

          if(options.reorderable === true) {
            $headerColumn.addClass('macro-table-column-reorderable');
          }

          if(columns[i].sortable !== false) {
            $headerColumn.addClass('macro-table-column-sortable');
          }

          $headerRow.prepend($headerColumn);
          $columnSizers.prepend($colSizer);
          if(typeof summaryRow === 'object') {
            $summaryRow.prepend($summaryColumn);
          }
        }

        totalColumnWidth += columnWidth;
        if(marginAdded === 0 && totalColumnWidth > tableViewportWidth) {
          //amount of space clipped from the last column + width of the "current column" when last column is visible, which allows to scroll right one column further
          marginAdded = (totalColumnWidth - tableViewportWidth) + columnWidth;
        }
      }

      if(typeof summaryRow === 'object') {
        $macroTable.addClass('macro-table-display-summary-row');
      } else {
        $macroTable.removeClass('macro-table-display-summary-row');
      }

      //size the scroll spacer to the theoretical max width of all the data + spacing margin
      $macroTable.find('div.macro-table-scroll-spacer')
      .width(totalColumnWidth + marginAdded);

      $leftScrollWrapperBody.width(totalColumnWidth + marginAdded);
      $leftScrollWrapperHeader.width(totalColumnWidth + marginAdded + this.scrollBarWidth);

      $headerWrapper.show(); //needs to be visible so column width calculation can be performed

      $header.add($dataContainer).scrollLeft(
        $header.scrollLeft() + $headerRow.find('th').filter(':nth-child('+(this.currentColumn + 1)+')').position().left //scroll position of old column
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
        summaryRow = options.summaryRow,
        $macroTable = this.element,
        $staticColumnSizers = $macroTable.find('colgroup.macro-table-static-column-sizer'), //one in header, one in body
        $staticHeaderRow = $macroTable.find('div.macro-table-static-header tr.macro-table-static-header-row'),
        $staticSummaryRow = $macroTable.find('div.macro-table-static-header tr.macro-table-static-summary-row');

      $staticColumnSizers.empty();
      $staticHeaderRow.empty();
      $staticSummaryRow.empty();

      //set up table for rows to have checkbox columns, sizing handled in .resizeTable()
      if(options.rowsSelectable === true && this.renderRowDataSet.length > 0) {
        var $checboxColumnSizer = $(document.createElement('col')).addClass('macro-table-row-selector-column')
          .width(this.rowSelectColumnWidth),
          $checkboxColumn = $(document.createElement('th')).html('<input type="checkbox" class="macro-table-checkbox macro-table-select-toggle" />');

        $staticColumnSizers.append($checboxColumnSizer);
        $staticHeaderRow.append($checkboxColumn);
        if(typeof summaryRow === 'object') {
          $staticSummaryRow.append($(document.createElement('th')).html('&nbsp;')); //space filler
        }

        $macroTable.addClass('macro-table-rows-selectable');
      } else {
        $macroTable.removeClass('macro-table-rows-selectable');
      }

      //WARNING: assuming at this point rowsWithChildrenCount has been initialized and is up to date

      //set up table for rows with expandable children
      if(this.rowsWithChildrenCount > 0) {
        var timestamp = +new Date(),
          $expanderColumnSizer = $(document.createElement('col')).addClass('macro-table-row-expander-column')
          .width(this.expanderColumnWidth),
          $expanderColumn = $(document.createElement('th')).addClass('macro-table-row-expander-cell')
          .html(
            '<div class="macro-table-expand-toggle-container">'+
              '<input type="checkbox" id="macro-table-expand-toggle-'+timestamp+'" class="macro-table-checkbox macro-table-expand-toggle" />'+
              '<label for="macro-table-expand-toggle-'+timestamp+'" class="macro-table-expand-toggle-label"></label>'+
            '</div>'
          );

        $staticColumnSizers.append($expanderColumnSizer);
        $staticHeaderRow.append($expanderColumn);
        if(typeof summaryRow === 'object') {
          $staticSummaryRow.append($(document.createElement('th')).html('&nbsp;')); //space filler
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

      return $staticHeaderRow.width();
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
        $dataContainer = $dataContainerWrapper.find('div.macro-table-data-container'),
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

          //render the rows as long as we haven't gone over the DOM row threshold
          if(i >= this.currentRow - this.currentDomRow && renderCount < this.maxTotalDomRows && j < maxRenderCount) {
            var staticHeight, dynamicHeight,
              rowElements = renderRow.call(this, rowData, this.expandedTableData.length - 1);

            //append row to table
            $tableBody.append(rowElements.dynamicRow);
            $staticTableBody.append(rowElements.staticRow);

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

            renderCount++; //a row or subrow was rendered
          }
        }
      }

      //size the scroll spacer to the theoretical max height of all the data
      $macroTable.find('div.macro-table-scroll-spacer')
      .height(rowHeight * this.expandedTableData.length);

      //return table to the old scoll position
      $currentRowElement = $tableBody.find('tr').filter(':nth-child('+(this.currentDomRow + 1)+')');
      scrollPosition = $dataContainer.scrollTop() + ($currentRowElement.length === 0 ? 0 : $currentRowElement.position().top);

      $dataContainer.add($staticDataContainer)
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
      this.element.trigger('columnreorder', columns);
      rebuildSearchIndexColumns.bind(this)('move', columnToReorderIndex, newIndex);
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
      this.element.trigger('columnremove', columns);
      rebuildSearchIndexColumns.bind(this)('delete', columnToRemoveIndex);
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
      this.element.trigger('columnadd', columns);
      rebuildSearchIndexColumns.bind(this)('add');
    },

    /**
     * @method _sortTable
     * @description sort the table by a particular column
     * @param columnToSort {Number|String} the column to sort by's index or field name
     * @param {Function} callback Callback function that executes upon completion of the sort/filter
     * @private
     */
    _sortTable: function(columnToSort, callback) {
      var options = this.options,
        $columnHeader = $('div.macro-table-header tr.macro-table-header-row th', this.element),
        columnData, sortWorker, columnSorter, renderRowDataSet;

      //columnToSort is an array index
      if(parseInt(columnToSort, 10).length === columnToSort.length) {

        if(columnToSort >= 0) {

          columnData = options.columns[columnToSort];
          options.sortByColumn = columnData.field;

          //when this function is called with columnToSort as a Number value, we know this is a user action
          //rather than a re-rendering. therefore we know we should change sort order direction
          columnData.direction = typeof columnData.direction === 'undefined' ? 1 : columnData.direction * -1;

          $columnHeader = $columnHeader.filter(':nth-child('+(columnToSort + 1)+')')
          .removeClass('macro-table-sort-ascending macro-table-sort-descending')
          .addClass('macro-table-sort-loading');

          workerSortRow.bind(this)(columnData, $columnHeader, callback);
          return;

        } else {

          options.sortByColumn = '';
          renderRowDataSet = this.sortedRows[''][''];
        }

      //columnToSort is a column field name
      } else {

        options.sortByColumn = columnToSort;

        //TODO: what's the point of this for loop?
        /*for(var columnIndex = options.columns.length - 1; columnIndex >= 0; columnIndex--) { //TODO: make this a helper function?
          if(options.columns[columnIndex].field == columnToSort) {

            columnData = options.columns[columnIndex];

            //when this function is called with columnToSort as a String value, we know this is an internal
            //re-rendering without intention of changing the sort order direction

            break;
          }
        }*/

        renderRowDataSet = this.sortedRows[columnToSort][''];
      }

      renderRowDataSet = postSortFilter.bind(this)(renderRowDataSet, null, callback); //possibly trigger webworker

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
        headerHeight = $macroTable.find('div.macro-table-scroll-shim').outerHeight(),
        rowSelectorOffset = options.rowsSelectable === true ? this.rowSelectColumnWidth : 0,
        middleDomRow;

      //initialized undefined dimensions with parent dimensions
      height = height || this._getFallbackHeightToResize();
      width = width || this._getFallbackWidthToResize();
      headerHeight = headerHeight > 0 ? headerHeight : rowHeight;

      //determine how many rows will fit in the provided height
      this.displayRowWindow = height < rowHeight ? options.defaultTableHeightInRows : ~~((height - headerHeight - this.scrollBarWidth) / rowHeight);

      if(options.rowBuffer < this.displayRowWindow) {
        console.error('options.rowBuffer',options.rowBuffer,'cannot be less than displayRowWindow',this.displayRowWindow,'. rowBuffer value being changed to',this.displayRowWindow);
        options.rowBuffer = this.displayRowWindow;
      }

      //set table itself to correct height to prevent any accidental block sizing funniness
      $macroTable.height(height).width(width);

      //size the data container wrapper
      $macroTable.find('div.macro-table-data-container-wrapper')
      .height(height - headerHeight - this.scrollBarWidth) //-1 to account for bottom border of header
      .width(width - this.scrollBarWidth - 1); //-1 to account for left border

      //size the data container
      $macroTable.find('div.macro-table-data-container, div.macro-table-static-data-container')
      .height(height - headerHeight - this.scrollBarWidth);

      //size the scroll container
      $macroTable.find('div.macro-table-scroll-container')
      .outerHeight(height - headerHeight); //may have box-sizing: border-box; set (if not webkit)

      //size the vertical drop guide for the resizing functionality
      $macroTable.find('div.macro-table-resize-guide')
      .height(height - this.scrollBarWidth);

      //set globals based on new table dimensions
      this.replaceRowWindow = options.rowBuffer / 2;
      this.maxTotalDomRows = this.displayRowWindow + (options.rowBuffer * 2);
      middleDomRow = ~~(this.maxTotalDomRows / 2);
      this.triggerUpDomRow = middleDomRow - ~~(this.displayRowWindow / 2) - this.replaceRowWindow;
      this.triggerDownDomRow = middleDomRow - ~~(this.displayRowWindow / 2) + this.replaceRowWindow;
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
        rowTraverseCount = 0;

      for(var i = 0, len = tableData.length; i < len; i++) {
        var row = tableData[i];

        //loop the main row and its sub rows if it has any
        for(var j = 0, rowGroupLen = 1 + (typeof row.subRows !== 'undefined' ? row.subRows.length : 0); j < rowGroupLen; j++) {
          var rowData = rowGroupLen > 1 && j > 0 ? row.subRows[j - 1] : row;

          tableRows[rowTraverseCount] = [];

          //loop through the ordered columns datastructure so that order can be maintained in this output
          for(var k = 0, columnLen = columns.length; k < columnLen; k++) {
            tableRows[rowTraverseCount][k] = {};
            tableRows[rowTraverseCount][k][columns[k].field] = rowData.data[columns[k].field];
          }

          rowTraverseCount++;
        }
      }

      return tableRows;
    },

    /**
     * Resize the table components to fit the supplied dimensions
     * Public interface for calls to _resizeTable and _sortTable
     */
    resizeTable: function(height, width) {
      this._resizeTable(height, width);

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
        tableData = this.renderRowDataSet;

      if(byIndex && typeof tableData[scrollToRow] !== 'undefined') {
        scrollToRow = this.expandedTableData.indexOf(tableData[scrollToRow]);
      } else if(typeof scrollToRow === 'undefined') {
        scrollToRow = 0;
      }

      console.log('scroll to row',scrollToRow);

      var rowsToScroll = scrollToRow - this.currentRow;
      if(rowsToScroll !== 0) {
        this.scrollToRowIndex = scrollToRow;
        this.element.find('div.macro-table-scroll-container').scrollTop(this.scrollTop + (rowsToScroll * options.rowHeight));

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

      var $column = this.element.find('tr.macro-table-header-row th:nth-child('+(scrollToColumn + 1)+')'),
        columnOffset = $column.length > 0 ? $column.position().left : 0,
        $scroll = this.element.find('div.macro-table-scroll-container');

      this.scrollLeft = -1; //force a scroll

      $scroll.scrollLeft($scroll.scrollLeft() + columnOffset);
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
     * @method filterTable
     * @description filter the displayed table rows to those that match the search term
     * @param filterTerm {String} the term for which to search table rows for a match. if undefined, all rows are matched
     * @return {Array} an array of matching rows
     */
    filterTable: function(filterTerm) {
      filterTerm = typeof filterTerm !== 'string' ? '' : filterTerm;
      this._setOption('filterTerm', filterTerm);

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

      // In jQuery UI 1.8, you must invoke the destroy method from the base widget
      $.Widget.prototype.destroy.call( this );
      // In jQuery UI 1.9 and above, you would define _destroy instead of destroy and not call the base method
    }
  });
})(jQuery, window, document);