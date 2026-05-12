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
let u_UVScale;

let g_textures = {};

// Separate texture units keep wall and grass images from overwriting each other.
const TEXTURE_UNITS = {
  wall: 0,
  grass: 1,
  sand: 2,
  diamond: 3
};

const TEXTURE_PATHS = {
  wall: ["./textures/wall.png", "./textures/wall.jpg", "./wall.png", "./wall.jpg", "textures/wall.png", "textures/wall.jpg", "wall.png", "wall.jpg"],

  // The floor uses grass.jpg. Put grass.jpg beside index.html/main.js,
  // or put it in a textures folder.
  grass: ["./grass.jpg", "grass.jpg", "./textures/grass.jpg", "textures/grass.jpg", "./grass.png", "grass.png", "./textures/grass.png", "textures/grass.png"],

  // Sand blocks sit on top of the grass floor and can be dug away.
  sand: ["./sand.jpg", "sand.jpg", "./textures/sand.jpg", "textures/sand.jpg", "./sand.png", "sand.png", "./textures/sand.png", "textures/sand.png"],

  // Diamond blocks make the tall perimeter wall around the sand field.
  diamond: ["./diamond.jpg", "diamond.jpg", "./textures/diamond.jpg", "textures/diamond.jpg", "./diamond.png", "diamond.png", "./textures/diamond.png", "textures/diamond.png"]
};

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
let g_lastTickTime = performance.now() / 1000.0;

const WORLD_SIZE = 32;
const PLAYER_EYE_HEIGHT = 1.75;
const PLAYER_GROUND_Y = 0.0;
const PLAYER_GROUND_EYE_Y = PLAYER_GROUND_Y + PLAYER_EYE_HEIGHT;
const PLAYER_RADIUS = 0.28;
const PLAYER_STEP_CLEARANCE = 0.08;
const PLAYER_MOVE_SPEED = 6.0;
const PLAYER_JUMP_SPEED = 6.5;
const PLAYER_GRAVITY = -18.0;

let g_playerVerticalVelocity = 0.0;
let g_playerOnGround = true;

const COLLISION_SAMPLE_OFFSETS = [
  [0.0, 0.0],
  [PLAYER_RADIUS, 0.0],
  [-PLAYER_RADIUS, 0.0],
  [0.0, PLAYER_RADIUS],
  [0.0, -PLAYER_RADIUS],
  [PLAYER_RADIUS * 0.707, PLAYER_RADIUS * 0.707],
  [PLAYER_RADIUS * 0.707, -PLAYER_RADIUS * 0.707],
  [-PLAYER_RADIUS * 0.707, PLAYER_RADIUS * 0.707],
  [-PLAYER_RADIUS * 0.707, -PLAYER_RADIUS * 0.707]
];


const DIAMOND_PERIMETER_HEIGHT = 8;
const MAX_SAND_HEIGHT = 4;
const HIDDEN_DIAMOND_COUNT = 20;

// The dog is hidden under the player's starting spot.
// Camera starts at world position (2.5, 2.5), so the dog starts there too.
const DOG_WORLD_X = 2.5;
const DOG_WORLD_Z = 2.5;
const DOG_MAP_X = Math.floor(DOG_WORLD_X + WORLD_SIZE / 2);
const DOG_MAP_Z = Math.floor(DOG_WORLD_Z + WORLD_SIZE / 2);
let g_dogFound = false;

// Diamond perimeter blocks surround the dig site.
const g_map = createDiamondPerimeterMap();

// Sand stacks are 3-4 blocks tall on top of the grass floor.
const g_sandHeightMap = createSandHeightMap();

// Each non-negative value is the buried diamond block's y-level in that sand stack.
const g_hiddenDiamondHeightMap = createHiddenDiamondHeightMap();

let g_itemsFound = 0;
const TOTAL_BURIED_ITEMS = HIDDEN_DIAMOND_COUNT;

function createFilledBooleanMap(value) {
  const map = [];

  for (let z = 0; z < WORLD_SIZE; z++) {
    const row = [];

    for (let x = 0; x < WORLD_SIZE; x++) {
      row.push(value);
    }

    map.push(row);
  }

  return map;
}

function createDiamondPerimeterMap() {
  const map = [];

  for (let z = 0; z < WORLD_SIZE; z++) {
    const row = [];

    for (let x = 0; x < WORLD_SIZE; x++) {
      let height = 0;

      if (x === 0 || z === 0 || x === WORLD_SIZE - 1 || z === WORLD_SIZE - 1) {
        height = DIAMOND_PERIMETER_HEIGHT;
      }

      row.push(height);
    }

    map.push(row);
  }

  return map;
}

function createSandHeightMap() {
  const map = [];

  for (let z = 0; z < WORLD_SIZE; z++) {
    const row = [];

    for (let x = 0; x < WORLD_SIZE; x++) {
      let height = 0;

      // Leave the diamond perimeter empty; the tall diamond wall goes there.
      if (x > 0 && z > 0 && x < WORLD_SIZE - 1 && z < WORLD_SIZE - 1) {
        height = 3 + ((x * 17 + z * 11) % 2); // 3 or 4 blocks tall
      }

      row.push(height);
    }

    map.push(row);
  }

  return map;
}

function createTreasureMap() {
  const map = createFilledBooleanMap(false);

  // Kept for compatibility with older versions of the project.
  return map;
}

function createHiddenDiamondHeightMap() {
  const map = [];

  for (let z = 0; z < WORLD_SIZE; z++) {
    const row = [];

    for (let x = 0; x < WORLD_SIZE; x++) {
      row.push(-1);
    }

    map.push(row);
  }

  let placed = 0;
  let attempts = 0;

  while (placed < HIDDEN_DIAMOND_COUNT && attempts < 2000) {
    attempts++;

    const x = 1 + Math.floor(Math.random() * (WORLD_SIZE - 2));
    const z = 1 + Math.floor(Math.random() * (WORLD_SIZE - 2));

    // Keep the starting area around the player mostly normal, so the spawn is readable.
    if (x >= 15 && x <= 21 && z >= 15 && z <= 21) {
      continue;
    }

    // Do not place a diamond in the same little area as the hidden dog.
    if (Math.abs(x - DOG_MAP_X) <= 1 && Math.abs(z - DOG_MAP_Z) <= 1) {
      continue;
    }

    if (map[z][x] !== -1) {
      continue;
    }

    const sandHeight = g_sandHeightMap[z][x];

    if (sandHeight < 3) {
      continue;
    }

    // Hide the diamond under at least one sand block, but not all the way at bedrock.
    let hiddenY = sandHeight - 2;

    if (sandHeight === 4 && Math.random() < 0.5) {
      hiddenY = 1;
    }

    map[z][x] = hiddenY;
    placed++;
  }

  return map;
}

const VSHADER_SOURCE = `
attribute vec4 a_Position;
attribute vec2 a_UV;

varying vec2 v_UV;

uniform mat4 u_ModelMatrix;
uniform mat4 u_ViewMatrix;
uniform mat4 u_ProjectionMatrix;
uniform vec2 u_UVScale;

void main() {
  gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_ModelMatrix * a_Position;
  v_UV = a_UV * u_UVScale;
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
  updateDiamondCounter();
  updateDogMessage("");

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
  u_UVScale = gl.getUniformLocation(gl.program, "u_UVScale");

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
gl.uniform2f(u_UVScale, 1.0, 1.0);
}

function initCubeBuffer() {
  const data = [];

  function pushVertex(position, uv) {
    data.push(position[0], position[1], position[2], uv[0], uv[1]);
  }

  function pushQuad(bottomLeft, bottomRight, topRight, topLeft) {
    // Each face gets the same clean square UV layout. This avoids the odd
    // mirrored/diagonal-looking texture seams that happened when some cube
    // faces used a different vertex order.
    pushVertex(bottomLeft,  [0, 0]);
    pushVertex(bottomRight, [1, 0]);
    pushVertex(topRight,    [1, 1]);

    pushVertex(bottomLeft,  [0, 0]);
    pushVertex(topRight,    [1, 1]);
    pushVertex(topLeft,     [0, 1]);
  }

  // Front: z = +0.5
  pushQuad(
    [-0.5, -0.5,  0.5],
    [ 0.5, -0.5,  0.5],
    [ 0.5,  0.5,  0.5],
    [-0.5,  0.5,  0.5]
  );

  // Back: z = -0.5
  pushQuad(
    [ 0.5, -0.5, -0.5],
    [-0.5, -0.5, -0.5],
    [-0.5,  0.5, -0.5],
    [ 0.5,  0.5, -0.5]
  );

  // Left: x = -0.5
  pushQuad(
    [-0.5, -0.5, -0.5],
    [-0.5, -0.5,  0.5],
    [-0.5,  0.5,  0.5],
    [-0.5,  0.5, -0.5]
  );

  // Right: x = +0.5
  pushQuad(
    [0.5, -0.5,  0.5],
    [0.5, -0.5, -0.5],
    [0.5,  0.5, -0.5],
    [0.5,  0.5,  0.5]
  );

  // Top: y = +0.5
  pushQuad(
    [-0.5, 0.5,  0.5],
    [ 0.5, 0.5,  0.5],
    [ 0.5, 0.5, -0.5],
    [-0.5, 0.5, -0.5]
  );

  // Bottom: y = -0.5
  pushQuad(
    [-0.5, -0.5, -0.5],
    [ 0.5, -0.5, -0.5],
    [ 0.5, -0.5,  0.5],
    [-0.5, -0.5,  0.5]
  );

  g_cubeBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, g_cubeBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
}

function initTextures() {
  createTextureWithFallback(
    "wall",
    [
      170, 170, 170, 255,
      90, 90, 90, 255,
      90, 90, 90, 255,
      170, 170, 170, 255
    ]
  );

  createTextureWithFallback(
    "grass",
    [
      75, 150, 60, 255,
      45, 110, 35, 255,
      45, 110, 35, 255,
      75, 150, 60, 255
    ]
  );

  createTextureWithFallback(
    "sand",
    [
      214, 190, 130, 255,
      191, 166, 105, 255,
      226, 205, 149, 255,
      174, 148, 91, 255
    ]
  );

  createTextureWithFallback(
    "diamond",
    [
      115, 235, 255, 255,
      20, 130, 180, 255,
      50, 190, 225, 255,
      210, 255, 255, 255
    ]
  );

  bindTexture("wall");

  loadTextureImageFromPaths("wall", 0);
  loadTextureImageFromPaths("grass", 0);
  loadTextureImageFromPaths("sand", 0);
  loadTextureImageFromPaths("diamond", 0);

  return true;
}

function getTextureUnit(textureName) {
  if (TEXTURE_UNITS[textureName] === undefined) {
    return 0;
  }

  return TEXTURE_UNITS[textureName];
}

function createTextureWithFallback(textureName, pixels) {
  const texture = gl.createTexture();

  if (!texture) {
    console.log("Failed to create texture: " + textureName);
    return;
  }

  g_textures[textureName] = texture;

  const unit = getTextureUnit(textureName);
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, texture);

  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    2,
    2,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    new Uint8Array(pixels)
  );

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
}

function loadTextureImageFromPaths(textureName, pathIndex) {
  const paths = TEXTURE_PATHS[textureName];

  if (!paths || pathIndex >= paths.length) {
    console.log("Could not find texture for " + textureName + ". Tried: " + (paths || []).join(", "));
    return;
  }

  const texturePath = paths[pathIndex];
  const image = new Image();

  image.onload = function () {
    loadTexture(textureName, image, texturePath);
  };

  image.onerror = function () {
    console.log("Could not load texture: " + texturePath);
    loadTextureImageFromPaths(textureName, pathIndex + 1);
  };

  image.src = texturePath;
}

function isPowerOfTwo(value) {
  return value > 0 && (value & (value - 1)) === 0;
}

function nextPowerOfTwo(value) {
  let power = 1;

  while (power < value) {
    power *= 2;
  }

  return power;
}

function getTextureUploadSource(image, texturePath) {
  if (isPowerOfTwo(image.width) && isPowerOfTwo(image.height)) {
    return image;
  }

  // WebGL 1 cannot repeat non-power-of-two images. Resize into a temporary
  // power-of-two canvas so grass.jpg can tile across the floor instead of
  // stretching once across the entire world.
  const canvasTexture = document.createElement("canvas");
  canvasTexture.width = nextPowerOfTwo(image.width);
  canvasTexture.height = nextPowerOfTwo(image.height);

  const context = canvasTexture.getContext("2d");
  context.drawImage(image, 0, 0, canvasTexture.width, canvasTexture.height);

  console.log(
    texturePath + " was resized to " +
    canvasTexture.width + "x" + canvasTexture.height +
    " so it can repeat correctly in WebGL."
  );

  return canvasTexture;
}

function loadTexture(textureName, image, texturePath) {
  const texture = g_textures[textureName];

  if (!texture) {
    console.log("Texture was not initialized: " + textureName);
    return;
  }

  const unit = getTextureUnit(textureName);
  const source = getTextureUploadSource(image, texturePath);

  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);

  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, texture);

  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    source
  );

  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

  console.log("Loaded " + textureName + " texture: " + texturePath);
  renderScene();
}

function bindTexture(textureName) {
  const texture = g_textures[textureName] || g_textures.wall || g_textures.grass;

  if (!texture) {
    return;
  }

  const safeTextureName = g_textures[textureName] ? textureName : (g_textures.wall ? "wall" : "grass");
  const unit = getTextureUnit(safeTextureName);

  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.uniform1i(u_Sampler0, unit);
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
    if (ev.code === "Space") {
      startJump();
    }

    keys[ev.code] = true;

    if (ev.code === "KeyF" && !ev.repeat) {
      addBlockInFrontOfCamera();
    }

    if (ev.code === "KeyR" && !ev.repeat) {
      deleteBlockInFrontOfCamera();
    }

    if ([
      "KeyW", "KeyA", "KeyS", "KeyD",
      "KeyQ", "KeyE", "KeyF", "KeyR", "Space"
    ].includes(ev.code)) {
      ev.preventDefault();
    }
  });

  document.addEventListener("keyup", function (ev) {
    keys[ev.code] = false;
  });
}

function updateCameraControls(deltaSeconds) {
  let moveX = 0.0;
  let moveZ = 0.0;
  const forward = camera.getForwardFlat();

  if (keys.KeyW) {
    moveX += forward[0];
    moveZ += forward[2];
  }

  if (keys.KeyS) {
    moveX -= forward[0];
    moveZ -= forward[2];
  }

  if (keys.KeyA) {
    moveX += forward[2];
    moveZ -= forward[0];
  }

  if (keys.KeyD) {
    moveX -= forward[2];
    moveZ += forward[0];
  }

  const moveLength = Math.sqrt(moveX * moveX + moveZ * moveZ);

  if (moveLength > 0.0) {
    moveX /= moveLength;
    moveZ /= moveLength;

    const distance = PLAYER_MOVE_SPEED * deltaSeconds;
    moveCameraWithCollision(moveX * distance, moveZ * distance);
  }

  if (keys.KeyQ) {
    camera.panLeft();
  }

  if (keys.KeyE) {
    camera.panRight();
  }
}

function startJump() {
  if (!g_playerOnGround) {
    return;
  }

  g_playerVerticalVelocity = PLAYER_JUMP_SPEED;
  g_playerOnGround = false;
}

function updatePlayerPhysics(deltaSeconds) {
  const groundHeight = getGroundHeightAtPosition(camera.eye.elements[0], camera.eye.elements[2]);
  const targetEyeY = groundHeight + PLAYER_EYE_HEIGHT;

  // If the player walked off a block, start falling instead of floating.
  if (g_playerOnGround && camera.eye.elements[1] > targetEyeY + 0.02) {
    g_playerOnGround = false;
    g_playerVerticalVelocity = 0.0;
  }

  // If the ground moved up under the player because they landed on a block, snap to it.
  if (g_playerOnGround && camera.eye.elements[1] < targetEyeY) {
    moveCameraY(targetEyeY - camera.eye.elements[1]);
    g_playerVerticalVelocity = 0.0;
    return;
  }

  if (g_playerOnGround) {
    return;
  }

  g_playerVerticalVelocity += PLAYER_GRAVITY * deltaSeconds;
  moveCameraY(g_playerVerticalVelocity * deltaSeconds);

  const newGroundHeight = getGroundHeightAtPosition(camera.eye.elements[0], camera.eye.elements[2]);
  const newTargetEyeY = newGroundHeight + PLAYER_EYE_HEIGHT;

  if (camera.eye.elements[1] <= newTargetEyeY) {
    const correction = newTargetEyeY - camera.eye.elements[1];
    moveCameraY(correction);
    g_playerVerticalVelocity = 0.0;
    g_playerOnGround = true;
  }
}

function moveCameraY(dy) {
  camera.eye.elements[1] += dy;
  camera.at.elements[1] += dy;
  camera.updateViewMatrix();
}

function moveCameraWithCollision(dx, dz) {
  // Split movement into small chunks so a low frame rate cannot skip through a wall.
  const maxStep = 0.08;
  const totalDistance = Math.sqrt(dx * dx + dz * dz);
  const steps = Math.max(1, Math.ceil(totalDistance / maxStep));

  const stepX = dx / steps;
  const stepZ = dz / steps;

  for (let i = 0; i < steps; i++) {
    moveCameraCollisionStep(stepX, stepZ);
  }

  camera.updateViewMatrix();
}

function moveCameraCollisionStep(dx, dz) {
  const eye = camera.eye.elements;

  // Test X and Z separately. This lets the player slide along walls instead of
  // getting stuck when walking diagonally into one.
  if (isPlayerPositionWalkable(eye[0] + dx, eye[2])) {
    eye[0] += dx;
    camera.at.elements[0] += dx;
  }

  if (isPlayerPositionWalkable(eye[0], eye[2] + dz)) {
    eye[2] += dz;
    camera.at.elements[2] += dz;
  }
}

function getPlayerFeetY() {
  return camera.eye.elements[1] - PLAYER_EYE_HEIGHT;
}

function getSolidHeightAtCell(cell) {
  if (cell === null) {
    return DIAMOND_PERIMETER_HEIGHT;
  }

  return Math.max(g_map[cell.z][cell.x], g_sandHeightMap[cell.z][cell.x]);
}

function getGroundHeightAtPosition(worldX, worldZ) {
  const cell = worldToMapCell(worldX, worldZ);

  if (cell === null) {
    return PLAYER_GROUND_Y;
  }

  return Math.max(PLAYER_GROUND_Y, getSolidHeightAtCell(cell));
}

function isPlayerPositionWalkable(worldX, worldZ) {
  const feetY = getPlayerFeetY();

  for (let i = 0; i < COLLISION_SAMPLE_OFFSETS.length; i++) {
    const offset = COLLISION_SAMPLE_OFFSETS[i];
    const cell = worldToMapCell(worldX + offset[0], worldZ + offset[1]);

    // Treat outside the map like a wall, so the player cannot leave the world.
    if (cell === null) {
      return false;
    }

    const solidHeight = getSolidHeightAtCell(cell);

    // Height-aware collision:
    // - On the grass floor, a 1-block wall still blocks you.
    // - While jumping, once your feet are above that 1-block top, you can pass over it.
    // - Taller sand stacks and the diamond perimeter still block you until you are above them.
    if (solidHeight > feetY + PLAYER_STEP_CLEARANCE) {
      return false;
    }
  }

  return true;
}

function tick() {
  const now = performance.now() / 1000.0;
  const deltaSeconds = Math.min(now - g_lastTickTime, 0.05);
  g_lastTickTime = now;

  g_seconds = now - g_startTime;

  updateCameraControls(deltaSeconds);
  updatePlayerPhysics(deltaSeconds);
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

function drawCube(matrix, color, texColorWeight = 0.0, textureName = "wall", uvScaleX = 1.0, uvScaleY = 1.0) {
  gl.bindBuffer(gl.ARRAY_BUFFER, g_cubeBuffer);

  const FSIZE = Float32Array.BYTES_PER_ELEMENT;

  // Each cube vertex has 5 numbers: x, y, z, u, v.
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, FSIZE * 5, 0);
  gl.enableVertexAttribArray(a_Position);

  gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, FSIZE * 5, FSIZE * 3);
  gl.enableVertexAttribArray(a_UV);

  if (texColorWeight > 0.0) {
    bindTexture(textureName);
  }

  gl.uniformMatrix4fv(u_ModelMatrix, false, matrix.elements);
  gl.uniform4fv(u_Color, color);

  // Step 4: choose how much texture to use.
  gl.uniform1f(u_TexColorWeight, texColorWeight);
  gl.uniform2f(u_UVScale, uvScaleX, uvScaleY);

  gl.drawArrays(gl.TRIANGLES, 0, 36);

  // Reset so colored shapes and the animal do not inherit tiled UVs.
  gl.uniform2f(u_UVScale, 1.0, 1.0);
}

function drawColoredCube(matrix, color) {
  drawCube(matrix, color, 0.0);
}

function drawTexturedCube(matrix, color = [1.0, 1.0, 1.0, 1.0], textureName = "wall", uvScaleX = 1.0, uvScaleY = 1.0) {
  drawCube(matrix, color, 1.0, textureName, uvScaleX, uvScaleY);
}

function drawMixedCube(matrix, color, textureAmount, textureName = "wall", uvScaleX = 1.0, uvScaleY = 1.0) {
  drawCube(matrix, color, textureAmount, textureName, uvScaleX, uvScaleY);
}

function worldToMapCell(worldX, worldZ) {
  const mapX = Math.floor(worldX + WORLD_SIZE / 2);
  const mapZ = Math.floor(worldZ + WORLD_SIZE / 2);

  if (
    mapX < 0 || mapX >= WORLD_SIZE ||
    mapZ < 0 || mapZ >= WORLD_SIZE
  ) {
    return null;
  }

  return { x: mapX, z: mapZ };
}

function getMapCellInFrontOfCamera() {
  let dx = camera.at.elements[0] - camera.eye.elements[0];
  let dz = camera.at.elements[2] - camera.eye.elements[2];
  let length = Math.sqrt(dx * dx + dz * dz);

  if (length === 0) {
    return null;
  }

  dx /= length;
  dz /= length;

  const currentCell = worldToMapCell(camera.eye.elements[0], camera.eye.elements[2]);

  // Step along a short ray and return the first map square in front of the player,
  // instead of jumping two full blocks ahead and often editing the wrong square.
  for (let distance = 0.25; distance <= 3.0; distance += 0.05) {
    const targetCell = worldToMapCell(
      camera.eye.elements[0] + dx * distance,
      camera.eye.elements[2] + dz * distance
    );

    if (
      targetCell !== null &&
      (currentCell === null || targetCell.x !== currentCell.x || targetCell.z !== currentCell.z)
    ) {
      return targetCell;
    }
  }

  return null;
}

function addBlockInFrontOfCamera() {
  const cell = getMapCellInFrontOfCamera();

  if (cell === null) {
    return;
  }

  if (g_map[cell.z][cell.x] === 0 && g_sandHeightMap[cell.z][cell.x] < MAX_SAND_HEIGHT) {
    g_sandHeightMap[cell.z][cell.x]++;
  }

  renderScene();
}

function deleteBlockInFrontOfCamera() {
  const cell = getMapCellInFrontOfCamera();

  if (cell === null) {
    return;
  }

  if (g_map[cell.z][cell.x] === 0 && g_sandHeightMap[cell.z][cell.x] > 0) {
    const hiddenDiamondY = g_hiddenDiamondHeightMap[cell.z][cell.x];
    const isDiggingExposedDiamond = hiddenDiamondY >= 0 && g_sandHeightMap[cell.z][cell.x] === hiddenDiamondY + 1;

    g_sandHeightMap[cell.z][cell.x]--;

    if (isDiggingExposedDiamond) {
      g_itemsFound++;
      g_hiddenDiamondHeightMap[cell.z][cell.x] = -1;
      updateDiamondCounter();
    }

    checkIfDogFound(cell);
  }

  renderScene();
}

function isDogSearchCell(cell) {
  return Math.abs(cell.x - DOG_MAP_X) <= 1 && Math.abs(cell.z - DOG_MAP_Z) <= 1;
}

function checkIfDogFound(cell) {
  if (g_dogFound || !isDogSearchCell(cell)) {
    return;
  }

  // The dog is buried under the player spawn area. Once the nearby sand is
  // mostly cleared, reveal it, clear its own cell, start the animation,
  // and show the message.
  if (g_sandHeightMap[cell.z][cell.x] <= 1) {
    g_dogFound = true;
    g_animation = true;
    g_pokeAnimation = false;
    g_startTime = performance.now() / 1000.0;

    if (g_sandHeightMap[DOG_MAP_Z] && typeof g_sandHeightMap[DOG_MAP_Z][DOG_MAP_X] === "number") {
      g_sandHeightMap[DOG_MAP_Z][DOG_MAP_X] = 0;
    }

    updateDogMessage("You found me!");
  }
}

function updateDiamondCounter() {
  const counterElement = document.getElementById("diamond-counter");

  if (counterElement) {
    counterElement.innerText = g_itemsFound + " / " + TOTAL_BURIED_ITEMS;
  }
}

function updateDogMessage(message) {
  const messageElement = document.getElementById("dog-message");

  if (messageElement) {
    messageElement.innerText = message;
  }
}

function drawWorld() {
  // Step 9: sky box
  let sky = new Matrix4();
  sky.translate(0, 20, 0);
  sky.scale(1000, 1000, 1000);
  drawColoredCube(sky, [0.45, 0.75, 1.0, 1.0]);

  // Grass floor stays underneath the dig area. Sand blocks sit on top of it.
  for (let z = 0; z < WORLD_SIZE; z++) {
    for (let x = 0; x < WORLD_SIZE; x++) {
      const worldX = x - WORLD_SIZE / 2 + 0.5;
      const worldZ = z - WORLD_SIZE / 2 + 0.5;

      let grass = new Matrix4();
      grass.translate(worldX, -0.55, worldZ);
      grass.scale(1, 0.1, 1);
      drawTexturedCube(grass, [1.0, 1.0, 1.0, 1.0], "grass", 1.0, 1.0);

      const sandHeight = g_sandHeightMap[z][x];
      const hiddenDiamondY = g_hiddenDiamondHeightMap[z][x];
      const hiddenDiamondIsExposed = hiddenDiamondY >= 0 && sandHeight === hiddenDiamondY + 1;

      for (let y = 0; y < sandHeight; y++) {
        let block = new Matrix4();
        block.translate(worldX, y, worldZ);
        block.scale(1, 1, 1);

        if (hiddenDiamondIsExposed && y === hiddenDiamondY) {
          drawTexturedCube(block, [1.0, 1.0, 1.0, 1.0], "diamond", 1.0, 1.0);
        } else {
          drawTexturedCube(block, [1.0, 1.0, 1.0, 1.0], "sand", 1.0, 1.0);
        }
      }
    }
  }

  // Tall diamond wall around the perimeter of the dig site.
  for (let z = 0; z < WORLD_SIZE; z++) {
    for (let x = 0; x < WORLD_SIZE; x++) {
      let height = g_map[z][x];

      for (let y = 0; y < height; y++) {
        let diamond = new Matrix4();
        diamond.translate(
          x - WORLD_SIZE / 2 + 0.5,
          y,
          z - WORLD_SIZE / 2 + 0.5
        );
        diamond.scale(1, 1, 1);
        drawTexturedCube(diamond, [1.0, 1.0, 1.0, 1.0], "diamond", 1.0, 1.0);
      }
    }
  }
}

function renderScene() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.uniformMatrix4fv(u_ViewMatrix, false, camera.viewMatrix.elements);
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, camera.projectionMatrix.elements);

  drawWorld();

  if (g_dogFound) {
    drawDog();
  }
}

function makeDogMatrix(baseX, baseY, baseZ) {
  let matrix = new Matrix4();
  matrix.translate(baseX, baseY, baseZ);
  return matrix;
}

function drawDog() {
  // The dog appears after you dig it out. It is lowered so its feet sit on the sand/grass.
  const dogX = DOG_WORLD_X;
  const dogZ = DOG_WORLD_Z;
  const dogY = getGroundHeightAtPosition(dogX, dogZ) + 0.45;

  let body = makeDogMatrix(dogX, dogY, dogZ);
  body.translate(0, 0, 0);
  body.scale(1.4, 0.65, 0.55);
  drawColoredCube(body, [0.55, 0.33, 0.16, 1]);

  let chest = makeDogMatrix(dogX, dogY, dogZ);
  chest.translate(0.55, 0.05, 0);
  chest.scale(0.45, 0.7, 0.6);
  drawColoredCube(chest, [0.63, 0.40, 0.22, 1]);

  let head = makeDogMatrix(dogX, dogY, dogZ);
  head.translate(1.0, 0.45, 0);
  head.rotate(gHeadAngle, 0, 1, 0);
  head.scale(0.5, 0.45, 0.45);
  drawColoredCube(head, [0.68, 0.45, 0.25, 1]);

  let snout = makeDogMatrix(dogX, dogY, dogZ);
  snout.translate(1.32, 0.38, 0);
  snout.scale(0.28, 0.22, 0.25);
  drawColoredCube(snout, [0.85, 0.65, 0.45, 1]);

  let nose = makeDogMatrix(dogX, dogY, dogZ);
  nose.translate(1.52, 0.39, 0);
  nose.rotate(270, 0, 0, 1);
  nose.scale(0.18, 0.18, 0.18);
  drawCone(nose, [0.02, 0.02, 0.02, 1]);

  let ear1 = makeDogMatrix(dogX, dogY, dogZ);
  ear1.translate(0.91, 0.76, 0.2);
  ear1.rotate(20 + gEarAngle, 1, 0, 0);
  ear1.scale(0.18, 0.35, 0.12);
  drawColoredCube(ear1, [0.35, 0.18, 0.08, 1]);

  let ear2 = makeDogMatrix(dogX, dogY, dogZ);
  ear2.translate(0.91, 0.76, -0.2);
  ear2.rotate(-20 - gEarAngle, 1, 0, 0);
  ear2.scale(0.18, 0.35, 0.12);
  drawColoredCube(ear2, [0.35, 0.18, 0.08, 1]);

  let tail = makeDogMatrix(dogX, dogY, dogZ);
  tail.translate(-0.75, 0.25, 0);
  tail.rotate(gTailAngle, 0, 1, 0);
  tail.rotate(300, 0, 0, 1);
  tail.scale(0.85, 0.15, 0.15);
  drawCone(tail, [0.45, 0.25, 0.12, 1]);

  drawLeg(-0.45, -0.35, 0.25, -gLegAngle, -gCalfAngle, -gFootAngle, dogX, dogY, dogZ);
  drawLeg( 0.45, -0.35, 0.25,  gLegAngle,  gCalfAngle,  gFootAngle, dogX, dogY, dogZ);

  drawLeg(-0.45, -0.35, -0.25,  gLegAngle,  gCalfAngle,  gFootAngle, dogX, dogY, dogZ);
  drawLeg( 0.45, -0.35, -0.25, -gLegAngle, -gCalfAngle, -gFootAngle, dogX, dogY, dogZ);
}

function drawLeg(x, y, z, thighAngle, calfAngle, footAngle, baseX = 0, baseY = 0, baseZ = 0) {
  let thigh = makeDogMatrix(baseX, baseY, baseZ);
  thigh.translate(x, y, z);
  thigh.rotate(thighAngle, 0, 0, 1);
  thigh.translate(0, -0.16, 0);
  thigh.scale(0.18, 0.38, 0.18);
  drawColoredCube(thigh, [0.42, 0.23, 0.1, 1]);

  let calf = makeDogMatrix(baseX, baseY, baseZ);
  calf.translate(x, y, z);
  calf.rotate(thighAngle, 0, 0, 1);
  calf.translate(0, -0.30, 0);
  calf.rotate(calfAngle, 0, 0, 1);
  calf.translate(0, -0.16, 0);
  calf.scale(0.15, 0.32, 0.15);
  drawColoredCube(calf, [0.38, 0.2, 0.08, 1]);

  let foot = makeDogMatrix(baseX, baseY, baseZ);
  foot.translate(x, y, z);
  foot.rotate(thighAngle, 0, 0, 1);
  foot.translate(0, -0.32, 0);
  foot.rotate(calfAngle, 0, 0, 1);
  foot.translate(0, -0.25, 0);
  foot.rotate(footAngle, 0, 0, 1);
  foot.translate(0.08, -0.05, 0);
  foot.scale(0.28, 0.12, 0.2);
  drawColoredCube(foot, [0.22, 0.11, 0.04, 1]);
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