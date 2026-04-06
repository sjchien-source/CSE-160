function main() {  
  // Retrieve <canvas> element
  var canvas = document.getElementById('example');  
  if (!canvas) { 
    console.log('Failed to retrieve the <canvas> element');
    return false; 
  } 

  // Get the rendering context for 2DCG
  var ctx = canvas.getContext('2d');

  // Draw a blue rectangle
  ctx.fillStyle = 'black'; // Set color to blue
  ctx.fillRect(0, 0, 400, 400);        // Fill a rectangle with the color

var v1 = new Vector3([2.25, 2.25, 0]);

drawVector(ctx, v1, "red");
}

function clearCanvas() {
  var canvas = document.getElementById('example');
  var ctx = canvas.getContext('2d');

  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  return ctx;
}

function drawVector(ctx, v, color) {
  var canvas = document.getElementById('example');

  var centerX = canvas.width / 2;
  var centerY = canvas.height / 2;
  var scale = 20;

  var endX = centerX + v.elements[0] * scale;
  var endY = centerY - v.elements[1] * scale;

  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.lineTo(endX, endY);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function handleDrawEvent() {
  var ctx = clearCanvas();

  var x1 = parseFloat(document.getElementById("xInput1").value);
  var y1 = parseFloat(document.getElementById("yInput1").value);

  var x2 = parseFloat(document.getElementById("xInput2").value);
  var y2 = parseFloat(document.getElementById("yInput2").value);

  var v1 = new Vector3([x1, y1, 0]);
  var v2 = new Vector3([x2, y2, 0]);

  drawVector(ctx, v1, "red");
  drawVector(ctx, v2, "blue");
}
function handleDrawOperationEvent() {
  var ctx = clearCanvas();

  var x1 = parseFloat(document.getElementById("xInput1").value);
  var y1 = parseFloat(document.getElementById("yInput1").value);

  var x2 = parseFloat(document.getElementById("xInput2").value);
  var y2 = parseFloat(document.getElementById("yInput2").value);

  var op = document.getElementById("operation").value;
  var scalar = parseFloat(document.getElementById("scalarInput").value);

  var v1 = new Vector3([x1, y1, 0]);
  var v2 = new Vector3([x2, y2, 0]);

  drawVector(ctx, v1, "red");
  drawVector(ctx, v2, "blue");

  if (op === "add") {
    var v3 = new Vector3([x1, y1, 0]);
    v3.add(v2);
    drawVector(ctx, v3, "green");
  }
  else if (op === "sub") {
    var v3 = new Vector3([x1, y1, 0]);
    v3.sub(v2);
    drawVector(ctx, v3, "green");
  }
  else if (op === "mul") {
    var v3 = new Vector3([x1, y1, 0]);
    var v4 = new Vector3([x2, y2, 0]);

    v3.mul(scalar);
    v4.mul(scalar);

    drawVector(ctx, v3, "green");
    drawVector(ctx, v4, "green");
  }
  else if (op === "div") {
    if (scalar === 0) {
      console.log("Cannot divide by zero");
      return;
    }

    var v3 = new Vector3([x1, y1, 0]);
    var v4 = new Vector3([x2, y2, 0]);

    v3.div(scalar);
    v4.div(scalar);

    drawVector(ctx, v3, "green");
    drawVector(ctx, v4, "green");
  }
  else if (op === "magnitude") {
    console.log("Magnitude of v1:", v1.magnitude());
    console.log("Magnitude of v2:", v2.magnitude());
  }
  else if (op === "normalize") {
    var v3 = new Vector3([x1, y1, 0]);
    var v4 = new Vector3([x2, y2, 0]);

    v3.normalize();
    v4.normalize();

    drawVector(ctx, v3, "green");
    drawVector(ctx, v4, "green");
  }
  else if (op === "angle") {
  var angle = angleBetween(v1, v2);
  console.log("Angle between v1 and v2:", angle.toFixed(2), "degrees");
  }
  else if (op === "area") {
    var area = areaTriangle(v1, v2);
    console.log("Area of the triangle:", area);
  }
}

function angleBetween(v1, v2) {
  var dot = Vector3.dot(v1, v2);
  var mag1 = v1.magnitude();
  var mag2 = v2.magnitude();

  if (mag1 === 0 || mag2 === 0) {
    return 0;
  }

  var cosAlpha = dot / (mag1 * mag2);

  cosAlpha = Math.min(1, Math.max(-1, cosAlpha));

  var angleRad = Math.acos(cosAlpha);
  var angleDeg = angleRad * (180 / Math.PI);

  return angleDeg;
}

function areaTriangle(v1, v2) {
  var crossProduct = Vector3.cross(v1, v2);
  var parallelogramArea = crossProduct.magnitude();
  var triangleArea = parallelogramArea / 2;
  return triangleArea;
}