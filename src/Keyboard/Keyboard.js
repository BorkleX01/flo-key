import React,  { Component } from 'react'
import './Keyboard.css'
import { keys } from '../Scale/Diatonic'
import { Role }  from '../Role'
import { EngineContext } from '../Engine/EngineContext'
import { Keys } from '../Keys'
import { qwertyClavier, octavePager }  from './LocalKeyboard'
import Spinner from '../Widgets/Spinner'

//Render sequence(s)
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
      bass: {notes:[], queue:[], range: [24, 71]},
      treble: {notes:[], queue:[], range: [24, 71]},
      queue: [],
      nom: [],
      time: 0,
      octavePage: 0,
      span: 72
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
    this.keyRef = {}
    this.roleRef = {}
    
    this.keyRefMaker = (ind) => this.keyRef[ind] = React.createRef();
    this.roleRefMaker = (id) => this.roleRef[id] = React.createRef();

    this.buttonMap = new Map();
    
    this.mapButtons = (start) => {
      this.buttonMap.clear();
      qwertyClavier.map((o)=>{ this.buttonMap.set(o, start++)})
      let button = this.buttonMap.keys();
      for(let i in this.state.keyObj){
        if(this.keyRef[i] != undefined){ 
          if((i >= this.state.octavePage*12 + this.state[this.state.mode].range[0])){
            this.keyRef[i].current !== null &&
            this.keyRef[i].current.setState({qwert: button.next().value})
          }
          else
          {
            this.keyRef[i].current !== null &&
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
        let isEdit = this.roleRef[this.state.mode].current.state.editSeq; 
        this.setState(state=> {
          state[state.mode].notes.push(key)
          /*state[state.mode].queue.push(state[state.mode].queue.length === 0 ?
                                       window.performance.now() :
                                       window.performance.now() - state[state.mode].queue[0]) */
          state[state.mode].queue.push(1)
          state.keyObj[key].active[state.mode] = true;
          if(isEdit){
            let clips = this.roleRef[state.mode].current.state.clips
            let newClip = state[state.mode].notes.map((o,i) => [o, state[state.mode].queue[i]])
            let seq = this.roleRef[state.mode].current.state.currentSeq
            clips[seq] = newClip
            this.roleRef[state.mode].current.setState({clips: clips})
          }
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
      if(rest.includes('exports')){
      }
      else if(rest.includes('range')){
        this.setState(state=>{
          state[mode].range = [+v, +i]
          return state
        })
      }
      
      else if(rest.includes('load'))
      {
        this.setState(state => {
          state[mode].notes = v
          state[mode].queue = i
          return state
        })
      }
      else if(rest.includes('settings'))
      {
        let settings = this.roleRef[mode].current.state.arpSettings
        console.log('settings changed');
        
      }
      else if(rest.includes('delete'))
      {
        this.setState(state=>{
          state[mode].notes.splice(i,1)
          state[mode].queue.splice(i,1)
          !state[mode].notes.includes(+v) && delete state.keyObj[+v].active[mode]
          if(rest.includes('edit')){
            let newClip = state[mode].notes.map((o,i) => [o, state[mode].queue[i]])
            let seq = this.roleRef[mode].current.state.currentSeq
            let clips = this.roleRef[mode].current.state.clips
            clips[seq] = newClip
            this.roleRef[mode].current.setState({clips: clips })
          }
          return state
        })
      }
      else if(rest.includes('reseq')){
        let newClip = []
        for (let n of v){
          newClip.push(n[0])
        }
        this.setState({[mode] : {...this.state[mode], notes : newClip}})
      }
    }
    
    this.viewClick = (e) => {
      this.setState({view: e.target.name})
    }
    
    this.modeClick = (e) => {
      this.setState({mode: e.target.id})
      
      this.roleRef[this.state.mode].current.setState({active: false})
      if(this.state.mode === e.target.id){
        this.roleRef[e.target.id].current.setState({visible: !this.roleRef[e.target.id].current.state.visible, active: true})
      }else{
        this.roleRef[e.target.id].current.setState({active: true})
      }
    }

    this.startSequencer = () => {
      let role = this.roleRef[this.state.mode].current;
      role.setState({scheduleStart: !role.state.scheduleStart})
    }


    //Qwert
    //Shift z and x for modal transoposition (along whatever the octave page was set to, default C)
    //Ctrl z and x for semitone transposition
    
    document.onkeypress = (e) => {
      if (e.target.className !== 'text-input') {
        

        if(e.key === ' '){
          e.preventDefault()
          this.startSequencer()
        }

        if(e.key === octavePager[0] || e.key === octavePager[1] ){
          let pageTurn = this.state.octavePage + (e.key === octavePager[0] ? -1 : +1)
          let page = pageTurn*12 + this.state[this.state.mode].range[0]
          if(pageTurn>=0 && page+11 <= this.state[this.state.mode].range[1]){
            this.setState({octavePage : pageTurn})
          }
        }

        if(this.buttonMap.get(e.key) != undefined && this.buttonMap.get(e.key) < this.state[this.state.mode].range[1] ){
          this.keyListener(this.buttonMap.get(e.key), 'hardware')
        }

      }

      this.addSeqClick = () => {
        console.log('add new sequencer');
      }

      
    }

    
    this.changeRange = (v) => {
        let val = +v;
        let end = +(val+this.state.span)
        this.roleListener(val, end, this.state.mode, 'range')
      }

      this.changeSpan = (v) => {
        let val = +v;
        this.setState(state=>{
          state.span = val
          this.changeRange(this.state.range[0])
          return state})
      }
  }

  componentDidMount(){
    this.roleRef[this.state.mode].current.setState({active: true})
    this.mapButtons(this.state.octavePage*12 + this.state[this.state.mode].range[0])
  }

  componentDidUpdate(){
    this.mapButtons(this.state.octavePage*12 + this.state[this.state.mode].range[0])
/*
    if(this.state.notes !== this.state.newClip){
      this.setState({notes: this.state.newClip})
    }
*/
  }

  render() {
    return Object.keys(this.state.keyObj).length > 0 && (
      <EngineContext.Consumer>
	{engine => (
          <div className="nav">
            <div className="panel nav-top">
              <div className='lhs-tabs'>
                <button onClick={this.viewClick} name='piano'>Piano</button>
                <button onClick={this.viewClick} name='squares'>Grid</button>
                <button onClick={this.viewClick} name='squares octave'>Octave</button>
                <button onClick={this.viewClick} name='logarithmic'>Logarithmic</button>
                <div className="messages"></div>
              </div>

	      <div className='rhs-tabs '>
	        <button className='bass' onClick={this.modeClick} id='bass'>Bass</button>
	        <button className='treble' onClick={this.modeClick} id='treble'>Treble</button>
	        <button className='addSeq' onClick={this.addSeqClick} id='addSeq'>+</button>
                <div className="messages"></div>
              </div>
            </div>

            <div className="panel">
              <div className="pane">
                <Spinner
                  label={'Octave offset'}
                  slider={true}
                  value={this.state[this.state.mode].range[0]}
                  onChange={this.changeRange}
                  min={0} max={96-12} step={12}/>
              </div>

              <div className="pane">
                <Spinner
                  label='Note range'
                  slider={true} value={this.state[this.state.mode].range[1] - this.state[this.state.mode].range[0]}
                  onChange={this.changeSpan}
                  min={1} max={96} step={1}/>
              </div>
              <div className="messages"></div>
            </div>

            <div className='keyboard-outer'>
              <div className='keyboard'>
  	        {Object.keys(this.state.keyObj)
	         .map((o,i,arr)=>(
		   this.state[this.state.mode].range[0] <= i
		     &&
		     i <= this.state[this.state.mode].range[1]
		     &&
		     (<Keys
                        ref={this.keyRefMaker(i)}
                        playNote={engine.playNote}
		        key={i-this.state[this.state.mode].range[0]}
		        widget={i-this.state[this.state.mode].range[0]}
		        listener={this.keyListener}
		        view={this.state.view}
		        index={i}
		        obj = {this.state.keyObj[o]}
                      />
		     )))}
                
              </div>
              
              <div className='instruments'>
                <Role
                  ref = {this.roleRefMaker('bass')}
                  modeClick={this.modeClick}
	          clear={this.clearSeq}
	          module='bass'
	          listener={this.roleListener}
	          freq={this.state.freq}
	          seq={this.state.bass.notes}
	          cue={this.state.bass.queue}
                  obj={this.state.keyObj}
	          playNote={engine.playNote}
	          tempo={engine.tempo}
                  noteOn={engine.noteOn}
                  range={this.state['bass'].range}/>
                
	        <Role
                  ref = {this.roleRefMaker('treble')}
                  modeClick={this.modeClick}
	          clear={this.clearSeq}
	          module='treble'
	          listener={this.roleListener}
	          freq={this.state.freq}
	          seq={this.state.treble.notes}
	          cue={this.state.treble.queue}
                  obj={this.state.keyObj}
	          playNote={engine.playNote}
	          tempo={engine.tempo}
                  noteOn={engine.noteOn}
                  range={this.state['treble'].range}/>
	      </div>
            </div>
          </div>)}
      </EngineContext.Consumer>
    )
  }
}

export default Keyboard
