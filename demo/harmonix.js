const SINE = 0;
const SQUARE = 1;
const QUANTUM = 10;
const SAW = 2;
const TRIANGLE = 3;
var context = new webkitAudioContext();
var masterGain = context.createGain();
var synthGain = context.createGain();
var lfo = context.createBiquadFilter();
var chromatics = tuner();

function pitchBuilder(offset) {
  return 440*Math.pow(2, offset/12);
}

function harmonix(fundamental, type) {
  var tone = {
    freq : fundamental,
    gain : 1,
    type : type,
  };
  var partials = [tone];
  for (var i = 1; i < 8; i++) {
    var partial = Object.create(tone);
    partial.freq = partials[i-1].freq * (i + 1);
    partial.gain = Math.log(partials[i-1].gain / (i+1));
    partial.type = type;
    partials.push(partial);
  }
  return partials;
}

function buildSynth(partials, context, masterGain) {
  var synths = [];
  for (var i = 0; i < partials.length; i++) {
    var synth = context.createOscillator();
    synth.type = partials[i].type;
    synth.frequency.value = partials[i].freq;
    synth.gain = context.createGain();
    synth.gain.gain.value = partials[i].gain;
    synth.connect(synth.gain);
    synth.gain.connect(synthGain);
    synths.push(synth);
  }
  return synths;
}

var freqHandle = null;

function moveFreq(delta, interval) {
  clearInterval(freqHandle);
  freqHandle = setInterval(function() {
    synths.forEach(function(e) {
      e.frequency.value += delta;
    });
  }, interval);
}

function setFreqAtTime(freq, interval) {
  synths.forEach(function(e) {
    e.frequency.setValueAtTime(freq, context.currentTime + interval);
  });
}

var transport = false;
var seq = 0;

function clearSeq() {
  seq = 0;
  transport = false;
}

function setNoteAtTime(note, duration) {
  if (transport) {
    var startTime = 0.5 * seq;
    seq += duration / 0.5;
  } else {
    startTime = 0.5;
  }
  var freq = midi2Freq(classic2Midi(note));
  setFreqAtTime(freq, startTime);
  setFreqAtTime(0, startTime + duration - 0.001);
}

/* Bar 1: E D C D
 * Bar 2: E E EE
 * Bar 3: D D DD
 * Bar 4: E G GG
 * Bar 5: E D C D
 * Bar 6: E E E E
 * Bar 7: D D E D
 * Bar 8: CCCC
 */
function mary() {
  transport = true;
  var octave = 4;
  //Bar 1
  setNoteAtTime('E' + octave, noteDurationToTime('quarter'));
  setNoteAtTime('D' + octave, noteDurationToTime('quarter'));
  setNoteAtTime('C' + octave, noteDurationToTime('quarter'));
  setNoteAtTime('D' + octave, noteDurationToTime('quarter'));
  //Bar 2
  setNoteAtTime('E' + octave, noteDurationToTime('quarter'));
  setNoteAtTime('E' + octave, noteDurationToTime('quarter'));
  setNoteAtTime('E' + octave, noteDurationToTime('half'));
  //Bar 3
  setNoteAtTime('D' + octave, noteDurationToTime('quarter'));
  setNoteAtTime('D' + octave, noteDurationToTime('quarter'));
  setNoteAtTime('D' + octave, noteDurationToTime('half'));
  //Bar 4
  setNoteAtTime('E' + octave, noteDurationToTime('quarter'));
  setNoteAtTime('G' + octave, noteDurationToTime('quarter'));
  setNoteAtTime('G' + octave, noteDurationToTime('half'));
  //Bar 5
  setNoteAtTime('E' + octave, noteDurationToTime('quarter'));
  setNoteAtTime('D' + octave, noteDurationToTime('quarter'));
  setNoteAtTime('C' + octave, noteDurationToTime('quarter'));
  setNoteAtTime('D' + octave, noteDurationToTime('quarter'));
  //Bar 6
  setNoteAtTime('E' + octave, noteDurationToTime('quarter'));
  setNoteAtTime('E' + octave, noteDurationToTime('quarter'));
  setNoteAtTime('E' + octave, noteDurationToTime('quarter'));
  setNoteAtTime('E' + octave, noteDurationToTime('quarter'));
  //Bar 7
  setNoteAtTime('D' + octave, noteDurationToTime('quarter'));
  setNoteAtTime('D' + octave, noteDurationToTime('quarter'));
  setNoteAtTime('E' + octave, noteDurationToTime('quarter'));
  setNoteAtTime('D' + octave, noteDurationToTime('quarter'));
  //Bar 8
  setNoteAtTime('C' + octave, noteDurationToTime('whole'));
  clearSeq();
}

function noteDurationToTime(noteDuration) {
  return noteDurationLookup[noteDuration] * 0.5;
}

function setOffAtTime(interval) {
  synths.forEach(function(e) {
    e.frequency.setValueAtTime(0, context.currentTime + interval);
  });
}

function moveGain(delta, interval) {
  freqHandle = setInterval(function() {
    synthGain.gain.value += delta;
  }, interval);
}

var wobbleHandle;
function wobble(freq) {
  var delta;
  clearInterval(wobbleHandle);
  wobbleHandle = setInterval(function() {
    synthGain.gain.value = 2 * Math.sin(freq * 2 * Math.PI * 
      context.currentTime);  
  }, QUANTUM);
}

function envelope(drop, interval) {
  synthGain.gain.linearRampToValueAtTime(drop, context.currentTime + interval);
}

function setFreq(freq) {
  clearInterval(freqHandle);
  synths.forEach(function(e, i) {
    e.frequency.value = freq * (i + 1);
  });
}

function setLFOFreq(freq) {
  lfo.frequency.value = freq;
}

function setLFOGain(gain) {
  lfo.gain.value = gain;
}

function setLFOQ(Q) {
  lfo.Q.value = Q;
}

function moveLFOFreq(delta, interval) {
  setInterval(function() { 
    lfo.frequency.value = delta;
  }, interval);
}

function moveLFOQ(delta, interval) {
  setInterval(function() { 
    lfo.Q.value = delta;
  }, interval);
}

function playFreq(freq, length) {
  if (length === undefined) {
    length = 500;
  }
  clearInterval(freqHandle);
  setFreq(freq);
  synthGain.gain.value = 1;
  setTimeout(function () {
    synthGain.gain.value = 0;
  }, length);
}

lfo.type = lfo.BANDPASS;
lfo.frequency.value = 18.343;
lfo.gain.value = 1;
lfo.Q.value = 0.5;
synthGain.connect(lfo);
lfo.connect(masterGain);
var partials = harmonix(440, SAW);
var synths = buildSynth(partials, context, lfo);
masterGain.connect(context.destination);
masterGain.gain.value = 1;
synths.forEach(function(e, i, A){ e.noteOn(0);})
var head = document.getElementsByTagName('head')[0];
var script = document.createElement('script');
script.type = 'text/javascript';
script.src = 'Scheduler.js';
head.appendChild(script);
//var noise = new Whitenoise(context);
//noise.connect(masterGain);
//var question = new Question(context);
//question.connect(masterGain);
