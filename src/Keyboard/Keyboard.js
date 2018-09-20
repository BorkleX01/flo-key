import React,  { Component } from 'react'
import './Keyboard.css'
import { keys } from '../Scale/Diatonic'
import { Role }  from '../Role'
import { EngineContext } from '../Engine/EngineContext'
import { Keys } from '../Keys'
import {qwertyClavier, octavePager}  from './LocalKeyboard'

class Keyboard extends Component {
  constructor(props){
    super()
    this.props = props
    this.state = {
      range : props.range,
      view : 'piano',
      mode : 'bass',
      notes: [],
      freq: [],
      intervals: [],
      keyArr: [],
      keyObj: {},
      bass: {notes:[], queue:[]},
      treble: {notes:[], queue:[]},
      queue: [],
      nom: [],
      time: 0,
      octavePage: 1
    }

    const data = keys(8)
    this.state.notes = data.note
    this.state.freq = data.freq
    this.state.int = data.intervals
    this.state.nom = data.nomenclature
    
    var pos = 0;
    const keyObj = this.state.notes.map((o, i, arr) => {
      return {int: o,
	      pos: (o === 1 ? pos : pos++),
	      freq: this.state.freq[i],
	      type: (o === 0.5 ? 'white-key' : 'black-key'),
	      nom: this.state.nom[pos-1],
              active: [],
              qwert:''}
    })
    
    this.state.keyObj = {...keyObj}
    
    this.keyRef = (ind) => this.keyRef[ind] = React.createRef();
    this.roleRef = (id) => this.roleRef[id] = React.createRef();

    this.buttonMap = new Map();
    
    this.mapButtons = (start) => {
      this.buttonMap.clear();
      qwertyClavier.map((o)=>{ this.buttonMap.set(o, start++)})
      let button = this.buttonMap.keys();
      for(let i in this.state.keyObj){
        if(this.keyRef[i] != undefined){ 
          if((i >= this.state.octavePage*12 + props.range[0])){
            this.keyRef[i].current.setState({qwert: button.next().value})
          }
          else
          {
            this.keyRef[i].current.setState({qwert: ''})
          }
        }
      }
    }

    this.keyListener = (key, ...rest) => {
      if(rest.includes('hardware')){
        this.keyRef[key].current.setState({button: true})
        this.keyRef[key].current.press()
      }
      
      if(rest.includes('add')){
        this.setState(state=> {
          state[state.mode].notes.push(key)
          state[state.mode].queue.push(state[state.mode].queue.length === 0 ?
                                       window.performance.now() :
                                       window.performance.now() - state[state.mode].queue[0])
          state.keyObj[key].active[state.mode] = true;
          return state})
      }
    }

    this.clearSeq = (mode) => {
      this.setState(state=>{
        for(let key of Object.values(state.keyObj)){key.active[mode] != undefined && delete key.active[mode]}
        state[mode].notes = []
        state[mode].queue = []
        return state
      })
    }

    this.roleListener = (v, i, mode, ...rest) => {
      if(rest.includes('load')){
        this.setState(state => {
          state[mode].notes = v
          state[mode].queue = i
          return state
        })
      } else {
        this.setState(state=>{
          state[mode].notes.splice(i,1)
          state[mode].queue.splice(i,1)
          !state[mode].notes.includes(+v) && delete state.keyObj[+v].active[mode]
          return state
        })
      }
    }
    
    this.viewClick = (e) => {
      this.setState({view: e.target.name})
    }
    
    this.modeClick = (e) => {

      this.setState({mode: e.target.id})
      if(this.state.mode === e.target.id){
        this.roleRef[e.target.id].current.setState({visible: !this.roleRef[e.target.id].current.state.visible})
      }
    }

    document.onkeypress = (e) => {
      if(e.key === octavePager[0] || e.key === octavePager[1] ){
        let pageTurn = this.state.octavePage + (e.key === octavePager[0] ? -1 : +1)
        let page = pageTurn*12 + this.props.range[0]
        if(pageTurn>=0 && page+11 <= this.props.range[1]){
          this.setState({octavePage : pageTurn})
        }
      }
      if(this.buttonMap.get(e.key) != undefined && this.buttonMap.get(e.key) < this.props.range[1] ){
        this.keyListener(this.buttonMap.get(e.key), 'hardware')
      }
    }

    this.addSeqClick = () => {
      console.log('add new sequencer');
    }
  }
  componentDidMount(){
    this.mapButtons(this.props.range[0])
  }
  componentDidUpdate(){
    this.mapButtons(this.state.octavePage*12 + this.props.range[0])
  }
  render() {
    return Object.keys(this.state.keyObj).length > 0 && (
      <EngineContext.Consumer>
	{engine =>(
          <div className='keyboard-outer'>
            <div className='lhs-tabs'>
              <button onClick={this.viewClick} name='piano'>Piano</button>
              <button onClick={this.viewClick} name='squares'>Grid</button>
              <button onClick={this.viewClick} name='squares octave'>Octave</button>
              <button onClick={this.viewClick} name='logarithmic'>Logarithmic</button>
            </div>
	    <div className='rhs-tabs'>
	      <button className='bass' onClick={this.modeClick} id='bass'>Bass</button>
	      <button className='treble' onClick={this.modeClick} id='treble'>Treble</button>
	      <button className='addSeq' onClick={this.addSeqClick} id='addSeq'>+</button>
	    </div>
            <div className='keyboard'>
	      {Object.keys(this.state.keyObj)
	       .map((o,i,arr)=>(
		 this.props.range[0] <= i
		   &&
		   i <= this.props.range[1]
		   &&
		   (<Keys
                      ref={this.keyRef(i)}
                      playNote={engine.playNote}
		      key={i-this.props.range[0]}
		      widget={i-this.props.range[0]}
		      listener={this.keyListener}
		      view={this.state.view}
		      index={i}
		      obj = {this.state.keyObj[o]}
		    />
		   )))}

              <div className='instruments'>
                <div>{this.state.octavePage} octave z=down x=up </div>

                <Role
                  ref = {this.roleRef('bass')}
                  modeClick={this.modeClick}
	          clear={this.clearSeq}
	          module='bass'
	          listener={this.roleListener}
	          freq={this.state.freq}
	          seq={this.state.bass.notes}
	          cue={this.state.bass.queue}
	          playNote={engine.playNote}
	          tempo={engine.tempo}
                />
                
	        <Role
                  ref = {this.roleRef('treble')}
                  modeClick={this.modeClick}
	          clear={this.clearSeq}
	          module='treble'
	          listener={this.roleListener}
	          freq={this.state.freq}
	          seq={Object.values(this.state.treble.notes)}
	          cue={this.state.treble.queue}
	          playNote={engine.playNote}
	          tempo={engine.tempo}
                  realTime={true}
                />
                
	      </div>
            </div>
            <br/>
          </div>)}
      </EngineContext.Consumer>
    )
  }
}

export default Keyboard