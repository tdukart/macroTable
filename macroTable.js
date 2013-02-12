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

(function( $, undefined ) {

  var rowSelectColumnWidth =16, //the static width of the checkbox column for selecting rows
    expanderColumnWidth = 16, //the static width of the expand/collapse sub rows column
    styledScrollbarWidth = 12,
    unStyledScrollbarWidth = 16,
    scrollBarWidth = navigator.userAgent.indexOf(' AppleWebKit/') !== -1 ? styledScrollbarWidth : unStyledScrollbarWidth,
    resizeColumnMinWidth = 30,
    defaultTableHeight = 200, //default the table to this height
    displayRowWindow, //the max number of rows that will show in the provided table height
    replaceRowWindow, //when a DOM row swap is triggered, this many rows will be removed and replaced at the other end of the table

    //columns
    maxTotalDomColumns = Infinity, //TODO: not implemented, currently allowing any number of columns to show
    currentColumn = 0, //0-indexed, describes the left-most, visible data column (direct correlation with array index). default to first column
    currentDomColumn = 0, //0-indexed, describes the left-most, visible DOM column. default to first column
    //processedColumns = [], //once columns processed from options.columns, the elements and real widths go in here

    //rows
    sortedRows = {}, //object of sorted combinations of the table data, key 'default' contains the data ordered as it was initialized
    maxTotalDomRows, //real DOM row count would only be less than this if the amount of data is less than this number (don't need the extra DOM rows to display total data)
    scrollTop = 0, //default to top of table
    scrollLeft = 0,//default to left of table
    currentRow = 0, //0-indexed, describes the top-most, visible data row (direct correlation with array index). default to first row
    currentDomRow = 0, //0-indexed, describes the top-most, visible DOM row. default to first row
    triggerUpDomRow, //when scrolling up, when on this DOM row, a row swap will trigger
    triggerDownDomRow, //when scrolling down, when on this DOM row, a row swap will trigger

    summaryRowEnabled,

    selectedRowCount = 0, //counter to keep track of selected rows, used to optimize selecting behavior comparing currently selected to length of total rows
    expandedRowCount = 0, //counter to keep track of expanded rows, used to optimize selecting behavior comparing currently selected to length of total rows
    rowsWithChildrenCount = 0, //counter for the total number of rows that can be expanded 
    expandedTableData, //data structure directly translating to the rows that are displayed in the table (flat, rather than hierarchical)
    expandedRowIndexes = []; //keep track of the rows that are expanded for the onRowExpand callback

  /** Truly Private functions */

  /**
   * convenience function to clear out the data content and rerender the appropriate rows based on the new scroll position
   * @param startRowIndex {Number} the index into the tableData where the rows should start rendering from (should ALWAYS be smaller than endRowIndex)
   * @param endRowIndex {Number} the index into the tableData where the last row is to be rendered number (should ALWAYS be larger than swtartRowIndex)
   * @param direction {Number} the number of rows the table was scrolled, positive for down, negative for up
   * @returns {Number} the actual number of rows rendered
   */
  function rebuildRows(startRowIndex, endRowIndex, direction) {
    var tableData = this.options.tableData,
      $tableContentWrapper = this.element.find('div.macro-table-data-container-wrapper'),
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
      rowData = expandedTableData[startRowIndex + renderCount];

      if(typeof rowData !== 'undefined') {

        rowElements = renderRow.call(this, rowData, (startRowIndex + renderCount));
        
        //append new rows to table
        $tableBody.append(rowElements.dynamicRow);
        $staticTableBody.append(rowElements.staticRow);

        //reconcile possible different heights between static and dynamic rows
        staticHeight = rowElements.staticRow.height();
        dynamicHeight = rowElements.dynamicRow.height();
        if(staticHeight > dynamicHeight) {
          rowElements.dynamicRow.height(staticHeight);
        } else if(staticHeight < dynamicHeight) {
          rowElements.staticRow.height(dynamicHeight);
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
      $tableBody.append($rows.filter(':lt('+(maxTotalDomRows - renderCount)+')'));
      $staticTableBody.append($staticRows.filter(':lt('+(maxTotalDomRows - renderCount)+')'));
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

      tableContainerHeight = $tableContainer.height();

    //loop through rows backwards to find the new, truly last row that will allow the last row to show
    $($tableRows.get().reverse()).each(function(i, element) {
      distanceFromBottomToNewLastDomRow += $(element).height();
      if(distanceFromBottomToNewLastDomRow > tableContainerHeight) {
        distanceFromBottomToNewLastDomRow -= $(element).height();
        newLastDomRow = $tableRows.length - i + 1;
        return false;
      }
    });

    //add calculated margins to allow scrolling to bring last row into view
    $tableScrollSpacer.css('padding-bottom', (newLastDomRow - this.options.rowBuffer - displayRowWindow) * this.options.rowHeight);
    $tableScrollWrappers.css('padding-bottom', tableContainerHeight - distanceFromBottomToNewLastDomRow);
    $reorderGuide.css('bottom', tableContainerHeight - distanceFromBottomToNewLastDomRow);
  }

  /**
   * function to handle the table container scrolling
   * will identify the case where a row swap needs to happen and will take care of it as well
   * @param direction {Number} number of rows to scroll (negative for up, positive for down)
   */
  function scrollTableVertical(direction, rerender) {
    var rowBuffer = this.options.rowBuffer,

      rowNumber = currentRow,
      visibleRowCount = expandedTableData.length,

      finalDomRowWindow = visibleRowCount - rowBuffer - rowBuffer - displayRowWindow, //the final row window render starts at this row
      isInFinalDomWindow = currentRow > finalDomRowWindow,
      
      $tableContentWrapper = this.element.find('div.macro-table-data-container-wrapper'),
      $tableContainer = $tableContentWrapper.find('div.macro-table-data-container'),

      $staticTableContainer = $tableContentWrapper.find('div.macro-table-static-data-container'),
      $tableBody = $tableContainer.find('tbody.macro-table-column-content'),
      $tableRows = $tableBody.find('tr'),
      newRenderCount = 0; //number of new rows we need to remove and re-add with new values

    //a huge scroll, passed the normal row swap threshold (grab the thumb with the mouse and whip it all the way in one direction)
    if(currentDomRow + direction > maxTotalDomRows || currentDomRow + direction <= 0 || rerender) {

      //final dom window should always render the maxTotalDomRows number of rows
      if(isInFinalDomWindow) {

        rebuildRows.call(this, visibleRowCount - maxTotalDomRows, visibleRowCount);
        currentDomRow = maxTotalDomRows - (visibleRowCount - rowNumber);
        calculateAndApplyBottomMargin.call(this); //at the bottom, make sure the scroll margins are in place

      //not in final dom window, proceed as normal
      } else {

        var topRowBuffer = rowNumber < rowBuffer ? rowNumber : rowBuffer; //account for when on the first rowBuffer number of rows
        rebuildRows.call(this, rowNumber - topRowBuffer, rowNumber - topRowBuffer + maxTotalDomRows);
        currentDomRow = topRowBuffer;
      }

      //console.log('re-render',rowNumber,'(DOM row)',currentDomRow);

      $tableRows = $tableBody.find('tr'); //refetch rows, since they've likely changed

    //more normal situations
    } else {

      //scrolling down
      if(direction > 0) { 

        currentDomRow = Math.min(currentDomRow + direction, visibleRowCount - maxTotalDomRows); //the DOM row that the table would be at, if a detach weren't about to happen

        //convenience variables to make debugging the logic easier
        var remainingDomRows = $tableRows.filter(':gt('+(currentDomRow - 1)+')').length,
          moreRowRenderingNeeded = visibleRowCount - rowNumber > remainingDomRows && remainingDomRows <= maxTotalDomRows - rowBuffer - 1;

        //render new rows appropriate to current DOM possition, or if a big jump landed into the final DOM window and need the remaining rows fleshed out
        if(!isInFinalDomWindow || (isInFinalDomWindow && moreRowRenderingNeeded)) {

          if(currentDomRow >= triggerDownDomRow) {

            newRenderCount = currentDomRow - rowBuffer;
            if(newRenderCount <= 0) {
              console.warn('newRenderCount should never be less than 1 but it is',newRenderCount,'Probably due to overloaded scroll listener');
            } else {

              currentDomRow -= rebuildRows.call(this, rowNumber + maxTotalDomRows - currentDomRow, rowNumber + maxTotalDomRows - currentDomRow + newRenderCount, direction);
              //console.log('scrolling down',rowNumber,'(DOM row)',currentDomRow);

              $tableRows = $tableBody.find('tr'); //refetch rows, since they've likely changed
            }
          }

        //in the finalDomRowWindow, add margin to bottom of wrapper to allow scrolling the last row completely into the visible window
        } else {

          calculateAndApplyBottomMargin.call(this);

        }

      //scrolling up
      } else if(direction < 0) { 

        currentDomRow = Math.max(currentDomRow + direction, 0); //the DOM row that the table would be at, if a detach weren't about to happen
        
        if(currentDomRow <= triggerUpDomRow && rowNumber > replaceRowWindow) {

          newRenderCount = maxTotalDomRows - currentDomRow - displayRowWindow - rowBuffer;
          if(newRenderCount <= 0) {
            console.warn('newRenderCount should never be less than 1 but it is',newRenderCount,'Probably due to overloaded scroll listener');
          } else {

            currentDomRow += rebuildRows.call(this, rowNumber - currentDomRow - 1 - newRenderCount, rowNumber - currentDomRow, direction);
            //console.log('scrolling up',rowNumber,'(DOM row)',currentDomRow);

            $tableRows = $tableBody.find('tr'); //refetch rows, since they've likely changed
          }
        }

      } //scroll up
    } //else

    var scrollTop = $tableRows.eq(currentDomRow).offset().top - $tableBody.offset().top;
    console.log('current dom row (top visible row)',currentDomRow,'currentRow',currentRow,'row index',expandedTableData[currentRow].index,'from top',scrollTop);
    $tableContainer.scrollTop(scrollTop);
    $staticTableContainer.scrollTop(scrollTop);
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
      $currrentColumn = $domColumns.eq(currentColumn),
      columnIterator = -1,
      endColumn;

    //scroll right
    if(scrollContainerScrollLeft > dataContainerScrollLeft && 
        scrollContainerScrollLeft >= dataContainerScrollLeft + $currrentColumn.outerWidth()) {
      columnIterator = currentColumn + 1;
      endColumn = $domColumns.length;

    //scroll left
    } else if(scrollContainerScrollLeft < dataContainerScrollLeft && 
        scrollContainerScrollLeft <= dataContainerScrollLeft + $currrentColumn.outerWidth()) {
      columnIterator = currentColumn;
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

        currentColumn = columnIterator;
        $tableContainer.scrollLeft(newColumnScrollLeft);
        this.element.find('div.macro-table-header').scrollLeft(newColumnScrollLeft);
        break;

      }

      columnIterator += (scrollContainerScrollLeft > dataContainerScrollLeft ? 1 : -1);

    }
  }

  /**
   * Build a table row containing a column for each field
   * @param {Object} data A row of data to be rendered by field
   * @param {Number} index The row number being rendered in the expandedTableData datastructure
   */
  function renderRow(row, index) {
    var columns = this.options.columns,
      isRowsSelectable = this.options.rowsSelectable === true,
      rowHasChildren = typeof row.subRows !== 'undefined' && row.subRows.length,
      rowData,
      expanderCellClass = '',
      dynamicRowColumns = '',
      staticRowColumns = '',
      $dynamicRow = $(document.createElement('tr')),
      $staticRow = $(document.createElement('tr'));

    //give even rows a stripe color
    if(index % 2 == 0) {
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

    if(row.expanded === true) {
      $dynamicRow.addClass('macro-table-row-expanded');
      $staticRow.addClass('macro-table-row-expanded');
    } else {
      $dynamicRow.addClass('macro-table-row-collapsed');
      $staticRow.addClass('macro-table-row-collapsed');
    }

    //build dynamically left-scrollable row
    for(var i = 0, len = columns.length; i < len; i++) {
      var columnContent = row.data[columns[i].field];
      columnContent = typeof columnContent === 'undefined' ? '' : columnContent;

      if(typeof columns[i].formatter === 'function') {
        columnContent = columns[i].formatter(columnContent);
      }
      dynamicRowColumns += '<td'+(columns[i].resizable !== false ? ' class="macro-table-column-resizable"' : '')+'>'+columnContent+'</td>';
    }

    //build static row
    if(isRowsSelectable) {
      staticRowColumns += '<td><input type="checkbox" class="macro-table-checkbox macro-table-row-selector" data-row-index="'+index+'" '+(row.selected === true ? 'checked="checked"' : '')+'/></td>';
    }

    //build row expand column
    if(rowHasChildren && row.expanded) {
      expanderCellClass = 'macro-table-subrow-hierarchy-vertical-line-bottom-half';
    } else if(typeof row.parentIndex !== 'undefined') {
      expanderCellClass = 'macro-table-subrow-hierarchy-line-right '; //TODO: macro-table-subrow-hierarchy-line-right should be conditionally removed for subRows of subRows
      if(this.options.tableData[row.parentIndex].subRows.length - 1 > row.index) { //FIXME: this will break for a subRow of a subRow, because we're looking directly at tableData (which is only top level rows)
        expanderCellClass += 'macro-table-subrow-hierarchy-vertical-line-full';
      } else {
        expanderCellClass += 'macro-table-subrow-hierarchy-vertical-line-top-half'
      }
    }
    
    var timestamp = +new Date();
    staticRowColumns += '<td class="macro-table-row-expander-cell' + (expanderCellClass != '' ? ' '+expanderCellClass : '') + '">' + 
      (rowHasChildren ? 
        '<input type="checkbox" id="macro-table-row-expander-'+timestamp+'" class="macro-table-checkbox macro-table-row-expander" data-row-index="'+index+'" '+(row.expanded === true ? 'checked="checked"' : '')+'/>' +
        '<label for="macro-table-row-expander-'+timestamp+'" class="macro-table-row-expander-label"></label>' : 
        '') + 
    '</td>'; 

    $dynamicRow.html(dynamicRowColumns);
    $staticRow.html(staticRowColumns);

    return {
      dynamicRow: $dynamicRow,
      staticRow: $staticRow,
    };
  }

  /**
   * Loop through defined columns and verify the proposed sort by column exists
   * @param columnField {String} field name of column to potentially sort by
   * @return the index of the column if it is sortable, -1 otherwise
   */
  function validateSortByColumn(columnField) {
    var columns = this.options.columns;

    if(columnField == '') {
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
    var tableData = this.options.tableData,
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
   * @param sortedTableData {Array} the current data structure for the table data sorted by this column.
   *  if it is undefined, it means the table has not yet been sorted by this column. if defined, it should
   *  simply be reversed (no need to full sort again, we're just changing direction of the sort)
   * @param columnData {Object} the definition of the column by which the table data is to be sorted
   * @param $columnHeader {jQuery} column header for the sorted column
   */
  function workerSortRow(sortedTableData, columnData, $columnHeader) {
    var self = this,
      options = this.options,
      $veil = $('div.macro-table-data-veil', this.element),
      columnSorter;

    $veil.show();

    sortWorker = new Worker('macroTableSort.js');
    
    sortWorker.onerror = function(e) {
      sortWorker.terminate();
      self._renderTableRows(options.tableData);
    };

    sortWorker.onmessage = function(e) {
      var sortedTableData = e.data;
      sortedRows[options.sortByColumn] = sortedTableData;
      self._renderTableRows(sortedTableData);

      $columnHeader.removeClass('macro-table-sort-loading')
      .addClass(columnData.direction > 0 ? 'macro-table-sort-ascending' : 'macro-table-sort-descending');

      $veil.hide();

      sortWorker.terminate();
      //console.log('sorted data',sortedTableData);
    };

    //initialize the ordered tableData to use
    if(typeof sortedTableData === 'undefined') {

      //console.log('pre-sorted data',options.tableData);

      if(typeof columnData.sortable === 'function') {
        columnSorter = columnData.sortable.toString();
      }

      sortWorker.postMessage({
        action: 'sort',
        tableData: options.tableData,
        sortByField: options.sortByColumn,
        columnSorter: columnSorter
      });

    } else {

      //console.log('pre-sorted data',sortedTableData);
      
      sortWorker.postMessage({
        action: 'order',
        tableData: sortedTableData
      });
      
    }
  }

  $.widget('n.macroTable', {

    /**
     * The prefix to use for events.
     * @property widgetEventPrefix
     * @type String
     */
    widgetEventPrefix: 'macroTable',

    options: {
      height: undefined, //default height of table, if not defined will fit to parent
      width: undefined, //defailt width of table, if not defined will fit to parent
      rowHeight: 30, //render height of a table row, in pixels
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
       * Callback run on reordering columns
       * called with the newly ordered columns array as a parameter
       * could be used for storing users preferences, etc.
       */
      onColumnReorder: undefined,
      /**
       * Callback run when a column is resized
       * called with the index of the column that was resized and its new width
       * could be used for storing users preferences, etc.
       */
      onColumnResize: undefined,
      /**
       * Callback run when a row is expanded or collapsed
       * called with an array of the row indexes that are expanded
       * could be used for storing users preferences, etc.
       */
      onRowExpand: undefined,
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
      rowsSelectable: false,
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

        case 'reorderable':
          break;

        case 'onColumnReorder':
          break;

        case 'onColumnResize':
          break;

        case 'tableData':
          rowsWithChildrenCount = countRowsWithChildren.call(this);
          sortedRows = {};
        case 'summaryRow':
          this._init(); //causes currentColumn and currentRow to reset to 0
          break;

        case 'rowsSelectable':
          //TODO add class managment for macro-table-rwos-selectable too
          if(value === true) {
            this.element.addClass('macro-table-rows-selectable');
          } else {
            this.element.removeClass('macro-table-rows-selectable');
            //$('tr.macro-table-selected-row', this.element).removeClass('macro-table-highlight macro-table-selected-row'); //deselect any selected rows
          }
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
        $macroTable = this.element,
        rowHeight = this.options.rowHeight,
        breakTableScroll = false,
        forceTableScrollRender = false;

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
          '<div class="macro-table-reorder-handle"></div>'+
        '</div>'+
        '<div class="macro-table-scroll-shim"></div>'+
      '</div>'+
      '<div class="macro-table-data-container-wrapper">'+
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

        expandedTableData[index].expanded = !!isExpanded;

        if(isExpanded) {
          expandedRowCount++;
          //apply + concat the subRows to remove to the argument array provides one-line solution to an otherwise loop-related solution
          expandedTableData.splice.apply(expandedTableData, [index + 1, 0].concat(expandedTableData[index].subRows)); 

          //newly expanded rows are never selected, so if the select all header checkbox is checked, put it into indeterminate state
          if($selectAllHeaderCheckbox.attr('checked')) {
            $selectAllHeaderCheckbox.attr('checked', false); //click the box again and it will select the newly expanded rows
            $selectAllHeaderCheckbox[0].indeterminate = true;
          }

        } else {
          expandedRowCount--;
          var removedRows = expandedTableData.splice(index + 1, expandedTableData[index].subRows.length);

          //clean up selected count from removed rows
          for(var i = 0, len = removedRows.length; i < len; i++) {
            if(removedRows[i].selected) {
              removedRows[i].selected = false;
              selectedRowCount--;
            }
          }

          //by hiding the sub rows, all remaining rows are selected, so make select toggle checkbox reflect that
          if(selectedRowCount == expandedTableData.length) {
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
          } else {
            $headerWrapper.removeClass('macro-table-header-active');
          }

        }
      })

      //provide delay to hiding of reorder handle when mouseout'ing of header cell
      .delegate('tr.macro-table-header-row th', 'mouseout', function(e) {
        if(!$(e.relatedTarget).hasClass('macro-table-reorder-handle')) { //don't deselect column if hovering over the reorder handle
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
            selectedRowCount = expandedTableData.length;

          //header checkbox deselected
          } else {

            isToggled = false;
            $checkboxes.attr('checked', false);
            $tableRows.removeClass('macro-table-highlight macro-table-selected-row');
            selectedRowCount = 0;
          }

          //set the row data structure to the appropriate selected state
          for(var i = 0, len = expandedTableData.length; i < len; i++) {
            expandedTableData[i].selected = isToggled;
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

          thisCurrentRow = expandedTableData[currentRow];

          //set the row data structure to the appropriate selected state
          expandedRowIndexes = [];
          for(var i = 0, subRowsModified = 0, len = expandedTableData.length; i < len + subRowsModified; i++) {
            
            if(typeof expandedTableData[i].subRows !== 'undefined' && expandedTableData[i].subRows.length) {

              if(isToggled) {
                expandedRowIndexes.push(expandedTableData[i].index);
              }

              if(expandedTableData[i].expanded != isToggled) {
                handleRowExpandToggle(i, isToggled);
                subRowsModified += (isToggled ? 1 : -1) * expandedTableData[i].subRows.length; //expandedTableData is changing, so need to modify the loop length
              }

              //(optimization) all expandable rows accounted for, stop the loop
              if(expandedRowCount == rowsWithChildrenCount) {
                break;
              }
            }
          }

          //handle the resizing of the scroll spacer, and make sure the row position doesn't change
          thisCurrentRow = expandedTableData.indexOf(thisCurrentRow) != -1 ? 
            expandedTableData.indexOf(thisCurrentRow) : //scroll to the original row
            expandedTableData.indexOf(tableData[thisCurrentRow.index]); //scroll to the row's parent

          breakTableScroll = true; //when resizing the scroll spacer, a scroll even may be triggered (and we don't want it to)
          $macroTable.find('div.macro-table-scroll-spacer')
          .height(rowHeight * (expandedTableData.length + 1));

          //nested setTimeouts to allow for scroll event to trigger for the scroll-spacer resize, then re-render the current position
          setTimeout(function() {
            breakTableScroll = false;
            forceTableScrollRender = true;
            self.scrollToRow(thisCurrentRow);

            //reset the force re-render flag
            setTimeout(function() {
              forceTableScrollRender = false;
              if(typeof self.options.onRowExpand === 'function') {
                self.options.onRowExpand(expandedRowIndexes);
              }
            },0);
          },0);
        }
      });

      //wire row select and row expand checkbox event behavior 
      $staticDataContainer.delegate('input.macro-table-checkbox', 'click', function(e) {
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
            expandedTableData[dataRowIndex].selected = true;
            selectedRowCount++;
          } else {
            $checkboxRow.removeClass('macro-table-highlight macro-table-selected-row');
            $dataRow.removeClass('macro-table-highlight macro-table-selected-row');
            expandedTableData[dataRowIndex].selected = false;
            selectedRowCount--;
          }

          //set header checkbox state
          if(selectedRowCount == 0) { //no rows selected

            $selectAllHeaderCheckbox.attr('checked', false);
            $selectAllHeaderCheckbox[0].indeterminate = false;

          } else if(selectedRowCount == expandedTableData.length) { //all rows selected

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
            if(expandedRowIndexes.indexOf(dataRowIndex) == -1) {
              expandedRowIndexes.push(dataRowIndex);
            }
          } else {
            $dataRow.removeClass('macro-table-row-expanded')
            .addClass('macro-table-row-collapsed');

            $checkboxRow.removeClass('macro-table-row-expanded')
            .addClass('macro-table-row-collapsed');

            handleRowExpandToggle(dataRowIndex, false);

            //remove the collapsed row index from the array for the onRowExpand callback
            expandedRowIndexes.splice(expandedRowIndexes.indexOf(dataRowIndex), 1);
          }

          self._refreshRows();
          
          //set header checkbox state
          if(expandedRowCount == 0) { //no rows expanded

            $expandAllHeaderCheckbox.attr('checked', false);
            //$expandAllHeaderCheckbox[0].indeterminate = false;

          } else if(expandedRowCount == rowsWithChildrenCount) { //all expandable rows expanded

            $expandAllHeaderCheckbox.attr('checked', true);
            //$expandAllHeaderCheckbox[0].indeterminate = false;

          } //else { //at least one row expanded, but not all

            //$expandAllHeaderCheckbox[0].indeterminate = true;
          //}

          $macroTable.find('div.macro-table-scroll-spacer')
          .height(rowHeight * (expandedTableData.length + 1));

          if(typeof self.options.onRowExpand === 'function') {
            self.options.onRowExpand(expandedRowIndexes.sort());
          }
        }
      });


      /* Wire resize column events */

      //helper function to return the width to resize a column to based on current cursor position
      function calculateReiszeColumnWidth(cursorPosition, $columnToResize) {
        var cursorOffset = cursorPosition - $macroTable.offset().left;

        return Math.max(
          Math.min(
            $macroTable.outerWidth() - scrollBarWidth - $resizer.outerWidth(), //max left position
            cursorOffset //current cursor position
          ), 
          $columnToResize.offset().left + resizeColumnMinWidth //min resize position
        );
      }

      //mousedown for the resizer, used when resizing columns
      var resizePositionStart;
      $resizer.bind('mousedown', function(e) {
        if(typeof resizePositionStart === 'undefined') { //prevent multiple mousedowns (if you mousedown, move cursor off of table, then move back and click)
          resizePositionStart = e.pageX - $macroTable.offset().left;

          //the resizer has been grabbed, attach listeners to the container to allow it to move around
          
          $resizer.addClass('macro-table-active');
          self.element.addClass('macro-table-resizing')
          .bind('mouseup', function(e) {
            //the handle has been dragged around and has now been let go
            e.stopPropagation();

            var $columnToResize = $macroTable.find('.macro-table-column-resize'),
              $columnContainers = $macroTable.find('colgroup.macro-table-column-sizer'), //finds the header and content sizers (2 elements)
              $columns = $columnContainers.filter(':first').find('col'),
              columnNumber = $columnToResize.index(),
              $columnSizers = $columnContainers.find('col:nth-child('+(columnNumber + 1)+')'),
              widthDelta = calculateReiszeColumnWidth(e.pageX, $columnToResize) - resizePositionStart,
              marginAdded = 0,
              totalColumnWidth = 0,
              tableViewportWidth = $macroTable.parent().width() - scrollBarWidth,
              newWidth = $columnSizers.width() + widthDelta,
              $dynamicRows =  $dataContainer.find('tr'),
              $staticRows = $staticDataContainer.find('tr'),
              i;

            //clean up the mousemove and mouseup events on the container
            self.element.unbind('mouseup')
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
            .width(newTotalColumnWidth + marginAdded + scrollBarWidth);

            $macroTable.find('div.macro-table-scroll-spacer')
            .width(newTotalColumnWidth + marginAdded);


            //cleanup the resizer element
            $resizer.removeClass('macro-table-highlight macro-table-active');

            resizePositionStart = undefined;

            if(typeof self.options.onColumnResize === 'function') {
              self.options.onColumnResize(columnNumber, newWidth);
            }
          }); //mouseup
        } //if(typeof resizePositionStart === 'undefined')
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
        var $element = $(e.target),
          resizerWidth = $resizer.outerWidth(),
          cursorOffset = e.pageX - $macroTable.offset().left;

        /* process enabling/disabling the resize handle when hovering */

        if(!$macroTable.hasClass('macro-table-resizing') && !$macroTable.hasClass('macro-table-column-moving')) {

          if($element.hasClass('macro-table-column-resizable')) {

            var thumbPosition = ($element.offset().left - $macroTable.offset().left) + //relative start position to macroTable container
                                $element.outerWidth() - Math.ceil(resizerWidth / 2); //end position of the cell with resize guide compensation

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
              currentColumnIndex = $macroTable.find('col.macro-table-selected-column').first().index(),
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
              isScrollingLeft = newColumnPosition - dataContainerOffset == 0 && scrollOffset != 0;

            if((isScrollingLeft || isScrollingRight) && $macroTable.hasClass('macro-table-column-moving')) {
              if(typeof scrollColumnTimer === 'undefined') {
                scrollColumnTimer = setTimeout(function() {
                  scrollColumnTimer = undefined;

                  $scroll.scrollLeft(
                    scrollOffset + (newColumnWidth * (isScrollingRight ? 1 : -1))
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
            if(reorderGuidePosition == 0 && cursorDataContainerOffset <= newColumnWidth / 2) {

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
              (newIndex > currentColumnIndex ? newColumnWidth : 0)
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
      });


      /* Wire table scrolling events */

      //mousewheel for table scrolling, wrapper for scrolling the scroll container, attached to .macro-table-data-container-wrapper
      //$dataContainer.parent()
      $macroTable.add($macroTable.find('div.macro-table-data-veil'))
      .bind('mousewheel', function(e, delta, deltaX, deltaY) {
        e.preventDefault();
        if(deltaY < 0) {
          $scroll.scrollTop(scrollTop + rowHeight);
        } else if(deltaY > 0) {
          $scroll.scrollTop(scrollTop - rowHeight);
        }

        if(deltaX != 0) {
          var $domColumns = $header.find('th'),
            offset = Math.abs($domColumns.eq(0).position().left);

          if(deltaX < 0 && currentColumn > 0) {
            var lastOffset = Math.abs($domColumns.eq(currentColumn - 1).position().left);
            console.log('left scroll',offset-lastOffset,'lastOffset',lastOffset,'offset',offset,'currentColumn',currentColumn);
            $scroll.scrollLeft(
              offset
              -lastOffset
            );
          } else if(deltaX > 0 && currentColumn < $domColumns.length - 1) {
            var nextOffset = Math.abs($domColumns.eq(currentColumn + 1).position().left);
            console.log('right scroll',offset-nextOffset,'nextOffset',nextOffset,'offset',offset,'currentColumn',currentColumn);
            $scroll.scrollLeft(
              offset +
              nextOffset
            );
          }
        }
        //console.log('Mousewheel .macro-table-data-container', scrollTop, rowHeight,$scroll);
      });

      //scroll function for the scroll container, using the scrollbars
      $scroll.scroll(function(e) {
        var lastScrollTop = scrollTop,
          lastTableScrollLeft = scrollLeft;

        scrollTop = $(this).scrollTop();
        scrollLeft = $(this).scrollLeft();

        var rowsToScroll = Math.abs(~~(scrollTop / rowHeight) - ~~(lastScrollTop / rowHeight));
        if(rowsToScroll > 0) {
          if(lastScrollTop < scrollTop) {
            
            currentRow += rowsToScroll;
            if(!breakTableScroll) {
              scrollTableVertical.call(self, rowsToScroll, forceTableScrollRender);
              //console.log('scrolling down to row',currentRow,'by',rowsToScroll,'rows');
            }

          } else if (lastScrollTop > scrollTop){

            currentRow -= rowsToScroll;
            if(!breakTableScroll) {
              scrollTableVertical.call(self, -rowsToScroll, forceTableScrollRender);
              //console.log('scrolling up to row',currentRow,'by',rowsToScroll,'rows');
            }
          }
        }

        if(scrollLeft != lastTableScrollLeft) {
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
      var options = this.options;

      //validate sortByColumn
      if(validateSortByColumn.call(this, options.sortByColumn) < 0) {
        options.sortByColumn = '';
      }

      //initialize the global count for rows with children
      rowsWithChildrenCount = countRowsWithChildren.call(this);

      scrollTop = 0;
      currentRow = 0;
      currentDomRow = 0;
      currentColumn = 0;
      currentDomColumn = 0;
      selectedRowCount = 0;
      expandedRowCount = 0;

      this._renderTableHeader();
      this._renderHeaderRowControls();

      //resize the table, re-calculate the global variables and populate the data rows
      this.resizeTable(options.height, options.width);

      console.log('replaceRowWindow',replaceRowWindow,'maxTotalDomRows',maxTotalDomRows,'maxTotalDomColumns',maxTotalDomColumns,'middleDomRow',~~(maxTotalDomRows / 2),'triggerUpDomRow',triggerUpDomRow,'triggerDownDomRow',triggerDownDomRow);
    },

    /**
     * @method _initializeScrollBarOffsets
     * convenience function for initializing element offsets for scrollbar widths
     * @private
     */
    _initializeScrollBarOffsets: function() {
      if(scrollBarWidth === styledScrollbarWidth) {
        this.element.addClass('has-styled-scrollbars');
      }

      this.element.find('div.macro-table-header-wrapper').css('margin-right', scrollBarWidth).end()
      .find('div.macro-table-scroll-shim').css({
        width: scrollBarWidth,
        right: -scrollBarWidth
      }).end()
      .find('div.macro-table-data-veil').css({
        right: scrollBarWidth,
        bottom: scrollBarWidth
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
        $columnSizers = $macroTable.find('colgroup.macro-table-column-sizer'), //one in header, one in body
        $headerWrapper = $macroTable.find('div.macro-table-header-wrapper'),
        $header = $headerWrapper.find('div.macro-table-header'),
        $headerRow = $header.find('tr.macro-table-header-row'),
        $leftScrollWrapperHeader = $header.find('div.macro-table-scroll-wrapper'),
        $leftScrollWrapperBody = $macroTable.find('div.macro-table-data-container div.macro-table-scroll-wrapper'),
        $summaryRow = $header.find('tr.macro-table-summary-row'),

        totalColumnWidth = 0,
        tableViewportWidth = $macroTable.parent().width() - scrollBarWidth,
        marginAdded;

      $headerWrapper.hide();

      $headerRow.empty();
      $summaryRow.empty();
      $columnSizers.empty();

      //build the column headers
      $headerWrapper.show(); //needs to be visible so column width calculation can be performed
      for(var i = columns.length - 1; i >= 0; i--) {
        var columnWidth = typeof columns[i].width !== 'undefined' ? parseInt(columns[i].width) : this.options.defaultColumnWidth;

        if(i < maxTotalDomColumns) { //TODO: right now, this is always true because we show all columns in the DOM, always
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

          columnWidth = $headerColumn.outerWidth(); //this is why the header has to be visible
        }

        totalColumnWidth += columnWidth;
        if(typeof marginAdded === 'undefined' && totalColumnWidth > tableViewportWidth) {
          marginAdded = tableViewportWidth - (totalColumnWidth - columnWidth);
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

      $leftScrollWrapperBody.width(totalColumnWidth + marginAdded)
      $leftScrollWrapperHeader.width(totalColumnWidth + marginAdded + scrollBarWidth);

      $header.scrollLeft(
        $headerRow.find('th').filter(':nth-child('+(currentColumn + 1)+')').position().left //scroll position of old column
      );
    },

    /**
     * @method _renderHeaderRowControls
     * @description puts the static column header into the appropriate state for the tableData
     * @private
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
      if(options.rowsSelectable === true) {
        var $checboxColumnSizer = $(document.createElement('col')).addClass('macro-table-row-selector-column')
          .width(rowSelectColumnWidth),
          $checkboxColumn = $(document.createElement('th')).html('<input type="checkbox" class="macro-table-checkbox macro-table-select-toggle" />');

        $staticColumnSizers.append($checboxColumnSizer);
        $staticHeaderRow.append($checkboxColumn);
        if(typeof summaryRow === 'object') {
          $staticSummaryRow.append($(document.createElement('th'))); //space filler
        }

        $macroTable.addClass('macro-table-rows-selectable');
      } else {
        $macroTable.removeClass('macro-table-rows-selectable');
      }

      //WARNING: assuming at this point rowsWithChildrenCount has been initialized and is up to date

      //set up table for rows with expandable children
      if(rowsWithChildrenCount > 0) {
        var timestamp = +new Date(),
          $expanderColumnSizer = $(document.createElement('col')).addClass('macro-table-row-expander-column')
          .width(expanderColumnWidth),
          $expanderColumn = $(document.createElement('th')).addClass('macro-table-row-expander-cell')
          .html('<input type="checkbox" id="macro-table-expand-toggle-'+timestamp+'" class="macro-table-checkbox macro-table-expand-toggle" />'+
          '<label for="macro-table-expand-toggle-'+timestamp+'" class="macro-table-expand-toggle-label"></label>');

        $staticColumnSizers.append($expanderColumnSizer);
        $staticHeaderRow.append($expanderColumn);
        if(typeof summaryRow === 'object') {
          $staticSummaryRow.append($(document.createElement('th'))); //space filler
        }

        $macroTable.addClass('macro-table-rows-expandable');
      } else {
        $macroTable.removeClass('macro-table-rows-expandable');
      }

      //enable/disable static columns depending on settings
      if(options.rowsSelectable === true || rowsWithChildrenCount > 0 /*|| other.settings.that.enable.static.column */) {
        $macroTable.addClass('macro-table-static-column-enabled');
      } else {
        $macroTable.removeClass('macro-table-static-column-enabled');
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
        maxRenderCount = maxTotalDomRows,
        $macroTable = this.element,
        $dataContainerWrapper = $macroTable.find('div.macro-table-data-container-wrapper'),
        $dataContainer = $dataContainerWrapper.find('div.macro-table-data-container'),
        $staticDataContainer = $dataContainerWrapper.find('div.macro-table-static-data-container'),
        $leftScrollWrapperBody = $dataContainer.find('div.macro-table-scroll-wrapper'),
        $tableBody = $dataContainerWrapper.find('tbody.macro-table-column-content'),
        $staticTableBody = $dataContainerWrapper.find('tbody.macro-table-static-column-content');

      expandedTableData = [];

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

          expandedTableData.push(rowData);

          //render the rows as long as we haven't gone over the DOM row threshold
          if(i >= currentRow - currentDomRow && renderCount < maxTotalDomRows && j < maxRenderCount) {
            var staticHeight, dynamicHeight,
              rowElements = renderRow.call(this, rowData, expandedTableData.length - 1);

            //append row to table
            $tableBody.append(rowElements.dynamicRow);
            $staticTableBody.append(rowElements.staticRow);

            //reconcile possible different heights between static and dynamic rows
            staticHeight = rowElements.staticRow.height();
            dynamicHeight = rowElements.dynamicRow.height();
            if(staticHeight > dynamicHeight) {
              rowElements.dynamicRow.height(staticHeight);
            } else if(staticHeight < dynamicHeight) {
              rowElements.staticRow.height(dynamicHeight);
            }

            renderCount++; //a row or subrow was rendered
          }
        }
      }

      //size the scroll spacer to the theoretical max height of all the data
      $macroTable.find('div.macro-table-scroll-spacer')
      .height(rowHeight * (expandedTableData.length + 1));

      //return table to the old scoll position
      $dataContainer.add($staticDataContainer)
      .scrollTop(
        $tableBody.find('tr').filter(':nth-child('+(currentDomRow + 1)+')').position().top //scroll position of old DOM row
      );
    },

    /**
     * @method _moveColumn
     * @description move a column to a new position
     * @private
     */
    _moveColumn: function(columnToReorder, newIndex) {
      console.log('_moveColumn',columnToReorder,'to',newIndex);

      var columns = this.options.columns;
      newIndex = newIndex > columns.length - 1 ? columns.length - 1 : newIndex;
      columns.splice(newIndex, 0, columns.splice(columnToReorder, 1)[0]);
      this._setOption('columns', columns);

      //may be called before the row/column position is scrolled back into original state due to setTimeout thread breaking
      if(typeof this.options.onColumnReorder === 'function') {
        this.options.onColumnReorder(columns);
      }
    },

    /**
     * @method _sortTable
     * @description sort the table by a particular column
     * @param columnToSort {Number|String} the column to sort by's index or field name
     * @private
     */
    _sortTable: function(columnToSort) {
      var self = this,
        options = this.options,
        $columnHeader = $('div.macro-table-header tr.macro-table-header-row th', this.element),
        columnData, sortedTableData, sortWorker, columnSorter;

      //columnToSort is an array index
      if(parseInt(columnToSort).length == columnToSort.length) {

        if(columnToSort >= 0) {
        
          columnData = options.columns[columnToSort];
          options.sortByColumn = columnData.field;

          //when this function is called with columnToSort as a Number value, we know this is a user action
          //rather than a re-rendering. therefore we know we should change sort order direction
          columnData.direction = typeof columnData.direction === 'undefined' ? 1 : columnData.direction * -1;

          sortedTableData = sortedRows[options.sortByColumn];

          $columnHeader = $columnHeader.filter(':nth-child('+(columnToSort + 1)+')')
          .removeClass('macro-table-sort-ascending macro-table-sort-descending')
          .addClass('macro-table-sort-loading');

          workerSortRow.call(this, sortedTableData, columnData, $columnHeader);
          return;

        } else {

          options.sortByColumn = '';
          sortedTableData = options.tableData;
        }
      
      //columnToSort is a column field name
      } else {

        options.sortByColumn = columnToSort;
        
        if(columnToSort != '') {

          for(var columnIndex = options.columns.length - 1; columnIndex >= 0; columnIndex--) { //TODO: make this a helper function?
            if(options.columns[columnIndex].field == columnToSort) {
              
              columnData = options.columns[columnIndex];

              //when this function is called with columnToSort as a String value, we know this is an internal
              //re-rendering without intention of changing the sort order direction
              
              break;
            }
          }

          sortedTableData = sortedRows[columnToSort];

        } else {

          sortedTableData = options.tableData;
        }
      }

      this._renderTableRows(sortedTableData);
    },

    /**
     * @method _reRender
     * @description re-render the entire table and restore it to the original scroll position
     * @private
     */
    _reRender: function() {
      var scrollPositionLeft = currentColumn,
        scrollPositionTop = currentRow; //FIXME: this will be broken if looking at a subRow

      //this._init(); //causes currentColumn and currentRow to reset to 0
      this._renderTableHeader();
      this._sortTable(this.options.sortByColumn); //re-render table rows

      this.scrollToColumn(scrollPositionLeft)
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

    /** Public methods */

    /**
     * @method getSelectedRows
     * @description fetch the rows that have been selected (via checkboxes). If rowsSelectable option is false, returns empty array.
     * @returns {Array} ordered list of selected rows
     */
    getSelectedRows: function() {
      var selectedRows = [];

      if(this.options.rowsSelectable === true && selectedRowCount != 0) {

        for(var i = 0, len = expandedTableData.length; i < len; i++) {

          if(expandedTableData[i].selected) {
            selectedRows.push(expandedTableData[i]);
          }

          if(selectedRows.length == selectedRowCount) {
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
        tableData = options.tableData,
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
     * if no dimension is given, fit to the parent container
     */
    resizeTable: function(height, width) {
      var $macroTable = this.element,
        options = this.options,
        rowHeight = options.rowHeight,
        headerHeight = $macroTable.find('div.macro-table-scroll-shim').outerHeight() - 1,
        rowSelectorOffset = options.rowsSelectable === true ? rowSelectColumnWidth : 0,
        middleDomRow;

      //initialized undefined dimensions with parent dimensions
      height = height || $macroTable.parent().height();
      width = width || $macroTable.parent().width();

      //determine how many rows will fit in the provided height
      displayRowWindow = height < rowHeight ? ~~(defaultTableHeight / rowHeight) : ~~((height - rowHeight - scrollBarWidth) / rowHeight);

      if(options.rowBuffer < displayRowWindow) {
        console.error('options.rowBuffer',options.rowBuffer,'cannot be less than displayRowWindow',displayRowWindow,'. rowBuffer value being changed to',displayRowWindow);
        options.rowBuffer = displayRowWindow;
      }

      //size the data container wrapper
      $macroTable.find('div.macro-table-data-container-wrapper')
      .height(height - headerHeight - scrollBarWidth - 1) //-1 to account for bottom border of header
      .width(width - scrollBarWidth - 1); //-1 to account for left border

      //size the data container
      $macroTable.find('div.macro-table-data-container, div.macro-table-static-data-container')
      .height(height - headerHeight - scrollBarWidth)

      //size the scroll container
      $macroTable.find('div.macro-table-scroll-container')
      .outerHeight(height - headerHeight - 1); //may have box-sizing: border-box; set (if not webkit)

      //size the vertical drop guide for the resizing functionality
      $macroTable.find('div.macro-table-resize-guide')
      .height(height - scrollBarWidth);

      //set globals based on new table dimensions
      replaceRowWindow = options.rowBuffer / 2;
      maxTotalDomRows = displayRowWindow + (options.rowBuffer * 2);
      middleDomRow = ~~(maxTotalDomRows / 2);
      triggerUpDomRow = middleDomRow - ~~(displayRowWindow / 2) - replaceRowWindow;
      triggerDownDomRow = middleDomRow - ~~(displayRowWindow / 2) + replaceRowWindow;

      //maxTotalDomRows and the trigger rows have changed, so the table rows need to be re-rendered so that scrolling doesn't break
      this._sortTable(options.sortByColumn);
    },

    /**
     * Scroll the table to the desired row
     * @param scrollToRow {Number} the row or row index to scroll the table to
     * @param byIndex {Boolean} true if scrolling to the row index number rather 
     *  than the true row number (which may differ if any sub rows are expanded)
     */
    scrollToRow: function(scrollToRow, byIndex) {
      var options = this.options,
        tableData = options.tableData;

      if(byIndex && typeof tableData[scrollToRow] !== 'undefined') {
        scrollToRow = expandedTableData.indexOf(tableData[scrollToRow]);
      } else if(typeof scrollToRow === 'undefined') {
        scrollToRow = 0;
      }

      console.log('scroll to row',scrollToRow);

      var rowsToScroll = scrollToRow - currentRow;
      if(rowsToScroll != 0) {
        this.element.find('div.macro-table-scroll-container').scrollTop(scrollTop + (rowsToScroll * options.rowHeight));
      
      } else {
        this._refreshRows();
      }
    },

    scrollToColumn: function(scrollToColumn) {
      console.log('scroll to column',scrollToColumn);

      var $column = this.element.find('tr.macro-table-header-row th:nth-child('+(scrollToColumn + 1)+')'),
        columnOffset = $column.length > 0 ? $column.position().left : 0,
        $scroll = this.element.find('div.macro-table-scroll-container');

      scrollLeft = -1; //force a scroll

      $scroll.scrollLeft($scroll.scrollLeft() + columnOffset);
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
})( jQuery );