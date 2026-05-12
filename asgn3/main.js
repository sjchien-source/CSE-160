// main.js
let canvas;
let gl;
let camera;
let keys = {};
let a_Position;
let a_UV;
let u_ModelMatrix;
let u_GlobalRotation;
let u_ViewMatrix;
let u_ProjectionMatrix;
let u_Color;
let u_Sampler0;
let u_TexColorWeight;

let g_texture0;
let g_texturePathIndex = 0;
const TEXTURE_PATHS = ["textures/wall.png", "textures/grass.png"];

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

const WORLD_SIZE = 32;

const g_map = [
  "44444444444444444444444444444444",
  "40000000000000000000000000000004",
  "40002222200000000011110000000004",
  "40000000200000000010010000000004",
  "40000000200033300010010000000004",
  "40001111200030300010011111100004",
  "40001000000030300010000000100004",
  "40001000000033300011111100100004",
  "40001000000000000000000100100004",
  "40001111111110000000000100100004",
  "40000000000010002222200100100004",
  "40000033300010002000200100100004",
  "40000030300010002000200100100004",
  "40000033300011112000200100100004",
  "40000000000000000000200100000004",
  "40000000001111111111200111111004",
  "40000000001000000000000000001004",
  "40022220001000033333330000001004",
  "40020020001111030000030011111004",
  "40020020000001030333030010000004",
  "40022220000001030003030010000004",
  "40000000000001033333030010000004",
  "40001111100001000000030010000004",
  "40001000100001111111110011100004",
  "40001000100000000000000000100004",
  "40001000111111111110000000100004",
  "40001000000000000010002222100004",
  "40001111111110000010002000100004",
  "40000000000010000011112000100004",
  "40000000000011110000000000100004",
  "40000000000000000000000000000004",
  "44444444444444444444444444444444"
].map(row => row.split("").map(Number));

const VSHADER_SOURCE = `
attribute vec4 a_Position;
attribute vec2 a_UV;

varying vec2 v_UV;

uniform mat4 u_ModelMatrix;
uniform mat4 u_ViewMatrix;
uniform mat4 u_ProjectionMatrix;

void main() {
  gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_ModelMatrix * a_Position;
  v_UV = a_UV;
}`;

const FSHADER_SOURCE = `
precision mediump float;

uniform vec4 u_Color;
uniform sampler2D u_Sampler0;
uniform float u_TexColorWeight;

varying vec2 v_UV;

void main() {
  vec4 texColor = texture2D(u_Sampler0, v_UV);

  gl_FragColor = mix(u_Color, texColor, u_TexColorWeight);
}`;

function main() {
  setupWebGL();
  camera = new Camera(canvas);
  connectVariablesToGLSL();
  initCubeBuffer();
  initConeBuffer();
  initTextures();
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
  a_UV = gl.getAttribLocation(gl.program, "a_UV");

  u_ModelMatrix = gl.getUniformLocation(gl.program, "u_ModelMatrix");
 // u_GlobalRotation = gl.getUniformLocation(gl.program, "u_GlobalRotation");
  u_ViewMatrix = gl.getUniformLocation(gl.program, "u_ViewMatrix");
  u_ProjectionMatrix = gl.getUniformLocation(gl.program, "u_ProjectionMatrix");
  u_Color = gl.getUniformLocation(gl.program, "u_Color");
  u_Sampler0 = gl.getUniformLocation(gl.program, "u_Sampler0");
  u_TexColorWeight = gl.getUniformLocation(gl.program, "u_TexColorWeight");

  if (a_Position < 0) {
    console.log("Failed to get the storage location of a_Position");
  }

  if (a_UV < 0) {
    console.log("Failed to get the storage location of a_UV");
  }

let identity = new Matrix4();
gl.uniformMatrix4fv(u_ModelMatrix, false, identity.elements);
//gl.uniformMatrix4fv(u_GlobalRotation, false, identity.elements);

// Step 5: View matrix = where the camera is looking from
let viewMatrix = new Matrix4();
viewMatrix.setLookAt(
  0, 0, 5,   // eye: camera position
  0, 0, 0,   // at: where camera looks
  0, 1, 0    // up direction
);
gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);

// Step 5: Projection matrix = perspective camera
let projectionMatrix = new Matrix4();
projectionMatrix.setPerspective(
  60,                           // field of view
  canvas.width / canvas.height,  // aspect ratio
  0.1,                          // near clipping plane
  1000                          // far clipping plane
);
gl.uniformMatrix4fv(u_ProjectionMatrix, false, projectionMatrix.elements);

gl.uniform1i(u_Sampler0, 0);
gl.uniform1f(u_TexColorWeight, 0.0);
}

function initCubeBuffer() {
  const data = [];

  function pushFace(vertices) {
    const uvs = [
      0, 0,
      1, 0,
      1, 1,
      0, 0,
      1, 1,
      0, 1
    ];

    for (let i = 0; i < 6; i++) {
      data.push(
        vertices[i * 3],
        vertices[i * 3 + 1],
        vertices[i * 3 + 2],
        uvs[i * 2],
        uvs[i * 2 + 1]
      );
    }
  }

  // Front face
  pushFace([
    -0.5, -0.5,  0.5,
     0.5, -0.5,  0.5,
     0.5,  0.5,  0.5,

    -0.5, -0.5,  0.5,
     0.5,  0.5,  0.5,
    -0.5,  0.5,  0.5
  ]);

  // Back face
  pushFace([
    -0.5, -0.5, -0.5,
    -0.5,  0.5, -0.5,
     0.5,  0.5, -0.5,

    -0.5, -0.5, -0.5,
     0.5,  0.5, -0.5,
     0.5, -0.5, -0.5
  ]);

  // Left face
  pushFace([
    -0.5, -0.5, -0.5,
    -0.5, -0.5,  0.5,
    -0.5,  0.5,  0.5,

    -0.5, -0.5, -0.5,
    -0.5,  0.5,  0.5,
    -0.5,  0.5, -0.5
  ]);

  // Right face
  pushFace([
     0.5, -0.5, -0.5,
     0.5,  0.5,  0.5,
     0.5, -0.5,  0.5,

     0.5, -0.5, -0.5,
     0.5,  0.5, -0.5,
     0.5,  0.5,  0.5
  ]);

  // Top face
  pushFace([
    -0.5,  0.5, -0.5,
    -0.5,  0.5,  0.5,
     0.5,  0.5,  0.5,

    -0.5,  0.5, -0.5,
     0.5,  0.5,  0.5,
     0.5,  0.5, -0.5
  ]);

  // Bottom face
  pushFace([
    -0.5, -0.5, -0.5,
     0.5, -0.5,  0.5,
    -0.5, -0.5,  0.5,

    -0.5, -0.5, -0.5,
     0.5, -0.5, -0.5,
     0.5, -0.5,  0.5
  ]);

  g_cubeBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, g_cubeBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
}

function initTextures() {
  g_texture0 = gl.createTexture();

  if (!g_texture0) {
    console.log("Failed to create the texture object");
    return false;
  }

  // Temporary checkerboard texture so WebGL has something valid before the image loads.
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, g_texture0);

  const fallbackPixels = new Uint8Array([
    180, 180, 180, 255,   80,  80,  80, 255,
     80,  80,  80, 255,  180, 180, 180, 255
  ]);

  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    2,
    2,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    fallbackPixels
  );

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  gl.uniform1i(u_Sampler0, 0);

  loadTextureImageFromPath();
  return true;
}

function loadTextureImageFromPath() {
  if (g_texturePathIndex >= TEXTURE_PATHS.length) {
    console.log("Could not find a texture image. Add wall.jpg in the same folder as main.js, or add textures/wall.jpg.");
    return;
  }

  const image = new Image();
  const texturePath = TEXTURE_PATHS[g_texturePathIndex];

  image.onload = function () {
    loadTexture(image, texturePath);
  };

  image.onerror = function () {
    console.log("Could not load texture: " + texturePath);
    g_texturePathIndex++;
    loadTextureImageFromPath();
  };

  image.src = texturePath;
}

function loadTexture(image, texturePath) {
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, g_texture0);

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    image
  );

  gl.uniform1i(u_Sampler0, 0);
  console.log("Loaded texture: " + texturePath);
  renderScene();
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

      camera.rotateWithMouse(dx, dy);

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

  document.addEventListener("keydown", function (ev) {
    keys[ev.code] = true;

    if (ev.code === "KeyF") {
      addBlockInFrontOfCamera();
    }

    if (ev.code === "KeyR") {
      deleteBlockInFrontOfCamera();
    }

    if ([
      "KeyW", "KeyA", "KeyS", "KeyD",
      "KeyQ", "KeyE", "KeyF", "KeyR"
    ].includes(ev.code)) {
      ev.preventDefault();
    }
  });

  document.addEventListener("keyup", function (ev) {
    keys[ev.code] = false;
  });
}

function updateCameraControls() {
  if (keys.KeyW) {
    camera.moveForward();
  }

  if (keys.KeyS) {
    camera.moveBackwards();
  }

  if (keys.KeyA) {
    camera.moveLeft();
  }

  if (keys.KeyD) {
    camera.moveRight();
  }

  if (keys.KeyQ) {
    camera.panLeft();
  }

  if (keys.KeyE) {
    camera.panRight();
  }
}

function tick() {
  g_seconds = performance.now() / 1000.0 - g_startTime;

  updateCameraControls();
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

  // The cone does not have real UVs yet, so give it one default UV value.
  gl.disableVertexAttribArray(a_UV);
  gl.vertexAttrib2f(a_UV, 0.0, 0.0);

  gl.uniformMatrix4fv(u_ModelMatrix, false, matrix.elements);
  gl.uniform4fv(u_Color, color);
  gl.uniform1f(u_TexColorWeight, 0.0);

  gl.drawArrays(gl.TRIANGLES, 0, g_coneVertexCount);
}

function drawCube(matrix, color, texColorWeight = 0.0) {
  gl.bindBuffer(gl.ARRAY_BUFFER, g_cubeBuffer);

  const FSIZE = Float32Array.BYTES_PER_ELEMENT;

  // Each cube vertex has 5 numbers: x, y, z, u, v.
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, FSIZE * 5, 0);
  gl.enableVertexAttribArray(a_Position);

  gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, FSIZE * 5, FSIZE * 3);
  gl.enableVertexAttribArray(a_UV);

  gl.uniformMatrix4fv(u_ModelMatrix, false, matrix.elements);
  gl.uniform4fv(u_Color, color);

  // Step 4: choose how much texture to use.
  gl.uniform1f(u_TexColorWeight, texColorWeight);

  gl.drawArrays(gl.TRIANGLES, 0, 36);
}

function drawColoredCube(matrix, color) {
  drawCube(matrix, color, 0.0);
}

function drawTexturedCube(matrix, color = [1.0, 1.0, 1.0, 1.0]) {
  drawCube(matrix, color, 1.0);
}

function drawMixedCube(matrix, color, textureAmount) {
  drawCube(matrix, color, textureAmount);
}

function drawWorld() {

function getMapCellInFrontOfCamera() {
  let dx = camera.at.elements[0] - camera.eye.elements[0];
  let dz = camera.at.elements[2] - camera.eye.elements[2];

  let length = Math.sqrt(dx * dx + dz * dz);

  if (length === 0) {
    return null;
  }

  dx /= length;
  dz /= length;

  let targetX = camera.eye.elements[0] + dx * 2.0;
  let targetZ = camera.eye.elements[2] + dz * 2.0;

  let mapX = Math.floor(targetX + WORLD_SIZE / 2);
  let mapZ = Math.floor(targetZ + WORLD_SIZE / 2);

  if (
    mapX < 0 || mapX >= WORLD_SIZE ||
    mapZ < 0 || mapZ >= WORLD_SIZE
  ) {
    return null;
  }

  return {
    x: mapX,
    z: mapZ
  };
}

function addBlockInFrontOfCamera() {
  let cell = getMapCellInFrontOfCamera();

  if (cell === null) {
    return;
  }

  if (g_map[cell.z][cell.x] < 4) {
    g_map[cell.z][cell.x]++;
  }

  renderScene();
}

function deleteBlockInFrontOfCamera() {
  let cell = getMapCellInFrontOfCamera();

  if (cell === null) {
    return;
  }

  if (g_map[cell.z][cell.x] > 0) {
    g_map[cell.z][cell.x]--;
  }

  renderScene();
}
  // Step 9: sky box
  let sky = new Matrix4();
  sky.translate(0, 20, 0);
  sky.scale(1000, 1000, 1000);
  drawColoredCube(sky, [0.45, 0.75, 1.0, 1.0]);

  // Step 8: ground / floor
  let ground = new Matrix4();
  ground.translate(0, -0.55, 0);
  ground.scale(WORLD_SIZE, 0.1, WORLD_SIZE);
  drawColoredCube(ground, [0.25, 0.7, 0.25, 1.0]);

  // Step 10: walls from 32x32 map
  for (let z = 0; z < WORLD_SIZE; z++) {
    for (let x = 0; x < WORLD_SIZE; x++) {
      let height = g_map[z][x];

      if (height > 0) {
        for (let y = 0; y < height; y++) {
          let wall = new Matrix4();

          // Center the 32x32 map around the origin
          wall.translate(
            x - WORLD_SIZE / 2 + 0.5,
            y,
            z - WORLD_SIZE / 2 + 0.5
          );

          wall.scale(1, 1, 1);

          // Textured walls
          drawTexturedCube(wall);
        }
      }
    }
  }
}

function renderScene() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.uniformMatrix4fv(u_ViewMatrix, false, camera.viewMatrix.elements);
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, camera.projectionMatrix.elements);


  drawWorld();

  function getMapCellInFrontOfCamera() {
  // Direction camera is looking
  let dx = camera.at.elements[0] - camera.eye.elements[0];
  let dz = camera.at.elements[2] - camera.eye.elements[2];

  let length = Math.sqrt(dx * dx + dz * dz);

  if (length === 0) {
    return null;
  }

  dx /= length;
  dz /= length;

  // Pick a point in front of the player
  let targetX = camera.eye.elements[0] + dx * 2.0;
  let targetZ = camera.eye.elements[2] + dz * 2.0;

  // Convert world coordinates back into map indices
  let mapX = Math.floor(targetX + WORLD_SIZE / 2);
  let mapZ = Math.floor(targetZ + WORLD_SIZE / 2);

  if (
    mapX < 0 || mapX >= WORLD_SIZE ||
    mapZ < 0 || mapZ >= WORLD_SIZE
  ) {
    return null;
  }

  return {
    x: mapX,
    z: mapZ
  };
}

function addBlockInFrontOfCamera() {
  let cell = getMapCellInFrontOfCamera();

  if (cell === null) {
    return;
  }

  if (g_map[cell.z][cell.x] < 4) {
    g_map[cell.z][cell.x]++;
  }

  renderScene();
}

function deleteBlockInFrontOfCamera() {
  let cell = getMapCellInFrontOfCamera();

  if (cell === null) {
    return;
  }

  if (g_map[cell.z][cell.x] > 0) {
    g_map[cell.z][cell.x]--;
  }

  renderScene();
}

  let body = new Matrix4();
  body.translate(0, 0, 0);
  body.scale(1.4, 0.65, 0.55);
  drawColoredCube(body, [0.55, 0.33, 0.16, 1]);

  let chest = new Matrix4();
  chest.translate(0.55, 0.05, 0);
  chest.scale(0.45, 0.7, 0.6);
  drawColoredCube(body, [0.55, 0.33, 0.16, 1]);


  let head = new Matrix4();
  head.translate(1.0, 0.45, 0);
  head.rotate(gHeadAngle, 0, 1, 0);
  head.scale(0.5, 0.45, 0.45);
  drawColoredCube(body, [0.55, 0.33, 0.16, 1]);

  let snout = new Matrix4();
  snout.translate(1.32, 0.38, 0);
  snout.scale(0.28, 0.22, 0.25);
  drawColoredCube(head, [0.68, 0.45, 0.25, 1]);

  let nose = new Matrix4();
  nose.translate(1.52, 0.39, 0);
  nose.rotate(270, 0, 0, 1);
  nose.scale(0.18, 0.18, 0.18);
  drawCone(nose, [0.02, 0.02, 0.02, 1]);

  let ear1 = new Matrix4();
  ear1.translate(0.91, 0.76, 0.2);
  ear1.rotate(20 + gEarAngle, 1, 0, 0);
  ear1.scale(0.18, 0.35, 0.12);
  drawColoredCube(snout, [0.85, 0.65, 0.45, 1]);

  let ear2 = new Matrix4();
  ear2.translate(0.91, 0.76, -0.2);
  ear2.rotate(-20 - gEarAngle, 1, 0, 0);  
  ear2.scale(0.18, 0.35, 0.12);
  drawColoredCube(ear1, [0.35, 0.18, 0.08, 1]);

  let tail = new Matrix4();
  tail.translate(-0.75, 0.25, 0);
  tail.rotate(gTailAngle, 0, 1, 0);
  tail.rotate(300, 0, 0, 1);
  tail.scale(0.85, 0.15, 0.15);
  drawCone(tail, [0.45, 0.25, 0.12, 1]);

  drawLeg(-0.45, -0.35, 0.25, -gLegAngle, -gCalfAngle, -gFootAngle);
  drawLeg( 0.45, -0.35, 0.25,  gLegAngle,  gCalfAngle,  gFootAngle);

  drawLeg(-0.45, -0.35, -0.25,  gLegAngle,  gCalfAngle,  gFootAngle);
  drawLeg( 0.45, -0.35, -0.25, -gLegAngle, -gCalfAngle, -gFootAngle);
}

function drawLeg(x, y, z, thighAngle, calfAngle, footAngle) {
  let thigh = new Matrix4();
  thigh.translate(x, y, z);
  thigh.rotate(thighAngle, 0, 0, 1);
  thigh.translate(0, -0.16, 0);
  thigh.scale(0.18, 0.38, 0.18);
  drawColoredCube(thigh, [0.42, 0.23, 0.1, 1]);

  let calf = new Matrix4();
  calf.translate(x, y, z);
  calf.rotate(thighAngle, 0, 0, 1);
  calf.translate(0, -0.30, 0);
  calf.rotate(calfAngle, 0, 0, 1);
  calf.translate(0, -0.16, 0);
  calf.scale(0.15, 0.32, 0.15);
  drawColoredCube(thigh, [0.42, 0.23, 0.1, 1]);

  let foot = new Matrix4();
  foot.translate(x, y, z);
  foot.rotate(thighAngle, 0, 0, 1);
  foot.translate(0, -0.32, 0);
  foot.rotate(calfAngle, 0, 0, 1);
  foot.translate(0, -0.25, 0);
  foot.rotate(footAngle, 0, 0, 1);
  foot.translate(0.08, -0.05, 0);
  foot.scale(0.28, 0.12, 0.2);
  drawColoredCube(thigh, [0.42, 0.23, 0.1, 1]);
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