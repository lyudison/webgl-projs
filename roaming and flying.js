var VSHADER_SOURCE =
'uniform bool u_Lighting;\n' +
'uniform vec3 u_LightPos;\n' +
'uniform mat4 u_ProjMatrix;\n' +
'uniform mat4 u_ViewMatrix;\n' +
'uniform mat4 u_ModelMatrix;\n' +
'uniform mat4 u_NormalMatrix;\n' +
'attribute vec3 a_Position;\n' +
'attribute vec3 a_Color;\n' +
// 'attribute vec3 a_NormalVec;\n' +
'varying vec3 v_Color;\n' +
'varying vec3 v_Norm;\n' +
'varying vec3 v_ToLight;\n' +
'void main() {\n' +
'  gl_Position = u_ProjMatrix * u_ViewMatrix * u_ModelMatrix * vec4(a_Position, 1.0);\n' +
'  if (u_Lighting) {\n' +
'    v_Norm = (u_NormalMatrix * vec4(normalize(a_Position), 0.0)).xyz;\n' +
'    v_ToLight = u_LightPos - (u_ModelMatrix * vec4(a_Position, 1.0)).xyz;\n' +
'  } else {\n' +
'    v_Norm = vec3(0.0, 0.0, 1.0);\n' +
'    v_ToLight = vec3(0.0, 0.0, 1.0);\n' +
'  }\n' +
'  v_Color = a_Color;\n' +
'}\n';

// Fragment shader program
var FSHADER_SOURCE =
'precision mediump float;\n' +
'varying vec3 v_Color;\n' +
'varying vec3 v_Norm;\n' +
'varying vec3 v_ToLight;\n' +
'void main() {\n' +
'  float diff = clamp(dot(normalize(v_Norm), normalize(v_ToLight)), 0.0, 1.0);\n' +
'  gl_FragColor = vec4(v_Color*(0.3+0.7*diff), 1.0);\n' +
'}\n';

// # of Float32Array elements used for each vertex
// (x,y,z)position + (r,g,b)color + (x,y,z)normal
var floatsPerVertex = 6;

// Camera
var F = new Vector4(new Float32Array([0.0, 1.0, 0.0, 0.0]));
var S = new Vector4(new Float32Array([1.0, 0.0, 0.0, 0.0]));
var oriU = new Vector4(new Float32Array([0.0, 0.0, 1.0, 0.0]));
var U = oriU;
var g_EyeX = 0.0, g_EyeY = -10.0, g_EyeZ = 2.0;
var g_Angle = 0.0; 
var g_MoveStep = 0.1;
var g_FlyStep = 0.1;
var g_PitchAngleStep = 0.6;
var g_YawAngleStep = 0.6;
var g_RollAngle = 0.0;
var g_RollAngleStep = 1;
var rollAngleMax = 30;

// Projection
var fovy = 40;
var fovyMin = 20;
var fovyMax = 90;
var heightMin = 1.0;
var heightMax = 4.0;
var projMin = 1;
var projMax = 10;
var nearMin = 0.1;
var nearMax = 100;
var farMin = 1;
var farMax = 200;
var aspect;
var orthoHeight = 5.0;
var orthoWidth = 0.0;
var near = 1;
var far = 100;

// Lighting
var lightX = 0.0, lightY = -1.0, lightZ = 2.5;
var lightXStep = 0.2;

// Sphere
var sphX = -3;
var sphY = 0;
var sphMoveStep = 0.05;

// Tree
var treeAngleStep = 0.1;
var treeAngleMax = 30.0;

// settings Panel
var Settings = function() {
    this.switchView = false;
    this.flightMode = false;
    this.fovy40 = true;
    this.left = -2;
    this.right = 2;
    this.bottom = -2;
    this.top = 2;
    this.near = 1;
    this.far = 10;
};
var settings;

// Quaternion
// Global vars for mouse click-and-drag for rotation.
var isDrag=false;   // mouse-drag: true when user holds down mouse button
var xMclik=0.0;     // last mouse button-down position (in CVV coords)
var yMclik=0.0;   
var xMdragTot=0.0;  // total (accumulated) mouse-drag amounts (in CVV coords).
var yMdragTot=0.0;  

var qNew = new Quaternion(0,0,0,1); // most-recent mouse drag's rotation
var qTot = new Quaternion(0,0,0,1); // 'current' orientation (made from qNew)
var quatMatrix = new Matrix4();       // rotation matrix, made from latest qTot

// Focus on the end segment of a robot
var oriPoint = new Vector4(new Float32Array([0.0, 0.0, 0.0, 1.0]));
var oriVec = new Vector4(new Float32Array([0.0, 0.0, 1.0, 0.0]));
var focusPoint;
var lookAtVec;

function main() {

  var canvas = document.getElementById('webgl');
  canvas.width = innerWidth;
  canvas.height = innerHeight*3/4;

  var gl = getWebGLContext(canvas);
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  gl.clearColor(0.25, 0.2, 0.25, 1.0);
  gl.enable(gl.DEPTH_TEST); 

  // Set the vertex coordinates, color and normal
  var n = initVertexBuffers(gl);
  if (n < 0) {
    console.log('Failed to specify the vertex information');
    return;
  }

  u_Lighting = gl.getUniformLocation(gl.program, 'u_Lighting');
  u_LightPos = gl.getUniformLocation(gl.program, 'u_LightPos');
  if (!u_Lighting || !u_LightPos) { 
    console.log('Failed to get u_Lighting or u_LightPos');
    return;
  }
  u_ProjMatrix = gl.getUniformLocation(gl.program, 'u_ProjMatrix');
  u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
  if (!u_ProjMatrix || !u_ViewMatrix || !u_ModelMatrix || !u_NormalMatrix) { 
      console.log('Failed to get u_ViewMatrix, u_ProjMatrix, u_ModelMatrix or u_NormalMatrix');
      return;
  }

  projPerspMatrix = new Matrix4();
  projOrthoMatrix = new Matrix4();
  viewMatrix = new Matrix4();
  modelMatrix = new Matrix4();

  document.onkeydown= function(ev){keydown(ev, gl);};
  document.onkeyup = function(ev){keyup(ev, gl);};
  canvas.onmousedown  = function(ev){myMouseDown( ev, gl, canvas) }; 
  canvas.onmousemove =  function(ev){myMouseMove( ev, gl, canvas) };
  canvas.onmouseup =    function(ev){myMouseUp(   ev, gl, canvas)};

  setupSettings();

  var tick = function() {
    animate();
    draw(gl);
    requestAnimationFrame(tick, canvas);
  };
  tick();
}

function initVertexBuffers(gl) {

  gndVerts = makeGroundGrid();

  sphVerts = makeSphere(1.0, 
    new Float32Array([1.0, 0.0, 0.0]), 
    new Float32Array([0.0, 0.7, 0.6]));

  tetVerts = makeTetrahedron();

  torVerts = makeTorus(1.0, 0.25,
    new Float32Array([1.0, 0.0, 0.0]),
    new Float32Array([0.5, 0.0, 0.5]));

  cylVerts = makeCylinder();

  axeVerts = makeAxe();

  priVerts = makePrism();
  
  var nVertices = gndVerts.length 
                + sphVerts.length
                + tetVerts.length
                + torVerts.length
                + cylVerts.length
                + axeVerts.length
                + priVerts.length;

  // Copy all shapes into one big Float32 array:
  var vertices = new Float32Array(nVertices);
  gndStart = 0;
  for(i=0, j=0; j< gndVerts.length; i++, j++) {
      vertices[i] = gndVerts[j];
  }
  sphStart = i;
  for(j=0; j< sphVerts.length; i++, j++) {
      vertices[i] = sphVerts[j];
  }
  tetStart = i;
  for(j=0; j< tetVerts.length; i++, j++) {
      vertices[i] = tetVerts[j];
  }
  torStart = i;
  for(j=0; j< torVerts.length; i++, j++) {
      vertices[i] = torVerts[j];
  }
  cylStart = i;
  for(j=0; j< cylVerts.length; i++, j++) {
      vertices[i] = cylVerts[j];
  }
  axeStart = i;
  for(j=0; j< axeVerts.length; i++, j++) {
      vertices[i] = axeVerts[j];
  }
  priStart = i;
  for(j=0; j< priVerts.length; i++, j++) {
      vertices[i] = priVerts[j];
  }

  // Create a vertex buffer object (VBO)
  var vertexBuffer = gl.createBuffer();  
  if (!vertexBuffer) {
    console.log('Failed to create the buffer object');
    return -1;
}

  // Write vertex information to buffer object
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  var FSIZE = vertices.BYTES_PER_ELEMENT;

  // Assign the buffer object to a_Position and enable the assignment
  var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if(a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return -1;
}
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, FSIZE * floatsPerVertex, 0);
  gl.enableVertexAttribArray(a_Position);

  // Assign the buffer object to a_Color and enable the assignment
  var a_Color = gl.getAttribLocation(gl.program, 'a_Color');
  if(a_Color < 0) {
    console.log('Failed to get the storage location of a_Color');
    return -1;
  }
  gl.vertexAttribPointer(a_Color, 3, gl.FLOAT, false, FSIZE * floatsPerVertex, FSIZE * 3);
  gl.enableVertexAttribArray(a_Color);

  // Assign the buffer object to a_NormalVec and enable the assignment
  // var a_NormalVec = gl.getAttribLocation(gl.program, 'a_NormalVec');
  // if(a_NormalVec < 0) {
  //   console.log('Failed to get the storage location of a_NormalVec');
  //   return -1;
  // }
  // gl.vertexAttribPointer(a_NormalVec, 3, gl.FLOAT, false, FSIZE * floatsPerVertex, FSIZE * 6);
  // gl.enableVertexAttribArray(a_NormalVec);

  return nVertices/floatsPerVertex; // return # of vertices
}

function makeGroundGrid() {
//==============================================================================
// Create a list of vertices that create a large grid of lines in the x,y plane
// centered at x=y=z=0.  Draw this shape using the GL_LINES primitive.

  var xcount = 100;           // # of lines to draw in x,y to make the grid.
  var ycount = 100;       
  var xymax   = 50.0;         // grid size; extends to cover +/-xymax in x and y.
  var xColr = new Float32Array([1.0, 1.0, 0.3]);  // bright yellow
  var yColr = new Float32Array([0.5, 1.0, 0.5]);  // bright green.

  // Create an (global) array to hold this ground-plane's vertices:
  var gndVerts = new Float32Array(floatsPerVertex*2*(xcount+ycount));

  // draw a grid made of xcount+ycount lines; 2 vertices per line.

  var xgap = xymax/(xcount-1);        // HALF-spacing between lines in x,y;
  var ygap = xymax/(ycount-1);        // (why half? because v==(0line number/2))

  // First, step thru x values as we make vertical lines of constant-x:
  for(v=0, j=0; v<2*xcount; v++, j+=floatsPerVertex) {
    if(v%2==0) { // put even-numbered vertices at (xnow, -xymax, 0)
        gndVerts[j  ] = -xymax + (v  )*xgap;
        gndVerts[j+1] = -xymax;
        gndVerts[j+2] = 0.0;
    }
    else { // put odd-numbered vertices at (xnow, +xymax, 0).
        gndVerts[j  ] = -xymax + (v-1)*xgap;
        gndVerts[j+1] = xymax;
        gndVerts[j+2] = 0.0;
    }
    gndVerts[j+3] = xColr[0];
    gndVerts[j+4] = xColr[1];
    gndVerts[j+5] = xColr[2];
}

  // Second, step thru y values as wqe make horizontal lines of constant-y:
  for(v=0; v<2*ycount; v++, j+=floatsPerVertex) {
    if(v%2==0) { // put even-numbered vertices at (-xymax, ynow, 0)
        gndVerts[j  ] = -xymax;
        gndVerts[j+1] = -xymax + (v  )*ygap;
        gndVerts[j+2] = 0.0;
    }
    else { // put odd-numbered vertices at (+xymax, ynow, 0).
        gndVerts[j  ] = xymax;
        gndVerts[j+1] = -xymax + (v-1)*ygap;
        gndVerts[j+2] = 0.0;
    }
    gndVerts[j+3] = yColr[0];
    gndVerts[j+4] = yColr[1];
    gndVerts[j+5] = yColr[2];
  }

  return gndVerts;
}

function makeSphere(radius, topColor, bottomColor) {

    var slices = 15; // # of slice to form sphere
    var sliceVerts = 27; // # of vertices to form `circle'
    var sliceAngle = Math.PI/slices;

    // # of vertices to form sphere
    // each slice need 2n vertices, except for the first and last one
    var sphVerts = new Float32Array((slices*sliceVerts*2-2)*floatsPerVertex);

    var cos0 = 0.0, sin0 = 0.0, cos1 = 0.0, sin1 = 0.0;
    var j = 0; // counts the amount of array elements
    var isFirst = 1, isLast = 0;
    var k = 1.0; // used for calculating color for vertices at each edge

    for (s = 0; s < slices; s++) {
        // calculate the sin and cos for top and bottom
        // of current slice
        if (s == 0) {
            isFirst = 1;
            cos0 = 1.0;
            sin0 = 0.0;
        } else {
            isFirst = 0;
            cos0 = cos1;
            sin0 = sin1;
        }
        cos1 = Math.cos((s+1)*sliceAngle);
        sin1 = Math.sin((s+1)*sliceAngle);

        if (s == slices-1) {
            isLast = 1;
        }
        for (v = isFirst; v < sliceVerts*2-isLast; v++, j+=floatsPerVertex) {
            k = (s+v%2)/slices;
            // vertices on the top of slice
            if (v%2==0) {
                sphVerts[j] = radius*Math.cos(Math.PI*v/sliceVerts)*sin0;
                sphVerts[j+1] = radius*Math.sin(Math.PI*v/sliceVerts)*sin0;
                sphVerts[j+2] = radius*cos0;
            // vertices on the bottom of slice
        } else {
            sphVerts[j] = radius*Math.cos(Math.PI*(v-1)/sliceVerts)*sin1;
            sphVerts[j+1] = radius*Math.sin(Math.PI*(v-1)/sliceVerts)*sin1;
            sphVerts[j+2] = radius*cos1;
        }
        sphVerts[j+3] = k*bottomColor[0]+(1-k)*topColor[0];
        sphVerts[j+4] = k*bottomColor[1]+(1-k)*topColor[1];
        sphVerts[j+5] = k*bottomColor[2]+(1-k)*topColor[2];
    }
  }

  return sphVerts;
}

function makeTetrahedron() {

    var tetVerts = new Float32Array([
        0.0, 0.0, 1.0, 1.0, 1.0, 1.0,
        1.0, -1.0, -1.0, 1.0, 0.0, 0.0,
        0.0, 1.0, -1.0, 0.0, 1.0, 0.0,
        -1.0, -1.0, -1.0, 0.0, 0.0, 1.0,
        0.0, 0.0, 1.0, 1.0, 1.0, 1.0,
        1.0, -1.0, -1.0, 1.0, 0.0, 0.0]);

    return tetVerts;
}

function makeTorus(rbend, rbar, nearColor, farColor) {

    var barSlices = 23;
    var barSides = 13;

    var torVerts = new Float32Array(floatsPerVertex*(2*barSides*barSlices+2));

    // for calculation coords
    var thetaStep = 2*Math.PI/barSlices; 
    var phiHalfStep = Math.PI/barSides;
    var x, y, z, k; 

    var j = 0;
    for (var s = 0; s < barSlices; s++) {
        for (var v = 0; v < 2*barSides; v++, j+=floatsPerVertex) {
            if (v%2==0) {
                torVerts[j] = (rbend+rbar*Math.cos(v*phiHalfStep))*Math.cos(s*thetaStep);
                torVerts[j+1] = (rbend+rbar*Math.cos(v*phiHalfStep))*Math.sin(s*thetaStep);
                torVerts[j+2] = rbar*Math.sin(v*phiHalfStep);
                x = torVerts[j]; y = torVerts[j+1]; z = torVerts[j+2];
                k = Math.sqrt(x*x+y*y+z*z)/(rbend+rbar);
            } else {
                torVerts[j] = (rbend+rbar*Math.cos((v-1)*phiHalfStep))*Math.cos((s+1)*thetaStep);
                torVerts[j+1] = (rbend+rbar*Math.cos((v-1)*phiHalfStep))*Math.sin((s+1)*thetaStep);
                torVerts[j+2] = rbar*Math.sin((v-1)*phiHalfStep);
                x = torVerts[j]; y = torVerts[j+1]; z = torVerts[j+2];
                k = Math.sqrt(x*x+y*y+z*z)/(rbend+rbar);
            }
            torVerts[j+3] = k*farColor[0]+(1-k)*nearColor[0];
            torVerts[j+4] = k*farColor[1]+(1-k)*nearColor[1];
            torVerts[j+5] = k*farColor[2]+(1-k)*nearColor[2];
        }
    }

    // close the torus by connecting to the index 0 vertex
    torVerts[j  ] = torVerts[0];
    torVerts[j+1] = torVerts[1];
    torVerts[j+2] = torVerts[2];
    torVerts[j+3] = torVerts[3];
    torVerts[j+4] = torVerts[4];
    torVerts[j+5] = torVerts[5];

    j+=floatsPerVertex; // go to next vertex:
    torVerts[j  ] = torVerts[6];
    torVerts[j+1] = torVerts[7];
    torVerts[j+2] = torVerts[8];
    torVerts[j+4] = torVerts[9];
    torVerts[j+5] = torVerts[10];
    torVerts[j+6] = torVerts[11];

    return torVerts;
}

function makeCylinder() {
//==============================================================================
// Make a cylinder shape from one TRIANGLE_STRIP drawing primitive, using the
// 'stepped spiral' design described in notes.
// Cylinder center at origin, encircles z axis, radius 1, top/bottom at z= +/-1.
//
  var ctrColr = new Float32Array([0.2, 0.2, 0.2]);   // dark gray
  var topColr = new Float32Array([0.4, 0.7, 0.4]);   // light green
  var botColr = new Float32Array([0.5, 0.5, 1.0]);   // light blue
  var capVerts = 16; // # of vertices around the topmost 'cap' of the shape
  var botRadius = 1.0;       // radius of bottom of cylinder (top always 1.0)
 
  // Create a (global) array to hold this cylinder's vertices;
  var cylVerts = new Float32Array(  ((capVerts*6) -2) * floatsPerVertex);
  // # of vertices * # of elements needed to store them. 

    // Create circle-shaped top cap of cylinder at z=+1.0, radius 1.0
    // v counts vertices: j counts array elements (vertices * elements per vertex)
    for(v=1,j=0; v<2*capVerts; v++,j+=floatsPerVertex) {    
        // skip the first vertex--not needed.
        if(v%2==0)
        {               // put even # vertices at center of cylinder's top cap:
            cylVerts[j  ] = 0.0;            // x,y,z,w == 0,0,1,1
            cylVerts[j+1] = 0.0;    
            cylVerts[j+2] = 1.0; 
            cylVerts[j+3]=ctrColr[0]; 
            cylVerts[j+4]=ctrColr[1]; 
            cylVerts[j+5]=ctrColr[2];
        }
        else {  // put odd# vertices around the top cap's outer edge;
                // x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
                // theta = 2*PI*((v-1)/2)/capVerts = PI*(v-1)/capVerts
            cylVerts[j  ] = Math.cos(Math.PI*(v-1)/capVerts);           // x
            cylVerts[j+1] = Math.sin(Math.PI*(v-1)/capVerts);           // y
            //  (Why not 2*PI? because 0 < =v < 2*capVerts, so we
            //   can simplify cos(2*PI * (v-1)/(2*capVerts))
            cylVerts[j+2] = 1.0;    // z
            // r,g,b = topColr[]
            cylVerts[j+3]=topColr[0]; 
            cylVerts[j+4]=topColr[1]; 
            cylVerts[j+5]=topColr[2];           
        }
    }
    // Create the cylinder side walls, made of 2*capVerts vertices.
    // v counts vertices within the wall; j continues to count array elements
    for(v=0; v< 2*capVerts; v++, j+=floatsPerVertex) {
        if(v%2==0)  // position all even# vertices along top cap:
        {       
                cylVerts[j  ] = Math.cos(Math.PI*(v)/capVerts);     // x
                cylVerts[j+1] = Math.sin(Math.PI*(v)/capVerts);     // y
                cylVerts[j+2] = 1.0;    // z
                // r,g,b = topColr[]
                cylVerts[j+3]=topColr[0]; 
                cylVerts[j+4]=topColr[1]; 
                cylVerts[j+5]=topColr[2];           
            }
        else        // position all odd# vertices along the bottom cap:
        {
                cylVerts[j  ] = botRadius * Math.cos(Math.PI*(v-1)/capVerts);       // x
                cylVerts[j+1] = botRadius * Math.sin(Math.PI*(v-1)/capVerts);       // y
                cylVerts[j+2] =-1.0;    // z
                // r,g,b = topColr[]
                cylVerts[j+3]=botColr[0]; 
                cylVerts[j+4]=botColr[1]; 
                cylVerts[j+5]=botColr[2];           
            }
        }
    // Create the cylinder bottom cap, made of 2*capVerts -1 vertices.
    // v counts the vertices in the cap; j continues to count array elements
    for(v=0; v < (2*capVerts -1); v++, j+= floatsPerVertex) {
        if(v%2==0) {    // position even #'d vertices around bot cap's outer edge
            cylVerts[j  ] = botRadius * Math.cos(Math.PI*(v)/capVerts);     // x
            cylVerts[j+1] = botRadius * Math.sin(Math.PI*(v)/capVerts);     // y
            cylVerts[j+2] =-1.0;    // z
            // r,g,b = topColr[]
            cylVerts[j+3]=botColr[0]; 
            cylVerts[j+4]=botColr[1]; 
            cylVerts[j+5]=botColr[2];       
        }
        else {  // position odd#'d vertices at center of the bottom cap:
            cylVerts[j  ] = 0.0;            // x,y,z,w == 0,0,-1,1
        cylVerts[j+1] = 0.0;    
        cylVerts[j+2] =-1.0; 
        cylVerts[j+3]=botColr[0]; 
        cylVerts[j+4]=botColr[1]; 
        cylVerts[j+5]=botColr[2];
    }
}

return cylVerts;
}

function makeAxe() {

    var axeVerts = new Float32Array([
        // Drawing Axes: Draw them using gl.LINES drawing primitive;
        // +x axis RED; +y axis GREEN; +z axis BLUE; origin: GRAY
        0.0,  0.0,  0.0,       1.0,  0.0,  0.0, 
        1.3,  0.0,  0.0,       1.0,  0.0,  0.0, 

        0.0,  0.0,  0.0,       0.0,  1.0,  0.0, 
        0.0,  1.3,  0.0,       0.0,  1.0,  0.0, 

        0.0,  0.0,  0.0,       0.0,  0.0,  1.0, 
        0.0,  0.0,  1.3,       0.0,  0.0,  1.0, 
        ]);  

    return axeVerts;
}

function makePrism() {

    var priVerts = new Float32Array([
        // face
        -0.5,   0.5, 0.5,      1.0, 0.0, 0.0,    
        -0.5,  -0.5, 0.5,      1.0, 0.0, 0.0,    
        0.5,  -0.5, 0.5,      1.0, 0.0, 0.0,  

        -0.5,  0.5,  0.5,      1.0, 0.1, 0.1,    
        0.5,  0.5,  0.5,      1.0, 0.1, 0.1,    
        0.5, -0.5,  0.5,      1.0, 0.1, 0.1,    

        //face - left
        -0.5, -0.5, 0.5,    0.0, 1.0, 0.0,
        -0.8, -0.5, 0.0,    0.0, 1.0, 0.0,
        -0.8, 0.5, 0.0,   0.0, 1.0, 0.0,

        -0.8,  0.5, 0.0,     0.0, 1.0, 0.1,
        -0.5, -0.5, 0.5,     0.0, 1.0, 0.1,
        -0.5,  0.5, 0.5,     0.0, 1.0, 0.1,

        //face - right 
        0.5, -0.5, 0.5,0.0, 0.0, 1.0,
        0.5, 0.5, 0.5, 0.0, 0.0, 1.0,
        0.8, -0.5, 0.0,0.0, 0.0, 1.0,

        0.5, 0.5, 0.5, 0.1, 0.0, 1.0,
        0.8, -0.5, 0.0,0.1, 0.0, 1.0,
        0.8, 0.5, 0.0, 0.1, 0.0, 1.0, 

        //back
        -0.5,   0.5, -0.5, 1.0, 0.0, 0.0,    
        -0.5,  -0.5, -0.5, 1.0, 0.0, 0.0,    
        0.5,  -0.5, -0.5, 1.0, 0.0, 0.0,  

        -0.5,  0.5,  -0.5, 1.0, 0.1, 0.1,    
        0.5,  0.5,  -0.5, 1.0, 0.1, 0.1,    
        0.5, -0.5,  -0.5, 1.0, 0.1, 0.1,    

        //back - left
        -0.5, -0.5, -0.5,  0.0, 0.1, 1.0,
        -0.8, -0.5, 0.0,     0.0, 0.1, 1.0,
        -0.8, 0.5, 0.0,   0.0, 0.1, 1.0,

        -0.8,  0.5, 0.0,     0.0, 0.1, 1.0,
        -0.5, -0.5, -0.5,     0.0, 0.1, 1.0,
        -0.5,  0.5, -0.5, 0.0, 0.1, 1.0,

        //back - right 
        0.5, -0.5, -0.5,1.0, 0.0, 1.1,
        0.5, 0.5, -0.5, 1.0, 0.0, 1.1,
        0.8, -0.5, 0.0, 1.0, 0.0, 1.1,

        0.5, 0.5, -0.5, 1.0, 0.0, 1.1,
        0.8, -0.5, 0.0, 1.0, 0.0, 1.1,
        0.8, 0.5, 0.0,  1.0, 0.0, 1.1,

        //bottom
        -0.5, -0.5, 0.5,    1.0, 1.0, 0.0,
        0.5,  -0.5, 0.5,    1.0, 1.0, 0.0,
        -0.5, -0.5, -0.5,          1.0, 1.0, 0.0,

        -0.5, -0.5, -0.5,    1.0, 1.0, 0.1,
        0.5, -0.5, -0.5,         1.0, 1.0, 0.1,
        0.5, -0.5, 0.5,         1.0, 1.0, 0.1,

        //bottom - left
        -0.5, -0.5, 0.5,         1.0, 1.0, 0.0,
        -0.8, -0.5, 0.0,        1.0, 1.0, 0.0,
        -0.5, -0.5, -0.5,   1.0, 1.0, 0.0,

        //bottom - right
        0.5, -0.5, 0.5,         1.0, 1.0, 0.1,
        0.8, -0.5, 0.0,        1.0, 1.0, 0.1,
        0.5, -0.5, -0.5,        1.0, 1.0, 0.1,

        //top
        -0.5, 0.5, 0.5,    1.0, 0.0, 0.0,
        0.5,  0.5, 0.5,    1.0, 0.0, 0.0,
        0.0,  1.0, 0.0,    1.0, 0.0, 0.0,

        -0.5, 0.5, 0.5,    0.0, 1.0, 0.0,
        -0.8, 0.5, 0.0,    0.0, 1.0, 0.0,
        0.0,  1.0, 0.0,   0.0, 1.0, 0.0,

        -0.8, 0.5, 0.0,    0.0, 0.1, 1.0,
        -0.5, 0.5, -0.5,    0.0, 0.1, 1.0,
        0.0, 1.0, 0.0,    0.0, 0.1, 1.0,

        -0.5, 0.5, -0.5,    1.0, 1.0, 0.0,
        0.5,  0.5, -0.5,    1.0, 1.0, 0.0,
        0.0,  1.0, 0.0,    1.0, 1.0, 0.0,

        0.5, 0.5, -0.5,    0.0, 1.0, 0.1,
        0.8, 0.5, 0.0,    0.0, 1.0, 0.1,
        0.0,  1.0, 0.0,    0.0, 1.0, 0.1,

        0.8, 0.5, 0.0,    1.0, 0.0, 1.0,
        0.5, 0.5, 0.5,    1.0, 0.0, 1.0,
        0.0, 1.0, 0.0,    1.0, 0.0, 1.0,
    ]);

    return priVerts;
}

var keys = []; // Or you could call it "key"
keyup = keydown = function(ev, gl){

    keys[ev.keyCode] = ev.type == 'keydown';
}

function moveForward(speed) {
  var dx = F.elements[0] * speed;
  var dy = F.elements[1] * speed;
  var dz = F.elements[2] * speed;
  g_EyeX += dx;
  g_EyeY += dy;
  g_EyeZ += dz;
}

function moveBackward(speed) {
  var dx = F.elements[0] * speed;
  var dy = F.elements[1] * speed;
  var dz = F.elements[2] * speed;
  g_EyeX -= dx;
  g_EyeY -= dy;
  g_EyeZ -= dz;
}

function moveLeft() {
  var dx = S.elements[0] * g_MoveStep;
  var dy = S.elements[1] * g_MoveStep;
  var dz = S.elements[2] * g_MoveStep;
  g_EyeX -= dx;
  g_EyeY -= dy;
  g_EyeZ -= dz;
}

function moveRight() {
  var dx = S.elements[0] * g_MoveStep;
  var dy = S.elements[1] * g_MoveStep;
  var dz = S.elements[2] * g_MoveStep;
  g_EyeX += dx;
  g_EyeY += dy;
  g_EyeZ += dz;
}

function rotateLeft() {
  var mat = new Matrix4();
  mat.setRotate(g_YawAngleStep, 0.0, 0.0, 1.0);
  F = mat.multiplyVector4(F);
  S = mat.multiplyVector4(S);
}

function rotateRight() {
  var mat = new Matrix4();
  mat.setRotate(-g_YawAngleStep, 0.0, 0.0, 1.0);
  F = mat.multiplyVector4(F);
  S = mat.multiplyVector4(S);
}

function tiltDown() {
  var mat = new Matrix4();
  mat.setRotate(-g_PitchAngleStep, S.elements[0], S.elements[1], S.elements[2]);
  F = mat.multiplyVector4(F);
}

function tiltUp() {
  var mat = new Matrix4();
  mat.setRotate(g_PitchAngleStep, S.elements[0], S.elements[1], S.elements[2]);
  F = mat.multiplyVector4(F);
}

function rollLeft() {
  console.log(g_RollAngle);
  if (g_RollAngle > -rollAngleMax) {
    g_RollAngle -= g_RollAngleStep;
  }
  var mat = new Matrix4();
  mat.setRotate(g_RollAngle, F.elements[0], F.elements[1], F.elements[2]);
  U = mat.multiplyVector4(oriU);
}

function rollRight() {
  if (g_RollAngle < rollAngleMax) {
    g_RollAngle += g_RollAngleStep;
  }
  var mat = new Matrix4();
  mat.setRotate(g_RollAngle, F.elements[0], F.elements[1], F.elements[2]);
  U = mat.multiplyVector4(oriU);
}

function myMouseDown(ev, gl, canvas) {
//==============================================================================
// Called when user PRESSES down any mouse button;
//                  (Which button?    console.log('ev.button='+ev.button);   )
//    ev.clientX, ev.clientY == mouse pointer location, but measured in webpage 
//    pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)  

// Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
  var rect = ev.target.getBoundingClientRect(); // get canvas corners in pixels
  var xp = ev.clientX - rect.left;                  // x==0 at canvas left edge
  var yp = canvas.height - (ev.clientY - rect.top); // y==0 at canvas bottom edge
//  console.log('myMouseDown(pixel coords): xp,yp=\t',xp,',\t',yp);
  
  // Convert to Canonical View Volume (CVV) coordinates too:
  var x = (xp - canvas.width/2)  /    // move origin to center of canvas and
               (canvas.width/2);      // normalize canvas to -1 <= x < +1,
  var y = (yp - canvas.height/2) /    //                     -1 <= y < +1.
               (canvas.height/2);
//  console.log('myMouseDown(CVV coords  ):  x, y=\t',x,',\t',y);
  
  isDrag = true;                      // set our mouse-dragging flag
  xMclik = x;                         // record where mouse-dragging began
  yMclik = y;
};

function myMouseMove(ev, gl, canvas) {
//==============================================================================
// Called when user MOVES the mouse with a button already pressed down.
//                  (Which button?   console.log('ev.button='+ev.button);    )
//    ev.clientX, ev.clientY == mouse pointer location, but measured in webpage 
//    pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)  

  if(isDrag==false) return;       // IGNORE all mouse-moves except 'dragging'

  // Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
  var rect = ev.target.getBoundingClientRect(); // get canvas corners in pixels
  var xp = ev.clientX - rect.left;                  // x==0 at canvas left edge
  var yp = canvas.height - (ev.clientY - rect.top); // y==0 at canvas bottom edge
//  console.log('myMouseMove(pixel coords): xp,yp=\t',xp,',\t',yp);
  
  // Convert to Canonical View Volume (CVV) coordinates too:
  var x = (xp - canvas.width/2)  /    // move origin to center of canvas and
               (canvas.width/2);      // normalize canvas to -1 <= x < +1,
  var y = (yp - canvas.height/2) /    //                     -1 <= y < +1.
               (canvas.height/2);

  // find how far we dragged the mouse:
  xMdragTot += (x - xMclik);          // Accumulate change-in-mouse-position,&
  yMdragTot += (y - yMclik);
  // AND use any mouse-dragging we found to update quaternions qNew and qTot.
  //===================================================
  dragQuat(x - xMclik, y - yMclik);
  //===================================================
  xMclik = x;                         // Make NEXT drag-measurement from here.
  yMclik = y;

};

function myMouseUp(ev, gl, canvas) {
//==============================================================================
// Called when user RELEASES mouse button pressed previously.
//                  (Which button?   console.log('ev.button='+ev.button);    )
//    ev.clientX, ev.clientY == mouse pointer location, but measured in webpage 
//    pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)  

// Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
  var rect = ev.target.getBoundingClientRect(); // get canvas corners in pixels
  var xp = ev.clientX - rect.left;                  // x==0 at canvas left edge
  var yp = canvas.height - (ev.clientY - rect.top); // y==0 at canvas bottom edge
//  console.log('myMouseUp  (pixel coords): xp,yp=\t',xp,',\t',yp);
  
  // Convert to Canonical View Volume (CVV) coordinates too:
  var x = (xp - canvas.width/2)  /    // move origin to center of canvas and
               (canvas.width/2);      // normalize canvas to -1 <= x < +1,
  var y = (yp - canvas.height/2) /    //                     -1 <= y < +1.
               (canvas.height/2);
//  console.log('myMouseUp  (CVV coords  ):  x, y=\t',x,',\t',y);
  
  isDrag = false;                     // CLEAR our mouse-dragging flag, and
  // accumulate any final bit of mouse-dragging we did:
  xMdragTot += (x - xMclik);
  yMdragTot += (y - yMclik);
//  console.log('myMouseUp: xMdragTot,yMdragTot =',xMdragTot,',\t',yMdragTot);

  // AND use any mouse-dragging we found to update quaternions qNew and qTot;
  dragQuat(x - xMclik, y - yMclik);

};

function draw(gl) {

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Set the matrix to be used for to set the camera view
  viewMatrix.setIdentity();
  if (settings.switchView) {
    viewMatrix.setLookAt(focusPoint[0], focusPoint[1], focusPoint[2], 
                focusPoint[0]+lookAtVec[0],
                focusPoint[1]+lookAtVec[1],
                focusPoint[2]+lookAtVec[2],
                0.0, 0.0, 1.0);
  } else {
    viewMatrix.setLookAt(g_EyeX, g_EyeY, g_EyeZ, 
                g_EyeX + F.elements[0], g_EyeY + F.elements[1], g_EyeZ + F.elements[2],  
                U.elements[0], U.elements[1], U.elements[2]);
  }
  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);

  // Set the position of light source
  gl.uniform3f(u_LightPos, lightX, lightY, lightZ)

  // the aspect ratio of the 2 viewports
  // var aspect = (gl.drawingBufferWidth/2)/(gl.drawingBufferHeight);
  // var fovy = settings.fovy;
  // var height = settings.height;
  // var width = height*aspect;

  // VIEWPORT 1: Perspective
  // Left viewport (x, y, width, height)
  gl.viewport(0, 0, gl.drawingBufferWidth/2, gl.drawingBufferHeight);
  // set projection matrix
  if (settings.fovy40) {
    projPerspMatrix.setPerspective(fovy, aspect, near, far);
  } else {
    projPerspMatrix.setFrustum(settings.left, settings.right, settings.bottom, settings.top, settings.near, settings.far);
  }
  // Pass the view projection matrix
  gl.uniformMatrix4fv(u_ProjMatrix, false, projPerspMatrix.elements);
  // Draw the scene
  drawMyScene(gl);

  // VIEWPORT 2: Orthogonal
  // Right viewport 
  gl.viewport(gl.drawingBufferWidth/2, 0, gl.drawingBufferWidth/2, gl.drawingBufferHeight);
  // set projection matrix
  if (settings.fovy40) {
    projOrthoMatrix.setOrtho(-orthoWidth/2, orthoWidth/2, -orthoHeight/2, orthoHeight/2, near, far);
  } else {
    projOrthoMatrix.setOrtho(settings.left, settings.right, settings.bottom, settings.top, settings.near, settings.far);
  }
  // Pass the view projection matrix
  gl.uniformMatrix4fv(u_ProjMatrix, false, projOrthoMatrix.elements);
  // Draw the scene
  drawMyScene(gl);
}

function drawMyScene(gl) {

  modelMatrix.setIdentity();
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

  // Grid
  gl.drawArrays(gl.LINES,
    gndStart/floatsPerVertex,
    gndVerts.length/floatsPerVertex);

  // World axe
  gl.drawArrays(gl.LINES,
    axeStart/floatsPerVertex,
    axeVerts.length/floatsPerVertex);

  // Sphere
  pushMatrix(modelMatrix);
  modelMatrix.translate(sphX, -2.0, 0.0);
  gl.uniform1f(u_Lighting, true);
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  var normalMatrix = modelMatrix.invert().transpose();
  gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP,
    sphStart/floatsPerVertex,
    sphVerts.length/floatsPerVertex);
  gl.uniform1f(u_Lighting, false);
  modelMatrix = popMatrix();

  // Tetrahedron
  pushMatrix(modelMatrix);
  modelMatrix.translate(3.0, 0.0, 0.0);
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP,
    tetStart/floatsPerVertex,
    tetVerts.length/floatsPerVertex);
  modelMatrix = popMatrix();

  // Torus
  pushMatrix(modelMatrix);
  modelMatrix.translate(0.0, 4.0, 0.0);
  quatMatrix.setFromQuat(qTot.x, qTot.y, qTot.z, qTot.w);  // Quaternion-->Matrix
  modelMatrix.concat(quatMatrix);                         // apply that matrix.
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP,
    torStart/floatsPerVertex,
    torVerts.length/floatsPerVertex);
  modelMatrix = popMatrix();

  // Cylinder
  pushMatrix(modelMatrix);
  modelMatrix.translate(3.0, 3.0, 0.0);
  modelMatrix.scale(0.5, 0.5, 1.0);
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP,
    cylStart/floatsPerVertex,
    cylVerts.length/floatsPerVertex);
  modelMatrix = popMatrix();

  // Tree
  pushMatrix(modelMatrix);
  modelMatrix.translate(0.0, 1.0, 0.0);
  modelMatrix.scale(0.1, 0.1, 0.1);
  drawTree(gl);
  modelMatrix = popMatrix();

  // Prism
  pushMatrix(modelMatrix);
  modelMatrix.translate(-3.0, 0.0, 0.0);
  modelMatrix.rotate(90, 1.0, 0.0, 0.0);
  modelMatrix.scale(0.7, 1.0, 0.7);
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLES,
    priStart/floatsPerVertex,
    priVerts.length/floatsPerVertex);
  modelMatrix = popMatrix();
}

var isFirst = true;
var levels = 7;
var angles = [];
var xOris = [];
var yOris = [];
var angleSteps = [];
function drawTree(gl) {

    if (isFirst) {
        generateTree(gl, 0, 0, levels);
        isFirst = false;
    } else {
        drawTreeHelper(gl, 0, 0, levels);
    }
}

function generateTree(gl, cur_i, cur, end) {

    if (cur == end) {
        return;
    }

    for (var i = 0; i < 2; i++) {
        pushMatrix(modelMatrix);
        var angle = getRandomInt(-20, 20);
        var xOri = 0.0, yOri = 0.0;
        if (Math.random()>0.5) {
            xOri = 1.0; 
            angleSteps[cur_i] = treeAngleStep;
        } else {
            yOri = 1.0;
            angleSteps[cur_i] = treeAngleStep;
        }
        angles[cur_i] = angle;
        xOris[cur_i] = xOri;
        yOris[cur_i] = yOri;
        modelMatrix.translate(0.0, 0.0, 1.0);
        modelMatrix.rotate(angle, xOri, yOri, 0.0);
        modelMatrix.translate(0.0, 0.0, 1.0);
        pushMatrix(modelMatrix);
        modelMatrix.scale(0.1, 0.1, 1.0);
        gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
        gl.drawArrays(gl.TRIANGLE_STRIP,
            cylStart/floatsPerVertex,
            cylVerts.length/floatsPerVertex);
        modelMatrix = popMatrix();
        generateTree(gl, cur_i*2+1+i, cur+1, end);
        modelMatrix = popMatrix();
    }
}

function drawTreeHelper(gl, cur_i, cur, end) {

    if (cur == end) {
        return;
    }

    if (cur_i == angles.length-1) {
        pushMatrix(modelMatrix);
        focusPoint = modelMatrix.multiplyVector4(oriPoint).elements; 
        lookAtVec = modelMatrix.multiplyVector4(oriVec).elements;
        modelMatrix.scale(10, 10, 10);
        gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
        gl.drawArrays(gl.LINES,
            axeStart/floatsPerVertex,
            axeVerts.length/floatsPerVertex);
        modelMatrix = popMatrix();
    }

    for (var i = 0; i < 2; i++) {
        pushMatrix(modelMatrix);
        var angle = angles[cur_i];
        var xOri = xOris[cur_i];
        var yOri = yOris[cur_i];
        modelMatrix.translate(0.0, 0.0, 1.0);
        modelMatrix.rotate(angle, xOri, yOri, 0.0);
        modelMatrix.translate(0.0, 0.0, 1.0);
        pushMatrix(modelMatrix);
        modelMatrix.scale(0.1, 0.1, 1.0);
        gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
        gl.drawArrays(gl.TRIANGLE_STRIP,
            cylStart/floatsPerVertex,
            cylVerts.length/floatsPerVertex);
        modelMatrix = popMatrix();
        drawTreeHelper(gl, cur_i*2+1+i, cur+1, end);
        modelMatrix = popMatrix();
    }
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

var g_last = Date.now();
function animate() {

    var now = Date.now();
    var elapsed = now - g_last;
    g_last = now;

    // Tree
    for (var i = 0; i < angles.length; i++) {
        angles[i] += angleSteps[i];
        if (Math.abs(angles[i])>treeAngleMax) {
            angleSteps[i] *= -1;
        }
    }

    // Sphere
    sphX += sphMoveStep;
    if (Math.abs(sphX) > 4) {
      sphMoveStep *= -1;
    }

    // Flight mode
    if (settings.flightMode) {
      moveForward(g_FlyStep);
      // adjust the yaw
      if (keys[37] == false && g_RollAngle < 0) {
        rollRight();
      }
      if (keys[39] == false && g_RollAngle > 0) {
        rollLeft();
      }
    }
    for (var i = 0; i < keys.length; i++) {
      if (keys[i] !== true) {
        continue;
      }
      switch(i) {
      case 87: // w: move forward
          if (!settings.flightMode) {
            moveForward(g_MoveStep);
          }
          break;
      case 83: // s: move backward
          if (!settings.flightMode) {
            moveBackward(g_MoveStep);
          }
          break;
      case 65: // a: move left
          if (!settings.flightMode) {
            moveLeft();
          }
          break;
      case 68: // d: move right
          if (!settings.flightMode) {
            moveRight();
          }
          break;
      case 37: // left arrow: rotate left
          rotateLeft();
          if (settings.flightMode) {
            rollLeft();
          }
          break;
      case 39: // right arrow: rotate right
          rotateRight();
          if (settings.flightMode) {
            rollRight();
          }
          break;
      case 40: // down arrow: tilt down
          tiltDown();
          break;
      case 38: // up arrow: tilt up
          tiltUp();
          break;
      default:
      }
    }

    // Viewport and Projection
    var canvas = document.getElementById('webgl');
    if (settings.fovy40) {
      canvas.width = innerWidth;
      canvas.height = innerHeight * 3/4;
      aspect = canvas.width/2/canvas.height;
      orthoWidth = orthoHeight * aspect;
    } else {
      aspect = (settings.right - settings.left) / (settings.top - settings.bottom);
      canvas.width = innerWidth;
      canvas.height = innerWidth*0.5/aspect;
    }
}

function setupSettings() {
    settings = new Settings();
    var gui = new dat.GUI({autoPlace: false});
    var panelContainer = document.getElementById('panel');
    panelContainer.appendChild(gui.domElement);
    // gui.add(settings, 'fovy', fovyMin, fovyMax);
    // gui.add(settings, 'height', heightMin, heightMax);
    gui.add(settings, 'switchView');
    gui.add(settings, 'flightMode');
    gui.add(settings, 'fovy40');
    gui.add(settings, 'left', -projMax, -projMin);
    gui.add(settings, 'right', projMin, projMax);
    gui.add(settings, 'bottom', -projMax, -projMin);
    gui.add(settings, 'top', projMin, projMax);
    gui.add(settings, 'near', nearMin, nearMax);
    gui.add(settings, 'far', farMin, farMax);
}

function dragQuat(xdrag, ydrag) {
//==============================================================================
// Called when user drags mouse by 'xdrag,ydrag' as measured in CVV coords.
// We find a rotation axis perpendicular to the drag direction, and convert the 
// drag distance to an angular rotation amount, and use both to set the value of 
// the quaternion qNew.  We then combine this new rotation with the current 
// rotation stored in quaternion 'qTot' by quaternion multiply.  Note the 
// 'draw()' function converts this current 'qTot' quaternion to a rotation 
// matrix for drawing. 
  var res = 5;
  var qTmp = new Quaternion(0,0,0,1);
  
  var dist = Math.sqrt(xdrag*xdrag + ydrag*ydrag);
  // console.log('xdrag,ydrag=',xdrag.toFixed(5),ydrag.toFixed(5),'dist=',dist.toFixed(5));
  qNew.setFromAxisAngle(-ydrag + 0.0001, xdrag + 0.0001, 0.0, dist*50.0);
  // (why add tiny 0.0001? To ensure we never have a zero-length rotation axis)
              // why axis (x,y,z) = (-yMdrag,+xMdrag,0)? 
              // -- to rotate around +x axis, drag mouse in -y direction.
              // -- to rotate around +y axis, drag mouse in +x direction.
              
  qTmp.multiply(qNew,qTot);     // apply new rotation to current rotation. 
  //--------------------------
  // IMPORTANT! Why qNew*qTot instead of qTot*qNew? (Try it!)
  // ANSWER: Because 'duality' governs ALL transformations, not just matrices. 
  // If we multiplied in (qTot*qNew) order, we would rotate the drawing axes
  // first by qTot, and then by qNew--we would apply mouse-dragging rotations
  // to already-rotated drawing axes.  Instead, we wish to apply the mouse-drag
  // rotations FIRST, before we apply rotations from all the previous dragging.
  //------------------------
  // IMPORTANT!  Both qTot and qNew are unit-length quaternions, but we store 
  // them with finite precision. While the product of two (EXACTLY) unit-length
  // quaternions will always be another unit-length quaternion, the qTmp length
  // may drift away from 1.0 if we repeat this quaternion multiply many times.
  // A non-unit-length quaternion won't work with our quaternion-to-matrix fcn.
  // Matrix4.prototype.setFromQuat().
//  qTmp.normalize();           // normalize to ensure we stay at length==1.0.
  qTot.copy(qTmp);
  // show the new quaternion qTot on our webpage in the <div> element 'QuatValue'
  
};