var gl;
var canvas;

// View parameters
/** @global Location of the camera in world coordinates */
var eyePt = vec3.fromValues(0.0,0.0,10.0);
/** @global Direction of the view in world coordinates */
var viewDir = vec3.fromValues(0.0,0.0,-1.0);
/** @global Up vector for view matrix creation, in world coordinates */
var up = vec3.fromValues(0.0,1.0,0.0);
/** @global Location of a point along viewDir in world coordinates */
var viewPt = vec3.fromValues(0.0,0.0,0.0);

// Create the normal
var nMatrix = mat3.create();

// Create ModelView matrix
var mvMatrix = mat4.create();

//Create Projection matrix
var pMatrix = mat4.create();

var mvMatrixStack = [];

/** @global The View matrix */
var vMatrix = mat4.create();


//Light parameters
/** @global Light position in VIEW coordinates */
var lightPosition = [20,20,20];
/** @global Ambient light color/intensity for Phong reflection */
var lAmbient = [1,1,1];
/** @global Diffuse light color/intensity for Phong reflection */
var lDiffuse = [1,1,1];
/** @global Specular light color/intensity for Phong reflection */
var lSpecular =[0.1,0.1,0.1];

//Material parameters
/** @global Ambient material color/intensity for Phong reflection */
var kAmbient = [0.5,0.5,1.0];
/** @global Diffuse material color/intensity for Phong reflection */
var kTerrainDiffuse = [0,1,1];
/** @global Specular material color/intensity for Phong reflection */
var kSpecular = [0.0,0.0,0.0];
/** @global Shininess exponent for Phong reflection */
var shininess = 5;

// Time variables used for animation.
var now = Date.now();
var last = Date.now();
var step = now - last;

//Arrays that holds the sphere properties.
var sphereCount = 0;
var positions = [];
var velocities = []; //in m/s
var masses = []; //in kg
var forces = []; //in N

//The range in which the sphere will be spawned at
var sphereSpwnRange = 5;
//The range in which the initial velocity of the sphere will be.
var sphereViRange = 2;
//gravity of the Earth, 9.8 m/s^2
var gravity = [0, -9.8, 0];
//coeefient of fraction of the ball with air.
var fraction = 10;
//How elastic the collision is, in this case, perfect elastic collsion
var elasticity = 1.0
//Position of the "box".
var boarder = 5.0;

//-------------------------------------------------------------------------
/**
 * Sends Modelview matrix to shader
 */
function uploadModelViewMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

//-------------------------------------------------------------------------
/**
 * Sends projection matrix to shader
 */
function uploadProjectionMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform,
                      false, pMatrix);
}

//-------------------------------------------------------------------------
/**
 * Generates and sends the normal matrix to the shader
 */
function uploadNormalMatrixToShader() {
  mat3.fromMat4(nMatrix,mvMatrix);
  mat3.transpose(nMatrix,nMatrix);
  mat3.invert(nMatrix,nMatrix);
  gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, nMatrix);
}

//----------------------------------------------------------------------------------
/**
 * Pushes matrix onto modelview matrix stack
 */
function mvPushMatrix() {
    var copy = mat4.clone(mvMatrix);
    mvMatrixStack.push(copy);
}


//----------------------------------------------------------------------------------
/**
 * Pops matrix off of modelview matrix stack
 */
function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
      throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}

//----------------------------------------------------------------------------------
/**
 * Sends projection/modelview matrices to shader
 */
function setMatrixUniforms() {
    uploadModelViewMatrixToShader();
    uploadNormalMatrixToShader();
    uploadProjectionMatrixToShader();
}

//----------------------------------------------------------------------------------
/**
 * Translates degrees to radians
 * @param {Number} degrees Degree input to function
 * @return {Number} The radians that correspond to the degree input
 */
function degToRad(degrees) {
        return degrees * Math.PI / 180;
}

//----------------------------------------------------------------------------------
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

//----------------------------------------------------------------------------------
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

//----------------------------------------------------------------------------------
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

  shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
  gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

  shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
  shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
  shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
  shaderProgram.uniformLightPositionLoc = gl.getUniformLocation(shaderProgram, "uLightPosition");
  shaderProgram.uniformAmbientLightColorLoc = gl.getUniformLocation(shaderProgram, "uAmbientLightColor");
  shaderProgram.uniformDiffuseLightColorLoc = gl.getUniformLocation(shaderProgram, "uDiffuseLightColor");
  shaderProgram.uniformSpecularLightColorLoc = gl.getUniformLocation(shaderProgram, "uSpecularLightColor");
  shaderProgram.uniformShininessLoc = gl.getUniformLocation(shaderProgram, "uShininess");
  shaderProgram.uniformAmbientMaterialColorLoc = gl.getUniformLocation(shaderProgram, "uKAmbient");
  shaderProgram.uniformDiffuseMaterialColorLoc = gl.getUniformLocation(shaderProgram, "uKDiffuse");
  shaderProgram.uniformSpecularMaterialColorLoc = gl.getUniformLocation(shaderProgram, "uKSpecular");
}

//-------------------------------------------------------------------------
/**
 * Sends material information to the shader
 * @param {Float32} alpha shininess coefficient
 * @param {Float32Array} a Ambient material color
 * @param {Float32Array} d Diffuse material color
 * @param {Float32Array} s Specular material color
 */
function setMaterialUniforms(alpha,a,d,s) {
  gl.uniform1f(shaderProgram.uniformShininessLoc, alpha);
  gl.uniform3fv(shaderProgram.uniformAmbientMaterialColorLoc, a);
  gl.uniform3fv(shaderProgram.uniformDiffuseMaterialColorLoc, d);
  gl.uniform3fv(shaderProgram.uniformSpecularMaterialColorLoc, s);
}

//-------------------------------------------------------------------------
/**
 * Sends light information to the shader
 * @param {Float32Array} loc Location of light source
 * @param {Float32Array} a Ambient light strength
 * @param {Float32Array} d Diffuse light strength
 * @param {Float32Array} s Specular light strength
 */
function setLightUniforms(loc,a,d,s) {
  gl.uniform3fv(shaderProgram.uniformLightPositionLoc, loc);
  gl.uniform3fv(shaderProgram.uniformAmbientLightColorLoc, a);
  gl.uniform3fv(shaderProgram.uniformDiffuseLightColorLoc, d);
  gl.uniform3fv(shaderProgram.uniformSpecularLightColorLoc, s);
}

function setupSphereBuffers() {
  var sphereSoup = [];
  var sphereNormals = [];
  var numT = sphereFromSubdivision(6, sphereSoup, sphereNormals);
  console.log("Generated ", numT, " triangles");
  sphereVertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexPositionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphereSoup), gl.STATIC_DRAW);
  sphereVertexPositionBuffer.itemSize = 3;
  sphereVertexPositionBuffer.numItems = numT * 3;

  //Specify normals
  sphereVertexNormalBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexNormalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphereNormals), gl.STATIC_DRAW);
  sphereVertexNormalBuffer.itemSize = 3;
  sphereVertexNormalBuffer.numItems = numT * 3;

  console.log("Normals ", sphereNormals.length/3);
  console.log(sphereSoup)

}

function setupBuffers() {
    setupSphereBuffers();
}


//----------------------------------------------------------------------------------
/**
 * Draw call that applies matrix transformations to model and draws model in frame
 */
function draw() {
    var transformVec = vec3.create();

    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // We'll use perspective
    mat4.perspective(pMatrix,degToRad(90), gl.viewportWidth / gl.viewportHeight, 0.1, 200.0);

    // We want to look down -z, so create a lookat point in that direction
    vec3.add(viewPt, eyePt, viewDir);
    // Then generate the lookat matrix and initialize the MV matrix to that view
    mat4.lookAt(mvMatrix,eyePt,viewPt,up);

    //  What IF Condition should go here?
    if (sphereCount != 0) {
        //Handle each sphere
        for (i = 0; i < sphereCount; i++) {
            mvPushMatrix();
            var transformVec = vec3.fromValues(positions[i][0], positions[i][1], positions[i][2]);
            mat4.translate(mvMatrix, mvMatrix, transformVec);
            var scale = 1;
            var scaleVec = vec3.fromValues(scale,scale,scale);
            mat4.scale(mvMatrix, mvMatrix, scaleVec);
            setMatrixUniforms();
            setMaterialUniforms(shininess,kAmbient,kTerrainDiffuse,kSpecular);
            setLightUniforms(lightPosition,lAmbient,lDiffuse,lSpecular);
            drawSphere();
            mvPopMatrix();
        }
    }
}

//-------------------------------------------------------------------------
/**
 * Draws a sphere from the sphere buffer
 */
function drawSphere(){
  gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexPositionBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, sphereVertexPositionBuffer.itemSize,
                         gl.FLOAT, false, 0, 0);

  // Bind normal buffer
  gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexNormalBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute,
                           sphereVertexNormalBuffer.itemSize,
                           gl.FLOAT, false, 0, 0);


  gl.drawArrays(gl.TRIANGLES, 0, sphereVertexPositionBuffer.numItems);

}


//----------------------------------------------------------------------------------
/**
 * Startup function called from html code to start program.
 */
 function startup() {
  canvas = document.getElementById("myGLCanvas");
  gl = createGLContext(canvas);
  setupShaders();
  setupBuffers();
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);
  // document.onkeydown = handleKeyDown;
  // document.onkeyup = handleKeyUp;
  tick();
}

//----------------------------------------------------------------------------------
/**
  * Update any model transformations
  */
function animate() {
    now = Date.now();
    step = (now - last) / 1000 //Time in s.
    last = now;
    for (i = 0; i < sphereCount; i++) {
        for (j = 0; j < 3; j++) {
            //Get gatvity number
            if (document.getElementById("moon").checked) {
                gravity = [0, -1.62, 0];
            } else if (document.getElementById("mars").checked) {
                gravity = [0, -3.711, 0];
            } else {
                gravity = [0, -9.8, 0];
            }
            //Update the velocities using force
            //vt = v0 + a * dt
            //a = F / m
            //f = c * v ^ 2
            //velocities[i][j] = velocities[i][j] + step * (velocities[i][j] * velocities[i][j] * forces[i][j] / masses[i] + gravity[j]);

            //Or could use drag ** t model, not sure what it means physically, use it anyway
            var drag = document.getElementById("slider").value / 1000;
            var prevV = velocities[i][j];
            velocities[i][j] = velocities[i][j] * Math.pow(drag, step) + gravity[j] * step
            //If next velocity is smaller than 0, meaning the ball should stip because of the drag.
            if (velocities[i][j] > 0 && prevV < 0) {
              velocities[i][j] = 0;
              console.log("smaller than 0?")
            }
            if (j == 1 && velocities[i][j] < -1.6
              && Math.abs(velocities[i][j]) < 2) {
             console.log(velocities[i][j], prevV) 
            }
            
            //Now update the postion using the velocity
            var nextPostion = positions[i][j] + step * velocities[i][j]
            //Check if it is outside the box of size 5 + radius.
            if (nextPostion > boarder || nextPostion < -boarder) {
                //update Velocity
                velocities[i][j] = -velocities[i][j] * elasticity;
            }
            positions[i][j] = positions[i][j] + step * velocities[i][j];
            //Update the fraction to make sure it always act against the velocity, used for the first model.
            var vDirection = Math.abs(velocities[i][j]) / velocities[i][j]
            forces[i][j] = -vDirection * fraction
        }
        //How to deal with the boucing at floor?
        var vy = velocities[i][1];
        var y = positions[i][1];
        //console.log(vy, y)
        if (vy < 0.001 && y + boarder <= boarder / 1500) {
          velocities[i][1] = 0;
          positions[i][1] = -boarder;
        }
    }
}


//----------------------------------------------------------------------------------
/**
 * Keeping drawing frames....
 */
function tick() {
    requestAnimFrame(tick);
    animate();
    draw();
}

/**
 * Add one sphere at random position.
 */
function addSphere() {
    //First add total number of sphere.
    sphereCount++;
    //Give the sphere a mass, ~10kg?
    masses.push(randomRange(0, 100));
    //Give the sphere a rangom starting location.
    var tempX = randomRange(-sphereSpwnRange, sphereSpwnRange);
    var tempY = randomRange(-sphereSpwnRange, sphereSpwnRange);
    var tempZ = randomRange(-sphereSpwnRange, sphereSpwnRange);
    var temp = [tempX, tempY, tempZ]
    positions.push(temp);
    //Give it an initial velocity, give higher vi in x and z direction.
    var tempVx = randomRange(-5 * sphereViRange, 5 * sphereViRange);
    var tempVy = randomRange(-5 * sphereViRange, 5 * sphereViRange);
    var tempVz = randomRange(-sphereViRange, sphereViRange);
    var tempV = [tempVx, tempVy, tempVz];
    velocities.push(tempV);
    //Give the sphere the gravity and fraction
    var xDirection = -Math.abs(tempVx) / tempVx;
    var yDirection = -Math.abs(tempVy) / tempVy;
    var zDirection = -Math.abs(tempVz) / tempVz;
    forces.push([fraction * xDirection, fraction * yDirection, fraction * zDirection]);
}

/**
 * Reset all spheres.
 */
function reset() {
    sphereCount = 0;
    positions = [];
    velocities = [];
    forces = []
}


/**
 * Helper function that return a random number.
 * @param lower - the lower bound of the random number.
 * @param upper - the upper bound of the random number.
 * @return - A psuedorandome number.
 */
function randomRange(lower, upper) {
    rand = Math.random();
    return lower + (upper - lower) * rand
}
