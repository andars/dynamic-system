'use strict';

var Mouse = {
  x:0,
  y:0,
};

document.addEventListener('mousemove', function(event) {
  Mouse.x = event.clientX;
  Mouse.y = event.clientY;
});


function Diagram(id, draw) {
  this.canvas = document.getElementById(id);
  this.ctx = this.canvas.getContext('2d');
  this.ctx.font = "16px sans-serif";
  this.drawfn = draw;
  this.ctx.save();
  this.bounding_rect = this.canvas.getBoundingClientRect();
}

Diagram.prototype.draw_once = function() {
  this.drawfn(this.ctx);
}

Diagram.prototype.draw = function() {
  this.drawfn(this.ctx);
  requestAnimationFrame(this.draw.bind(this));
}

Diagram.prototype.draw_axis_y = function() {
  var center_x = this.canvas.width/2;
  var ctx = this.ctx;
  ctx.strokeStyle = "gray";
  ctx.beginPath();
  ctx.moveTo(center_x, 0);
  ctx.lineTo(center_x, this.canvas.height);
  ctx.stroke();
}

Diagram.prototype.draw_axis_x = function(offset) {
  var offset = (typeof offset !== 'undefined') ? offset : 0;
  var center_y = this.canvas.height/2;
  var ctx = this.ctx;
  ctx.strokeStyle = "gray";
  ctx.beginPath();
  ctx.moveTo(offset, center_y);
  ctx.lineTo(this.canvas.width+offset, center_y);
  ctx.stroke();
}

Diagram.prototype.draw_axes = function() {
  this.draw_axis_x();
  this.draw_axis_y();
}


Diagram.prototype.mouse = function() {
  return {
    x: Mouse.x - this.bounding_rect.left,
    y: Mouse.y - this.bounding_rect.top,
  }
}

var state = {
  x: 100,
  v: 0,
};

var index = 0;

var gamma = 1;
var k = 10;

var now = window.performance.now();
var last = now;

function update() {
  now = window.performance.now();
  var delta = (now - last)/1000; // in seconds

  if (delta > 0.1) delta = 0.01;

  var dv1 = -gamma*state.x - k*state.x;
  var dx1 = state.v;
  var dv2 = -gamma*(state.v + dv1*delta);
  var dx2 = state.v + dx1*delta;

  // push the most recent sample onto our history list
  history.push({time: index++, position: state.x});

  // delete samples over 500 ago, keeping only the most recent 500
  if (history.length > 500) {
    history.shift();
  }

  state.x += 0.5 * (dx1 + dx2) * delta;
  state.v += 0.5 * (dv1 + dv2) * delta;

  last = now;
}

var ps_prev_x = state.x;
var ps_prev_v = state.v;
function draw_phase_space() {
  var ctx = this.ctx;

  ctx.fillStyle = "blue";
  var center_x = this.canvas.width/2;
  var center_y = this.canvas.height/2;

  ctx.strokeStyle = "blue";
  ctx.beginPath();
  ctx.moveTo(ps_prev_v+center_x, ps_prev_x+center_y, 10, 10);
  ctx.lineTo(state.v+center_x, state.x+center_y, 10, 10);
  ctx.stroke();

  ps_prev_v = state.v;
  ps_prev_x = state.x;
}

var phase_space = new Diagram('phase_space', draw_phase_space);

phase_space.reset = function() {
    ps_prev_v = state.v;
    ps_prev_x = state.x;
    this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
}

// draw the axes for phase space as a separate diagram
// i couldn't figure out how to stop the canvas from
// darkening the axes if they were not cleared every frame
function draw_ps_axes() {
  this.draw_axes();
}

var ps_axes = new Diagram('phase_space_axes', draw_ps_axes);
ps_axes.draw_once();

function draw_position() {
  var ctx = this.ctx;
  ctx.clearRect(0,0,this.canvas.width, this.canvas.height);

  // draw object
  ctx.fillStyle = "blue";
  var center_x = this.canvas.width/2;
  var center_y = this.canvas.height/2;
  ctx.fillRect(center_x-5, state.x+center_y-5, 10, 10);

  this.draw_axis_y();
}

var position_space = new Diagram('position_space', draw_position);

var history = [];
function draw_history() {
  var ctx = this.ctx;
  var center_x = this.canvas.width/2;
  var center_y = this.canvas.height/2;

  var current_time = history[history.length-1].time;
  var offset = 0;
  if (current_time > this.canvas.width*2/3) {
    offset = current_time - this.canvas.width*2/3;
    ctx.restore();
    ctx.save();
    ctx.translate(-offset, 0);
  }

  ctx.clearRect(offset,0,this.canvas.width+offset, this.canvas.height);
  this.draw_axis_x(offset);

  ctx.strokeStyle = "blue";
  ctx.beginPath();
  ctx.moveTo(0, history[0]+center_y);
  for (var i = 0; i<history.length; i++) {
    var sample = history[i];
    ctx.lineTo(sample.time, sample.position + center_y);
  }
  ctx.stroke();
}

var history_diagram = new Diagram('history', draw_history);

history_diagram.reset = function() {
  this.ctx.restore();
}

var animation_request;
function loop() {
  update();
  phase_space.draw_once();
  position_space.draw_once();
  history_diagram.draw_once();

  animation_request = requestAnimationFrame(loop);
}

document.querySelector('#damping').addEventListener('input', function(e) {
  gamma = parseFloat(this.value);
});
document.querySelector('#k').addEventListener('input', function(e) {
  k = parseFloat(this.value);
});
document.querySelector('#restart').addEventListener('click', function(e) {
  cancelAnimationFrame(animation_request);
  history = [];
  state.x = 100;
  state.v = 0;
  index = 0;
  history_diagram.reset();
  phase_space.reset();
  loop();
});

loop();

