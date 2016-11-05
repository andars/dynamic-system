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
  x: 0,
  v: 0,
};

var index = 0;

var gamma = 0;
var k = 0;

var now = window.performance.now();
var last = now;

function dx_user(x,v) {
  return v;
  }

function dx(x,v) {
  var d = dx_user(x,v);
  if (typeof d === 'undefined' || isNaN(d)) {
    return 0;
  }
  return d;
}

function dv_user(x,v) {
  return -gamma*v - k*x;
}

function dv(x,v) {
  var d = dv_user(x,v);
  if (typeof d === 'undefined' || isNaN(d)) {
    return 0;
  }
  return d;
}

// The First Order Euler Method
// also known as the rectangle method
//
// Idea is the same as the one-dimensional left hand rectangle method
// Can also be viewed as using the first order taylor approximation
// of the function at the current time
//
// This method is pretty bad for reasonable step sizes
function euler(x, v, delta) {
  var dv1 = dv(state.x, state.v);
  var dx1 = dx(state.x, state.v);

  return {
    x: state.x + dx1 * delta,
    v: state.v + dv1 * delta,
  }
}

// The Improved Euler Method
// also known variously as Heun's method, explicit trapezoidal rule,
// and occasionally RK2
//
// Same idea as the one-dimensional trapezoidal rule
// 1. Find derivative at current state (left endpoint)
// 2. Find derivative at estimated next state (right endpoint)
// 3. Use the average of the two to compute next state
//
// Good enough for most visualizations despite not conserving energy,
// has difficulty with low damping and high k.
function improved_euler(x, v, delta) {
  // derivatives at current state
  var dv1 = dv(state.x, state.v);
  var dx1 = dx(state.x, state.v);

  // derivatives at full step (estimated next state using dx1 and dv1)
  var dv2 = dv(state.x + dx1*delta, state.v + dv1*delta);
  var dx2 = dx(state.x + dx1*delta, state.v + dv1*delta);

  // use the average to estimate the next state
  return {
    x: state.x + 0.5 * (dx1 + dx2) * delta,
    v: state.v + 0.5 * (dv1 + dv2) * delta,
  }
}

// Runge Kutta Fourth Order Method
function rk4(x, v, delta) {
  // derivatives at current state
  var dv1 = dv(state.x, state.v);
  var dx1 = dx(state.x, state.v);

  // derivatives at half step, using dx1 and dv1
  var dv2 = dv(state.x + 0.5*dx1*delta, state.v + 0.5*dv1*delta);
  var dx2 = dx(state.x + 0.5*dx1*delta, state.v + 0.5*dv1*delta);

  // derivatives at half step, using dx2 and dv2
  var dv3 = dv(state.x + 0.5*dx2*delta, state.v + 0.5*dv2*delta);
  var dx3 = dx(state.x + 0.5*dx2*delta, state.v + 0.5*dv2*delta);

  // derivatives at full step, using dx3 and dv3
  var dv4 = dv(state.x + dx3*delta, state.v + dv3*delta);
  var dx4 = dx(state.x + dx3*delta, state.v + dv3*delta);

  // average the four derivatives, with double weight on d_2 and d_3
  return {
    x: state.x + (1/6)*delta*(dx1 + 2*dx2 + 2*dx3 + dx4),
    v: state.v + (1/6)*delta*(dv1 + 2*dv2 + 2*dv3 + dv4),
  }
}

var integrator = improved_euler;

function update() {
  now = window.performance.now();
  var delta = (now - last)/1000; // in seconds

  if (delta > 0.1) delta = 0.01;

  // push the most recent sample onto our data_history list
  data_history.push({time: index++, x: state.x, v: state.v});

  // delete samples over 500 ago, keeping only the most recent 500
  if (data_history.length > 500) {
    data_history.shift();
  }

  state = integrator(state.x, state.v, delta);

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
  ctx.moveTo(ps_prev_v+center_x, -ps_prev_x+center_y, 10, 10);
  ctx.lineTo(state.v+center_x, -state.x+center_y, 10, 10);
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
  var center_x = this.canvas.width/2;
  var center_y = this.canvas.height/2;
  ctx.clearRect(0,0,this.canvas.width, this.canvas.height);

  this.draw_axis_y();

  // draw object
  ctx.fillStyle = "blue";
  ctx.fillRect(center_x-7, -state.x+center_y-3, 14, 6);

  if (!plot_v) return;
  ctx.fillStyle = "red";
  ctx.fillRect(center_x-7, -state.v+center_y-3, 14, 6);

}

var position_space = new Diagram('position_space', draw_position);
var plot_v = false;

var data_history = [];
function draw_data_history() {
  var ctx = this.ctx;
  var center_x = this.canvas.width/2;
  var center_y = this.canvas.height/2;

  var current_time = data_history[data_history.length-1].time;
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
  ctx.moveTo(0, -data_history[0].x+center_y);
  for (var i = 0; i<data_history.length; i++) {
    var sample = data_history[i];
    ctx.lineTo(sample.time, -sample.x + center_y);
  }
  ctx.stroke();

  if (!plot_v) return;

  ctx.strokeStyle = "red";
  ctx.beginPath();
  ctx.moveTo(0, -data_history[0].v+center_y);
  for (var i = 0; i<data_history.length; i++) {
    var sample = data_history[i];
    ctx.lineTo(sample.time, -sample.v + center_y);
  }
  ctx.stroke();
}

var data_history_diagram = new Diagram('history', draw_data_history);

data_history_diagram.reset = function() {
  this.ctx.restore();
}

var animation_request;
function loop() {
  update();
  phase_space.draw_once();
  position_space.draw_once();
  data_history_diagram.draw_once();

  animation_request = requestAnimationFrame(loop);
}

document.querySelector('#damping').addEventListener('input', function(e) {
  gamma = parseFloat(this.value)/10;
});

document.querySelector('#k').addEventListener('input', function(e) {
  k = parseFloat(this.value);
});

function restart() {
  cancelAnimationFrame(animation_request);
  data_history = [];
  state.x = parseFloat(document.querySelector('#x_nought').value);
  state.v = parseFloat(document.querySelector('#v_nought').value);
  gamma = parseFloat(document.querySelector('#damping').value)/10;
  k = parseFloat(document.querySelector('#k').value);
  index = 0;
  data_history_diagram.reset();
  phase_space.reset();
  loop();
}

document.querySelector('#restart').addEventListener('click', restart);

function fn_body(fn) {
  var source = fn.toString();
  return source.slice(source.indexOf('{')+1, source.lastIndexOf('}')).trim();
}

function try_parse_fn(node, default_fn) {
  var fn;
  var error = false;
  try {
    fn = new Function('x', 'v', node.value);
  } catch (e) {
    error = true;
    this
  }

  if (error) {
    node.classList.add('error');
    return default_fn
  } else {
    node.classList.remove('error');
    return fn;
  }
}

var dx_input = document.querySelector('#dx_equation');
dx_input.value = fn_body(dx_user);
dx_input.addEventListener('keyup', function(e) {
  dx_user = try_parse_fn(this, dx_user);
});

var dv_input = document.querySelector('#dv_equation');
dv_input.value = fn_body(dv_user);
dv_input.addEventListener('keyup', function(e) {
  dv_user = try_parse_fn(this, dv_user);
});

document.querySelector('#plot_v').addEventListener('click', function(e) {
    plot_v = this.checked;
});

setTimeout(restart, 500);

