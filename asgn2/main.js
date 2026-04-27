// main.js
let canvas;
let gl;
let a_Position;
let u_ModelMatrix;
let u_GlobalRotation;
let u_Color;
let gAnimalGlobalRotation = 0;
let gMouseXRotation = 0;
let gMouseYRotation = 0;
let gLegAngle = 0;
let gCalfAngle = 0;
let gFootAngle = 0;
let gTailAngle = 0;
let gHeadAngle = 0;
let gEarAngle = 0;
let g_coneVertexCount = 0;
let g_animation = false;
let g_pokeAnimation = false;
let g_seconds = 0;
let g_startTime = performance.now() / 1000.0;
let g_coneBuffer;
let g_cubeBuffer;
let g_isDragging = false;
let g_lastMouseX = 0;
let g_lastMouseY = 0;
let g_lastFrameTime = performance.now();
let g_frameCount = 0;
let g_fps = 0;

const VSHADER_SOURCE = `
attribute vec4 a_Position;
uniform mat4 u_ModelMatrix;
uniform mat4 u_GlobalRotation;

void main() {
  gl_Position = u_GlobalRotation * u_ModelMatrix * a_Position;
}`;

const FSHADER_SOURCE = `
precision mediump float;

uniform vec4 u_Color;

void main() {
  gl_FragColor = u_Color;
}`;

function main() {
  setupWebGL();
  connectVariablesToGLSL();
  initCubeBuffer();
  initConeBuffer();
  addActionsForHtmlUI();

  gl.clearColor(0.6, 0.4, 0.9, .9);

  requestAnimationFrame(tick);
}

function setupWebGL() {
  canvas = document.getElementById("webgl");
  gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });

  if (!gl) {
    console.log("Failed to get WebGL context.");
    return;
  }

  gl.enable(gl.DEPTH_TEST);
}

function connectVariablesToGLSL() {
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log("Failed to initialize shaders.");
    return;
  }

  a_Position = gl.getAttribLocation(gl.program, "a_Position");
  u_ModelMatrix = gl.getUniformLocation(gl.program, "u_ModelMatrix");
  u_GlobalRotation = gl.getUniformLocation(gl.program, "u_GlobalRotation");
  u_Color = gl.getUniformLocation(gl.program, "u_Color");

  let identity = new Matrix4();
  gl.uniformMatrix4fv(u_ModelMatrix, false, identity.elements);
  gl.uniformMatrix4fv(u_GlobalRotation, false, identity.elements);
}
function initCubeBuffer() {
  const vertices = new Float32Array([
    -0.5,-0.5,0.5, 0.5,-0.5,0.5, 0.5,0.5,0.5,
    -0.5,-0.5,0.5, 0.5,0.5,0.5, -0.5,0.5,0.5,

    -0.5,-0.5,-0.5, -0.5,0.5,-0.5, 0.5,0.5,-0.5,
    -0.5,-0.5,-0.5, 0.5,0.5,-0.5, 0.5,-0.5,-0.5,

    -0.5,-0.5,-0.5, -0.5,-0.5,0.5, -0.5,0.5,0.5,
    -0.5,-0.5,-0.5, -0.5,0.5,0.5, -0.5,0.5,-0.5,

    0.5,-0.5,-0.5, 0.5,0.5,0.5, 0.5,-0.5,0.5,
    0.5,-0.5,-0.5, 0.5,0.5,-0.5, 0.5,0.5,0.5,

    -0.5,0.5,-0.5, -0.5,0.5,0.5, 0.5,0.5,0.5,
    -0.5,0.5,-0.5, 0.5,0.5,0.5, 0.5,0.5,-0.5,

    -0.5,-0.5,-0.5, 0.5,-0.5,0.5, -0.5,-0.5,0.5,
    -0.5,-0.5,-0.5, 0.5,-0.5,-0.5, 0.5,-0.5,0.5
  ]);

  g_cubeBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, g_cubeBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
}

function initConeBuffer() {
  let vertices = [];
  let segments = 24;
  let tip = [0, 0.5, 0];
  let center = [0, -0.5, 0];

  for (let i = 0; i < segments; i++) {
    let angle1 = (i / segments) * 2 * Math.PI;
    let angle2 = ((i + 1) / segments) * 2 * Math.PI;

    let x1 = Math.cos(angle1) * 0.5;
    let z1 = Math.sin(angle1) * 0.5;
    let x2 = Math.cos(angle2) * 0.5;
    let z2 = Math.sin(angle2) * 0.5;

    vertices.push(
      tip[0], tip[1], tip[2],
      x1, -0.5, z1,
      x2, -0.5, z2
    );

    vertices.push(
      center[0], center[1], center[2],
      x2, -0.5, z2,
      x1, -0.5, z1
    );
  }

  g_coneVertexCount = vertices.length / 3;
  g_coneBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, g_coneBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
}

function addActionsForHtmlUI() {
  document.getElementById("globalRot").addEventListener("input", function () {
    gAnimalGlobalRotation = Number(this.value);
    renderScene();
  });

  document.getElementById("legAngle").addEventListener("input", function () {
    gLegAngle = Number(this.value);
    renderScene();
  });

  document.getElementById("calfAngle").addEventListener("input", function () {
    gCalfAngle = Number(this.value);
    renderScene();
  });

  document.getElementById("footAngle").addEventListener("input", function () {
    gFootAngle = Number(this.value);
    renderScene();
  });

  document.getElementById("animBtn").addEventListener("click", function () {
    g_animation = !g_animation;
  });

  canvas.addEventListener("mousedown", function (ev) {
    if (ev.shiftKey) {
      g_pokeAnimation = true;
      g_startTime = performance.now() / 1000.0;
    } else {
      g_isDragging = true;
      g_lastMouseX = ev.clientX;
      g_lastMouseY = ev.clientY;
    }
  });

  canvas.addEventListener("mousemove", function (ev) {
    if (g_isDragging) {
      let dx = ev.clientX - g_lastMouseX;
      let dy = ev.clientY - g_lastMouseY;

      gMouseYRotation += dx * 0.5;
      gMouseXRotation += dy * 0.5;
      g_lastMouseX = ev.clientX;
      g_lastMouseY = ev.clientY;

      renderScene();
    }
  });

  canvas.addEventListener("mouseup", function () {
    g_isDragging = false;
  });

  canvas.addEventListener("mouseleave", function () {
    g_isDragging = false;
  });
}

function tick() {
  g_seconds = performance.now() / 1000.0 - g_startTime;

  updateAnimationAngles();
  renderScene();
  updateFPS();

  requestAnimationFrame(tick);
}

function updateAnimationAngles() {
  if (g_animation) {
    gLegAngle = 30 * Math.sin(g_seconds * 3);
    gCalfAngle = 18 * Math.sin(g_seconds * 3);
    gFootAngle = 12 * Math.sin(g_seconds * 3);
    gTailAngle = 45 * Math.sin(g_seconds * 5);
    gEarAngle = 18 * Math.sin(g_seconds * 6);
  }

  if (g_pokeAnimation) {
    gEarAngle = 18 * Math.sin(g_seconds * 6);
    gTailAngle = 80 * Math.sin(g_seconds * 12);

    if (g_seconds > 2) {
      g_pokeAnimation = false;
      g_startTime = performance.now() / 1000.0;
    }
  }
}

function drawCone(matrix, color) {
  gl.bindBuffer(gl.ARRAY_BUFFER, g_coneBuffer);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  gl.uniformMatrix4fv(u_ModelMatrix, false, matrix.elements);
  gl.uniform4fv(u_Color, color);

  gl.drawArrays(gl.TRIANGLES, 0, g_coneVertexCount);
}

function drawCube(matrix, color) {
  gl.bindBuffer(gl.ARRAY_BUFFER, g_cubeBuffer);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  gl.uniformMatrix4fv(u_ModelMatrix, false, matrix.elements);
  gl.uniform4fv(u_Color, color);

  gl.drawArrays(gl.TRIANGLES, 0, 36);
}
function renderScene() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  let globalRotMat = new Matrix4();
  globalRotMat.rotate(gAnimalGlobalRotation, 0, 1, 0);
  globalRotMat.rotate(gMouseXRotation, 1, 0, 0);
  globalRotMat.rotate(gMouseYRotation, 0, 1, 0);
  globalRotMat.scale(0.5, 0.5, 0.5);
  gl.uniformMatrix4fv(u_GlobalRotation, false, globalRotMat.elements);

  let body = new Matrix4();
  body.translate(0, 0, 0);
  body.scale(1.4, 0.65, 0.55);
  drawCube(body, [0.55, 0.33, 0.16, 1]);

  let chest = new Matrix4();
  chest.translate(0.55, 0.05, 0);
  chest.scale(0.45, 0.7, 0.6);
  drawCube(chest, [0.63, 0.40, 0.22, 1]);

  let head = new Matrix4();
  head.translate(1.0, 0.45, 0);
  head.rotate(gHeadAngle, 0, 1, 0);
  head.scale(0.5, 0.45, 0.45);
  drawCube(head, [0.68, 0.45, 0.25, 1]);

  let snout = new Matrix4();
  snout.translate(1.32, 0.38, 0);
  snout.scale(0.28, 0.22, 0.25);
  drawCube(snout, [0.85, 0.65, 0.45, 1]);

  let nose = new Matrix4();
  nose.translate(1.52, 0.39, 0);
  nose.rotate(270, 0, 0, 1);
  nose.scale(0.18, 0.18, 0.18);
  drawCone(nose, [0.02, 0.02, 0.02, 1]);

  let ear1 = new Matrix4();
  ear1.translate(0.91, 0.76, 0.2);
  ear1.rotate(20 + gEarAngle, 1, 0, 0);
  ear1.scale(0.18, 0.35, 0.12);
  drawCube(ear1, [0.35, 0.18, 0.08, 1]);

  let ear2 = new Matrix4();
  ear2.translate(0.91, 0.76, -0.2);
  ear2.rotate(-20 - gEarAngle, 1, 0, 0);  
  ear2.scale(0.18, 0.35, 0.12);
  drawCube(ear2, [0.35, 0.18, 0.08, 1]);


  let tail = new Matrix4();
  tail.translate(-0.75, 0.25, 0);
  tail.rotate(gTailAngle, 0, 1, 0);
  tail.rotate(300, 0, 0, 1);
  tail.scale(0.85, 0.15, 0.15);
  drawCone(tail, [0.45, 0.25, 0.12, 1]);

drawLeg(-0.45, -0.35, 0.25, -gLegAngle, -gCalfAngle, -gFootAngle);
drawLeg( 0.45, -0.35, 0.25, gLegAngle, gCalfAngle, gFootAngle);

drawLeg(-0.45, -0.35, -0.25, gLegAngle, gCalfAngle, gFootAngle);
drawLeg( 0.45, -0.35, -0.25, -gLegAngle, -gCalfAngle, -gFootAngle);
}

function drawLeg(x, y, z, thighAngle, calfAngle, footAngle) {

  let thigh = new Matrix4();
  thigh.translate(x, y, z);
  thigh.rotate(thighAngle, 0, 0, 1);
  thigh.translate(0, -0.16, 0);
  thigh.scale(0.18, 0.38, 0.18);
  drawCube(thigh, [0.42, 0.23, 0.1, 1]);

  let calf = new Matrix4();
  calf.translate(x, y, z);
  calf.rotate(thighAngle, 0, 0, 1);
  calf.translate(0, -0.30, 0);
  calf.rotate(calfAngle, 0, 0, 1);
  calf.translate(0, -0.16, 0);
  calf.scale(0.15, 0.32, 0.15);
  drawCube(calf, [0.38, 0.2, 0.08, 1]);

  let foot = new Matrix4();
  foot.translate(x, y, z);
  foot.rotate(thighAngle, 0, 0, 1);
  foot.translate(0, -0.32, 0);
  foot.rotate(calfAngle, 0, 0, 1);
  foot.translate(0, -0.25, 0);
  foot.rotate(footAngle, 0, 0, 1);
  foot.translate(0.08, -0.05, 0);
  foot.scale(0.28, 0.12, 0.2);
  drawCube(foot, [0.22, 0.11, 0.04, 1]);
}

function updateFPS() {
  g_frameCount++;

  let now = performance.now();
  let elapsed = now - g_lastFrameTime;

  if (elapsed >= 1000) {
    g_fps = Math.round((g_frameCount * 1000) / elapsed);
    g_frameCount = 0;
    g_lastFrameTime = now;

    let fpsElement = document.getElementById("fps");
    if (fpsElement) {
      fpsElement.innerText = "FPS: " + g_fps;
    }
  }
}