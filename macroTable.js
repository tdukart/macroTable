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

  var rowSelectColumnWidth = 20, //the static width of the checkbox row for selecting rows
    scrollBarWidth = 12,
    resizeColumnMinWidth = 30,
    defaultTableHeight = 200, //default the table to this height
    displayRowWindow, //the max number of rows that will show in the provided table height
    replaceRowWindow, //when a row swap is triggered, this many rows will be removed and replaced at the other end of the table

    //columns
    maxTotalDomColumns, //TODO
    currentColumn = 0, //0-indexed, describes the left-most, visible data column (direct correlation with array index). default to first column
    currentDomColumn = 0, //0-indexed, describes the left-most, visible DOM column. default to first column
    //processedColumns = [], //once columns processed from options.columns, the elements and real widths go in here

    //rows
    maxTotalDomRows, //real DOM row count would only be less than this if the amount of data is less than this number (don't need the extra DOM rows to display total data)
    scrollTop = 0, //default to top of table
    lastRow = 0,
    currentRow = 0, //0-indexed, describes the top-most, visible data row (direct correlation with array index). default to first row
    currentDomRow = 0, //0-indexed, describes the top-most, visible DOM row. default to first row
    triggerUpDomRow, //when scrolling up, when on this DOM row, a row swap will trigger
    triggerDownDomRow, //when scrolling down, when on this DOM row, a row swap will trigger

    selectedRowCount = 0; //counter to keep track of selected rows, used to optimize selecting behavior comparing currently selected to length of total rows

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
      rowElements,
      staticHeight,
      dynamicHeight;

    direction = direction || 0; //default to "no scroll" for complete re-render

    //detach the table from the DOM for impending manipulation ideally, but need to know row heights, so can't...
    $rows = $tableBody.find('tr');
    $tableBody.empty();
    $staticRows = $staticTableBody.find('tr');
    $staticTableBody.empty();

    //append all new rows to the table, since we've exhausted the ones we can reuse already in the DOM
    while(startRowIndex + renderCount != endRowIndex) {
      if(typeof tableData[startRowIndex + renderCount] !== 'undefined') {

        rowElements = renderRow.call(this, tableData[startRowIndex + renderCount], startRowIndex + renderCount);
        
        //append new rows to table
        $tableBody.append(rowElements.dynamicRow);
        $staticTableBody.append(rowElements.staticRow);

        //reconcile possible different heights between static and dynamic rows
        staticHeight = rowElements.staticRow.height();
        dynamicHeight = rowElements.dynamicRow.height();
        if(staticHeight > dynamicHeight) {
          rowElements.dynamicRow.height(staticHeight);
        } else {
          rowElements.staticRow.height(dynamicHeight);
        }

      //reached beginning or end of table
      } else {

        if(direction > 0) {
          renderCount++;
        }
        break;

      }

      renderCount += (endRowIndex > startRowIndex ? 1 : -1);
    }

    //add back previous selection of rows
    if(direction < 0) {
      $tableBody.append($rows.filter('tr:lt('+(maxTotalDomRows - renderCount)+')'));
      $staticTableBody.append($staticRows.filter('tr:lt('+(maxTotalDomRows - renderCount)+')'));
    } else if(direction > 0) {
      $tableBody.prepend($rows.filter('tr:gt('+(renderCount - 1)+')'));
      $staticTableBody.prepend($staticRows.filter('tr:gt('+(renderCount - 1)+')'));
    }

    return Math.abs(renderCount);
  }

  /**
   * function to handle the table container scrolling
   * will identify the case where a row swap needs to happen and will take care of it as well
   * @param direction {Number} number of rows to scroll (negative for up, positive for down)
   */
  function scrollTableVertical(direction) {
    var rowBuffer = this.options.rowBuffer,
      tableData = this.options.tableData,
      $tableScrollSpacer = this.element.find('div.macro-table-scroll-spacer'),
      $tableContentWrapper = this.element.find('div.macro-table-data-container-wrapper'),
      $tableContainer = $tableContentWrapper.find('div.macro-table-data-container'),
      $tableScrollWrappers = $tableContentWrapper.find('div.macro-table-scroll-wrapper'),
      $staticTableContainer = $tableContentWrapper.find('div.macro-table-static-data-container'),
      $tableBody = $tableContainer.find('tbody.macro-table-column-content'),
      $tableRows = $tableBody.find('tr'),
      newRenderCount = 0; //number of new rows we need to remove and re-add with new values

    //a huge scroll, passed the normal row swap threshold (grab the thumb with the mouse and whip it all the way in one direction)
    if(currentDomRow + direction > maxTotalDomRows || currentDomRow + direction <= 0) {

      var topRowBuffer = currentRow < rowBuffer ? currentRow : rowBuffer;

      rebuildRows.call(this, currentRow - topRowBuffer, currentRow - topRowBuffer + maxTotalDomRows);

      currentDomRow = topRowBuffer;
      //console.log('re-render',currentRow,'(DOM row)',currentDomRow);

      $tableRows = $tableBody.find('tr'); //refetch rows, since they've likely changed

    //more normal situations
    } else {

      //scrolling down
      if(direction > 0) { 

        currentDomRow = Math.min(currentDomRow + direction, tableData.length - maxTotalDomRows); //the DOM row that the table would be at, if a detach weren't about to happen

        //convenience variables to make debuggin gthe logic easier
        var finalDomRowWindow = tableData.length - rowBuffer - rowBuffer - displayRowWindow, //the final row window render starts at this row
          remainingDomRows = $tableRows.filter(':gt('+(currentDomRow - 1)+')').length;
          isInFinalDomWindow = currentRow > finalDomRowWindow,
          moreRowRenderingNeeded = tableData.length - currentRow > remainingDomRows && remainingDomRows <= maxTotalDomRows - rowBuffer - 1;

        //render new rows appropriate to current DOM possition, or if a big jump landed into the final DOM window and need the remaining rows fleshed out
        if(!isInFinalDomWindow || (isInFinalDomWindow && moreRowRenderingNeeded)) {

          newRenderCount = currentDomRow - rowBuffer;
          if(newRenderCount <= 0) {
            console.warn('newRenderCount should never be less than 1 but it is',newRenderCount,'Probably due to overloaded scroll listener');
          } else {

            currentDomRow -= rebuildRows.call(this, currentRow + maxTotalDomRows - currentDomRow, currentRow + maxTotalDomRows - currentDomRow + newRenderCount, direction);
            //console.log('scrolling down',currentRow,'(DOM row)',currentDomRow);

            $tableRows = $tableBody.find('tr'); //refetch rows, since they've likely changed
          }

        //in the finalDomRowWindow, add margin to bottom of wrapper to allow scrolling the last row completely into the visible window
        } else {

          var distanceFromBottomToNewLastDomRow = 0,
            newLastDomRow,
            tableContainerHeight = $tableContainer.height();

          //loop through rows backwards to find the new truly last row that will allow the last row to show
          $($tableRows.get().reverse()).each(function(i, element) {
            distanceFromBottomToNewLastDomRow += $(element).height();
            if(distanceFromBottomToNewLastDomRow > tableContainerHeight) {
              distanceFromBottomToNewLastDomRow -= $(element).height();
              newLastDomRow = $tableRows.length - i + 1;
              return false;
            }
          });

          //add calculated margins to allow scrolling to bring last row into view
          $tableScrollSpacer.css('margin-bottom', (newLastDomRow - rowBuffer - displayRowWindow) * this.options.rowHeight);
          $tableScrollWrappers.css('margin-bottom', tableContainerHeight - distanceFromBottomToNewLastDomRow);

        }

      //scrolling up
      } else if(direction < 0) { 

        currentDomRow = Math.max(currentDomRow + direction, 0); //the DOM row that the table would be at, if a detach weren't about to happen
        
        if(currentDomRow <= triggerUpDomRow && currentRow > replaceRowWindow) {

          newRenderCount = maxTotalDomRows - currentDomRow - displayRowWindow - rowBuffer;
          if(newRenderCount <= 0) {
            console.warn('newRenderCount should never be less than 1 but it is',newRenderCount,'Probably due to overloaded scroll listener');
          } else {

            currentDomRow += rebuildRows.call(this, currentRow - currentDomRow - 1 - newRenderCount, currentRow - currentDomRow, direction);
            //console.log('scrolling up',currentRow,'(DOM row)',currentDomRow);

            $tableRows = $tableBody.find('tr'); //refetch rows, since they've likely changed
          }
        }

      } //scroll up
    } //else

    var scrollTop = $tableRows.eq(currentDomRow).offset().top - $tableBody.offset().top;
    //console.log('current dom row (top visible row)',currentDomRow,'currentRow',currentRow,'from top',scrollTop);
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
   * @param {Number} index The row number being rendered
   */
  function renderRow(data, index) {
    var columns = this.options.columns,
      isRowsSelectable = this.options.rowsSelectable === true,
      dynamicRowColumns = '',
      staticRowColumns = '',
      $dynamicRow = $(document.createElement('tr')),
      $staticRow = $(document.createElement('tr'));

    //give even rows a stripe color
    if(index % 2 == 0) {
      $dynamicRow.addClass('macro-table-row-stripe');
      $staticRow.addClass('macro-table-row-stripe');
    }

    //if selecting rows is enabled and this row has already been selected, style appropriately
    if(isRowsSelectable && data.selected) {
      $dynamicRow.addClass('macro-table-highlight');
      $staticRow.addClass('macro-table-highlight');
    }

    //build dynamically left-scrollable row
    for(var i = 0, len = columns.length; i < len; i++) {
      var columnContent = data[columns[i].field];
      if(typeof columns[i].formatter === 'function') {
        columnContent = columns[i].formatter(columnContent);
      }
      dynamicRowColumns += '<td'+(columns[i].resizable !== false ? ' class="macro-table-column-resizable"' : '')+'>'+columnContent+'</td>';
    }

    //build static row
    if(isRowsSelectable) {
      staticRowColumns += '<td><input type="checkbox" class="macro-table-checkbox" data-row-index="'+index+'" '+(data.selected ? 'checked="checked"' : '')+'/></td>';
    }

    return {
      dynamicRow: $dynamicRow.html(dynamicRowColumns),
      staticRow: $staticRow.html(staticRowColumns)
    };
  }

  $.widget( "n.macroTable", {

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
       * @field sortable {Boolean} allow column to be sorted. default true
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
      tableData: [],
      rowsSelectable: false,
    },

    /** "Private" methods */

    /**
     * @method _create
     * @description Creates the datatable. This is called by the jQuery widget framework.
     * @private
     */
    _create: function() {
      var self = this,
        $macroTable = this.element,
        rowHeight = this.options.rowHeight;

      $macroTable.hide()
      .empty()
      .html('<div class="macro-table-header-wrapper">'+
        '<div class="macro-table-static-header">'+
          '<table>'+
            '<colgroup class="macro-table-static-column-sizer"></colgroup>'+
            '<tr class="macro-table-static-header-row"></tr>'+
          '</table>'+
        '</div>'+
        '<div class="macro-table-header">'+
          '<div class="macro-table-scroll-wrapper">'+
            '<table>'+
              '<colgroup class="macro-table-column-sizer"></colgroup>'+
              '<tr class="macro-table-header-row"></tr>'+
            '</table>'+
          '</div>'+
        '</div>'+
      '</div>'+
      '<div class="macro-table-data-container-wrapper">'+
        '<div class="macro-table-static-data-container">'+
          '<div class="macro-table-scroll-wrapper">'+
            '<table>'+
              '<colgroup class="macro-table-static-column-sizer"></colgroup>'+
              '<tbody class="macro-table-static-column-content"></tbody>'+
            '</table>'+
          '</div>'+
        '</div>'+
        '<div class="macro-table-data-container">'+
          '<div class="macro-table-scroll-wrapper">'+
            '<table>'+
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
      '<div class="macro-table-resize-guide"></div>')
      .addClass('macro-table');

      var $scroll = $macroTable.find('div.macro-table-scroll-container'),
        $dataContainer = $macroTable.find('div.macro-table-data-container'),
        $staticDataContainer = $macroTable.find('div.macro-table-static-data-container'),
        $resizer = $macroTable.find('div.macro-table-resize-guide'),
        $reorderGuide = $macroTable.find('div.macro-table-reorder-guide'),
        $header = $macroTable.find('div.macro-table-header table'),
        $staticHeaderRow = $macroTable.find('div.macro-table-static-header tr.macro-table-static-header-row'),
        $columnToResize;

      //shortcut function to remove styling for when hovering over the resizer handle
      function deselectResizeHandle() {
        if(typeof $columnToResize !== 'undefined') {
          $columnToResize.removeClass('macro-table-column-resize');
          $columnToResize = undefined;
        }
        $resizer.removeClass('macro-table-highlight');
      }

      //mousedown, mouseup on the column headers, used for column ordering
      var mouseDownTimeout;
      if(this.options.reorderable === true) {
        $header.bind('mousedown', function(e) {
          e.preventDefault();
          var $element = $(e.target);
          if($element.is('th.macro-table-column-reorderable')) {
            //trigger reordering mode if holding down for 1 second
            mouseDownTimeout = setTimeout(function() {
              $macroTable.addClass('macro-table-column-moving');
              
              $reorderGuide.width($element.outerWidth())
              .css('left', $dataContainer.scrollLeft() + $element.position().left);
              
              $resizer.css('left', ($element.position().left - ($resizer.outerWidth() / 2)) + 'px');
              
              $macroTable.find('colgroup.macro-table-column-sizer col').filter(':nth-child('+($element.index() + 1)+')')
              .addClass('macro-table-selected-column');
              
              console.log('offset column',$element.offset().left,'position column',$element.position().left,'resizer',$dataContainer.scrollLeft() + $element.position().left - ($resizer.outerWidth() / 2));
            }, 1000);
          }
        }).bind('mouseup', function(e) {
          clearTimeout(mouseDownTimeout);

          var newIndex = $(e.target).index(),
            columnToReorderIndex = $macroTable.find('col.macro-table-selected-column')
          .removeClass('macro-table-selected-column')
          .filter(':first').index();
          $macroTable.removeClass('macro-table-column-moving');

          if(columnToReorderIndex != newIndex) {
            self._moveColumn(columnToReorderIndex, newIndex);
          }
        });
      }

      //row sorting listener
      $header.bind('click', function(e) {
        if(!$macroTable.hasClass('macro-table-column-moving')) {
          var $element = $(e.target);
          if($element.hasClass('macro-table-column-sortable')) {
            console.log('sort column');
            //TODO
          }
        }
        //TODO select all checkbox
      });

      $staticDataContainer.delegate('input.macro-table-checkbox', 'click', function(e) {
        var tableData = self.options.tableData,
          $headerCheckbox = $staticHeaderRow.find('input.macro-table-select-toggle'),
          $checkbox = $(this),
          $checkboxRow = $checkbox.parents('tr'),
          domRow = $checkboxRow.index(),
          dataRow = $checkbox.data('row-index'),
          $dataRow = $macroTable.find('tbody.macro-table-column-content tr').eq(domRow);

        if($checkbox.is(':checked')) {
          $checkboxRow.addClass('macro-table-highlight');
          $dataRow.addClass('macro-table-highlight');
          tableData[dataRow].selected = true;
          selectedRowCount++;
        } else {
          $checkboxRow.removeClass('macro-table-highlight');
          $dataRow.removeClass('macro-table-highlight');
          tableData[dataRow].selected = false;
          selectedRowCount--;
        }

        //set header checkbox state
        if(selectedRowCount == 0) { //no rows selected

          $headerCheckbox.attr('checked', false);
          $headerCheckbox[0].indeterminate = false;

        } else if(selectedRowCount == tableData.length) { //all rows selected

          $headerCheckbox.attr('checked', true);
          $headerCheckbox[0].indeterminate = false;

        } else { //at least one row selected, but not all

          $headerCheckbox[0].indeterminate = true;
        }
      });

      //mousemove event on the table root element, handling movement for column reordering and column resizing
      var lastPageX, scrollColumnTimer;
      $macroTable.bind('mousemove', function(e) {
        var $element = $(e.target),
          resizerWidth = $resizer.outerWidth(),
          thisLastPageX = lastPageX ? lastPageX : e.pageX;

        //process enabling/disabling the resize handle when hovering
        if(!$macroTable.hasClass('macro-table-resizing') && !$macroTable.hasClass('macro-table-column-moving')) {

          if($element.hasClass('macro-table-column-resizable')) {

            var thumbPosition = $element.position().left + $element.outerWidth() - ~~(resizerWidth / 2);

            if(e.pageX - $dataContainer.offset().left >= thumbPosition) {

              if(typeof $columnToResize !== 'undefined') {
                $columnToResize.removeClass('macro-table-column-resize');
              }
              $columnToResize = $element;
              $columnToResize.addClass('macro-table-column-resize');
              $resizer.addClass('macro-table-highlight')
              .css('left', thumbPosition + $dataContainer.position().left);

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
            $resizer.css('left', 
              //TODO: verify this works with selectable rows and collapsible rows turned on
              Math.max(
                Math.min(
                  $macroTable.outerWidth() - scrollBarWidth - resizerWidth, //max left position
                  e.pageX - ($resizer.outerWidth() * 2) //current cursor position
                ), 
                $columnToResize.offset().left + resizeColumnMinWidth //min resize position
              ) + 'px'
            ); 
          }, 0);

        } else if($macroTable.hasClass('macro-table-column-moving')) {
          e.stopPropagation();

          //reposition the reorder guide, do it out of the thread for performance improvements
          setTimeout(function setReorderGuidePosition() { 
            var scrollOffset = $dataContainer.scrollLeft(),
              cursorOffset = e.pageX - $macroTable.offset().left,
              currentIndex = $macroTable.find('col.macro-table-selected-column').first().index(),
              newIndex,
              $newColumn;

            $visibleColumns = $header.find('th'); //TODO: filter more intelligently (only look at columns visible in window)
            $visibleColumns.each(function(i, column) {
              var $column = $(column);
              if(e.pageX < $column.position().left + $column.outerWidth() || i == self.options.columns.length - 1) {
                $newColumn = $column;
                newIndex = $column.index();
                return false;
              }
            });

            //handle scrolling the columns if dragging the guide to the edges of the container
            var isScrollingLeft = $newColumn.position().left + $newColumn.outerWidth() > $dataContainer.outerWidth(),
              isScrollingRight = $newColumn.position().left == 0 && scrollOffset != 0;
            if(isScrollingLeft || isScrollingRight) {
              if(typeof scrollColumnTimer === 'undefined') {
                scrollColumnTimer = setTimeout(function() {
                  scrollColumnTimer = undefined;

                  $scroll.scrollLeft(
                    scrollOffset + ($newColumn.outerWidth() * (isScrollingLeft ? 1 : -1))
                  );
                  //force refresh, the recalculate position
                  setTimeout(function() {
                    setReorderGuidePosition();
                  }, 0);
                }, 1000);
              }
            } else {
              clearTimeout(scrollColumnTimer);
              scrollColumnTimer = undefined;
            }

            $reorderGuide.css('left', Math.max(
              0, //rightmost possible position
              Math.min(
                cursorOffset - ($reorderGuide.outerWidth() / 2), //$reorderGuide.position().left + (e.pageX - thisLastPageX),
                $header.find('th:last').position().left //leftmost possible position
              ) + scrollOffset
            ) + 'px');
            //console.log('reorder guide left scroll offset',scrollOffset,'leftmost possible position',$header.find('th:last').position().left,'mouse position',e.pageX - $macroTable.offset().left - ($reorderGuide.outerWidth() / 2) + scrollOffset);

            //position the resizer guide to the boundary of the column to act as an indicator for where the column would be dropped
            $resizer.css('left', (
              $newColumn.position().left +
              (newIndex > currentIndex ? $newColumn.outerWidth() - $resizer.outerWidth() - 1 : 0)
            ) + 'px');
            //console.log('left',$reorderGuide.css('left'),'current index',currentIndex,'new index',newIndex,'scroll left',$dataContainer.scrollLeft());
          }, 0);
        }

        lastPageX = e.pageX;
      });

      //mousewheel for table scrolling, wrapper for scrolling the scroll container
      $dataContainer.bind('mousewheel', function(e, delta, deltaX, deltaY) {
        e.preventDefault();
        if(deltaY < 0) {
          $scroll.scrollTop(scrollTop + rowHeight);
        } else {
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
      var tableScrollLeft;
      $scroll.scroll(function(e) {
        var lastScrollTop = scrollTop,
          lastTableScrollLeft = tableScrollLeft;
        scrollTop = $(this).scrollTop();
        tableScrollLeft = $(this).scrollLeft();

        var rowsToScroll = Math.abs(~~(scrollTop / rowHeight) - ~~(lastScrollTop / rowHeight));
        if(rowsToScroll > 0) {
          lastRow = currentRow;
          if(lastScrollTop < scrollTop) {
            if(currentRow < self.options.tableData.length - 1) {
              currentRow += rowsToScroll;
            }
            scrollTableVertical.call(self, rowsToScroll);
            //console.log('scrolling down to row',currentRow,'by',rowsToScroll,'rows');
          } else if (lastScrollTop > scrollTop){
            if(currentRow > 0) {
              currentRow -= rowsToScroll;
            }
            scrollTableVertical.call(self, -rowsToScroll);
            //console.log('scrolling up to row',currentRow,'by',rowsToScroll,'rows');
          }
        }

        if(tableScrollLeft != lastTableScrollLeft) {
          scrollTableHorizontal.call(self);
        }
        //console.log('Scrolling .macro-table-scroll-container: lastScrollTop',lastScrollTop,'scrollTop',scrollTop,'calculatedRow',calculatedRow,'lastCalculatedRow',lastCalculatedRow,'rowsToScroll',rowsToScroll);
      });

      //mousedown for the resizer, used when resizing columns
      var resizePositionStart = 0;
      $resizer.bind('mousedown', function(e) {
        resizePositionStart = e.pageX;

        //the resizer has been grabbed, attach listeners to the container to allow it to move around
        var $resizer = $(this);
        
        $resizer.addClass('macro-table-active');
        self.element.addClass('macro-table-resizing')
        .bind('mouseup',function(e) {
          //the handle has been dragged around and has now been let go
          e.stopPropagation();

          var $columnContainers = $macroTable.find('colgroup.macro-table-column-sizer'), //finds the header and content sizers (2 elements)
            $columns = $columnContainers.filter(':first').find('col'),
            columnNumber = $macroTable.find('.macro-table-column-resize').index(),
            $columnSizers = $columnContainers.find('col:nth-child('+(columnNumber + 1)+')'),
            widthDelta = e.pageX - resizePositionStart,
            marginAdded = 0,
            totalColumnWidth = 0,
            tableViewportWidth = $macroTable.parent().width() - scrollBarWidth,
            newWidth = $columnSizers.width() + widthDelta;

          //clean up the mousemove and mouseup events on the container
          self.element.unbind('mouseup')
          .removeClass('macro-table-resizing');

          //calculate how much the column should be resized, and resize the columns
          $columnSizers.width(newWidth);

          for(var i = $columns.length - 1; i >= 0; i--) {
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

          resizePositionStart = 0;

          if(typeof self.options.onColumnResize === 'function') {
            self.options.onColumnResize(columnNumber, newWidth);
          }
        });
      });

      $macroTable.show();
    },

    /**
     * @method _init
     * @description Initializes the variables and populates the table with data. This is called by the jQuery widget framework.
     * @private
     */
    _init: function() {
      var self = this,
        options = this.options,
        rowHeight = options.rowHeight,
        tableData = options.tableData,
        columns = options.columns,
        totalColumns = columns.length,
        totalRows = tableData.length,
        $macroTable = this.element,
        $headerRow = $macroTable.find('div.macro-table-header tr.macro-table-header-row'),
        $staticHeaderRow = $macroTable.find('div.macro-table-static-header tr.macro-table-static-header-row'),
        $leftScrollWrapperHeader = $macroTable.find('div.macro-table-header div.macro-table-scroll-wrapper'),
        $leftScrollWrapperBody = $macroTable.find('div.macro-table-data-container div.macro-table-scroll-wrapper'),
        $tableBody = $macroTable.find('tbody.macro-table-column-content'),
        $staticTableBody = $macroTable.find('tbody.macro-table-static-column-content'),
        $columnSizers = $macroTable.find('colgroup.macro-table-column-sizer'),
        $staticColumnSizers = $macroTable.find('colgroup.macro-table-static-column-sizer'),
        $resizer = $macroTable.find('div.macro-table-resize-guide'),
        totalColumnWidth = 0,
        tableViewportWidth = $macroTable.parent().width() - scrollBarWidth,
        marginAdded;

      //initialize global variables, reinitialize in case table is being re-rendered
      scrollTop = 0;
      currentColumn = 0;
      currentDomColumn = 0;
      lastRow = 0;
      currentRow = 0;
      currentDomRow = 0;

      $headerRow.empty();
      $columnSizers.empty();
      $staticColumnSizers.empty();

      if(options.rowsSelectable === true /*|| other.settings.that.enable.static.column */) {
        $macroTable.addClass('macro-table-static-column-enabled');
      } else {
        $macroTable.removeClass('macro-table-static-column-enabled');
      }

      //set up table for rows to have checkbox columns, sizing handled in .resizeTable()
      if(options.rowsSelectable === true) {
        var $checboxColumnSizer = $(document.createElement('col')).width(rowSelectColumnWidth),
          $checkboxColumn = $(document.createElement('th')).html('<input type="checkbox" class="macro-table-checkbox macro-table-select-toggle" />');

        //wire toggle all rows behavior
        $checkboxColumn.find('input').change(function(e) {
          var tableData = self.options.tableData,
            $checkboxes = $staticTableBody.find('input.macro-table-checkbox'),
            $tableRows = $staticTableBody.find('tr').add($tableBody.find('tr')),
            isToggled;

          //header checkbox selected or indeterminate (rows have already been individually selected)
          if(this.indeterminate === true || $(this).is(':checked')) {

            isToggled = true;
            $checkboxes.attr('checked', true);
            $tableRows.addClass('macro-table-highlight');
            selectedRowCount = tableData.length;

          //header checkbox deselected
          } else {

            isToggled = false;
            $checkboxes.attr('checked', false);
            $tableRows.removeClass('macro-table-highlight');
            selectedRowCount = 0;
          }

          //set the row data structure to the appropriate selected state
          for(var i = 0, len = tableData.length; i < len; i++) {
            tableData[i].selected = isToggled;
          }
        });

        $staticColumnSizers.append($checboxColumnSizer);
        $staticHeaderRow.append($checkboxColumn);

        $macroTable.addClass('macro-table-rows-selectable');
      } else {
        $macroTable.removeClass('macro-table-rows-selectable');
      }

      this.resizeTable(options.height, options.width);

      replaceRowWindow = options.rowBuffer / 2;
      maxTotalDomRows = displayRowWindow + (options.rowBuffer * 2);
      maxTotalDomColumns = 100;
      middleDomRow = ~~(maxTotalDomRows / 2);
      triggerUpDomRow = middleDomRow - ~~(displayRowWindow / 2) - replaceRowWindow;
      triggerDownDomRow = middleDomRow - ~~(displayRowWindow / 2) + replaceRowWindow;

      //build the column headers
      for(var i = totalColumns - 1; i >= 0; i--) {
        var columnWidth = typeof columns[i].width !== 'undefined' ? parseInt(columns[i].width) : this.options.defaultColumnWidth;

        if(i < maxTotalDomColumns) {
          var $colSizer = $(document.createElement('col')).width(columnWidth),
            $headerColumn = $(document.createElement('th'))
          .html(columns[i].title)
          .addClass(columns[i].className);

          if(options.reorderable === true) {
            $headerColumn.addClass('macro-table-column-reorderable');
          }

          if(columns[i].sortable !== false) {
            $headerColumn.addClass('macro-table-column-sortable');
          }

          if(columns[i].resizable !== false) {
            $headerColumn.addClass('macro-table-column-resizable');
          }

          $headerRow.prepend($headerColumn);
          $columnSizers.prepend($colSizer);

          columnWidth = $headerColumn.outerWidth();
        }

        totalColumnWidth += columnWidth;
        if(typeof marginAdded === 'undefined' && totalColumnWidth > tableViewportWidth) {
          marginAdded = tableViewportWidth - (totalColumnWidth - columnWidth);
        }
      }

      //size the scroll spacer to the theoretical max height of all the data
      $macroTable.find('div.macro-table-scroll-spacer')
      .height(rowHeight * (totalRows + 1))
      .width(totalColumnWidth + marginAdded);

      $leftScrollWrapperBody.width(totalColumnWidth + marginAdded)
      $leftScrollWrapperHeader.width(totalColumnWidth + marginAdded + scrollBarWidth);

      //populate table data into the table's DOM
      $tableBody.empty();
      for(var i = 0; i < totalRows; i++) {
        if(i < maxTotalDomRows) {
          var staticHeight, dynamicHeight,
            rowElements = renderRow.call(this, tableData[i], i);

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
        } else {
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
      var options = this.options;

      //handle specific option cases here
      switch(key) {
        case 'disabled':
          break;

        case 'columns':
          var scrollPositionLeft = currentColumn,
            scrollPositionTop = currentRow;

          this._init(); //causes currentColumn and currentRow to reset to 0

          this.scrollToColumn(scrollPositionLeft)
          this.scrollToRow(scrollPositionTop);
          break;

        case 'rowsSelectable':
          //TODO add class managment for macro-table-rwos-selectable too
          if(value === true) {
            this.element.addClass('macro-table-static-column-enabled');
          } else {
            this.element.removeClass('macro-table-static-column-enabled');
          }
          this.resizeTable(options.height, options.width);
          break;
      }

      // In jQuery UI 1.8, you have to manually invoke the _setOption method from the base widget
      $.Widget.prototype._setOption.apply( this, arguments );
      // In jQuery UI 1.9 and above, you use the _super method instead
      //this._super( "_setOption", key, value );
    },

    /**
     * @method _moveColumn
     * @description move a column to a new position
     * @private
     */
    _moveColumn: function(columnToReorder, newIndex) {
      console.log('_move',columnToReorder,'to',newIndex);

      var columns = this.options.columns;
      newIndex = newIndex > columns.length - 1 ? columns.length - 1 : newIndex;
      columns.splice(newIndex, 0, columns.splice(columnToReorder, 1)[0]);
      this._setOption('columns', columns);

      if(typeof this.options.onColumnReorder === 'function') {
        this.options.onColumnReorder(columns);
      }
    },

    /** Public methods */

    /**
     * @method getSelectedRows
     * @description fetch the rows that have been selected (via checkboxes). If rowsSelectable option is false, returns empty array.
     * @returns {Array} ordered list of selected rows
     */
    getSelectedRows: function() {
      var selectedRows = [],
        tableData = this.options.tableData;

      if(this.options.rowsSelectable === true && selectedRowCount != 0) {

        for(var i = 0, len = tableData.length; i < len; i++) {

          if(tableData[i].selected) {
            selectedRows.push(tableData[i]);
          }

        }
      }

      return selectedRows;
    },

    /**
     * Resize the table components to fit the supplied dimensions
     * if no dimension is given, fit to the parent container
     */
    resizeTable: function(height, width) {
      var $macroTable = this.element,
        rowHeight = this.options.rowHeight,
        rowSelectorOffset = this.options.rowsSelectable === true ? rowSelectColumnWidth : 0;

      //initialized undefined dimensions with parent dimensions
      height = height || $macroTable.parent().height();
      width = width || $macroTable.parent().width();

      //determine how many rows will fit in the provided height
      displayRowWindow = height < rowHeight ? ~~(defaultTableHeight / rowHeight) : ~~((height - rowHeight - scrollBarWidth) / rowHeight);

      if(this.options.rowBuffer < displayRowWindow) {
        console.error('options.rowBuffer',this.options.rowBuffer,'cannot be less than displayRowWindow',displayRowWindow,'. rowBuffer value being changed to',displayRowWindow);
        this.options.rowBuffer = displayRowWindow;
      }

      //size the data container wrapper
      $macroTable.find('div.macro-table-data-container-wrapper')
      .height(height - rowHeight - scrollBarWidth)
      .width(width - scrollBarWidth);

      //size the data container
      $macroTable.find('div.macro-table-data-container, div.macro-table-static-data-container')
      .height(height - rowHeight - scrollBarWidth)

      //size the scroll container
      $macroTable.find('div.macro-table-scroll-container')
      .height(height - rowHeight);

      //size the vertical drop guide for the resizing functionality
      $macroTable.find('div.macro-table-resize-guide')
      .height(height - scrollBarWidth);

      //size the vertical column reorder guide
      $macroTable.find('div.macro-table-reorder-guide')
      .height(height - rowHeight - scrollBarWidth);
    },

    scrollToRow: function(scrollToRow) {
      console.log('scroll to row',scrollToRow);

      var rowsToScroll = scrollToRow - currentRow;
      this.element.find('div.macro-table-scroll-container').scrollTop(scrollTop + (rowsToScroll * this.options.rowHeight));
    },

    scrollToColumn: function(scrollToColumn) {
      console.log('scroll to column',scrollToColumn);

      var $column = this.element.find('tr.macro-table-header-row th:nth-child('+scrollToColumn+')'),
        columnOffset = $column.length > 0 ? $column.position().left : 0,
        $scroll = this.element.find('div.macro-table-scroll-container');
      
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