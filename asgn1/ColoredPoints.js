// Vertex shader program
var VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +
  'uniform float u_Size;\n' +
  'void main() {\n' +
  '  gl_Position = a_Position;\n' +
  '  gl_PointSize = u_Size;\n' +
  '}\n';

// Fragment shader program
var FSHADER_SOURCE =
  'precision mediump float;\n' +
  'uniform vec4 u_FragColor;\n' +
  'void main() {\n' +
  '  gl_FragColor = u_FragColor;\n' +
  '}\n';

// Globals
var canvas;
var gl;
var a_Position;
var u_FragColor;
var u_Size;

var POINT = 0;
var TRIANGLE = 1;
var CIRCLE = 2;

var g_selectedType = POINT;

var g_shapesList = [];

var g_selectedColor = [1.0, 1.0, 1.0, 1.0];
var g_selectedSize = 10;
var g_selectedSegments = 10;
var g_showDog = false;
var g_gameMode = false;
var g_score = 0;
var g_timeLeft = 30;
var g_gameTargets = [];
var g_spawnInterval = null;
var g_timerInterval = null;

// Point class
class Point {
  constructor() {
    this.type = 'point';
    this.position = [0.0, 0.0];
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.size = 10.0;
  }

  render() {
    var xy = this.position;
    var rgba = this.color;
    var size = this.size;

    gl.disableVertexAttribArray(a_Position);
    gl.vertexAttrib3f(a_Position, xy[0], xy[1], 0.0);
    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
    gl.uniform1f(u_Size, size);
    gl.drawArrays(gl.POINTS, 0, 1);
  }
}

// Triangle class
class Triangle {
  constructor() {
    this.type = 'triangle';
    this.position = [0.0, 0.0];
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.size = 10.0;
  }

  render() {
    var xy = this.position;
    var rgba = this.color;

    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);

    var d = this.size / 200.0;
    drawTriangle([
      xy[0],     xy[1] + d,
      xy[0] - d, xy[1] - d,
      xy[0] + d, xy[1] - d
    ]);
  }
}

// Circle class
class Circle {
  constructor() {
    this.type = 'circle';
    this.position = [0.0, 0.0];
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.size = 10.0;
    this.segments = 10;
    this.isTarget = false;
    this.expireTime = 0;
  }

  render() {
    var xy = this.position;
    var rgba = this.color;
    var size = this.size;
    var segments = this.segments;

    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);

    var radius = size / 200.0;
    var angleStep = 360 / segments;

    for (var angle = 0; angle < 360; angle += angleStep) {
      var angle1 = angle;
      var angle2 = angle + angleStep;

      var x1 = xy[0] + Math.cos(angle1 * Math.PI / 180) * radius;
      var y1 = xy[1] + Math.sin(angle1 * Math.PI / 180) * radius;
      var x2 = xy[0] + Math.cos(angle2 * Math.PI / 180) * radius;
      var y2 = xy[1] + Math.sin(angle2 * Math.PI / 180) * radius;

      drawTriangle([
        xy[0], xy[1],
        x1, y1,
        x2, y2
      ]);
    }
  }
}

function main() {
  setupWebGL();
  connectVariablesToGLSL();
  addActionsForHtmlUI();

  canvas.onmousedown = handleCanvasClick;
  canvas.onmousemove = function(ev) {
    if (!g_gameMode && ev.buttons == 1) {
      click(ev);
    }
  };

  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);
}

function setupWebGL() {
  canvas = document.getElementById('webgl');
  gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });

  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }
}

function connectVariablesToGLSL() {
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to initialize shaders.');
    return;
  }

  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return;
  }

  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  if (!u_FragColor) {
    console.log('Failed to get the storage location of u_FragColor');
    return;
  }

  u_Size = gl.getUniformLocation(gl.program, 'u_Size');
  if (!u_Size) {
    console.log('Failed to get the storage location of u_Size');
    return;
  }
}

function addActionsForHtmlUI() {
  document.getElementById('pointButton').onclick = function() {
    g_selectedType = POINT;
  };

  document.getElementById('triangleButton').onclick = function() {
    g_selectedType = TRIANGLE;
  };

  document.getElementById('circleButton').onclick = function() {
    g_selectedType = CIRCLE;
  };

  document.getElementById('clearButton').onclick = function() {
    g_shapesList = [];
    g_gameTargets = [];
    g_showDog = false;

    stopGame();
    gl.clear(gl.COLOR_BUFFER_BIT);
  };

  document.getElementById('redSlide').addEventListener('input', function() {
    g_selectedColor[0] = this.value / 100;
  });

  document.getElementById('greenSlide').addEventListener('input', function() {
    g_selectedColor[1] = this.value / 100;
  });

  document.getElementById('blueSlide').addEventListener('input', function() {
    g_selectedColor[2] = this.value / 100;
  });

  document.getElementById('sizeSlide').addEventListener('input', function() {
    g_selectedSize = Number(this.value);
  });

  document.getElementById('segmentSlide').addEventListener('input', function() {
    g_selectedSegments = Number(this.value);
    document.getElementById('segmentValue').textContent = this.value;
  });

  document.getElementById('gameButton').onclick = function() {
    startGame();
  };

  document.getElementById('stopGameButton').onclick = function() {
    stopGame();
  };

  document.getElementById('drawPictureButton').onclick = function() {
    g_showDog = true;
    renderAllShapes();
  };
}


function handleCanvasClick(ev) {
  if (g_gameMode) {
    handleGameClick(ev);
  } else {
    click(ev);
  }
}

function click(ev) {
  var x = ev.clientX;
  var y = ev.clientY;
  var rect = ev.target.getBoundingClientRect();

  x = ((x - rect.left) - canvas.width / 2) / (canvas.width / 2);
  y = (canvas.height / 2 - (y - rect.top)) / (canvas.height / 2);

  var shape;

  if (g_selectedType == POINT) {
    shape = new Point();
  } else if (g_selectedType == TRIANGLE) {
    shape = new Triangle();
  } else {
    shape = new Circle();
    shape.segments = g_selectedSegments;
  }

  shape.position = [x, y];
  shape.color = [
    g_selectedColor[0],
    g_selectedColor[1],
    g_selectedColor[2],
    g_selectedColor[3]
  ];
  shape.size = g_selectedSize;

  g_shapesList.push(shape);
  renderAllShapes();
}

function startGame() {
  stopGame();

  g_gameMode = true;
  g_score = 0;
  g_timeLeft = 30;
  g_gameTargets = [];

  updateGameUI();
  renderAllShapes();

  g_spawnInterval = setInterval(function() {
    spawnTarget();
  }, 800);

  g_timerInterval = setInterval(function() {
    g_timeLeft--;
    removeExpiredTargets();
    updateGameUI();

    if (g_timeLeft <= 0) {
      endGame();
    }
  }, 1000);
}

function stopGame() {
  g_gameMode = false;

  if (g_spawnInterval) {
    clearInterval(g_spawnInterval);
    g_spawnInterval = null;
  }

  if (g_timerInterval) {
    clearInterval(g_timerInterval);
    g_timerInterval = null;
  }

  g_gameTargets = [];
  updateGameUI();
  renderAllShapes();
}

function spawnTarget() {
  if (!g_gameMode) return;

  var target = new Circle();
  target.position = [
    Math.random() * 1.6 - 0.8,
    Math.random() * 1.6 - 0.8
  ];

  target.size = Math.random() * 20 + 15;
  target.segments = 30;
  target.isTarget = true;
  target.expireTime = Date.now() + 1200;

  g_gameTargets.push(target);
  removeExpiredTargets();
  renderAllShapes();
}

function removeExpiredTargets() {
  var now = Date.now();
  g_gameTargets = g_gameTargets.filter(function(target) {
    return target.expireTime > now;
  });
  renderAllShapes();
}

function handleGameClick(ev) {
  var x = ev.clientX;
  var y = ev.clientY;
  var rect = ev.target.getBoundingClientRect();

  x = ((x - rect.left) - canvas.width / 2) / (canvas.width / 2);
  y = (canvas.height / 2 - (y - rect.top)) / (canvas.height / 2);

  for (var i = 0; i < g_gameTargets.length; i++) {
    var target = g_gameTargets[i];
    var dx = x - target.position[0];
    var dy = y - target.position[1];
    var radius = target.size / 200.0;

    if (dx * dx + dy * dy <= radius * radius) {
      g_gameTargets.splice(i, 1);
      g_score++;
      updateGameUI();
      renderAllShapes();
      return;
    }
  }
}

function updateGameUI() {
  document.getElementById('scoreDisplay').textContent = g_score;
  document.getElementById('timeDisplay').textContent = g_timeLeft;
}

function renderAllShapes() {
  gl.clear(gl.COLOR_BUFFER_BIT);

  if (g_showDog) {
    drawDogPicture();
  }

  for (var i = 0; i < g_shapesList.length; i++) {
    g_shapesList[i].render();
  }

  for (var i = 0; i < g_gameTargets.length; i++) {
    g_gameTargets[i].color = [1.0, 0.0, 0.0, 1.0]; // red targets
    g_gameTargets[i].render();
  }
}

function drawTriangle(vertices) {
  var n = 3;

  var vertexBuffer = gl.createBuffer();
  if (!vertexBuffer) {
    console.log('Failed to create the buffer object');
    return;
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);

  gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  gl.drawArrays(gl.TRIANGLES, 0, n);
}

function drawDogPicture() {
  const brown = [0.72, 0.52, 0.30, 1.0];
  const darkBrown = [0.45, 0.30, 0.18, 1.0];
  const lightBrown = [0.85, 0.72, 0.55, 1.0];
  const black = [0.05, 0.05, 0.05, 1.0];
  const white = [0.95, 0.95, 0.95, 1.0];
  const green = [0.2, 0.6, 0.2, 1.0];
  const blue = [0.4, 0.7, 1.0, 1.0];

  gl.uniform4f(u_FragColor, blue[0], blue[1], blue[2], blue[3]);
  drawTriangle([-1, 1, -1, -0.2, 1, 1]);
  drawTriangle([1, 1, -1, -0.2, 1, -0.2]);

  gl.uniform4f(u_FragColor, green[0], green[1], green[2], green[3]);
  drawTriangle([-1, -0.2, -1, -1, 1, -0.2]);
  drawTriangle([1, -0.2, -1, -1, 1, -1]);

  gl.uniform4f(u_FragColor, brown[0], brown[1], brown[2], brown[3]);
  drawTriangle([-0.35, 0.05, 0.10, 0.05, -0.35, -0.25]);
  drawTriangle([0.10, 0.05, 0.10, -0.25, -0.35, -0.25]);

  gl.uniform4f(u_FragColor, lightBrown[0], lightBrown[1], lightBrown[2], lightBrown[3]);
  drawTriangle([0.00, 0.05, 0.18, 0.10, 0.06, -0.10]);

  gl.uniform4f(u_FragColor, brown[0], brown[1], brown[2], brown[3]);
  drawTriangle([0.05, 0.18, 0.35, 0.20, 0.10, -0.02]);
  drawTriangle([0.35, 0.20, 0.32, -0.02, 0.10, -0.02]);

  gl.uniform4f(u_FragColor, lightBrown[0], lightBrown[1], lightBrown[2], lightBrown[3]);
  drawTriangle([0.32, 0.10, 0.52, 0.08, 0.34, -0.02]);
  drawTriangle([0.52, 0.08, 0.48, -0.02, 0.34, -0.02]);

  gl.uniform4f(u_FragColor, black[0], black[1], black[2], black[3]);
  drawTriangle([0.48, 0.04, 0.56, 0.03, 0.48, -0.03]);

  gl.uniform4f(u_FragColor, darkBrown[0], darkBrown[1], darkBrown[2], darkBrown[3]);

  drawTriangle([0.08, 0.18, 0.18, 0.18, 0.13, 0.34]);

  drawTriangle([0.22, 0.18,0.32, 0.18, 0.27, 0.34]);

  gl.uniform4f(u_FragColor, black[0], black[1], black[2], black[3]);
  drawTriangle([0.24, 0.11, 0.27, 0.11, 0.24, 0.08]);

  gl.uniform4f(u_FragColor, darkBrown[0], darkBrown[1], darkBrown[2], darkBrown[3]);
  drawTriangle([0.00, -0.25, 0.08, -0.25, 0.00, -0.58]);
  drawTriangle([0.08, -0.25, 0.08, -0.58, 0.00, -0.58]);

  drawTriangle([-0.12, -0.25, -0.04, -0.25, -0.12, -0.58]);
  drawTriangle([-0.04, -0.25, -0.04, -0.58, -0.12, -0.58]);

  drawTriangle([-0.25, -0.25, -0.17, -0.25, -0.25, -0.58]);
  drawTriangle([-0.17, -0.25, -0.17, -0.58, -0.25, -0.58]);

  drawTriangle([-0.36, -0.25, -0.28, -0.25, -0.36, -0.58]);
  drawTriangle([-0.28, -0.25, -0.28, -0.58, -0.36, -0.58]);

  drawTriangle([-0.35, 0.03, -0.52, 0.18, -0.40, -0.02]);

  gl.uniform4f(u_FragColor, 0.6, 0.1, 0.1, 1.0);
  drawTriangle([-0.95, -0.2, -0.35, -0.2, -0.65, 0.2]);


  gl.uniform4f(u_FragColor, 0.55, 0.27, 0.07, 1.0);
  drawTriangle([-0.9, -0.2, -0.4, -0.2, -0.9, -0.6]);
  drawTriangle([-0.4, -0.2, -0.4, -0.6, -0.9, -0.6]);
  gl.uniform4f(u_FragColor, 0.3, 0.15, 0.05, 1.0);

  drawTriangle([-0.75, -0.60,-0.55, -0.60,-0.65, -0.40]);
  gl.uniform4f(u_FragColor, white[0], white[1], white[2], white[3]);
  const dx = -0.95;
  const dy = .08;
  
  drawTriangle([0.18 + dx, -0.02 + dy, 0.28 + dx, -0.02 + dy, 0.18 + dx, -0.06 + dy]);
  drawTriangle([0.28 + dx, -0.02 + dy, 0.28 + dx, -0.06 + dy, 0.18 + dx, -0.06 + dy]);

  drawTriangle([0.18 + dx, -0.10 + dy, 0.28 + dx, -0.10 + dy, 0.18 + dx, -0.14 + dy]);
  drawTriangle([0.28 + dx, -0.10 + dy, 0.28 + dx, -0.14 + dy, 0.18 + dx, -0.14 + dy]);
  drawTriangle([0.18 + dx, -0.18 + dy, 0.28 + dx, -0.18 + dy, 0.18 + dx, -0.22 + dy]);
  drawTriangle([0.28 + dx, -0.18 + dy, 0.28 + dx, -0.22 + dy, 0.18 + dx, -0.22 + dy]);

  drawTriangle([0.18 + dx, -0.06 + dy, 0.22 + dx, -0.06 + dy, 0.18 + dx, -0.10 + dy]);
  drawTriangle([0.22 + dx, -0.06 + dy, 0.22 + dx, -0.10 + dy, 0.18 + dx, -0.10 + dy]);

  drawTriangle([0.24 + dx, -0.14 + dy, 0.28 + dx, -0.14 + dy, 0.24 + dx, -0.18 + dy]);
  drawTriangle([0.28 + dx, -0.14 + dy, 0.28 + dx, -0.18 + dy, 0.24 + dx, -0.18 + dy]);

  drawTriangle([0.32 + dx, -0.02 + dy, 0.42 + dx, -0.02 + dy, 0.32 + dx, -0.06 + dy]);
  drawTriangle([0.42 + dx, -0.02 + dy, 0.42 + dx, -0.06 + dy, 0.32 + dx, -0.06 + dy]);

  drawTriangle([0.32 + dx, -0.18 + dy, 0.42 + dx, -0.18 + dy, 0.32 + dx, -0.22 + dy]);
  drawTriangle([0.42 + dx, -0.18 + dy, 0.42 + dx, -0.22 + dy, 0.32 + dx, -0.22 + dy]);

  drawTriangle([0.32 + dx, -0.02 + dy, 0.36 + dx, -0.02 + dy, 0.32 + dx, -0.22 + dy]);
  drawTriangle([0.36 + dx, -0.02 + dy, 0.36 + dx, -0.22 + dy, 0.32 + dx, -0.22 + dy]);
}
