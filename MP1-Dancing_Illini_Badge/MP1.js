/**
 * @file MP1 of the Illinis badges
 * @author Yuhao Min <ymin6@illinois.edu>
 */

/** @global The WebGL context */
var gl;

/** @global The HTML5 canvas we draw on */
var canvas;

/** @global A simple GLSL shader program */
var shaderProgram;

/** @global The WebGL buffer holding the triangle */
var vertexPositionBuffer;

/** @global The WebGL buffer holding the vertex colors */
var vertexColorBuffer;

/** @global The Modelview matrix */
var mvMatrix = mat4.create();

/** @global The Projection matrix */
var pMatrix = mat4.create();

/** @global The deformation constant used in animation */
var defo = 0;

/** @global The angle of rotation around the x axis */
var rotAngle = 0;

/** @global The x position of the badge */
var xpos = -1;

/** @global The velocity at which the badge is moving */
var velocity = 0.01;

/** @global Check if the badge has bounde the wall */
var bounce_x = -1;

/** @global Time stamp of previous frame in ms */
var lastTime = 0;

/** @global A glmatrix vector to use for transformations */
var transformVec = vec3.create();

// Initialize the vector....
vec3.set(transformVec,0.0,0.0,-2.0);

//----------------------------------------------------------------------------------
/**
 * Sends projection/modelview matrices to shader
 */
function setMatrixUniforms() {
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
    gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
}

/**
 * Translates degrees to radians
 * @param {Number} degrees Degree input to function
 * @return {Number} The radians that correspond to the degree input
 */
function degToRad(degrees) {
        return degrees * Math.PI / 180;
}

/**
 * Creates a context for WebGL
 * @param {element} canvas WebGL canvas
 * @return {Object} WebGL context
 */
function createGLContext(canvas) {
  var names = ["webgl", "experimental-webgl"];
  var context = null;
  for (var i=0; i < names.length; i++) {
    try {
      context = canvas.getContext(names[i]);
    } catch(e) {}
    if (context) {
      break;
    }
  }
  if (context) {
    context.viewportWidth = canvas.width;
    context.viewportHeight = canvas.height;
  } else {
    alert("Failed to create WebGL context!");
  }
  return context;
}

/**
 * Loads Shaders
 * @param {string} id ID string for shader to load. Either vertex shader/fragment shader
 */
function loadShaderFromDOM(id) {
  var shaderScript = document.getElementById(id);

  // If we don't find an element with the specified id
  // we do an early exit
  if (!shaderScript) {
    return null;
  }

  // Loop through the children for the found DOM element and
  // build up the shader source code as a string
  var shaderSource = "";
  var currentChild = shaderScript.firstChild;
  while (currentChild) {
    if (currentChild.nodeType == 3) { // 3 corresponds to TEXT_NODE
      shaderSource += currentChild.textContent;
    }
    currentChild = currentChild.nextSibling;
  }

  var shader;
  if (shaderScript.type == "x-shader/x-fragment") {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (shaderScript.type == "x-shader/x-vertex") {
    shader = gl.createShader(gl.VERTEX_SHADER);
  } else {
    return null;
  }

  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  }
  return shader;
}

/**
 * Setup the fragment and vertex shaders
 */
function setupShaders() {
  vertexShader = loadShaderFromDOM("shader-vs");
  fragmentShader = loadShaderFromDOM("shader-fs");

  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Failed to setup shaders");
  }

  gl.useProgram(shaderProgram);
  shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

  shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");
  gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);
  shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
  shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
}

/**
 * Populate vertex buffer with data using calcualted points
 */
function loadVertices() {
  //Generate the vertex positions
  vertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);

  // Set up the vertices to be drawn
  var triangleVertices = [];

  //Copy of the triangle vertices

  /** @local The z-coordinates of all points */
  var z = 0.0;

  /** @local The space between the orange strips */
  var sp = 0.145

  /** @local All the points that made up the badge */
  var toAdd = [
          3.75 / 10, 3.5 /10,  0.0,
          3.75 /10,  -1/10,  0.0,
          2 /10,  -1 /10,  0.0,

          2 / 10,  3.5 /10,  0.0,
          3.75/10, 3.5/10,   0.0,
          2 /10,  -1/ 10,  0.0,

          8 /10,  6.5 /10,  0.0,
           8/ 10, -4 /10,  0.0,
          3.75 /10, -4 /10,   0.0,

          0,    1,      0,
          0,    0.65,   0,
          1,    1,    0,

          1,    0.65,     0,
          0,    0.65,   0,
          1,    1,    0,

          0.375,  0.65, 0,
          0.8,    0.65, 0,
          0.375,  -0.4, 0,

          -1 * 3.75 / 10, 3.5 /10,  0.0,
          -1 * 3.75 /10,  -1/10,  0.0,
          -1 * 2 /10,  -1 /10,  0.0,

          -1 * 2 / 10,  3.5 /10,  0.0,
          -1 * 3.75/10, 3.5/10,   0.0,
          -1 * 2 /10,  -1/ 10,  0.0,

          -1 * 8 /10,  6.5 /10,  0.0,
          -1 *  8/ 10, -4 /10,  0.0,
          -1 * 3.75 /10, -4 /10,   0.0,

          -1 * 0,    1,      0,
          -1 * 0,    0.65,   0,
          -1 * 1,    1,    0,

          -1 * 1,    0.65,     0,
          -1 * 0,    0.65,   0,
          -1 * 1,    1,    0,

          -1 * 0.375,  0.65, 0,
          -1 * 0.8,    0.65, 0,
          -1 * 0.375,  -0.4, 0,

          0.075 + 0 * sp, -0.475, 0,
          0.075 + 1 * sp, -0.475, 0,
          0.075 + 1 * sp, -1+(0.075 + 1 * sp)/2, 0,

          0.075 + 2 * sp, -0.475, 0,
          0.075 + 3 * sp, -0.475, 0,
          0.075 + 3 * sp, -1+(0.075 + 3 * sp)/2, 0,

          0.075 + 4 * sp, -0.475, 0,
          0.075 + 5 * sp, -0.475, 0,
          0.075 + 5 * sp, -1+(0.075 + 5 * sp)/2, 0,

          0.075 + 0 * sp, -0.475, 0,
          0.075 + 1 * sp, -1+(0.075 + 1 * sp)/2, 0,
          0.075 + 0 * sp, -1+(0.075 + 0 * sp)/2, 0,

          0.075 + 2 * sp, -0.475, 0,
          0.075 + 3 * sp, -1+(0.075 + 3 * sp)/2, 0,
          0.075 + 2 * sp, -1+(0.075 + 2 * sp)/2, 0,

          0.075 + 4 * sp, -0.475, 0,
          0.075 + 5 * sp, -1+(0.075 + 5 * sp)/2, 0,
          0.075 + 4 * sp, -1+(0.075 + 4 * sp)/2, 0,

          -1 *(0.075 + 0 * sp), -0.475, 0,
          -1 *(0.075 + 1 * sp), -0.475, 0,
          -1 *(0.075 + 1 * sp), -1+(0.075 + 1 * sp)/2, 0,

          -1 *(0.075 + 2 * sp), -0.475, 0,
          -1 *(0.075 + 3 * sp), -0.475, 0,
          -1 *(0.075 + 3 * sp), -1+(0.075 + 3 * sp)/2, 0,

          -1 *(0.075 + 4 * sp), -0.475, 0,
          -1 *(0.075 + 5 * sp), -0.475, 0,
          -1 *(0.075 + 5 * sp), -1+(0.075 + 5 * sp)/2, 0,

          -1 *(0.075 + 0 * sp), -0.475, 0,
          -1 *(0.075 + 1 * sp), -1+(0.075 + 1 * sp)/2, 0,
          -1 *(0.075 + 0 * sp), -1+(0.075 + 0 * sp)/2, 0,

          -1 *(0.075 + 2 * sp), -0.475, 0,
          -1 *(0.075 + 3 * sp), -1+(0.075 + 3 * sp)/2, 0,
          -1 *(0.075 + 2 * sp), -1+(0.075 + 2 * sp)/2, 0,

          -1 *(0.075 + 4 * sp), -0.475, 0,
          -1 *(0.075 + 5 * sp), -1+(0.075 + 5 * sp)/2, 0,
          -1 *(0.075 + 4 * sp), -1+(0.075 + 4 * sp)/2, 0, ];

  for (i=0; i < toAdd.length; i+=3){
  //change the lower orange part and the upper blue part seperately.
      if (i >= 36 * 3) {
        x=toAdd[i] * ( 1 + Math.sin(defo /55));
        y=toAdd[i+1] * ( 1 - Math.sin(defo /55));
        z=toAdd[i + 2];
      } else {
        x=toAdd[i] * ( 1 + Math.sin(defo /55));
        y=toAdd[i + 1] * ( 1 - Math.sin(defo /55));
        z=toAdd[i + 2];
      }
      //Add each vertices to the final array
      triangleVertices.push(x)
      triangleVertices.push(y)
      triangleVertices.push(z);
  }

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangleVertices), gl.DYNAMIC_DRAW);
  vertexPositionBuffer.itemSize = 3;
  vertexPositionBuffer.numberOfItems = toAdd.length/3;
}

/**
 * Populate color buffer with data using calcualted points
 */
function loadColors() {
  vertexColorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);

  // Set up the volors to be filled
  var colors = [];
  // The color array of all the triangles
  var colorAdd = [
        32/256, 45/256, 76/256, 1.0,
        32/256, 45/256, 76/256, 1.0,
        32/256, 45/256, 76/256, 1.0,
        32/256, 45/256, 76/256, 1.0,
        32/256, 45/256, 76/256, 1.0,
        32/256, 45/256, 76/256, 1.0,
        32/256, 45/256, 76/256, 1.0,
        32/256, 45/256, 76/256, 1.0,
        32/256, 45/256, 76/256, 1.0,
        32/256, 45/256, 76/256, 1.0,
        32/256, 45/256, 76/256, 1.0,
        32/256, 45/256, 76/256, 1.0,
        32/256, 45/256, 76/256, 1.0,
        32/256, 45/256, 76/256, 1.0,
        32/256, 45/256, 76/256, 1.0,
        32/256, 45/256, 76/256, 1.0,
        32/256, 45/256, 76/256, 1.0,
        32/256, 45/256, 76/256, 1.0,
        32/256, 45/256, 76/256, 1.0,
        32/256, 45/256, 76/256, 1.0,
        32/256, 45/256, 76/256, 1.0,
        32/256, 45/256, 76/256, 1.0,
        32/256, 45/256, 76/256, 1.0,
        32/256, 45/256, 76/256, 1.0,
        32/256, 45/256, 76/256, 1.0,
        32/256, 45/256, 76/256, 1.0,
        32/256, 45/256, 76/256, 1.0,
        32/256, 45/256, 76/256, 1.0,
        32/256, 45/256, 76/256, 1.0,
        32/256, 45/256, 76/256, 1.0,
        32/256, 45/256, 76/256, 1.0,
        32/256, 45/256, 76/256, 1.0,
        32/256, 45/256, 76/256, 1.0,
        32/256, 45/256, 76/256, 1.0,
        32/256, 45/256, 76/256, 1.0,
        32/256, 45/256, 76/256, 1.0,

        201/256, 76/256, 60/256, 1.0,
        201/256, 76/256, 60/256, 1.0,
        201/256, 76/256, 60/256, 1.0,
        201/256, 76/256, 60/256, 1.0,
        201/256, 76/256, 60/256, 1.0,
        201/256, 76/256, 60/256, 1.0,
        201/256, 76/256, 60/256, 1.0,
        201/256, 76/256, 60/256, 1.0,
        201/256, 76/256, 60/256, 1.0,
        201/256, 76/256, 60/256, 1.0,
        201/256, 76/256, 60/256, 1.0,
        201/256, 76/256, 60/256, 1.0,
        201/256, 76/256, 60/256, 1.0,
        201/256, 76/256, 60/256, 1.0,
        201/256, 76/256, 60/256, 1.0,
        201/256, 76/256, 60/256, 1.0,
        201/256, 76/256, 60/256, 1.0,
        201/256, 76/256, 60/256, 1.0,

        201/256, 76/256, 60/256, 1.0,
        201/256, 76/256, 60/256, 1.0,
        201/256, 76/256, 60/256, 1.0,
        201/256, 76/256, 60/256, 1.0,
        201/256, 76/256, 60/256, 1.0,
        201/256, 76/256, 60/256, 1.0,
        201/256, 76/256, 60/256, 1.0,
        201/256, 76/256, 60/256, 1.0,
        201/256, 76/256, 60/256, 1.0,
        201/256, 76/256, 60/256, 1.0,
        201/256, 76/256, 60/256, 1.0,
        201/256, 76/256, 60/256, 1.0,
        201/256, 76/256, 60/256, 1.0,
        201/256, 76/256, 60/256, 1.0,
        201/256, 76/256, 60/256, 1.0,
        201/256, 76/256, 60/256, 1.0,
        201/256, 76/256, 60/256, 1.0,
        201/256, 76/256, 60/256, 1.0,
    ];

  /** @local The alpha value all points */
  var a=1.0;

  for (i=0;i<colorAdd.length;i+=4){
      r= colorAdd[i];
      g= colorAdd[i+1]
      b= colorAdd[i+2];
      a= colorAdd[i+3]
      // Add color to the final array
      colors.push(r);
      colors.push(g);
      colors.push(b);
      colors.push(a);
  }

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
  vertexColorBuffer.itemSize = 4;
  vertexColorBuffer.numItems = colorAdd.length/4;
}

/**
 * Populate buffers with data for the non affine transformation
 */
function setupBuffers_NAff() {

  //Generate the vertex positions
  loadVertices();

  //Generate the vertex colors
  loadColors();
}

/**
 * Populate buffers with data for the affine transformation directly from the points.
 */
function setupBuffers_aff() {
  vertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);

  /** @local The space between the orange strips */
  var sp = 0.145;

  var triangleVertices = [
        3.75 / 10, 3.5 /10,  0.0,
        3.75 /10,  -1/10,  0.0,
        2 /10,  -1 /10,  0.0,
        2 / 10,  3.5 /10,  0.0,
        3.75/10, 3.5/10,   0.0,
        2 /10,  -1/ 10,  0.0,
        8 /10,  6.5 /10,  0.0,
        8/ 10, -4 /10,  0.0,
        3.75 /10, -4 /10,   0.0,
        0,    1,      0,
        0,    0.65,   0,
        1,    1,    0,
        1,    0.65,     0,
        0,    0.65,   0,
        1,    1,    0,
        0.375,  0.65, 0,
        0.8,    0.65, 0,
        0.375,  -0.4, 0,
        -1 * 3.75 / 10, 3.5 /10,  0.0,
        -1 * 3.75 /10,  -1/10,  0.0,
        -1 * 2 /10,  -1 /10,  0.0,
        -1 * 2 / 10,  3.5 /10,  0.0,
        -1 * 3.75/10, 3.5/10,   0.0,
        -1 * 2 /10,  -1/ 10,  0.0,
        -1 * 8 /10,  6.5 /10,  0.0,
        -1 *  8/ 10, -4 /10,  0.0,
        -1 * 3.75 /10, -4 /10,   0.0,
        -1 * 0,    1,      0,
        -1 * 0,    0.65,   0,
        -1 * 1,    1,    0,
        -1 * 1,    0.65,     0,
        -1 * 0,    0.65,   0,
        -1 * 1,    1,    0,
        -1 * 0.375,  0.65, 0,
        -1 * 0.8,    0.65, 0,
        -1 * 0.375,  -0.4, 0,
        0.075 + 0 * sp, -0.475, 0,
        0.075 + 1 * sp, -0.475, 0,
        0.075 + 1 * sp, -1+(0.075 + 1 * sp)/2, 0,
        0.075 + 2 * sp, -0.475, 0,
        0.075 + 3 * sp, -0.475, 0,
        0.075 + 3 * sp, -1+(0.075 + 3 * sp)/2, 0,
        0.075 + 4 * sp, -0.475, 0,
        0.075 + 5 * sp, -0.475, 0,
        0.075 + 5 * sp, -1+(0.075 + 5 * sp)/2, 0,
        0.075 + 0 * sp, -0.475, 0,
        0.075 + 1 * sp, -1+(0.075 + 1 * sp)/2, 0,
        0.075 + 0 * sp, -1+(0.075 + 0 * sp)/2, 0,
        0.075 + 2 * sp, -0.475, 0,
        0.075 + 3 * sp, -1+(0.075 + 3 * sp)/2, 0,
        0.075 + 2 * sp, -1+(0.075 + 2 * sp)/2, 0,
        0.075 + 4 * sp, -0.475, 0,
        0.075 + 5 * sp, -1+(0.075 + 5 * sp)/2, 0,
        0.075 + 4 * sp, -1+(0.075 + 4 * sp)/2, 0,
       -1 *(0.075 + 0 * sp), -0.475, 0,
       -1 *(0.075 + 1 * sp), -0.475, 0,
       -1 *(0.075 + 1 * sp), -1+(0.075 + 1 * sp)/2, 0,
       -1 *(0.075 + 2 * sp), -0.475, 0,
       -1 *(0.075 + 3 * sp), -0.475, 0,
       -1 *(0.075 + 3 * sp), -1+(0.075 + 3 * sp)/2, 0,
       -1 *(0.075 + 4 * sp), -0.475, 0,
       -1 *(0.075 + 5 * sp), -0.475, 0,
       -1 *(0.075 + 5 * sp), -1+(0.075 + 5 * sp)/2, 0,
       -1 *(0.075 + 0 * sp), -0.475, 0,
       -1 *(0.075 + 1 * sp), -1+(0.075 + 1 * sp)/2, 0,
       -1 *(0.075 + 0 * sp), -1+(0.075 + 0 * sp)/2, 0,
       -1 *(0.075 + 2 * sp), -0.475, 0,
       -1 *(0.075 + 3 * sp), -1+(0.075 + 3 * sp)/2, 0,
       -1 *(0.075 + 2 * sp), -1+(0.075 + 2 * sp)/2, 0,
       -1 *(0.075 + 4 * sp), -0.475, 0,
       -1 *(0.075 + 5 * sp), -1+(0.075 + 5 * sp)/2, 0,
       -1 *(0.075 + 4 * sp), -1+(0.075 + 4 * sp)/2, 0,

  ];

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangleVertices), gl.STATIC_DRAW);
  vertexPositionBuffer.itemSize = 3;
  vertexPositionBuffer.numberOfItems = 72;

  vertexColorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);
  var colors = [
        32/256, 45/256, 76/256, 1.0,
        32/256, 45/256, 76/256, 1.0,
        32/256, 45/256, 76/256, 1.0,
        32/256, 45/256, 76/256, 1.0,
        32/256, 45/256, 76/256, 1.0,
        32/256, 45/256, 76/256, 1.0,
        32/256, 45/256, 76/256, 1.0,
        32/256, 45/256, 76/256, 1.0,
        32/256, 45/256, 76/256, 1.0,
        32/256, 45/256, 76/256, 1.0,
        32/256, 45/256, 76/256, 1.0,
        32/256, 45/256, 76/256, 1.0,
        32/256, 45/256, 76/256, 1.0,
        32/256, 45/256, 76/256, 1.0,
        32/256, 45/256, 76/256, 1.0,
        32/256, 45/256, 76/256, 1.0,
        32/256, 45/256, 76/256, 1.0,
        32/256, 45/256, 76/256, 1.0,
        32/256, 45/256, 76/256, 1.0,
        32/256, 45/256, 76/256, 1.0,
        32/256, 45/256, 76/256, 1.0,
        32/256, 45/256, 76/256, 1.0,
        32/256, 45/256, 76/256, 1.0,
        32/256, 45/256, 76/256, 1.0,
        32/256, 45/256, 76/256, 1.0,
        32/256, 45/256, 76/256, 1.0,
        32/256, 45/256, 76/256, 1.0,
        32/256, 45/256, 76/256, 1.0,
        32/256, 45/256, 76/256, 1.0,
        32/256, 45/256, 76/256, 1.0,
        32/256, 45/256, 76/256, 1.0,
        32/256, 45/256, 76/256, 1.0,
        32/256, 45/256, 76/256, 1.0,
        32/256, 45/256, 76/256, 1.0,
        32/256, 45/256, 76/256, 1.0,
        32/256, 45/256, 76/256, 1.0,

        201/256, 76/256, 60/256, 1.0,
        201/256, 76/256, 60/256, 1.0,
        201/256, 76/256, 60/256, 1.0,
        201/256, 76/256, 60/256, 1.0,
        201/256, 76/256, 60/256, 1.0,
        201/256, 76/256, 60/256, 1.0,
        201/256, 76/256, 60/256, 1.0,
        201/256, 76/256, 60/256, 1.0,
        201/256, 76/256, 60/256, 1.0,
        201/256, 76/256, 60/256, 1.0,
        201/256, 76/256, 60/256, 1.0,
        201/256, 76/256, 60/256, 1.0,
        201/256, 76/256, 60/256, 1.0,
        201/256, 76/256, 60/256, 1.0,
        201/256, 76/256, 60/256, 1.0,
        201/256, 76/256, 60/256, 1.0,
        201/256, 76/256, 60/256, 1.0,
        201/256, 76/256, 60/256, 1.0,

        201/256, 76/256, 60/256, 1.0,
        201/256, 76/256, 60/256, 1.0,
        201/256, 76/256, 60/256, 1.0,
        201/256, 76/256, 60/256, 1.0,
        201/256, 76/256, 60/256, 1.0,
        201/256, 76/256, 60/256, 1.0,
        201/256, 76/256, 60/256, 1.0,
        201/256, 76/256, 60/256, 1.0,
        201/256, 76/256, 60/256, 1.0,
        201/256, 76/256, 60/256, 1.0,
        201/256, 76/256, 60/256, 1.0,
        201/256, 76/256, 60/256, 1.0,
        201/256, 76/256, 60/256, 1.0,
        201/256, 76/256, 60/256, 1.0,
        201/256, 76/256, 60/256, 1.0,
        201/256, 76/256, 60/256, 1.0,
        201/256, 76/256, 60/256, 1.0,
        201/256, 76/256, 60/256, 1.0,
    ];
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
  vertexColorBuffer.itemSize = 4;
  vertexColorBuffer.numItems = 72;
}

/**
 * Draw call that applies matrix transformations to model and draws model in frame for the affine * transformation case
 */
function draw_aff() {
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


  mat4.identity(mvMatrix);
  mat4.identity(pMatrix);
  mat4.perspective(pMatrix,degToRad(90), 1 , 0.5, 100.0);
  vec3.set(transformVec,xpos,0,-2);
  mat4.translate(mvMatrix, mvMatrix,transformVec);
  //console.log(mat4.str(pMatrix));
  mat4.rotateX(mvMatrix, mvMatrix, degToRad(rotAngle));
  // mat4.rotateY(mvMatrix, mvMatrix, degToRad(rotAngle - 90));
  // mat4.rotateZ(mvMatrix, mvMatrix, degToRad(rotAngle));
  // mat4.rotateX(mvMatrix, mvMatrix, degToRad((rotAngle - 90)) % 360);

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute,
                         vertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexColorAttribute,
                            vertexColorBuffer.itemSize, gl.FLOAT, false, 0, 0);
  setMatrixUniforms();
  gl.drawArrays(gl.TRIANGLES, 0, vertexPositionBuffer.numberOfItems);
}

/**
 * Draw call that applies matrix transformations to model and draws model in frame for the       * non-affine transformation case
 */
function draw_NAff() {
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  mat4.identity(mvMatrix);
  mat4.identity(pMatrix);

  //mat4.ortho(pMatrix,-1,1,-1,1,1,-1);

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute,
                         vertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexColorAttribute,
                            vertexColorBuffer.itemSize, gl.FLOAT, false, 0, 0);

  setMatrixUniforms();
  gl.drawArrays(gl.TRIANGLES, 0, vertexPositionBuffer.numberOfItems);
}

/**
 * Animation to be called from tick. Updates globals and performs animation for each tick using  * affine trasnformation.
 */
function animate_aff() {
  var timeNow = new Date().getTime();
  if (lastTime != 0) {
      var elapsed = timeNow - lastTime;
      rotAngle= (rotAngle+1.0) % 360;
      if (xpos >= 1 || xpos < -1) {
        bounce_x *= -1;
      }
      if (bounce_x > 0) {
        velocity *= -1;
      }
      xpos += velocity;
  }
  lastTime = timeNow;
}

/**
 * Animation to be called from tick. Updates globals and performs animation for each tick using  * Non-affine trasnformation.
 */
function animate_NAff() {
  defo= (defo+1.0) % 180
  loadVertices();
}



/**
 * Startup function called from html code to start program.
*/
 function startup() {
  canvas = document.getElementById("myGLCanvas");
  gl = createGLContext(canvas);
  setupShaders();
  setupBuffers_aff();
  gl.clearColor(1.0, 1.0, 1.0, 1.0);
  gl.enable(gl.DEPTH_TEST);
  tick()
}

/**
 * Tick called for every animation frame. Bease on the checked box, different transformation is chosen.
*/
function tick() {
  if (document.getElementById("Affine").checked) {
    requestAnimFrame(tick);
    draw_aff();
    animate_aff();
  } else {
    requestAnimFrame(tick);
    draw_NAff();
    animate_NAff();
  }
}


