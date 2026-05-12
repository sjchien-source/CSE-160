// camera.js

class Camera {
  constructor(canvas) {
    this.canvas = canvas;

    this.fov = 60.0;

    // Good starting position for the world
    // Spawn on top of the sand stack at world position (2.5, 2.5).
    this.eye = new Vector3([2.5, 4.75, 2.5]);
    this.at = new Vector3([3.5, 4.75, 2.5]);
    this.up = new Vector3([0, 1, 0]);

    this.yaw = 0.0;
    this.pitch = 0.0;

    this.speed = 0.4;
    this.turnSpeed = 4.0;
    this.mouseSensitivity = 0.4;

    this.viewMatrix = new Matrix4();
    this.projectionMatrix = new Matrix4();

    this.updateProjectionMatrix();
    this.updateViewMatrix();
  }

  updateProjectionMatrix() {
    this.projectionMatrix.setPerspective(
      this.fov,
      this.canvas.width / this.canvas.height,
      0.1,
      1000.0
    );
  }

  updateViewMatrix() {
    this.viewMatrix.setLookAt(
      this.eye.elements[0], this.eye.elements[1], this.eye.elements[2],
      this.at.elements[0], this.at.elements[1], this.at.elements[2],
      this.up.elements[0], this.up.elements[1], this.up.elements[2]
    );
  }

  syncAtFromAngles() {
    let yawRad = this.yaw * Math.PI / 180.0;
    let pitchRad = this.pitch * Math.PI / 180.0;

    let dir = new Vector3([
      Math.cos(pitchRad) * Math.cos(yawRad),
      Math.sin(pitchRad),
      Math.cos(pitchRad) * Math.sin(yawRad)
    ]);

    dir.normalize();

    this.at.elements[0] = this.eye.elements[0] + dir.elements[0];
    this.at.elements[1] = this.eye.elements[1] + dir.elements[1];
    this.at.elements[2] = this.eye.elements[2] + dir.elements[2];

    this.updateViewMatrix();
  }
  getForwardFlat() {
    let dx = this.at.elements[0] - this.eye.elements[0];
    let dz = this.at.elements[2] - this.eye.elements[2];

    let length = Math.sqrt(dx * dx + dz * dz);

    if (length === 0) {
      return [0, 0, -1];
    }

    return [dx / length, 0, dz / length];
  }

  moveForward() {
    let f = this.getForwardFlat();

    this.eye.elements[0] += f[0] * this.speed;
    this.eye.elements[2] += f[2] * this.speed;

    this.at.elements[0] += f[0] * this.speed;
    this.at.elements[2] += f[2] * this.speed;
    console.log("eye:", this.eye.elements);
    this.updateViewMatrix();
  }

  moveBackwards() {
    let f = this.getForwardFlat();

    this.eye.elements[0] -= f[0] * this.speed;
    this.eye.elements[2] -= f[2] * this.speed;

    this.at.elements[0] -= f[0] * this.speed;
    this.at.elements[2] -= f[2] * this.speed;

    this.updateViewMatrix();
  }

  moveLeft() {
    let f = this.getForwardFlat();

    // right is opposite of left
    let rightX = f[2];
    let rightZ = -f[0];

    this.eye.elements[0] += rightX * this.speed;
    this.eye.elements[2] += rightZ * this.speed;

    this.at.elements[0] += rightX * this.speed;
    this.at.elements[2] += rightZ * this.speed;

    this.updateViewMatrix();
  }

  moveRight() {
        let f = this.getForwardFlat();

    // left is perpendicular to forward
    let leftX = -f[2];
    let leftZ = f[0];

    this.eye.elements[0] += leftX * this.speed;
    this.eye.elements[2] += leftZ * this.speed;

    this.at.elements[0] += leftX * this.speed;
    this.at.elements[2] += leftZ * this.speed;

    this.updateViewMatrix();

  }

  panLeft() {
    this.yaw -= this.turnSpeed;
    this.syncAtFromAngles();
  }

  panRight() {
    this.yaw += this.turnSpeed;
    this.syncAtFromAngles();
  }

  rotateWithMouse(deltaX, deltaY) {
    this.yaw += deltaX * this.mouseSensitivity;
    this.pitch -= deltaY * this.mouseSensitivity;

    this.pitch = Math.max(-82, Math.min(82, this.pitch));

    this.syncAtFromAngles();
  }
}