/**
 * @fileoverview Terrain - A simple 3D terrain using WebGL
 * based on the workd of @author Eric Shaffer <shaffer1@illinois.edu>
 * @author Yuhao Min <ymin6@illinois.edu>
 */

/** Class implementing 3D terrain. */
class Terrain{
/**
 * Initialize members of a Terrain object
 * @param {number} n Number of triangles along x axis and y axis given by 2 ** n + 1.
 * @param {number} minX Minimum X coordinate value
 * @param {number} maxX Maximum X coordinate value
 * @param {number} minY Minimum Y coordinate value
 * @param {number} maxY Maximum Y coordinate value
 * @param {number} minZ Minimum Z coordinate value
 * @param {number} maxZ Maximum Z coordinate value
 */
    constructor(n,minX,maxX,minY,maxY,minZ,maxZ){
        this.div = Math.pow(2,n);
        this.minX=minX;
        this.minY=minY;
        this.maxX=maxX;
        this.maxY=maxY;
        this.minZ=minZ;
        this.maxZ=maxZ;
        // this.minHeight;
        // this.maxHeight;

        //Generate an array containing the z coordinates of the points.
        this.DSArray = this.DS(n)
        // Allocate vertex array
        this.vBuffer = [];
        // Allocate triangle array
        this.fBuffer = [];
        // Allocate normal array
        this.nBuffer = [];
        // Allocate array for edges so we can draw wireframe
        this.eBuffer = [];
        //Allocate array that store the color info for each vertex
        //Calculation is done here and passed to the shaders.
        this.cBuffer = [];
        console.log("Terrain: Allocated buffers");

        this.generateTriangles();
        console.log("Terrain: Generated triangles");

        this.generateLines();
        console.log("Terrain: Generated lines");

        // Get extension for 4 byte integer indices for drwElements
        var ext = gl.getExtension('OES_element_index_uint');
        if (ext ==null){
            alert("OES_element_index_uint is unsupported by your browser and terrain generation cannot proceed.");
        }


        //----------------print to console for debugging here-------------------------//
        // this.cord0 = [0, 0, 0]
        // this.cord1 = [0, 0, 0]
        // this.cord2 = [0, 0, 0]

        // //this.toPrint = this.findNorm(this.cord0, this.cord1, this.cord2)
        // // this.normal_at_point(0, this.div - 1)
            //this.toPrint = this.normal_at_point(this.div, this.div)
        //this.toPrint = this.nBuffer
        // for (var i = 0; i < this.div + 1; i++) {
        //     for (var j = 0; j < this.div + 1; j++) {
        //         // if (this.normal_at_point(j, i) != [0, 0, 1]) {
        //         //     console.log(this.returnVertex(j, i))
        //         //     this.toPrint.push(this.normal_at_point(j, i))
        //         // }
        //         this.toPrint.push(this.normal_at_point(i, j)[2])

        //     }
        // }

        this.toPrint = this.maxHeight
        console.log("12,12 is ",this.maxHeight)

        //---------------------------------------------------------------------------//
    }

    /**
    * Set the x,y,z coords of a vertex at location(i,j)
    * @param {Object} v an an array of length 3 holding x,y,z coordinates
    * @param {number} i the ith row of vertices
    * @param {number} j the jth column of vertices
    */
    setVertex(v,i,j)
    {
        var vid = 3 * (i * (this.div + 1) + j);
        this.vBuffer[vid] = v[0];
        this.vBuffer[vid + 1] = v[1];
        this.vBuffer[vid + 2] = v[2];
    }

    /**
    * Return the x,y,z coordinates of a vertex at location (i,j)
    * @param {Object} v an an array of length 3 holding x,y,z coordinates
    * @param {number} i the ith row of vertices
    * @param {number} j the jth column of vertices
    */
    getVertex(v,i,j)
    {
        var vid = 3 * (i * (this.div + 1) + j);
        v[0] = this.vBuffer[vid];
        v[1] = this.vBuffer[vid + 1];
        v[2] = this.vBuffer[vid + 2];
        return v;
    }

    /**
    * Send the buffer objects to WebGL for rendering
    */
    loadBuffers()
    {
        // Specify the vertex coordinates
        this.VertexPositionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexPositionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vBuffer), gl.STATIC_DRAW);
        this.VertexPositionBuffer.itemSize = 3;
        this.VertexPositionBuffer.numItems = this.numVertices;
        console.log("Loaded ", this.VertexPositionBuffer.numItems, " vertices");

        // Specify normals to be able to do lighting calculations
        this.VertexNormalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.nBuffer),
                  gl.STATIC_DRAW);
        this.VertexNormalBuffer.itemSize = 3;
        this.VertexNormalBuffer.numItems = this.numVertices;
        console.log("Loaded ", this.VertexNormalBuffer.numItems, " normals");

        // Specify faces of the terrain
        this.IndexTriBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.IndexTriBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(this.fBuffer),
                  gl.STATIC_DRAW);
        this.IndexTriBuffer.itemSize = 1;
        this.IndexTriBuffer.numItems = this.fBuffer.length;
        console.log("Loaded ", this.IndexTriBuffer.numItems, " triangles");

        //Setup Edges
        this.IndexEdgeBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.IndexEdgeBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(this.eBuffer),
                  gl.STATIC_DRAW);
        this.IndexEdgeBuffer.itemSize = 1;
        this.IndexEdgeBuffer.numItems = this.eBuffer.length;

        console.log("triangulatedPlane: loadBuffers");
        //Setup height depedent Color
        this.vertexColorBuffer = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexColorBuffer)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.cBuffer), gl.STATIC_DRAW)
        this.vertexColorBuffer.itemSize = 3
        this.vertexColorBuffer.numItems = this.cBuffer.length
        console.log("Loaded the color buffer")


        console.log(this.toPrint)
    }

    /**
    * Render the triangles
    */
    drawTriangles(){
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexPositionBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, this.VertexPositionBuffer.itemSize,
                         gl.FLOAT, false, 0, 0);

        // Bind normal buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexNormalBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute,
                           this.VertexNormalBuffer.itemSize,
                           gl.FLOAT, false, 0, 0);

        // Bind color Buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexColorBuffer)
        gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, this.vertexColorBuffer.itemSize, gl.FLOAT, false, 0, 0)

        //Draw
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.IndexTriBuffer);
        gl.drawElements(gl.TRIANGLES, this.IndexTriBuffer.numItems, gl.UNSIGNED_INT,0);
    }

    /**
    * Render the triangle edges wireframe style
    */
    drawEdges(){

        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexPositionBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, this.VertexPositionBuffer.itemSize,
                         gl.FLOAT, false, 0, 0);

        // Bind normal buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexNormalBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute,
                           this.VertexNormalBuffer.itemSize,
                           gl.FLOAT, false, 0, 0);

        //Draw
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.IndexEdgeBuffer);
        gl.drawElements(gl.LINES, this.IndexEdgeBuffer.numItems, gl.UNSIGNED_INT,0);
    }
/**
 * Fill the vertex and buffer arrays
 */
generateTriangles()
{
    //Push XY coordinates normally, push z coordinates from the generated DS array.
    var stepX = (this.maxX - this.minX) / this.div;
    var stepY = (this.maxY - this.minY) / this.div;
    var stepZ = (this.maxZ - this.minZ) / this.div;
    var maxHeight = -100;
    var minHeight = 0;
    var heightOffSet = -0.3
    for (var i = 0; i < this.div + 1; i++){
        for (var j = 0; j < this.div + 1; j++){
            this.vBuffer.push(this.minX + stepX * j);
            this.vBuffer.push(this.minY + stepY * i);
            var zPush = this.DSArray[i][j] + heightOffSet;
            this.vBuffer.push(zPush);
            //Finding the max and min height for later color use.
            
            if (zPush > maxHeight) {
              maxHeight = zPush;
              this.maxHeight = maxHeight;
            }
            if (zPush < minHeight) {
              this.minHeight = zPush;
            }

            // this.nBuffer.push(0);
            // this.nBuffer.push(0);
            // this.nBuffer.push(1);
        }
    }
    console.log("maxheifht is ", maxHeight)
    console.log("this.maxH is ", this.maxHeight)
    for (var i = 0; i < this.div; i++){
        for (var j = 0; j < this.div; j++){
            var vid = i * (this.div + 1) + j;
            this.fBuffer.push(vid);
            this.fBuffer.push(vid + 1);
            this.fBuffer.push(vid + this.div + 1);

            this.fBuffer.push(vid + 1);
            this.fBuffer.push(vid + 1 + this.div + 1);
            this.fBuffer.push(vid + this.div + 1);
        }
    }
    //Differnt options to make the color map with three sets of functions.
    //Option 1:Modeling RGB as three trig functions.
    function red(h) {
      var period = (3 * Math.PI) / maxHeight;
      var y_move = 1
      var n = 2
      var offset = 0
      var A = -1
      var r = (A * Math.cos(period * h+ offset) + y_move) / n
      return r;
    }
    function green(h) {
      var period = (Math.PI) / maxHeight;
      var y_move = 1
      var n = 2
      var offset = 0
      var A = -1
      var g = (A * Math.cos(period * h + offset) + y_move) / n
      return g;
    }
    function blue(h) {
      var period = (2 * Math.PI) / maxHeight;
      var y_move = 1
      var n = 2
      var offset = 0
      var A = 1
      var b = (A * Math.cos(period * h + offset) + y_move) / n
      return b;
    }
    //Option 2: Simple color at different height without grident.
    function color(h) {
      var relativeH = (h - heightOffSet)/(maxHeight - heightOffSet);
      //console.log("relH is ", relativeH)
      if (relativeH > 0.9) {
        return [1,1,1]
        //White
      }
      if (relativeH > 0.8) {
        return [34/255,44/255,33/255]
        //DarkGreen
      }
      if (relativeH > 0.6) {
        return [49/255,82/255,33/255];
        //lightGreen
      }
      if (relativeH > 0.45) {
        return [178/255, 96/255, 41/255]
        //Brown
      }
      if (relativeH > 0.35) {
        return [165/255, 138/255, 109/255]
      }
      if (relativeH > 0.25) {
        return [1, 223/255, 158/255];
      }
      if (relativeH > 0.2) {
        return [55/255, 209/255, 215/255]
      }
      if (relativeH > 0.15) {
        return [69/255, 168/255, 226/255]
      }
      if (relativeH > 0) {
        return [31/255,113/255,198/255];
        //Blue
      }
      if (relativeH > -0.1) {
        return [31/255, 81/255, 1]
      } else {
        return [21/255,0,1]
      }
    }
    //Option 3: Use linear interpolation to get RGB vals.
    function linInter(h) {
      var lowR = 0;
      var lowG = 0.8;
      var lowB = 0;
      var highR = 0.5;
      var highG = 1;
      var highB = 0.8;
      var k = (h - minHeight) / (maxHeight - minHeight);
      var R=(k * lowR + (1 - k) * highR)
      var G=(k * lowG + (1 - k) * highG)
      var B=(k * lowB + (1 - k) * highB)
      return [R,G,B]
    }

    //Calculate the normal of all vertices using the normal_at_point function.
    //Push color RGB value to the cBuffer.
    for (var i = 0; i < this.div + 1; i++){
        for (var j = 0; j < this.div + 1; j++) {
            this.nBuffer.push(this.normal_at_point(i, j)[0]);
            this.nBuffer.push(this.normal_at_point(i, j)[1]);
            this.nBuffer.push(this.normal_at_point(i, j)[2]);

            //This call return the height of that point.
            var pt_height = this.returnVertex(i, j)[2];
            // this.cBuffer.push(red(pt_height))
            // this.cBuffer.push(green(pt_height))
            // this.cBuffer.push(blue(pt_height))
            var RGB = color(pt_height);

            this.cBuffer.push(RGB[0])
            this.cBuffer.push(RGB[1])
            this.cBuffer.push(RGB[2])
        }
    }

    this.numVertices = this.vBuffer.length/3;
    this.numFaces = this.fBuffer.length/3;
}

/**
 * Print vertices and triangles to console for debugging
 */
printBuffers()
    {

    for(var i=0;i<this.numVertices;i++)
          {
           console.log("v ", this.vBuffer[i*3], " ",
                             this.vBuffer[i*3 + 1], " ",
                             this.vBuffer[i*3 + 2], " ");

          }

      for(var i=0;i<this.numFaces;i++)
          {
           console.log("f ", this.fBuffer[i*3], " ",
                             this.fBuffer[i*3 + 1], " ",
                             this.fBuffer[i*3 + 2], " ");

          }

    }

/**
 * Generates line values from faces in faceArray
 * to enable wireframe rendering
 */
generateLines()
{
    var numTris=this.fBuffer.length/3;
    for(var f=0;f<numTris;f++)
    {
        var fid=f*3;
        this.eBuffer.push(this.fBuffer[fid]);
        this.eBuffer.push(this.fBuffer[fid+1]);

        this.eBuffer.push(this.fBuffer[fid+1]);
        this.eBuffer.push(this.fBuffer[fid+2]);

        this.eBuffer.push(this.fBuffer[fid+2]);
        this.eBuffer.push(this.fBuffer[fid]);
    }

}

/**
 *A function that accept the int x, int y coordiante of a vertices and return its
 *  coordinate retrived from vBuufer
 *@param {int} y The y coordiante of the point
 *@param {int} x The X coordinate of the point
 *@return {array} The absolute coordinate value of the point in vBuffer stored in an array
**/
returnVertex(y, x) {
    var v = []
    var vid = vid = 3 * (y * (this.div + 1) + x)
    v.push(this.vBuffer[vid])
    v.push(this.vBuffer[vid + 1])
    v.push(this.vBuffer[vid + 2])
    return v
}

/**A function that accept a vector and return a normalized vector.
 *  If [0, 0, 0] is used, NaN will be returned
 *@param {array} vector The vector to be normalized
 *@return {array} A vector of the same diretion but magnitude of 1.
**/
normalization(vector){
    var vec_n = []
    var norm_2 = Math.pow((Math.pow(vector[0], 2) + Math.pow(vector[1], 2) + Math.pow(vector[2], 2)), 0.5)
    if (norm_2 == 0) {
        return [0, 0, 0]
    }
    vec_n.push(vector[0] / norm_2)
    vec_n.push(vector[1] / norm_2)
    vec_n.push(vector[2] / norm_2)
    return vec_n
}

/**
 * A helper function that calculate the cross product of two vector
 * @param {array} vec1 First vector of size (3,), type array
 * @param {array} vec2 Second vector of size (3,), type array
 * @return {array} The cross product vec1 x vec2
**/
cross(vec1, vec2) {
    var vecc = []
    vecc.push(vec1[1] * vec2[2] - vec1[2] * vec2[1])
    vecc.push(vec1[2] * vec2[0] - vec1[0] * vec2[2])
    vecc.push(vec1[0] * vec2[1] - vec1[1] * vec2[0])
    return vecc
}

/**
* An element-wise subtraction of two vectors vec1 - vec2.
* @param {array} vec1
* @param {array} vec2
* @return {array} vec1 - vec2.
**/
minus(vec1, vec2) {
    if (vec1.length != vec2.length) {
        return NaN
    }
    var vecm = []
    for (var i = 0; i < vec1.length; i++) {
        vecm.push(vec1[i] - vec2[i])
    }
    return vecm
}

/**
 *A function that finds the normal of the triangles who is made by the vertices in CCW dir
 *@param {array} cord0 The first coordinate of the vertices
 *@param {array} cord1 The second coordinate of the vertices
 *@param {array} cord2 The third coordinate of the vertices
 *@return {array} A normalized norm of the triangle set by the input in
 *  CCW direction
**/
findNorm(cord0, cord1, cord2) {
    var vec_n = this.cross(this.minus(cord1, cord0) , this.minus(cord2, cord0))
    if (vec_n != [0, 0, 0]) {
        return this.normalization(vec_n)
    } else {
        return vec_n
    }
}

/**A function that return the normal value of a point with cordinate (x, y)
 * by taking the average of the norm of the neighboring triangles.
 * If the point is at the edge, the missing parts are omitted
 * @param {array} y
 * @param {array} x
 * @return {array} the normal of the point
**/
normal_at_point(y, x) {
   var cord0 = this.returnVertex(y, x)
   var r_exist =  false
   var u_exist =  false
   var ul_exist = false
   var l_exist =  false
   var rd_exist = false
   var d_exist =  false

   var cord_r  = [0, 0, 0]
   var cord_l  = [0, 0, 0]
   var cord_u  = [0, 0, 0]
   var cord_d  = [0, 0, 0]
   var cord_rd  = [0, 0, 0]
   var cord_lu  = [0, 0, 0]

   if (x + 1 >= this.div + 1) {
        cord_r = [0, 0, 0]
   } else {
        cord_r = this.returnVertex(y, x+1)
        r_exist = true
   }

   if (x - 1 < 0) {
        cord_l = [0, 0, 0]
   } else {
        cord_l = this.returnVertex(y, x-1)
        l_exist = true
   }

   if (y + 1 >= this.div + 1) {
        cord_u = [0, 0, 0]
   } else {
        cord_u = this.returnVertex(y+1, x)
        u_exist = true
   }

   if (y - 1 < 0) {
        cord_d = [0, 0, 0]
   } else {
        cord_d = this.returnVertex(y-1, x)
        d_exist = true
   }

   if (x + 1 >= this.div + 1 || y - 1 < 0) {
        cord_rd = [0, 0, 0]
   } else {
        cord_rd = this.returnVertex(y-1, x+1)
        rd_exist = true
   }

   if (x - 1 < 0 || y + 1 >= this.div + 1) {
        cord_lu = [0, 0, 0]
   } else {
        cord_lu = this.returnVertex(y+1, x-1)
        ul_exist = true
   }

   var norm_RU   = [0, 0, 0]
   var norm_UL_1 = [0, 0, 0]
   var norm_UL_2 = [0, 0, 0]
   var norm_LD   = [0, 0, 0]
   var norm_DR_1 = [0, 0, 0]
   var norm_DR_2 = [0, 0, 0]

   if (r_exist && u_exist) {
    norm_RU = this.findNorm(cord0, cord_r, cord_u)
   }
   if (u_exist && ul_exist) {
    norm_UL_1 = this.findNorm(cord0, cord_u, cord_lu)
   }
   if (ul_exist && l_exist) {
    norm_UL_2 = this.findNorm(cord0, cord_lu, cord_l)
   }
   if (l_exist && d_exist) {
    norm_LD = this.findNorm(cord0, cord_l, cord_d)
   }
   if (d_exist && rd_exist) {
    norm_DR_1 = this.findNorm(cord0, cord_d, cord_rd)
   }
   if (rd_exist && r_exist) {
    norm_DR_2 = this.findNorm(cord0, cord_rd, cord_r)
   }
   //console.log(cord0, cord_r)
   //console.log(norm_RU, norm_UL_1, norm_UL_2, norm_LD, norm_DR_1, norm_DR_2)
   var sum = []
   for (var i = 0; i < 3; i++) {
        sum.push(norm_RU[i] + norm_UL_1[i] + norm_UL_2[i] + norm_LD[i]
         + norm_DR_1[i] + norm_DR_2[i])
   }
   return this.normalization(sum)
}

/**
* Simple function that get a random value between range
* @param lower - The lower bound of the random
* @param upper - The upper bound of the random
* @return - A random float between lower and upper
*/
random_range(lower, upper) {
  var range = upper - lower;
  return lower + Math.random() * range;
}


/**
* The function that generate the terrian of size 2**n + 1
* @param n - determine the size of the terrian
* @return - An array of size 2**n+1 by 2**n+1 containing the height info
*/
DS(n) {
  var size = Math.pow(2, n) + 1;
  //Making the output array and fill it with 0.
  var img = [];
  for (var i = 0; i < size; i++) {
    var inner = [];
    for (var j = 0; j <size; j++) {
      inner.push(0)
    }
    img.push(inner);
  }
  //Set the values at four conners.
  var offset = 0
  var range = [0,0.3]
  img[0][0] = this.random_range(range[0], range[1])
  img[0][size - 1] = this.random_range(range[0], range[1])
  img[size - 1][0] = this.random_range(range[0], range[1])
  img[size - 1][size - 1] = this.random_range(range[0], range[1])
  console.log("conners is" , this.random_range(range[0], range[1]))
  //The function that is used to calculate the avg of in the square.
  function square_avg(x,y,r) {
    var sum = 0;
    var c1 = 0
    var c2 = 0
    var c3 = 0
    var c4 = 0
    var ver = 0
    if ((x-r) >=0 && (y-r) >=0){
      var c1 = img[x -r][y - r];
      ver++
    }
    sum += c1;
    if ((x+r) < size && (y-r) >=0) {
      var c2 = img[x +r][y - r];
      ver++
    }
    sum += c2
    if ((x-r) >=0 && (y+r) < size) {
      var c3 = img[x -r][y + r];
      ver++
    }
    sum += c3
    if((x+r) < size && (y+r) < size) {
      var c4 = img[x +r][y + r];
      ver++
    }
    sum += c4
    return sum / ver;
  }
  //The function that is used to calculate the avg of the diamond.
  function diamond_avg(x,y,r) {
    var sum = 0;
    var c1 = 0
    var c2 = 0
    var c3 =0
    var c4 = 0
    var ver = 0;
    if ((x-r) >=0){
      var c1 = img[x -r][y];
      ver++
    }
    sum += c1;
    if ((x+r) < size) {
      var c2 = img[x + r][y];
      ver++
    }
    sum += c2
    if ( (y+r) < size) {
      var c3 = img[x][y + r];
      ver++
    }
    sum += c3
    if((y-r) >= 0) {
      var c4 = img[x][y - r];
      ver++
    }
    sum += c4
    return sum/ver;
  }
  //Begin to generate data to fill the array.
  var count  = 0;
  var num = 1;
  //Took roughness value as an random between a decresing range + const? OKAY?
  var roughness = (img[0][0]+img[0][size-1]+img[size-1][0]+img[size-1][size-1])/4
  var upper = range[1]
  var lower = range[0]
  for (var times = 0; times < n; times++) {
    var r_this = Math.pow(2 , (n - times - 1));
    var square_iter = Math.pow(4, (times));
    var square_step = (Math.pow(2, n)) / r_this
    var iter_index = Math.pow(2, times) * 2
    for (var i = 1; i < (count + 2); i += 2) {
      for (var j = 1; j < (count + 2); j += 2) {
        img[i * r_this][j * r_this] = (square_avg(i*r_this, j*r_this, r_this) + roughness - this.random_range(lower, upper))/// (0.5 *(count + 1))
      }
    }

    for (var i = 0; i < iter_index + 1; i ++) {
      for (var j = 0; j < iter_index + 1; j ++) {
        if ((i+j)%2 == 1) {
          img[i * r_this][j * r_this] = (diamond_avg(i * r_this, j * r_this, r_this) + roughness - this.random_range(lower, upper)) /// (0.5 * (count + 1))
        }
      }
    }
    count += Math.pow(2, num);
    num += 1;
    roughness /= 1.8
    upper /= 1.8
    lower*2
  }
  console.log(img)
  return img;
}



}


//-------------------------------------------------------------------------------------------//


