import React, {Component} from 'react';
import PropTypes from 'prop-types';
import moment from 'moment'
import ReactAgendaItem from './reactAgendaItem';
import classNames from 'classnames';
import {guid, getUnique, getLast, getFirst , mapItems} from './helpers.js';
import * as DragDropHelper from './dragAndDropHelper.js';

let startSelect
let endSelect
let isDragging = false;
let isMouseDown = false;
let draggedElement;
let timeNow = moment();
let draggedItem;
let ctrlKey = false;

let DEFAULT_ITEM = {
  name: '',
  classes: '',
  cellRefs: []
};



    let mouse = {
        x: 0,
        y: 0,
        startX: 0,
        startY: 0
    };
    let element = null;
    let helper = null;


export default class ReactAgenda extends Component {

  constructor(props) {
    super(props);
    this.state = {
      date: moment(),
      items: {},
      itemOverlayStyles: {},
      highlightedCells: [],
      numberOfDays:4,
      autoScaleNumber:0,
      focusedCell: null
    };
    this.handleBeforeUpdate = this.handleBeforeUpdate.bind(this);
    this.handleMouseClick = this.handleMouseClick.bind(this);
    this.handleMouseOver = this.handleMouseOver.bind(this);
    this.removeSelection = this.removeSelection.bind(this);
    this.handleAllClickStarts = this.handleAllClickStarts.bind(this);
    this.handleAllClickEnds = this.handleAllClickEnds.bind(this);
    this.onDragStart = this.onDragStart.bind(this);
    this.onDragEnter = this.onDragEnter.bind(this);
    this.onDragOver = this.onDragOver.bind(this);
    this.onDragEnd = this.onDragEnd.bind(this);
    this.onDragHandlerStart = this.onDragHandlerStart.bind(this);
    this.onDragHandlerEnd = this.onDragHandlerEnd.bind(this);
    this.getSelection = this.getSelection.bind(this);
    this.editEvent = this.editEvent.bind(this);
    this.removeEvent = this.removeEvent.bind(this);
    this.dragEvent = this.dragEvent.bind(this);
    this.duplicateEvent = this.duplicateEvent.bind(this);
    this.resizeEvent = this.resizeEvent.bind(this);
    this.updateDimensions = this.updateDimensions.bind(this);
  }

  /********************/
  /*  Life Cycle      */
  /********************/
  componentWillMount() {
    this.handleBeforeUpdate(this.props);
    if(this.props.autoScale){
      window.removeEventListener("resize", this.updateDimensions);

    }
    if(this.props.locale && this.props.locale != "en" ){
      moment.locale(this.props.locale);
    }

  }

  componentWillReceiveProps(props) {

    this.handleBeforeUpdate(props);
  }

  componentDidMount() {


    if(this.props.autoScale){
      window.addEventListener("resize", this.updateDimensions);
      this.updateDimensions();

    }


  }

  updateDimensions() {
    let width = Math.round((document.getElementById('agenda-wrapper').offsetWidth / 150 ) - 1)
    this.setState({autoScaleNumber:width , numberOfDays:width})
  }

  /********************/
  /*  Item Renderers  */
  /********************/
  getHeaderColumns() {
    let cols = [];

    if (this.state.numberOfDays === 5) {
      cols = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    } else {
      for (let i = 0; i < this.state.numberOfDays; i++) {
        cols.push(moment(this.state.date).add(i, 'days').toDate());
      }
    }
    return cols;
  }

  getBodyRows() {
    let rows = [];
    let interval = (60 / this.props.rowsPerHour);
   
    if(this.props.startAtTime && typeof this.props.startAtTime === "number" ){
         for (let i = 0; i < 24 * this.props.rowsPerHour; i++) {
          if(this.props.endAtTime != 0 && (this.props.endAtTime - this.props.startAtTime) * this.props.rowsPerHour  >=  i ){
           rows.push(moment(this.state.date).hours(this.props.startAtTime).minutes(0).seconds(0).milliseconds(0).add(Math.floor(i * interval), 'minutes'));  
          }
     
    }
    return rows;

    }
    
    for (let i = 0; i < 24 * this.props.rowsPerHour; i++) {
      rows.push(moment(this.state.date).hours(7).minutes(0).seconds(0).milliseconds(0).add(Math.floor(i * interval), 'minutes'));
    }
    return rows;

  }

  getMinuteCells(rowMoment) {
    let cells = [];
    for (let i = 0; i < this.state.numberOfDays; i++) {
      let cellRef = moment(rowMoment).add(i, 'days').format('YYYY-MM-DDTHH:mm:ss');
      cells.push({
        cellRef: cellRef,
        item: this.state.items[cellRef] || DEFAULT_ITEM
      });
    }
    return cells;
  }

  /********************/
  /*  Event Handlers  */
  /********************/
  handleBeforeUpdate(props) {
    if (props.hasOwnProperty('startDate') && props.startDate !== this.state.date.toDate()) {
      this.setState({
        date: moment(props.startDate)
      });
    }

    if (props.hasOwnProperty('items')) {
      this.setState({
        items: mapItems(props.items, props.rowsPerHour, props.timezone)
      });
    }




    if (props.hasOwnProperty('numberOfDays') && props.numberOfDays !== this.state.numberOfDays && !this.props.autoScale) {
      this.setState({numberOfDays: props.numberOfDays});
    }

    if (props.hasOwnProperty('minDate') && (!this.state.hasOwnProperty('minDate') || props.minDate !== this.state.minDate.toDate())) {
      this.setState({
        minDate: moment(props.minDate)
      });
    }

    if (props.hasOwnProperty('maxDate') && (!this.state.hasOwnProperty('maxDate') || props.maxDate !== this.state.maxDate.toDate())) {
      this.setState({
        maxDate: moment(props.maxDate)
      });
    }
  }

  handleMouseClick(cell, bypass) {


    if (typeof cell != "string" && cell.tagName) {
      let dt = moment(cell.innerText, ["h:mm A"]).format("HH");
      let old = parseInt(dt)
      let now = new Date();
      let newdate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), old + 1, 0)
      let mom = newdate.toISOString().substring(0, newdate.toISOString().length - 5)
    if(this.props.onCellSelect) {
        return this.props.onCellSelect(mom, bypass);
      }
      }
      if(this.props.onCellSelect) {
        this.props.onCellSelect(cell, bypass);
      }

  }


  setMousePosition(e) {
        let ev = e || window.event; //Moz || IE
        if (ev.pageX) { //Moz
            mouse.x = ev.pageX + window.pageXOffset;
            mouse.y = ev.pageY + window.pageYOffset;
        } else if (ev.clientX) { //IE
            mouse.x = ev.clientX + document.body.scrollLeft;
            mouse.y = ev.clientY + document.body.scrollTop;
        }
    };


  handleMouseOver(e) {
     this.setMousePosition(e)
    if (e.buttons === 0) {
      return false;
    }
    e.preventDefault
      ? e.preventDefault()
      : e.returnValue = false
 this.removeSelection()
    if(element){
        element.style.width = Math.abs(mouse.x - mouse.startX) + 'px';
            element.style.height = Math.abs(mouse.y - mouse.startY) + 'px';
            element.style.left = (mouse.x - mouse.startX < 0) ? mouse.x + 'px' : mouse.startX + 'px';
            element.style.top = (mouse.y - mouse.startY < 0) ? mouse.y + 'px' : mouse.startY + 'px';

            
     }

     if(helper){
             helper.style.left = mouse.x  + 'px';
            helper.style.top = (mouse.y - 10 ) + 'px';
            if(e.target.classList.contains("agenda__cell") && !e.target.classList.contains("--time")){
                let strt =  moment(startSelect)
                let endd =   moment(e.target.id)
              helper.innerHTML =endd.diff(strt) > 0? strt.format('LT') + ' -- ' + endd.format('LT'): endd.format('LT') + ' -- ' + strt.format('LT')
            }
          
     }
  }

  removeSelection() {

    let old = document.getElementsByClassName('agenda__cell_selected')

    for (let i = old.length - 1; i >= 0; --i) {
      if (old[i]) {
        old[i].classList.remove('agenda__cell_selected');
      }
    }

  }

  handleAllClickStarts(e, n) {

    isMouseDown = true;
   
    this.removeSelection()
    if (e.target.classList.contains("--time") ||e.target.classList.contains("--time-now")  && !isDragging) {

      return this.handleMouseClick(e.target)
    }

    if (e.target.classList.contains("agenda__cell") && !e.target.classList.contains("--time") && !isDragging) {
      this.removeSelection()
      e.target.classList.toggle('agenda__cell_selected');
      startSelect = e.target.id
      if (e.buttons === 0) {
        return false;
      }
      this.handleMouseClick(e.target.id)
        mouse.startX = mouse.x;
            mouse.startY = mouse.y;
            element = document.createElement('div');
             element.className = 'rectangle'
            element.style.left = mouse.x + 'px';
            element.style.top = mouse.y + 'px';
            document.body.appendChild(element)
           

            if(this.props.helper){
             helper = document.createElement('div');
            helper.className = 'helper-reactangle'
             document.body.appendChild(helper)
            }
    }

          
  }

  handleAllClickEnds(e, n) {
    //  e.preventDefault ? e.preventDefault() : e.returnValue = false
    isMouseDown = false;
    isDragging = false;

    endSelect = e.target.id

   let old = document.getElementsByClassName('rectangle')
   let old2 = document.getElementsByClassName('helper-reactangle')
    
     for (let i = old.length - 1; i >= 0; --i) {
      if (old[i]) {
        old[i].remove();
      }
    }

       for (let i = old2.length - 1; i >= 0; --i) {
      if (old2[i]) {
        old2[i].remove();
      }
    }
        element = null
        helper = null


    if (startSelect && endSelect && startSelect != endSelect) {

      return this.getSelection(startSelect , endSelect)
  }


  }

  /**************** ****/
  /*  Drag Handlers   */
  /*******************/

  onDragStart(e) {

    isDragging = true;
    isMouseDown = false;
    draggedItem = e.target.id;
    e.dataTransfer.setData('text/html', e.target);
    e.dataTransfer.dropEffect = "move";
    e.dataTransfer.setDragImage(e.target, 0, 0);
  }

  onDragEnter(e) {
    e.preventDefault()
    if (!isDragging) {
      this.removeSelection()
    }
    e.dataTransfer.dropEffect = "move";
    if (e.ctrlKey) {
      e.dataTransfer.effectAllowed = "copy";
      e.dataTransfer.dropEffect = "copy";
    }
  }

  onDragOver(e) {
     e.preventDefault()
    e.stopPropagation();

    if (e.target.id === draggedElement) {
      return false;
    }

    if (e.ctrlKey) {
      e.dataTransfer.effectAllowed = "copy";
      ctrlKey = true;
    } else {
      e.dataTransfer.dropEffect = "move";
    }

    if (e.target.classList.contains("cell-item")) {

      return draggedElement = e.target.parentNode.parentNode.id

    }

    if (e.target.classList.contains("handler")) {
      return draggedElement = e.target.parentNode.id

    }
    if (e.target.classList.contains("dragDiv")) {
      return draggedElement = e.target.parentNode.id

    }

    draggedElement = e.target.id

  }

  dragEvent(id, d) {
    if(!this.props.onChangeEvent){
      return;
    }
    let date = d;
    let itm;
    if (!this.refs[d]) {
      return;
    }
    if (this.refs[d].tagName !== 'TD') { // when user drag and drop an event into another we assign parent id
      date = this.refs[d].parentNode.id;
    }
    let items = this.props.items
    if (id && date && items) {
      for (let i in items) {
        if (items[i]._id === id) {
          let start = moment(items[i].startDateTime);
          let end = moment(items[i].endDateTime);
          let duration = moment.duration(end.diff(start));
          let newdate = moment(date).subtract((duration % (60 / this.state.rowsPerHour)))
          let newEnddate = moment(newdate).add(duration)
          items[i].startDateTime = new Date(newdate)
          items[i].endDateTime = new Date(newEnddate)
          itm = items[i]
          break;
        }
      }
        this.props.onChangeEvent(items, itm);
    }
  }

  duplicateEvent(id, d) {
    let date = d;
    let itm;
    let oldItm;
    if (!this.refs[d]) {
      return;
    }
    if (this.refs[d].tagName !== 'TD') { // when user drag and drop an event into another we assign parent id
      date = this.refs[d].parentNode.id;
    }
    let items = this.props.items
    if (id && date && items) {
      for (let i in items) {
        if (items[i]._id === id) {
          itm = Object.assign({} , items[i] , {_id:guid()} );
          let start = moment(itm.startDateTime);
          let end = moment(itm.endDateTime);
          let duration = moment.duration(end.diff(start));
          let newdate = moment(date)
          let newEnddate = moment(newdate).add(duration)
          itm.startDateTime = new Date(newdate)
          itm.endDateTime = new Date(newEnddate)
          items.push(itm)
          if(this.props.onChangeEvent){
            this.props.onChangeEvent(items, itm);
          }
          break;
        }
      }
    }
  }

  resizeEvent(id, date) {

    if(!this.props.onChangeDuration){
        return;
    }

    let items = this.props.items;
    if (id && date && items) {


      for (let i in items ) {
        if (items[i]._id === id) {
          let difference = new Date(date) - new Date(items[i].startDateTime)
          if (difference < 1) {
            let strt = new Date(items[i].startDateTime)
            items[i].endDateTime = new Date(strt.getFullYear(), strt.getMonth(), strt.getDate(), strt.getHours(), strt.getMinutes() + 15, 0);
            this.setState({items: items})
              return this.props.onChangeDuration(items, items[i])
          }
            let newdate = moment(date)
            items[i].endDateTime = new Date(newdate)
            return this.props.onChangeDuration(items, items[i])
            break;
          }

        }
      }
    }


  onDragEnd(e) {

    let newDate = draggedElement

    if (ctrlKey) {

      this.duplicateEvent(e.target.id, newDate)
    } else{
      this.dragEvent(e.target.id, newDate)
    }
    isDragging = false;
    isMouseDown = false;
    ctrlKey = false;
    draggedElement = '';
    draggedItem = '';

  }

  onDragHandlerStart(e) {

    isDragging = true;
    e.dataTransfer.setData('text/html', e.target);
    e.dataTransfer.dropEffect = "move";
    //e.dataTransfer.setData("text/html", e.target);
    e.dataTransfer.effectAllowed = "all";


  }

  onDragHandlerEnd(e, n) {



    if (typeof draggedElement === undefined || draggedElement === '') {
      return;
    }
    let item = e.target.id || e.target.offsetParent.id


    if (this.refs[draggedElement] && this.refs[e.target.id] && this.refs[e.target.id].tagName === "DIV" && this.refs[draggedElement].tagName === "DIV") {//detect if we are resizing an event
      item = e.target.id
      draggedElement = this.refs[draggedElement].parentNode.id;
      return this.resizeEvent(item, draggedElement)
    }

    if (draggedElement === '' && !this.refs[draggedElement] && this.refs[e.target.id].tagName === "DIV") { // when user drag and drop an event into another we assign parent id
      draggedElement = this.refs[e.target.id].parentNode.id;
      return;
    }

    if (!this.refs[draggedElement] && draggedElement) { //detect if we are dragging an event from its description panel (item component)
      let old = document.getElementById(draggedElement)
      draggedElement = old.parentNode.id;
    }


    this.resizeEvent(item, draggedElement)

    isDragging = false;
    isMouseDown = false;
    draggedElement = ''
  }

  /**************************/
  /*  selection Handlers   */
  /************************/

  getSelection(start , end) {

    // let array = [];
    // let array2 = [];
    // let old = document.getElementsByClassName('agenda__cell_selected')

    // array = Object.keys(old).map(function(value, index) {
    //   return old[value].id;
    // })
    // let last = moment(getLast(array));
    // let addon = last.add((60 / this.props.rowsPerHour), 'Minutes')
    // array.push(addon.format('YYYY-MM-DDTHH:mm:00'))

    // if (this.props.onRangeSelection) {
    //   console.log('array' , array)
    //   this.props.onRangeSelection(array);
    // }
   let strt =  moment(start)
   let endd =   moment(end)
  let arr = endd.diff(strt) >0?[start,end]:[end,start];

    this.props.onRangeSelection(arr);

  }

  /***************************/
  /*  EVENTS MODIFiCATION   */
  /*************************/

  editEvent(props) {
    if (this.props.onItemEdit) {
      this.props.onItemEdit(props, true);
    }

  }

  removeEvent(item) {
    let items = this.props.items;
    let newItems = items.filter(function(el) {
      return el._id !== item._id;
    });
    if (this.props.onItemRemove) {
      this.props.onItemRemove(newItems, item);
    }
  }

  render() {

    let renderHeaderColumns = function(col, i) {
      return <th ref={"column-" + (i + 1)} key={"col-" + i} className="agenda__cell --head">
        {col}
      </th>

    };

    let renderBodyRows = function(row, i) {
      if (i % this.props.rowsPerHour === 0 ) {
        let ref = "hour-" + Math.floor(i / this.props.rowsPerHour);
        let timeLabel = moment(row);
        let differ = timeLabel.diff(timeNow, 'minutes')

        timeLabel.locale(this.props.locale);
        return (
          <tr key={"row-" + i} ref={ref} draggable={false} className="agenda__row   --hour-start">
          <td className={differ <= 60 && differ >= 0
              ? 'disable-select agenda__cell --time-now'
              : 'disable-select agenda__cell --time'} rowSpan={this.props.rowsPerHour}>{timeLabel.format('LT')}
            </td>
            {this.getMinuteCells(row).map(renderMinuteCells, this)}
          </tr>
        );
      } else {
        return (
          <tr key={"row-" + i}>
            {this.getMinuteCells(row).map(renderMinuteCells, this)}
          </tr>
        );
      }
    };

    let itmName

    let Colors = this.props.itemColors

    let ItemComponent = this.props.itemComponent
      ? this.props.itemComponent
      : ReactAgendaItem;

    let renderItemCells = function(cell, i) {

      let cellClasses = {
        'agenda__cell': true
      };
      cell['item'].forEach(function(itm) {

        cellClasses[itm.classes] = true;

      })

      let classSet = classNames(cellClasses);

      let splt = classSet.split(' ');

      splt = splt.filter(i => !i.includes('agenda__cell'))
      splt = splt.filter(i => !i.includes('undefined'))

      let nwsplt = []
      splt.forEach(function(value) {
        if (value.length > 0) {
          nwsplt.push(Colors[value])
        }
      });

      let styles = {
        height: this.props.cellHeight + 'px'
      }
      if (splt.length > 1) {

        if (nwsplt[1] === nwsplt[2]) {

          nwsplt.splice(1, 0, "rgb(255,255,255)");
        }
        nwsplt = nwsplt.join(' , ')
        styles = {
          "background": 'linear-gradient(-100deg,' + nwsplt + ')',
          height: this.props.cellHeight + 'px'
        }
      }

      let itemElement = cell.item.map(function(item, idx) {

        let last1 = getLast(item.cellRefs);
        let first1 = getFirst(item.cellRefs);

        if (first1 === cell.cellRef ) {

          return <div id={item._id} ref={cell.cellRef} key={idx} className="dragDiv" onDragStart={this.onDragStart} onDragEnd={this.onDragEnd} draggable="true">

            {first1 === cell.cellRef
              ? <i className="drag-handle-icon" aria-hidden="true"></i>
              : ''}
            {first1 === cell.cellRef
              ? <ItemComponent item={item}
                parent={cell.cellRef}
                itemColors={Colors}
                edit={this.props.onItemEdit?this.editEvent:null}
                remove={this.props.onItemRemove?this.removeEvent:null}
                days={this.props.numberOfDays}/>
              : ''}

          </div>

        }

        if (last1 === cell.cellRef && this.props.onChangeDuration) {
          return <div className="handler" style={{
            marginLeft: 8 *(idx + 1) + 'px'
          }} id={item._id} key={item._id} onDragStart={this.onDragHandlerStart} onDragEnd={this.onDragHandlerEnd} draggable="true">
            <i className="resize-handle-icon"></i>
          </div>
        }

        return '';

      }.bind(this));

      return (

        <td ref={cell.cellRef} key={"cell-" + i} className={classSet} style={styles} id={cell.cellRef}>

          {itemElement}
        </td>
      )

    }.bind(this);

    let renderMinuteCells = function(cell, i) {
      if (cell.item[0] && !cell.item._id) {
        return renderItemCells(cell, i)
      }

      let cellClasses = {
        'agenda__cell': true
      };

      cellClasses[cell.item.classes] = true;
      let last, first;
      if (cell.item.cellRefs) {
        last = getLast(cell.item.cellRefs);
        first = getFirst(cell.item.cellRefs);
      }

      let classSet = classNames(cellClasses);

      let splt = classSet.split(' ');
      splt = splt.filter(i => !i.includes('agenda__cell'));
      splt = splt.filter(i => !i.includes('undefined'));
      let nwsplt = [];
      splt.forEach(function(value) {
        if (value.length > 0) {
          nwsplt.push(Colors[value]);
        }
      });

      let styles = {
        height: this.props.cellHeight + 'px'
      }
      if (splt.length > 1) {
        nwsplt = nwsplt.join(' , ')
        styles = {
          "background": 'linear-gradient(to left,' + nwsplt + ')',
          height: this.props.cellHeight + 'px'
        }
      }

      if (splt.length == 1) {
        styles = {
          "background": nwsplt[0],
          height: this.props.cellHeight + 'px'
        }
      }

      return (
        <td ref={cell.cellRef} key={"cell-" + i} className={classSet} style={styles} id={cell.cellRef}>

          {first === cell.cellRef
            ? <div id={cell.item._id} ref={cell.item._id} className="dragDiv" onDragStart={this.onDragStart} onDragEnd={this.onDragEnd} draggable="true">

                {first === cell.cellRef && this.props.onChangeEvent
                  ? <i className="drag-handle-icon" aria-hidden="true"></i>
                  : ''}
                {first === cell.cellRef
                  ? <ItemComponent item={cell.item}
                    parent={cell.cellRef}
                    itemColors={Colors}
                    edit={this.props.onItemEdit?this.editEvent:null}
                    remove={this.props.onItemRemove?this.removeEvent:null}
                    days={this.props.numberOfDays}/>
                  : ''}

              </div>
            : ''}

          {last === cell.cellRef && this.props.onChangeDuration
            ? <div className="handler" id={cell.item._id} onDragStart={this.onDragHandlerStart} onDragEnd={this.onDragHandlerEnd} draggable="true">
                <i className="resize-handle-icon"></i>
              </div>

            : ''}

        </td>
      )
    };

    let disablePrev = function(state) {
      if (!state.hasOwnProperty('minDate')) {
        return false;
      }

      return state.date.toDate().getTime() === state.minDate.toDate().getTime();
    };

    let disableNext = function(state) {
      if (!state.hasOwnProperty('maxDate')) {
        return false;
      }

      return state.date.toDate().getTime() === state.maxDate.toDate().getTime();
    };

    return (
      <div className="agenda" id="agenda-wrapper">
        <div className="agenda__table --header">
          <table>
            <thead>
              <tr>
                <th ref="column-0" className="agenda__cell --controls">
                  <div className="agenda-controls-layout">
                  {/*   Todo: Fill this with Schedule title?   */}
                  </div>
                </th>
                {this.getHeaderColumns(this.props.view).map(renderHeaderColumns, this)}
              </tr>
            </thead>
          </table>
        </div>

        <div ref="agendaScrollContainer" className="agenda__table --body" style={{
          position: 'relative'
        }}>
          <table cellSpacing="0" cellPadding="0">

            <tbody onMouseDown={this.handleAllClickStarts} onDragEnter={this.onDragEnter} onDragOver={this.onDragOver} onMouseUp={this.handleAllClickEnds} onMouseOver={this.handleMouseOver}>
              {this.getBodyRows().map(renderBodyRows, this)}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

};

ReactAgenda.propTypes = {
  minDate: PropTypes.instanceOf(Date),
  maxDate: PropTypes.instanceOf(Date),
  startDate: PropTypes.instanceOf(Date),
  startAtTime: PropTypes.number,
  endAtTime: PropTypes.number,
  cellHeight: PropTypes.number,
  view: PropTypes.string,
  locale: PropTypes.string,
  items: PropTypes.array,
  helper:PropTypes.bool,
  itemComponent: PropTypes.element,
  numberOfDays:PropTypes.number,
  headFormat: PropTypes.string,
  rowsPerHour: PropTypes.number,
  itemColors: PropTypes.object,
  fixedHeader: PropTypes.bool,
  autoScaleNumber: PropTypes.bool
};

ReactAgenda.defaultProps = {
  minDate: new Date(),
  maxDate: new Date(new Date().getFullYear(), new Date().getMonth() + 3),
  startDate: new Date(),
  startAtTime: 0,
  endAtTime: 0,
  cellHeight: 15,
  view:"agenda",
  locale: "en",
  helper:true,
  items: [],
  autoScale:false,
  itemComponent: ReactAgendaItem,
  numberOfDays: 4,
  headFormat: "ddd DD MMM",
  rowsPerHour: 4,
  itemColors: {
    'color-1': "rgba(102, 195, 131 , 1)",
    "color-2": "rgba(242, 177, 52, 1)",
    "color-3": "rgba(235, 85, 59, 1)",
    "color-4": "rgba(70, 159, 213, 1)"
  },
  fixedHeader: true
}
