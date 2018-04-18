var gl;
var canvas;
/** @global The shader program for the skybox */
var boxShaderProgram;
/** @global The shader program for the teapot */
var teapotShaderProgram;
/** @global The vertices of the skybox generated from TriMesh.js */
var boxVertexPositionBuffer;

var days=0;
/** @global The Angles to rotate the entire scen(box + teapot) */
var yAngle = 0.0;
var xAngle = 0.0;

// Create a place to store the textures
var cubeImage0;
var cubeImage1;
var cubeImage2;
var cubeImage3;
var cubeImage4;
var cubeImage5;
var cubeImages = [cubeImage0, cubeImage1, cubeImage2, cubeImage3, cubeImage4, cubeImage5]
var cubeMap;

// Variable to count the number of textures loaded
var texturesLoaded = 0;

var uInvVT;
var invVT = mat3.create();

var normalMatrix = mat3.create();
var uNormalMatrix;

// View parameters
/** @global Location of the camera in world coordinates */
var eyePt = vec3.fromValues(0.0,0.0,5.0);
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

/** @global An object holding the geometry for a 3D mesh */
var myMesh;

//Light parameters
/** @global Light position in VIEW coordinates */
var lightPosition = [10,10,10];
/** @global Ambient light color/intensity for Phong reflection */
var lAmbient = [0.1,0.1,0.1];
/** @global Diffuse light color/intensity for Phong reflection */
var lDiffuse = [1,1,1];
/** @global Specular light color/intensity for Phong reflection */
var lSpecular =[1,1,1];

//Material parameters
/** @global Ambient material color/intensity for Phong reflection */
var kAmbient = [1.0,1.0,1.0];
/** @global Diffuse material color/intensity for Phong reflection */
var kTerrainDiffuse = [205.0/255.0,163.0/255.0,63.0/255.0];
/** @global Specular material color/intensity for Phong reflection */
var kSpecular = [1.0,1.0,1.0];
/** @global Shininess exponent for Phong reflection */
var shininess = 23;
/** @global Edge color fpr wireframeish rendering */
var kEdgeBlack = [0.0,0.0,0.0];
/** @global Edge color for wireframe rendering */
var kEdgeWhite = [1.0,1.0,1.0];


//Model parameters for the teapot
var eulerY=0;
var eulerX=0;
//How far away are the teapot in y-direction.
var potPos=-2.5;

//-------------------------------------------------------------------------
/**
 * Sends Modelview matrix to shader
 * @param program: the shader program to be used.
 */
function uploadModelViewMatrixToShader(program) {
  gl.uniformMatrix4fv(program.mvMatrixUniform, false, mvMatrix);
}

//-------------------------------------------------------------------------
/**
 * Sends projection matrix to shader
 * @param program: the shader program to be used.
 */
function uploadProjectionMatrixToShader(program) {
  gl.uniformMatrix4fv(program.pMatrixUniform,
                      false, pMatrix);
}

//-------------------------------------------------------------------------
/**
 * Generates and sends the normal matrix to the shader
 * @param program: the shader program to be used.
 */
function uploadNormalMatrixToShader(program) {
  mat3.fromMat4(nMatrix,mvMatrix);
  mat3.transpose(nMatrix,nMatrix);
  mat3.invert(nMatrix,nMatrix);
  gl.uniformMatrix3fv(program.nMatrixUniform, false, nMatrix);
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
 * @param program: the shader program to be used.
 */
function setMatrixUniforms(program) {
    uploadModelViewMatrixToShader(program);
    uploadNormalMatrixToShader(program);
    uploadProjectionMatrixToShader(program);
    gl.uniformMatrix3fv(teapotShaderProgram.uInvVT, false, invVT);
    gl.uniformMatrix3fv(teapotShaderProgram.uNormalMatrix, false, normalMatrix);
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
 * Translates degrees to radians
 * @param {Number} degrees Degree input to function
 * @return {Number} The radians that correspond to the degree input
 */
function degToRad(degrees) {
        return degrees * Math.PI / 180;
}
//---------------------------------------------------------------------------------
/**
 * @param {number} value Value to determine whether it is a power of 2
 * @return {boolean} Boolean of whether value is a power of 2
 */
function isPowerOf2(value) {
  return (value & (value - 1)) == 0;
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
 * Animation to be called from tickbox. Updates globals and performs animation for each tickbox.
 */
function animate() {
    days=days+0.5;
}

//-------------------------------------------------------------------------
/**
 * Asynchronously read a server-side text file with a choosen face.
 */
function asyncGetFileBox(url, face) {
  console.log("Getting image");
  return new Promise((resolve, reject) => {
    cubeImages[face] = new Image();
    cubeImages[face].onload = () => resolve({url, status: 'ok'});
    cubeImages[face].onerror = () => reject({url, status: 'error'});
    cubeImages[face].src = url
    console.log("Made promise");
  });
}
//-------------------------------------------------------------------------
/**
 * Asynchronously read a server-side text file for the obj.
 */
function asyncGetFile(url) {
  //Your code here
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url);
    xhr.responseType = "text";
    xhr.onload = () => resolve(xhr.responseText);
    xhr.onerror = () => reject(xhr.statusText);
    xhr.send();
    console.log("Made Promise");
  });
}

//----------------------------------------------------------------------------------
/**
 * Setup a promise to load a texture
 */
function setupPromise(filename, face) {
    myPromise = asyncGetFileBox(filename, face);
    // We define what to do when the promise is resolved with the then() call,
    // and what to do when the promise is rejected with the catch() call
    myPromise.then((status) => {
        handleTextureLoaded(cubeImages[face], face)
        console.log("Yay! got the file");
    })
    .catch(
        // Log the rejection reason
       (reason) => {
            console.log('Handle rejected promise ('+reason+') here.');
        });
}

//----------------------------------------------------------------------------------
/**
 * Texture handling. Generates mipmap and sets texture parameters.
 * @param {Object} image Image for cube application
 * @param {Number} face Which face of the cubeMap to add texture to
 */
function handleTextureLoaded(image, face) {

  console.log("handleTextureLoaded, image = " + image);
  texturesLoaded++;

  gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMap);

  if (face == 0) {
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Z, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  } else if (face == 1) {
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  } else if (face == 2) {
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Y, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  } else if (face == 3) {
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  } else if (face == 4) {
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  } else if (face == 5) {
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  }

  //Clamping
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  //Filtering
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
}

//----------------------------------------------------------------------------------
/**
 * Set up the vertices of the box.
 */
function setupBoxBuffers() {

  //Distance between (0,0,0) and the plane
  var planeDist = 3;
  //Size of each side of the plane
  var boxLength = 3
  //Array that hold the vertex.
  var boxSoup = [];
  var numT = 0;
  //Use functions to make x,y,z planes.
  numT += zPlaneFromSubDivision(5,-boxLength,boxLength,-boxLength,boxLength,boxSoup, -planeDist);
  numT += zPlaneFromSubDivision(5,-boxLength,boxLength,-boxLength,boxLength,boxSoup, planeDist);
  numT += yPlaneFromSubDivision(5,-boxLength,boxLength,-boxLength,boxLength,boxSoup, -planeDist);
  numT += yPlaneFromSubDivision(5,-boxLength,boxLength,-boxLength,boxLength,boxSoup, planeDist);
  numT += xPlaneFromSubDivision(5,-boxLength,boxLength,-boxLength,boxLength,boxSoup, planeDist);
  numT += xPlaneFromSubDivision(5,-boxLength,boxLength,-boxLength,boxLength,boxSoup, -planeDist);

  gl.useProgram(boxShaderProgram);
  boxVertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, boxVertexPositionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(boxSoup), gl.STATIC_DRAW);
  boxVertexPositionBuffer.itemSize = 3;
  boxVertexPositionBuffer.numItems = numT * 3;
}

//----------------------------------------------------------------------------------
/**
 * Populate buffers with data from the obj file.
 */
function setupMesh(filename) {
  //Your code here
  gl.useProgram(teapotShaderProgram);
  myMesh = new TriMesh();
  myPromise = asyncGetFile(filename);
  myPromise.then((retrievedText) => {
    myMesh.loadFromOBJ(retrievedText);

  })
  .catch(
    (reason) => {
      console.log("Handle rejected promise ("+reason+") here")
    })
  myMesh.printBuffers()
}

//----------------------------------------------------------------------------------
/**
 * Setup the fragment and vertex shaders for the skybox
 */
function setupBoxShaders() {
  vertexShader = loadShaderFromDOM("shader-vs-skybox");
  fragmentShader = loadShaderFromDOM("shader-fs-skybox");

  boxShaderProgram = gl.createProgram();
  gl.attachShader(boxShaderProgram, vertexShader);
  gl.attachShader(boxShaderProgram, fragmentShader);
  gl.linkProgram(boxShaderProgram);

  if (!gl.getProgramParameter(boxShaderProgram, gl.LINK_STATUS)) {
    alert("Failed to setup shaders");
  }

  gl.useProgram(boxShaderProgram);

  boxShaderProgram.vertexPositionAttribute = gl.getAttribLocation(boxShaderProgram, "aVertexPosition");
  gl.enableVertexAttribArray(boxShaderProgram.vertexPositionAttribute);
  //Box does not need normal
  // boxShaderProgram.vertexNormalAttribute = gl.getAttribLocation(boxShaderProgram, "aVertexNormal");
  // gl.enableVertexAttribArray(boxShaderProgram.vertexNormalAttribute);

  boxShaderProgram.mvMatrixUniform = gl.getUniformLocation(boxShaderProgram, "uMVMatrix");
  boxShaderProgram.pMatrixUniform = gl.getUniformLocation(boxShaderProgram, "uPMatrix");
  boxShaderProgram.nMatrixUniform = gl.getUniformLocation(boxShaderProgram, "uNMatrix");
}

function setupTeapotShader() {
  vertexShader = loadShaderFromDOM("shader-vs-teapot");
  fragmentShader = loadShaderFromDOM("shader-fs-teapot");

  teapotShaderProgram = gl.createProgram();
  gl.attachShader(teapotShaderProgram, vertexShader);
  gl.attachShader(teapotShaderProgram, fragmentShader);
  gl.linkProgram(teapotShaderProgram);

  if (!gl.getProgramParameter(teapotShaderProgram, gl.LINK_STATUS)) {
    alert("Failed to setup shaders");
  }

  gl.useProgram(teapotShaderProgram);

  teapotShaderProgram.vertexPositionAttribute = gl.getAttribLocation(teapotShaderProgram, "aVertexPosition");
  gl.enableVertexAttribArray(teapotShaderProgram.vertexPositionAttribute);

  teapotShaderProgram.vertexNormalAttribute = gl.getAttribLocation(teapotShaderProgram, "aVertexNormal");
  gl.enableVertexAttribArray(teapotShaderProgram.vertexNormalAttribute);

  teapotShaderProgram.mvMatrixUniform = gl.getUniformLocation(teapotShaderProgram, "uMVMatrix");
  teapotShaderProgram.pMatrixUniform = gl.getUniformLocation(teapotShaderProgram, "uPMatrix");
  teapotShaderProgram.nMatrixUniform = gl.getUniformLocation(teapotShaderProgram, "uNMatrix");
  teapotShaderProgram.uNormalMatrix = gl.getUniformLocation(teapotShaderProgram, "normalMatrix")
  teapotShaderProgram.uInvVT = gl.getUniformLocation(teapotShaderProgram, "invVT");
  teapotShaderProgram.uniformLightPositionLoc = gl.getUniformLocation(teapotShaderProgram, "uLightPosition");
  teapotShaderProgram.uniformAmbientLightColorLoc = gl.getUniformLocation(teapotShaderProgram, "uAmbientLightColor");
  teapotShaderProgram.uniformDiffuseLightColorLoc = gl.getUniformLocation(teapotShaderProgram, "uDiffuseLightColor");
  teapotShaderProgram.uniformSpecularLightColorLoc = gl.getUniformLocation(teapotShaderProgram, "uSpecularLightColor");
  teapotShaderProgram.uniformShininessLoc = gl.getUniformLocation(teapotShaderProgram, "uShininess");
  teapotShaderProgram.uniformAmbientMaterialColorLoc = gl.getUniformLocation(teapotShaderProgram, "uKAmbient");
  teapotShaderProgram.uniformDiffuseMaterialColorLoc = gl.getUniformLocation(teapotShaderProgram, "uKDiffuse");
  teapotShaderProgram.uniformSpecularMaterialColorLoc = gl.getUniformLocation(teapotShaderProgram, "uKSpecular");
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
  gl.uniform1f(teapotShaderProgram.uniformShininessLoc, alpha);
  gl.uniform3fv(teapotShaderProgram.uniformAmbientMaterialColorLoc, a);
  gl.uniform3fv(teapotShaderProgram.uniformDiffuseMaterialColorLoc, d);
  gl.uniform3fv(teapotShaderProgram.uniformSpecularMaterialColorLoc, s);
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
  gl.uniform3fv(teapotShaderProgram.uniformLightPositionLoc, loc);
  gl.uniform3fv(teapotShaderProgram.uniformAmbientLightColorLoc, a);
  gl.uniform3fv(teapotShaderProgram.uniformDiffuseLightColorLoc, d);
  gl.uniform3fv(teapotShaderProgram.uniformSpecularLightColorLoc, s);
}

//----------------------------------------------------------------------------------
/**
 * Creates textures for application to cube.
 */
function setupTextures() {
  gl.useProgram(boxShaderProgram);
  cubeMap = gl.createTexture();
  setupPromise("./boxPics/pos-z.png", 0);
  setupPromise("./boxPics/neg-z.png", 1);
  setupPromise("./boxPics/pos-y.png", 2);
  setupPromise("./boxPics/neg-y.png", 3);
  setupPromise("./boxPics/pos-x.png", 4);
  setupPromise("./boxPics/neg-x.png", 5);

}

/**
  * The main Draw call.
  * Used two different shafer programs for rendering.
  *
  *
  */

function draw() {
    var transformVec = vec3.create();
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // We'll use perspective
    mat4.perspective(pMatrix,degToRad(90), gl.viewportWidth / gl.viewportHeight, 0.1, 500.0);

    // We want to look down -z, so create a lookat point in that direction
    vec3.add(viewPt, eyePt, viewDir);
    // Then generate the lookat matrix and initialize the MV matrix to that view
    mat4.lookAt(mvMatrix,eyePt,viewPt,up);
    //If statement here used during debugging.
    if (true) {
        //Use different shaderProgram
        gl.useProgram(boxShaderProgram);
        //  What IF Condition should go here?
        mvPushMatrix();
        //Change the scenn.
        mat4.rotateY(mvMatrix, mvMatrix, yAngle);
        mat4.rotateX(mvMatrix, mvMatrix, xAngle);
        vec3.set(transformVec,40,40,40);
        mat4.scale(mvMatrix, mvMatrix,transformVec);

        invVT = mat3.create();
        mat3.fromMat4(invVT, mvMatrix);
        //mat3.invert(invVT, invVT);


        setMatrixUniforms(boxShaderProgram);
        gl.bindBuffer(gl.ARRAY_BUFFER, boxVertexPositionBuffer);
        gl.vertexAttribPointer(boxShaderProgram.vertexPositionAttribute,   boxVertexPositionBuffer.itemSize,
                               gl.FLOAT, false, 0, 0);
        // Bind normal buffer
        // gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexNormalBuffer);
        // gl.vertexAttribPointer(boxShaderProgram.vertexNormalAttribute,
        //                          sphereVertexNormalBuffer.itemSize,
        //                          gl.FLOAT, false, 0, 0);
        // Set the texture for the cube map.
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMap);
        gl.uniform1i(gl.getUniformLocation(boxShaderProgram, "uCubeSampler"), 0);
        gl.drawArrays(gl.TRIANGLES, 0, boxVertexPositionBuffer.numItems);

        mvPopMatrix();
    }

    if (myMesh.loaded() == true) {
        //Use different shaderProgram
        gl.useProgram(teapotShaderProgram);
        var translateVec = vec3.fromValues(0,potPos,0);
        mvPushMatrix();

                        invVT = mat3.create()
        mat3.normalFromMat4(normalMatrix, mvMatrix);
        mat3.fromMat4(invVT, mvMatrix);
        mat3.invert(invVT, invVT);

        //Roate aournd the teapot along with the sceen.
        mat4.rotateY(mvMatrix, mvMatrix, yAngle);
        mat4.rotateX(mvMatrix, mvMatrix, xAngle);

        mat4.multiply(mvMatrix,vMatrix,mvMatrix);
        mat4.translate(mvMatrix, mvMatrix, translateVec);

        //Transform the light position accordingly.
        var lightPosition = vec3.fromValues(10,10,10);
        var l = vec4.fromValues(lightPosition[0],lightPosition[1],lightPosition[2], 1)
        vec4.transformMat4(l, l, mvMatrix);
        lightPosition = vec3.fromValues(l[0], l[1], l[2]);

        //Change the teapot indivadually w/o chaning the light position.
        mat4.rotateY(mvMatrix, mvMatrix, degToRad(eulerY));
        mat4.rotateX(mvMatrix, mvMatrix, degToRad(eulerX));

        gl.uniform1i(gl.getUniformLocation(teapotShaderProgram, "uCubeSampler"), 0);

        setMatrixUniforms(teapotShaderProgram);
        setLightUniforms(lightPosition,lAmbient,lDiffuse,lSpecular);
        setMaterialUniforms(shininess,kAmbient,
                            kTerrainDiffuse,kSpecular);
        myMesh.drawTriangles();
        mvPopMatrix();
    }
}

function start() {
    canvas = document.getElementById("myGLCanvas");
    gl = createGLContext(canvas);
    setupBoxShaders();
    setupTeapotShader();
    setupBoxBuffers();
    setupMesh("teapot_0.obj");
    setupTextures();
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
    document.onkeydown = handleKeyDown;
    document.onkeyup = handleKeyUp;
    tick();
}

//----------------------------------------------------------------------------------
/**
 * Tick called for every animation frame.
 */
function tick() {
    requestAnimFrame(tick);
    draw();
    animate();
}

//----------------------------------------------------------------------------------
//Code to handle user interaction
var currentlyPressedKeys = {};
function handleKeyDown(event) {
  //console.log("Key down ", event.key, " code ", event.code);
  currentlyPressedKeys[event.key] = true;
  //rotate the teapot along vertical axis.
  if (currentlyPressedKeys["a"]) {
      // key A
      eulerY-= 5;
  } else if (currentlyPressedKeys["d"]) {
      // key D
      eulerY+= 5;
  }
  //zooming the teapot
  if (currentlyPressedKeys["="]){
      event.preventDefault();
      eyePt[2]+= 0.01;
  } else if (currentlyPressedKeys["-"]){
      event.preventDefault();
      eyePt[2]-= 0.01;
  }
  //Rotate the teapot along transverse plane
  if (currentlyPressedKeys["w"]){
      // Up cursor key
      eulerX += 5;
  } else if (currentlyPressedKeys["s"]){
      // Down cursor key
      eulerX -= 5;
  }

  //Change the view along with teapot
  if (currentlyPressedKeys["ArrowUp"]){
      // Up cursor key
      event.preventDefault();
      xAngle+= 0.1;
  } else if (currentlyPressedKeys["ArrowDown"]){
      event.preventDefault();
      // Down cursor key
      xAngle-= 0.1;
  }
  if (currentlyPressedKeys["ArrowLeft"]){
      // Up cursor key
      event.preventDefault();
      yAngle+= 0.1;
  } else if (currentlyPressedKeys["ArrowRight"]){
      event.preventDefault();
      // Down cursor key
      yAngle-= 0.1;
  }
}

function handleKeyUp(event) {
        //console.log("Key up ", event.key, " code ", event.code);
        currentlyPressedKeys[event.key] = false;
}

