// Settings
var INIT_ZOOM = 0.0000003;
var ZOOM_MAX = 100;
var ZOOM_MIN = 1;
var ZOOM_STEP = 1;
var RADIUS_ZOOM_MAX = 2000;
var RADIUS_ZOOM_MIN = 1;
var TILT_ANGLE = -80.0;
var ACCEL_MIN = 1.0;
var ACCEL_MAX = 100000.0;
var DIST_ZOOM = 10.0;
var DIST_ZOOM_MIN = 1;
var DIST_ZOOM_MAX = 20;

// settings Panel
var Settings = function() {
    this.Zoom = ZOOM_MIN;
    this.RadiusZoom = RADIUS_ZOOM_MAX;
    this.DistanceZoom = DIST_ZOOM_MIN;
    this.Acceleration = 100.0;
    this.DisplayOrbit = true;
};
var settings;

// Constants
var FLOATS_PER_VERTEX = 7; // (x, y, z, w, r, g, b)

// flickering stars
var STAR_SIZE = 0.01;
var STAR_SIZE_MAX = 1;
var STAR_NUM = 50;
var STAR_SIZE_STEP = 0.01;

// Moving the view? (not used yet)
var TX = 0.0, TY = 0.0, TZ = 0.0;

// Rotating the planets
var merAngle = 0.0;
var venAngle = 0.0;
var earthAngle = 0.0;
// var stlAngle = 0.0;
var marAngle = 0.0;
var saturnAngle = 0.0;
var jupAngle = 0.0;
var uraAngle = 0.0;
var nepAngle = 0.0;
var ganyAngle = 0.0;

// For changing colors of planets dynamically
var period = 0.0;
var PERIOD_STEP = 0.01;

// For dragging the world
var DRAG_SPEED = 120;
var isDrag = false;
var xClick = 0.0;
var yClick = 0.0;
var xDragTotal = 0.0;
var yDragTotal = 0.0;
var X_ROTATE_STEP = 0.01;

// show instructions
var displayInst = false;

// For choosing planets
var xDown = 0.0;
var yDown = 0.0;
var SUN_ID = 0.1;
var MERCURY_ID = 0.2;
var VENUS_ID = 0.3;
var EARTH_ID = 0.4;
// var SATELLITE_ID = 0.42;
var MARS_ID = 0.5;
var JUPITER_ID = 0.6;
var GANYMEDE_ID = 0.62;
var SATURN_ID = 0.7;
var URANUS_ID = 0.8;
var NEPTUNE_ID = 0.9;
var DEFAULT_ID = 0.99;

// Data of Solar System
// radius of planets (in kilomiles)
var SUN_RADIUS = 432.47;
var MERCURY_RADIUS = 1.52;
var VENUS_RADIUS = 3.76;
var EARTH_RADIUS = 3.96;
var MARS_RADIUS = 2.11;
var JUPITER_RADIUS = 43.44;
var SATURN_RADIUS = 36.18;
var URANUS_RADIUS = 15.76;
var NEPTUNE_RADIUS = 15.30;
// largest satellite in solar system (belong to jupiter)
var GANYMEDE_RADIUS = 1.63;
// var SATELLITE_RADIUS = 0.5; // fake data here

// distance of planets from sun (in kilomiles)
var MERCURY_DIST = 35980;
var VENUS_DIST = 67240;
var EARTH_DIST = 92960;
var MARS_DIST = 141600;
var JUPITER_DIST = 483800;
var SATURN_DIST = 890000;
var URANUS_DIST = 1787000;
var NEPTUNE_DIST = 2795000;
// var GANYMEDE_DIST = 665; // distance from Jupiter
                            // replace to display better
var GANYMEDE_DIST = 1.3*JUPITER_RADIUS;
// var SATELLITE_DIST = 1.3*EARTH_RADIUS;

// angular velocities of planets (per day)
var MERCURY_ANG_VEL = Math.PI*2/88;
var VENUS_ANG_VEL = Math.PI*2/224.7;
var EARTH_ANG_VEL = Math.PI*2/365.3;
var MARS_ANG_VEL = Math.PI*2/687.0;
var JUPITER_ANG_VEL = Math.PI*2/398.9;
var SATURN_ANG_VEL = Math.PI*2/10759.2;
var URANUS_ANG_VEL = Math.PI*2/30688.5;
var NEPTUNE_ANG_VEL = Math.PI*2/60182.0;
var GANY_ANG_VEL = Math.PI*2/172*24;
// var SATELLITE_ANG_VEL = Math.PI*2/80;

// Vertex shader program
var VSHADER_SOURCE = 
    'uniform mat4 u_ModelMatrix;\n' + 
    'attribute vec4 a_Position;\n' + 
    'attribute vec4 a_Color;\n' + 
    'varying vec4 v_Color;\n' + 
    'uniform bool u_Clicked;\n' +
    'uniform float u_id;\n' +
    'uniform float u_Period;\n' +
    'void main() {' + 
    '   gl_Position = u_ModelMatrix * a_Position;\n' +
    '   gl_PointSize = 10.0;\n' +
    '   if (u_Clicked) {' +
    '       v_Color = vec4(u_id, 0.0, 0.0, 1.0);\n' +
    '   } else {\n' +
    '       v_Color = vec4(' +
    '           (1.0-u_Period)*a_Color[0]+u_Period*1.0,\n' +
    '           (1.0-u_Period)*a_Color[1]+u_Period*1.0,\n' +
    '           (1.0-u_Period)*a_Color[2]+u_Period*1.0,\n' +
    '           a_Color[3]);\n' +
    '   }' +
    '}\n';

// Fragment shader program
var FSHADER_SOURCE = 
    'precision mediump float;\n' +
    'varying vec4 v_Color;\n' +
    'void main() {' +
    '   gl_FragColor = v_Color;\n' +
    '}\n';

// the html page will call this once loaded
function main() {

    // setup the settings panel
    setupSettings();

    var canvas = document.getElementById('webgl');
    var hud = document.getElementById('hud');

    var gl = getWebGLContext(canvas);
    if (!gl) {
        console.log('Failed to get the rendering context for WebGL.');
        return;
    }
    var ctx = hud.getContext('2d');

    if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
        console.log('Failed to initialize shaders.');
        return;
    }

    var n = initVertexBuffer(gl);
    if (n < 0) {
        console.log('Failed to set the vertex information.');
        return;
    }

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
    if (!u_ModelMatrix) {
        console.log('Failed to get the storage location of u_ModelMatrix.');
        return;
    }

    var modelMatrix = new Matrix4();

    var u_Clicked = gl.getUniformLocation(gl.program, 'u_Clicked');
    if (!u_Clicked) {
        console.log('Failed to get the storage location of u_Clicked.');
        return;
    }
    gl.uniform1i(u_Clicked, 0);

    var u_id = gl.getUniformLocation(gl.program, 'u_id');
    if (!u_id) {
        console.log('Failed to get the storage location of u_id.');
        return;
    }

    var u_Period = gl.getUniformLocation(gl.program, 'u_Period');
    if (!u_Period) {
        console.log('Failed to get the storage location of u_Period.');
        return;
    }

    // generate random position stars
    starPoss = [];
    starSizes = [];
    starSteps = [];
    for (var i = 0; i < STAR_NUM; i++) {
        var x = (Math.random()-0.5)*2;
        var z = (Math.random()-0.5)*2;
        starPoss.push([x, z]);
        starSizes.push(Math.random());
        starSteps.push(Math.random()>0.5? STAR_SIZE_STEP: -STAR_SIZE_STEP);
    }

    // register mouse events
    hud.onmousedown = function(ev) {myMouseDown(ev, gl, canvas);};
    hud.onmousemove = function(ev) {myMouseMove(ev, gl, canvas)};
    hud.onmouseup = function(ev) {myMouseUp(ev, u_Clicked, gl, canvas, u_ModelMatrix, modelMatrix, u_id)};

    // register keyboard events
    window.addEventListener("keydown", myKeyDown, false);
    // window.addEventListener("keuup", myKeyUp, false);
    // window.addEventListener("keypress", myKeyPress, false);

    var tick = function() {
        animate(gl, u_Period);
        draw2D(hud, ctx);
        draw(gl, modelMatrix, u_ModelMatrix, u_id);
        requestAnimationFrame(tick, canvas);
    };

    tick();
}

function initVertexBuffer(gl) {

    // sun
    var sunVerts = makeSphere(
        SUN_RADIUS,
        new Float32Array([1.00, 0.20, 0.20]),
        new Float32Array([0.0, 0.0, 0.0]));
    lSunVerts = sunVerts.length;

    // planets
    var merVerts = makeSphere(
        MERCURY_RADIUS,
        new Float32Array([0.5, 0.5, 0.5]),
        new Float32Array([0.25, 0.25, 0.25]));
    lMerVerts = merVerts.length;

    var venVerts = makeSphere(
        VENUS_RADIUS,
        new Float32Array([0.72, 0.71, 0.68]),
        new Float32Array([0.35, 0.35, 0.34]));
    lVenVerts = venVerts.length;

    var earVerts = makeSphere(
        EARTH_RADIUS,
        new Float32Array([0.4, 0.7, 0.85]),
        new Float32Array([0.01, 0.1, 0.15]));
    lEarVerts = earVerts.length;

    var marVerts = makeSphere(
        MARS_RADIUS,
        new Float32Array([0.82, 0.24, 0.12]),
        new Float32Array([0.42, 0.12, 0.10]));
    lMarVerts = marVerts.length;

    var jupVerts = makeSphere(
        JUPITER_RADIUS,
        new Float32Array([1.0, 0.8, 0.65]),
        new Float32Array([1.0, 1.0, 1.0]));
    lJupVerts = jupVerts.length;

    var satVerts = makeSphere(
        SATURN_RADIUS,
        new Float32Array([1.0, 0.8, 0.65]),
        new Float32Array([0.5, 0.4, 0.3]));
    lSatVerts = satVerts.length;

    var uraVerts = makeSphere(
        URANUS_RADIUS,
        new Float32Array([0.26, 0.72, 0.82]),
        new Float32Array([0.13, 0.36, 0.41]));
    lUraVerts = uraVerts.length;

    var nepVerts = makeSphere(
        NEPTUNE_RADIUS,
        new Float32Array([0.28, 0.45, 0.98]),
        new Float32Array([0.14, 0.22, 0.49]));
    lNepVerts = nepVerts.length;

    var satRingVerts = makeTorus(
        SATURN_RADIUS*3/2, 
        SATURN_RADIUS/6, 
        new Float32Array([1.0, 0.8, 0.65]),
        new Float32Array([0.5, 0.3, 0.3]));
    lSatRingVerts = satRingVerts.length;

    // satellite
    var ganyVerts = makeSphere(
        GANYMEDE_RADIUS,
        new Float32Array([0.45, 0.4, 0.4]),
        new Float32Array([0.7, 0.7, 0.6]));
    lGanyVerts = ganyVerts.length;

    // orbits
    var earthOrbVerts = makeLoop(
        EARTH_DIST,
        new Float32Array([1.0, 1.0, 1.0]));
    lEarthOrbVerts = earthOrbVerts.length;

    // simple stars as background
    var starVerts = makeTetrahedron(
        STAR_SIZE, 
        new Float32Array([0.40, 0.25, 0.75]));
    lStarVerts = starVerts.length;

    // bytes of all shapes
    var size = (lSunVerts
        +lMerVerts+lVenVerts+lEarVerts+lMarVerts
        +lJupVerts+lSatRingVerts+lSatVerts+lUraVerts+lNepVerts
        +lGanyVerts
        +lEarthOrbVerts
        +lStarVerts); 
    // # of vertices
    var n = size/FLOATS_PER_VERTEX;

    var colorShapes = new Float32Array(size);
    var i = 0; // counts amount of final array elements
    sunStart = 0;
    for (var j = 0; j < lSunVerts; i++, j++) {
        colorShapes[i] = sunVerts[j];
    }
    merStart = i;
    for (var j = 0; j < lMerVerts; i++, j++) {
        colorShapes[i] = merVerts[j];
    }
    venStart = i;
    for (var j = 0; j < lVenVerts; i++, j++) {
        colorShapes[i] = venVerts[j];
    }
    earStart = i;
    for (var j = 0; j < lEarVerts; i++, j++) {
        colorShapes[i] = earVerts[j];
    }
    marStart = i;
    for (var j = 0; j < lMarVerts; i++, j++) {
        colorShapes[i] = marVerts[j];
    }
    jupStart = i;
    for (var j = 0; j < lJupVerts; i++, j++) {
        colorShapes[i] = jupVerts[j];
    }
    satStart = i;
    for (var j = 0; j < lSatVerts; i++, j++) {
        colorShapes[i] = satVerts[j];
    }
    satRingStart = i;
    for (var j = 0; j < lSatRingVerts; i++, j++) {
        colorShapes[i] = satRingVerts[j];
    }
    uraStart = i;
    for (var j = 0; j < lUraVerts; i++, j++) {
        colorShapes[i] = uraVerts[j];
    }
    nepStart = i;
    for (var j = 0; j < lNepVerts; i++, j++) {
        colorShapes[i] = nepVerts[j];
    }
    ganyStart = i;
    for (var j = 0; j < lGanyVerts; i++, j++) {
        colorShapes[i] = ganyVerts[j];
    }
    earthOrbStart = i;
    for (var j = 0; j < lEarthOrbVerts; i++, j++) {
        colorShapes[i] = earthOrbVerts[j];
    }
    starStart = i;
    for (var j = 0; j < lStarVerts; i++, j++) {
        colorShapes[i] = starVerts[j];
    }

    var shapeBufferHandle = gl.createBuffer();
    if (!shapeBufferHandle) {
        console.log('Failed to create the shape buffer object.');
        return false;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, shapeBufferHandle);
    gl.bufferData(gl.ARRAY_BUFFER, colorShapes, gl.STATIC_DRAW);

    var FSIZE = colorShapes.BYTES_PER_ELEMENT;

    var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    if (a_Position < 0) {
        console.log('Failed to get the storage location of a_Position.');
        return -1;
    }
    gl.vertexAttribPointer(
        a_Position, // vertex shader
        4, // # of values (attributes: x, y, z, w)
        gl.FLOAT, // type of value
        false, // need normalized?
        FSIZE * FLOATS_PER_VERTEX, 
            // stride:
            // how many bytes used to store each vertex
            // bytes/value * (x, y, z, w, r, g, b)
        0); // offset (in bytes)
    gl.enableVertexAttribArray(a_Position);

    var a_Color = gl.getAttribLocation(gl.program, 'a_Color');
    if (a_Color < 0) {
        console.log('Failed to get the storage location of a_Color.');
        return -1;
    }
    gl.vertexAttribPointer(
        a_Color, 
        3, 
        gl.FLOAT,
        false,
        FSIZE * FLOATS_PER_VERTEX,
        FSIZE * 4); // offset (in bytes)
    gl.enableVertexAttribArray(a_Color);

    // unbind buffer object
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    return n;
}

var g_last = Date.now();
function animate(gl, u_Period) {

    var now = Date.now();
    var elapsed = now - g_last;
    g_last = now;

    merAngle += MERCURY_ANG_VEL * settings.Acceleration * elapsed / 1000.0;
    merAngle %= 360;

    venAngle += VENUS_ANG_VEL * settings.Acceleration * elapsed / 1000.0;
    venAngle %= 360;

    earthAngle += EARTH_ANG_VEL * settings.Acceleration * elapsed / 1000.0;
    earthAngle %= 360;

    marAngle += MARS_ANG_VEL * settings.Acceleration * elapsed / 1000.0;
    marAngle %= 360;

    jupAngle += JUPITER_ANG_VEL * settings.Acceleration * elapsed / 1000.0;
    jupAngle %= 360;

    saturnAngle += SATURN_ANG_VEL * settings.Acceleration * elapsed / 1000.0;
    saturnAngle %= 360;

    uraAngle += URANUS_ANG_VEL * settings.Acceleration * elapsed / 1000.0;
    uraAngle %= 360;

    nepAngle += NEPTUNE_ANG_VEL * settings.Acceleration * elapsed / 1000.0;
    nepAngle %= 360;

    ganyAngle += GANY_ANG_VEL * settings.Acceleration * elapsed / 1000.0;
    ganyAngle %= 360;

    if (period+PERIOD_STEP>=0.3 || period+PERIOD_STEP<=0.0) {
        PERIOD_STEP = -PERIOD_STEP;
    } 
    period += PERIOD_STEP;
    gl.uniform1f(u_Period, period);

    for (var i = 0; i < STAR_NUM; i++) {
        if (starSizes[i]+starSteps[i]>=STAR_SIZE_MAX || starSizes[i]+starSteps[i]<=-STAR_SIZE_MAX) {
            starSteps[i] = -starSteps[i];
        }
        starSizes[i] += starSteps[i];
    }
}

function draw(gl, modelMatrix, u_ModelMatrix, u_id) {

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    // maybe for roaming
    modelMatrix.setTranslate(TX, TY, TZ);

    // convert to left-handed coord sys
    // to match WebGL display
    modelMatrix.scale(1, 1, -1); 

    // tilt the Solar System
    modelMatrix.rotate(TILT_ANGLE, 1, 0, 0);

    // mouse rotate the world (along axis z)
    var dist = xDragTotal;
    modelMatrix.rotate(dist*DRAG_SPEED, 0, 0, 1);

    pushMatrix(modelMatrix);
    // draw star as background
    // `render' the wall (6 walls)
    gl.uniform1f(u_id, DEFAULT_ID);
    drawBG(gl, modelMatrix, u_ModelMatrix);

    modelMatrix = popMatrix();    

    modelMatrix.scale(INIT_ZOOM, INIT_ZOOM, INIT_ZOOM);

    // shrink
    modelMatrix.scale(settings.Zoom, settings.Zoom, settings.Zoom);

    pushMatrix(modelMatrix);
    // Sun
    modelMatrix.scale(Math.sqrt(settings.RadiusZoom), Math.sqrt(settings.RadiusZoom), Math.sqrt(settings.RadiusZoom));
    // pass and draw
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    gl.uniform1f(u_id, SUN_ID);
    gl.drawArrays(gl.TRIANGLE_STRIP, 
                  sunStart/FLOATS_PER_VERTEX,  // starting index
                  lSunVerts/FLOATS_PER_VERTEX); // # of vertices to draw
    
    modelMatrix = popMatrix();
    
    pushMatrix(modelMatrix);
    // Mercury
    modelMatrix.rotate(merAngle, 0, 0, 1);
    modelMatrix.translate(MERCURY_DIST/settings.DistanceZoom, 0.0, 0.0);
    modelMatrix.scale(settings.RadiusZoom, settings.RadiusZoom, settings.RadiusZoom);
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    gl.uniform1f(u_id, MERCURY_ID);
    gl.drawArrays(gl.TRIANGLE_STRIP, merStart/FLOATS_PER_VERTEX, lMerVerts/FLOATS_PER_VERTEX);

    modelMatrix = popMatrix();

    pushMatrix(modelMatrix);
    // Venus
    modelMatrix.rotate(venAngle, 0, 0, 1);
    modelMatrix.translate(VENUS_DIST/settings.DistanceZoom, 0.0, 0.0);
    modelMatrix.scale(settings.RadiusZoom, settings.RadiusZoom, settings.RadiusZoom);
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    gl.uniform1f(u_id, VENUS_ID);
    gl.drawArrays(gl.TRIANGLE_STRIP, venStart/FLOATS_PER_VERTEX, lVenVerts/FLOATS_PER_VERTEX);

    modelMatrix = popMatrix();

    pushMatrix(modelMatrix);
    // Earth
    // orbit
    if (settings.DisplayOrbit) {
        pushMatrix(modelMatrix);
        modelMatrix.scale(1/settings.DistanceZoom, 1/settings.DistanceZoom, 0);
        gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
        gl.drawArrays(gl.LINES, earthOrbStart/FLOATS_PER_VERTEX, lEarthOrbVerts/FLOATS_PER_VERTEX);
        modelMatrix = popMatrix();
    }
    // earth
    modelMatrix.rotate(earthAngle, 0, 0, 1);
    modelMatrix.translate(EARTH_DIST/settings.DistanceZoom, 0.0, 0.0);
    modelMatrix.scale(settings.RadiusZoom, settings.RadiusZoom, settings.RadiusZoom);
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    gl.uniform1f(u_id, EARTH_ID);
    gl.drawArrays(gl.TRIANGLE_STRIP, earStart/FLOATS_PER_VERTEX, lEarVerts/FLOATS_PER_VERTEX);
    
    modelMatrix = popMatrix();

    pushMatrix(modelMatrix);
    // Mars
    modelMatrix.rotate(marAngle, 0, 0, 1);
    modelMatrix.translate(MARS_DIST/settings.DistanceZoom, 0.0, 0.0);
    modelMatrix.scale(settings.RadiusZoom, settings.RadiusZoom, settings.RadiusZoom);
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    gl.uniform1f(u_id, MARS_ID);
    gl.drawArrays(gl.TRIANGLE_STRIP, marStart/FLOATS_PER_VERTEX, lMarVerts/FLOATS_PER_VERTEX);

    modelMatrix = popMatrix();

    pushMatrix(modelMatrix);
    // Jupiter
    modelMatrix.rotate(jupAngle, 0, 0, 1);
    modelMatrix.translate(JUPITER_DIST/settings.DistanceZoom, 0.0, 0.0);
    modelMatrix.scale(settings.RadiusZoom, settings.RadiusZoom, settings.RadiusZoom);
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    gl.uniform1f(u_id, JUPITER_ID);
    gl.drawArrays(gl.TRIANGLE_STRIP, jupStart/FLOATS_PER_VERTEX, lJupVerts/FLOATS_PER_VERTEX);
    // Ganymede
    modelMatrix.rotate(ganyAngle, 0, 0, 1);
    // modelMatrix.translate(GANYMEDE_DIST/settings.DistanceZoom, 0.0, 0.0);
    modelMatrix.translate(GANYMEDE_DIST, 0.0, 0.0);
    // modelMatrix.scale(settings.RadiusZoom, settings.RadiusZoom, settings.RadiusZoom);
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    gl.uniform1f(u_id, GANYMEDE_ID);
    gl.drawArrays(gl.TRIANGLE_STRIP, ganyStart/FLOATS_PER_VERTEX, lGanyVerts/FLOATS_PER_VERTEX);

    modelMatrix = popMatrix();
    // Saturn
    // 1) body
    pushMatrix(modelMatrix);
    modelMatrix.rotate(saturnAngle, 0, 0, 1);
    modelMatrix.translate(SATURN_DIST/settings.DistanceZoom, 0.0, 0.0);
    modelMatrix.scale(settings.RadiusZoom, settings.RadiusZoom, settings.RadiusZoom);
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    gl.uniform1f(u_id, SATURN_ID);
    gl.drawArrays(gl.TRIANGLE_STRIP, satStart/FLOATS_PER_VERTEX, lSatVerts/FLOATS_PER_VERTEX);
    // 2) ring   
    modelMatrix.rotate(10.0, 1, 1, 0);
    modelMatrix.scale(1.0, 1.0, 0.3);
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    gl.uniform1f(u_id, SATURN_ID);
    gl.drawArrays(gl.TRIANGLE_STRIP, satRingStart/FLOATS_PER_VERTEX, lSatRingVerts/FLOATS_PER_VERTEX);

    modelMatrix = popMatrix();
    // Uranus
    pushMatrix(modelMatrix);
    modelMatrix.rotate(uraAngle, 0, 0, 1);
    modelMatrix.translate(URANUS_DIST/settings.DistanceZoom, 0.0, 0.0);
    modelMatrix.scale(settings.RadiusZoom, settings.RadiusZoom, settings.RadiusZoom);
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    gl.uniform1f(u_id, URANUS_ID);
    gl.drawArrays(gl.TRIANGLE_STRIP, uraStart/FLOATS_PER_VERTEX, lUraVerts/FLOATS_PER_VERTEX);

    modelMatrix = popMatrix();
    // Uranus
    pushMatrix(modelMatrix);
    modelMatrix.rotate(nepAngle, 0, 0, 1);
    modelMatrix.translate(NEPTUNE_DIST/settings.DistanceZoom, 0.0, 0.0);
    modelMatrix.scale(settings.RadiusZoom, settings.RadiusZoom, settings.RadiusZoom);
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    gl.uniform1f(u_id, NEPTUNE_ID);
    gl.drawArrays(gl.TRIANGLE_STRIP, nepStart/FLOATS_PER_VERTEX, lNepVerts/FLOATS_PER_VERTEX);
}

function drawBG(gl, modelMatrix, u_ModelMatrix) {

    for (var j = 0; j < 4; j++) {
        pushMatrix(modelMatrix);
        modelMatrix.rotate(90*j, 0, 0, 1);
        for (var i = 0; i < STAR_NUM; i++) {
            pushMatrix(modelMatrix);
            modelMatrix.translate(starPoss[i][0], 1.0, starPoss[i][1]);
            modelMatrix.scale(starSizes[i], starSizes[i], starSizes[i]);
            gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
            gl.drawArrays(gl.TRIANGLE_STRIP, 
                          starStart/FLOATS_PER_VERTEX,  // starting index
                          lStarVerts/FLOATS_PER_VERTEX); // # of vertices to draw
            modelMatrix = popMatrix();
        }
        modelMatrix = popMatrix();
    }
}

function draw2D(canvas, ctx) {

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.font = '18px "Times New Roman"';
    ctx.fillStyle = 'rgba(255, 255, 255, 1)';
    ctx.fillText('Press "H" to see instructions', 40, 40);
    if (displayInst) {
        ctx.fillStyle = 'rgba(255, 255, 255, 1)';
        ctx.font = '18px "Times New Roman"';
        ctx.fillText('Keyboard:', 40, 60);
        ctx.font = '15px "Times New Roman"';
        ctx.fillText('Up-Arrow: Zoom In', 40, 75);
        ctx.fillText('Down-Arrow: Zoom Out', 40, 90);
        ctx.fillText('Left-Arrow: Left Rotate', 40, 105);
        ctx.fillText('Right-Arrow: Right Rotate', 40, 120);
        ctx.font = '18px "Times New Roman"';
        ctx.fillText('Mouse:', 40, 140);
        ctx.font = '15px "Times New Roman"';
        ctx.fillText('Drag with Mouse to Rotate', 40, 155);
        ctx.fillText('Try to Click on the Planets', 40, 170);
        ctx.font = '18px "Times New Roman"';
        ctx.fillText('Panel:', 40, 190);
        ctx.font = '15px "Times New Roman"';
        ctx.fillText('Use the Panel on the Right', 40, 205);
    }
}

function myMouseDown(ev, gl, canvas) {

    // get the coords in canvas
    var rect = ev.target.getBoundingClientRect();
    var xp = ev.clientX - rect.left;
    var yp = canvas.height - (ev.clientY - rect.top);

    // converts to Canonical View Volume (CVV) coords
    var x = (xp - canvas.width/2)/(canvas.width/2);
    var y = (yp - canvas.height/2)/(canvas.height/2);

    isDrag = true;
    xClick = x;
    yClick = y;

    xDown = x;
    yDown = y;
}

function myMouseMove(ev, gl, canvas) {

    if (!isDrag) {
        return;
    }

    // get the coords in canvas
    var rect = ev.target.getBoundingClientRect();
    var xp = ev.clientX - rect.left;
    var yp = canvas.height - (ev.clientY - rect.top);

    // converts to Canonical View Volume (CVV) coords
    var x = (xp - canvas.width/2)/(canvas.width/2);
    var y = (yp - canvas.height/2)/(canvas.height/2);

    xDragTotal += (x - xClick);
    yDragTotal += (y - yClick);
    xClick = x;
    yClick = y;
}

function myMouseUp(ev, u_Clicked, gl, canvas, u_ModelMatrix, modelMatrix, u_id) {

    // get the coords in canvas
    var rect = ev.target.getBoundingClientRect();
    var xp = ev.clientX - rect.left;
    var yp = canvas.height - (ev.clientY - rect.top);

    // converts to Canonical View Volume (CVV) coords
    var x = (xp - canvas.width/2)/(canvas.width/2);
    var y = (yp - canvas.height/2)/(canvas.height/2);

    // if click without moving
    var id = -1;
    if (xDown==x && yDown==y) {
        id = check(gl, xp, yp, u_Clicked, u_ModelMatrix, modelMatrix, u_id);
        console.log('id: '+id);
        if (id==SUN_ID) {
            document.getElementById('intro').innerHTML = 
                'Sun: the star at the center of the Solar System '+
                'and is by far the most important source of energy.';
        } else if (id==MERCURY_ID) {
            document.getElementById('intro').innerHTML = 
                'Mercury: the smallest planet in the Solar System and '+
                'the one closest to the Sun.';
        } else if (id==VENUS_ID) {
            document.getElementById('intro').innerHTML = 
                'Venus: the second planet from the Sun, it has no '+
                'natural satellite.';
        } else if (id==EARTH_ID) {
            document.getElementById('intro').innerHTML = 
                'Earth: the 3rd planet from the Sun, the densest planet '+
                'in the Solar System, the largest of the Solar System\'s '+
                'four terrestrial planets. (Sure, where you are.)';
        } else if (id==MARS_ID) {
            document.getElementById('intro').innerHTML = 
                'Mars: the 4th planet from the Sun and the 2nd smallest '+
                'planet in the Solar System, after Mercury. ';
        } else if (id==JUPITER_ID) {
            document.getElementById('intro').innerHTML = 
                'Jupiter: the 5th planet from the Sun and the largest '+
                'in the Solar System. It is a gas giant. Also, it has '+
                'largest satellite (Ganymede) in the Solar System. '+
                '(You can try to find it and click for more information. ';
        } else if (id==SATURN_ID) {
            document.getElementById('intro').innerHTML = 
                'Saturn: the 6th planet from the Sun and the second '+
                'largest in the Solar System. It is a gas giant with '+
                'an average radius about 9 times that of Earth. ';
        } else if (id==URANUS_ID) {
            document.getElementById('intro').innerHTML = 
                'Uranus: the 7th planet from the Sun. It has the 3rd-'+
                'largest planetary radius and 4th-largest planetary '+
                'mass in the Solar System. ';
        } else if (id==NEPTUNE_ID) {
            document.getElementById('intro').innerHTML = 
                'Neptune: the 8th and farthest planet from the Sun in '+
                'Solar System. It is the 4th-largest planet by diameter '+
                'and the 3rd-largest by mass. Among the giant planets '+
                'in the Solar System, Neptune is the most dense. ';
        } else if (id==GANYMEDE_ID) {
            document.getElementById('intro').innerHTML = 
                'Ganymede: one of the satellites of Jupiter, '+
                'also the largest satellite in Solar System.';
        } else {
            document.getElementById('intro').innerHTML = 
                'Cosmos: You can see some flickering stars as background.';
        }
    }

    isDrag = false;
}

function check(gl, x, y, u_Clicked, u_ModelMatrix, modelMatrix, u_id) {

    // draw with single pixel for each object
    gl.uniform1i(u_Clicked, 1);
    draw(gl, modelMatrix, u_ModelMatrix, u_id);

    // get the color of pixel
    var pixels = new Uint8Array(4);
    gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    gl.uniform1i(u_Clicked, 0);
    draw(gl, modelMatrix, u_ModelMatrix, u_id);

    return (pixels[0]/255).toFixed(2);
}

function myKeyDown(ev) {

    switch(ev.keyCode) {
        case 38: // zoom in
            console.log("up arrow pressed");
            if (settings.Zoom+ZOOM_STEP>ZOOM_MAX) {
                break;
            }
            settings.Zoom += ZOOM_STEP;
            break;
        case 40: // zoom out
            console.log("down arrow pressed");
            if (settings.Zoom-ZOOM_STEP<ZOOM_MIN) {
                break;
            }
            settings.Zoom -= ZOOM_STEP;
            break;
        case 37: // drag left
            console.log("left arrow pressed");
            xDragTotal += X_ROTATE_STEP;
            break;
        case 39: // drag right
            console.log("right arrow pressed");
            xDragTotal -= X_ROTATE_STEP;
            break;
        case 72: // (un)display the help info
            console.log('"H" was pressed');
            displayInst = (displayInst+1)%2;
            break;
        default:
            console.log("invalid key: "+ev.keyCode);
            break;
    }
}

function setupSettings() {
    settings = new Settings();
    var gui = new dat.GUI({autoPlace: false});
    var panelContainer = document.getElementById('panel');
    panelContainer.appendChild(gui.domElement);
    gui.add(settings, 'Zoom', ZOOM_MIN, ZOOM_MAX).listen();
    gui.add(settings, 'RadiusZoom', RADIUS_ZOOM_MIN, RADIUS_ZOOM_MAX);
    gui.add(settings, 'DistanceZoom', DIST_ZOOM_MIN, DIST_ZOOM_MAX);
    gui.add(settings, 'Acceleration', ACCEL_MIN, ACCEL_MAX);
    gui.add(settings, 'DisplayOrbit');
    var update = function() {
        requestAnimationFrame(update);
    };
    update();
}

function makeTetrahedron(length, color) {

    var tetVerts = new Float32Array([
        0.0, 0.0, length, 1.0, color[0], color[1], color[2],
        length, -length, -length, 1.0, color[0], color[1], color[2],
        0.0, length, -length, 1.0, color[0], color[1], color[2],
        -length, -length, -length, 1.0, color[0], color[1], color[2],
        0.0, 0.0, length, 1.0, color[0], color[1], color[2],
        length, -length, -length, 1.0, color[0], color[1], color[2]]);

    return tetVerts;
}

function makeSphere(radius, topColor, bottomColor) {

    var slices = 15; // # of slice to form sphere
    var sliceVerts = 27; // # of vertices to form `circle'
    var sliceAngle = Math.PI/slices;

    // # of vertices to form sphere
    // each slice need 2n vertices, except for the first and last one
    var sphVerts = new Float32Array((slices*sliceVerts*2-2)*FLOATS_PER_VERTEX);

    var cos0 = 0.0, sin0 = 0.0, cos1 = 0.0, sin1 = 0.0;
    var j = 0; // counts the amount of array elements
    var isFirst = 1, isLast = 0;
    var k = 1.0; // used for calculating color for vertices
                 // at each edge

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
        for (v = isFirst; v < sliceVerts*2-isLast; v++, j+=FLOATS_PER_VERTEX) {
            k = (s+v%2)/slices;
            // vertices on the top of slice
            if (v%2==0) {
                sphVerts[j] = radius*Math.cos(Math.PI*v/sliceVerts)*sin0;
                sphVerts[j+1] = radius*Math.sin(Math.PI*v/sliceVerts)*sin0;
                sphVerts[j+2] = radius*cos0;
                sphVerts[j+3] = 1.0; // w = 1.0
                sphVerts[j+4] = k*bottomColor[0]+(1-k)*topColor[0];
                sphVerts[j+5] = k*bottomColor[1]+(1-k)*topColor[1];
                sphVerts[j+6] = k*bottomColor[2]+(1-k)*topColor[2];
            // vertices on the bottom of slice
            } else {
                sphVerts[j] = radius*Math.cos(Math.PI*(v-1)/sliceVerts)*sin1;
                sphVerts[j+1] = radius*Math.sin(Math.PI*(v-1)/sliceVerts)*sin1;
                sphVerts[j+2] = radius*cos1;
                sphVerts[j+3] = 1.0; // w = 1.0
                sphVerts[j+4] = k*bottomColor[0]+(1-k)*topColor[0];
                sphVerts[j+5] = k*bottomColor[1]+(1-k)*topColor[1];
                sphVerts[j+6] = k*bottomColor[2]+(1-k)*topColor[2];
            }
        }
    }

    return sphVerts;
}

function makeTorus(rbend, rbar, nearColor, farColor) {

    var barSlices = 23;
    var barSides = 13;

    var torVerts = new Float32Array(FLOATS_PER_VERTEX*(2*barSides*barSlices+2));

    // for calculation coords
    var thetaStep = 2*Math.PI/barSlices; 
    var phiHalfStep = Math.PI/barSides;
    var x, y, z, k; 

    var j = 0;
    for (var s = 0; s < barSlices; s++) {
        for (var v = 0; v < 2*barSides; v++, j+=FLOATS_PER_VERTEX) {
            if (v%2==0) {
                torVerts[j] = (rbend+rbar*Math.cos(v*phiHalfStep))*Math.cos(s*thetaStep);
                torVerts[j+1] = (rbend+rbar*Math.cos(v*phiHalfStep))*Math.sin(s*thetaStep);
                torVerts[j+2] = rbar*Math.sin(v*phiHalfStep);
                torVerts[j+3] = 1.0; // w = 1.0
                x = torVerts[j]; y = torVerts[j+1]; z = torVerts[j+2];
                k = Math.sqrt(x*x+y*y+z*z)/(rbend+rbar);
                torVerts[j+4] = k*farColor[0]+(1-k)*nearColor[0];
                torVerts[j+5] = k*farColor[1]+(1-k)*nearColor[1];
                torVerts[j+6] = k*farColor[2]+(1-k)*nearColor[2];
            } else {
                torVerts[j] = (rbend+rbar*Math.cos((v-1)*phiHalfStep))*Math.cos((s+1)*thetaStep);
                torVerts[j+1] = (rbend+rbar*Math.cos((v-1)*phiHalfStep))*Math.sin((s+1)*thetaStep);
                torVerts[j+2] = rbar*Math.sin((v-1)*phiHalfStep);
                torVerts[j+3] = 1.0; // w = 1.0
                x = torVerts[j]; y = torVerts[j+1]; z = torVerts[j+2];
                k = Math.sqrt(x*x+y*y+z*z)/(rbend+rbar);
                torVerts[j+4] = k*farColor[0]+(1-k)*nearColor[0];
                torVerts[j+5] = k*farColor[1]+(1-k)*nearColor[1];
                torVerts[j+6] = k*farColor[2]+(1-k)*nearColor[2];
            }
        }
    }

    return torVerts;
}

function makeLoop(radius, color) {

    var verts = 97;
    var loopVerts = new Float32Array(verts*FLOATS_PER_VERTEX);

    for (var v = 0, j = 0; v < verts; v++, j+=FLOATS_PER_VERTEX) {
        loopVerts[j] = radius*Math.cos(2*Math.PI*v/verts);
        loopVerts[j+1] = radius*Math.sin(2*Math.PI*v/verts);
        loopVerts[j+2] = 0.0;
        loopVerts[j+3] = 1.0;
        loopVerts[j+4] = color[0];
        loopVerts[j+5] = color[1];
        loopVerts[j+6] = color[2];
    }

    return loopVerts;
}

// function makePyramid() {

//     var pyrVerts = new Float32Array([
//         //Drawing the pyramid
//         //bottom side
//         -0.3, 0.0, 0.0, 1.0,   1.0, 0.0, 0.0,
//         0.3, 0.0, 0.0, 1.0,    0.0, 1.0, 0.0,
//         0.0, 0.0, 0.3, 1.0,   0.0, 0.0, 1.0,
//         //left side
//         -0.3, 0.0, 0.0, 1.0,  0.0, 1.0, 0.0,
//         0.0, 0.0, 0.3, 1.0,    1.0, 0.0, 0.0,
//         0.0, 0.3, 0.0, 1.0,   0.0, 0.0, 1.0,
//         //right side
//         0.3, 0.0, 0.0, 1.0,    1.0, 0.0, 0.0,
//         0.0, 0.0, 0.3, 1.0,   0.0, 0.0, 1.0,
//         0.0, 0.3, 0.0, 1.0,   0.0, 1.0, 0.0,
//         //bottom side 2
//         -0.3, 0.0, 0.0, 1.0,   1.0, 0.0, 0.0,
//         0.3, 0.0, 0.0, 1.0,    0.0, 1.0, 0.0,
//         0.0, 0.0, -0.3, 1.0,   0.0, 0.0, 1.0,
//         //left side 2
//         -0.3, 0.0, 0.0, 1.0,  0.0, 1.0, 0.0,
//         0.0, 0.0, -0.3, 1.0,  1.0, 0.0, 0.0,
//         0.0, 0.3, 0.0, 1.0,   0.0, 0.0, 1.0,
//         //right side 2
//         0.3, 0.0, 0.0, 1.0,    1.0, 0.0, 0.0,
//         0.0, 0.0, -0.3, 1.0,   0.0, 0.0, 1.0,
//         0.0, 0.3, 0.0, 1.0,   0.0, 1.0, 0.0,
//     ]);

//     return pyrVerts;
// }

// function makePrism() {

//     var priVerts = new Float32Array([
//         // face
//         -0.5,   0.5, 0.5, 1.0,      1.0, 0.0, 0.0,    
//         -0.5,  -0.5, 0.5, 1.0,      1.0, 0.0, 0.0,    
//         0.5,  -0.5, 0.5, 1.0,      1.0, 0.0, 0.0,  

//         -0.5,  0.5,  0.5, 1.0,      1.0, 0.1, 0.1,    
//         0.5,  0.5,  0.5, 1.0,      1.0, 0.1, 0.1,    
//         0.5, -0.5,  0.5, 1.0,      1.0, 0.1, 0.1,    

//         //face - left
//         -0.5, -0.5, 0.5, 1.0,    0.0, 1.0, 0.0,
//         -0.8, -0.5, 0.0, 1.0,    0.0, 1.0, 0.0,
//         -0.8, 0.5, 0.0, 1.0,     0.0, 1.0, 0.0,

//         -0.8,  0.5, 0.0, 1.0,    0.0, 1.0, 0.1,
//         -0.5, -0.5, 0.5, 1.0,    0.0, 1.0, 0.1,
//         -0.5,  0.5, 0.5, 1.0,    0.0, 1.0, 0.1,

//         //face - right 
//         0.5, -0.5, 0.5, 1.0,     0.0, 0.0, 1.0,
//         0.5, 0.5, 0.5, 1.0,      0.0, 0.0, 1.0,
//         0.8, -0.5, 0.0, 1.0,     0.0, 0.0, 1.0,

//         0.5, 0.5, 0.5, 1.0,      0.1, 0.0, 1.0,
//         0.8, -0.5, 0.0, 1.0,     0.1, 0.0, 1.0,
//         0.8, 0.5, 0.0, 1.0,      0.1, 0.0, 1.0, 

//         //back
//         -0.5,   0.5, -0.5, 1.0,      1.0, 0.0, 0.0,    
//         -0.5,  -0.5, -0.5, 1.0,      1.0, 0.0, 0.0,    
//         0.5,  -0.5, -0.5, 1.0,      1.0, 0.0, 0.0,  

//         -0.5,  0.5,  -0.5, 1.0,      1.0, 0.1, 0.1,    
//         0.5,  0.5,  -0.5, 1.0,      1.0, 0.1, 0.1,    
//         0.5, -0.5,  -0.5, 1.0,      1.0, 0.1, 0.1,    

//         //back - left
//         -0.5, -0.5, -0.5, 1.0,    0.0, 0.1, 1.0,
//         -0.8, -0.5, 0.0, 1.0,    0.0, 0.1, 1.0,
//         -0.8, 0.5, 0.0, 1.0,     0.0, 0.1, 1.0,

//         -0.8,  0.5, 0.0, 1.0,    0.0, 0.1, 1.0,
//         -0.5, -0.5, -0.5, 1.0,    0.0, 0.1, 1.0,
//         -0.5,  0.5, -0.5, 1.0,    0.0, 0.1, 1.0,

//         //back - right 
//         0.5, -0.5, -0.5, 1.0,     1.0, 0.0, 1.1,
//         0.5, 0.5, -0.5, 1.0,      1.0, 0.0, 1.1,
//         0.8, -0.5, 0.0, 1.0,      1.0, 0.0, 1.1,

//         0.5, 0.5, -0.5, 1.0,      1.0, 0.0, 1.1,
//         0.8, -0.5, 0.0, 1.0,      1.0, 0.0, 1.1,
//         0.8, 0.5, 0.0, 1.0,       1.0, 0.0, 1.1,

//         //bottom
//         -0.5, -0.5, 0.5, 1.0,         1.0, 1.0, 0.0,
//         0.5,  -0.5, 0.5, 1.0,         1.0, 1.0, 0.0,
//         -0.5, -0.5, -0.5,1.0,          1.0, 1.0, 0.0,

//         -0.5, -0.5, -0.5, 1.0,         1.0, 1.0, 0.1,
//         0.5, -0.5, -0.5,  1.0,        1.0, 1.0, 0.1,
//         0.5, -0.5, 0.5,   1.0,       1.0, 1.0, 0.1,

//         //bottom - left
//         -0.5, -0.5, 0.5,  1.0,        1.0, 1.0, 0.0,
//         -0.8, -0.5, 0.0,  1.0,       1.0, 1.0, 0.0,
//         -0.5, -0.5, -0.5, 1.0,        1.0, 1.0, 0.0,

//         //bottom - right
//         0.5, -0.5, 0.5,   1.0,       1.0, 1.0, 0.1,
//         0.8, -0.5, 0.0,   1.0,      1.0, 1.0, 0.1,
//         0.5, -0.5, -0.5,  1.0,       1.0, 1.0, 0.1,

//         //top
//         -0.5, 0.5, 0.5, 1.0,         1.0, 0.0, 0.0,
//         0.5,  0.5, 0.5, 1.0,         1.0, 0.0, 0.0,
//         0.0,  1.0, 0.0, 1.0,         1.0, 0.0, 0.0,

//         -0.5, 0.5, 0.5, 1.0,         0.0, 1.0, 0.0,
//         -0.8, 0.5, 0.0, 1.0,         0.0, 1.0, 0.0,
//         0.0,  1.0, 0.0, 1.0,        0.0, 1.0, 0.0,

//         -0.8, 0.5, 0.0, 1.0,         0.0, 0.1, 1.0,
//         -0.5, 0.5, -0.5, 1.0,         0.0, 0.1, 1.0,
//         0.0, 1.0, 0.0, 1.0,         0.0, 0.1, 1.0,

//         -0.5, 0.5, -0.5, 1.0,         1.0, 1.0, 0.0,
//         0.5,  0.5, -0.5, 1.0,         1.0, 1.0, 0.0,
//         0.0,  1.0, 0.0, 1.0,         1.0, 1.0, 0.0,

//         0.5, 0.5, -0.5, 1.0,         0.0, 1.0, 0.1,
//         0.8, 0.5, 0.0, 1.0,         0.0, 1.0, 0.1,
//         0.0,  1.0, 0.0, 1.0,         0.0, 1.0, 0.1,

//         0.8, 0.5, 0.0, 1.0,         1.0, 0.0, 1.0,
//         0.5, 0.5, 0.5, 1.0,         1.0, 0.0, 1.0,
//         0.0, 1.0, 0.0, 1.0,         1.0, 0.0, 1.0,
//     ]);

//     return priVerts;
// }