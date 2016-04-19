//=============================================================================
// Vertex shader program
//=============================================================================
var VSHADER_SOURCE =
  //-------------Set precision.
  // GLSL-ES 2.0 defaults (from spec; '4.5.3 Default Precision Qualifiers'):
  // DEFAULT for Vertex Shaders:  precision highp float; precision highp int;
  //                                  precision lowp sampler2D; precision lowp samplerCuboid;
  // DEFAULT for Fragment Shaders:  UNDEFINED for float; precision mediump int;
  //                                  precision lowp sampler2D;   precision lowp samplerCuboid;
  //--------------- GLSL Struct Definitions:
  'struct MatlT {\n' +        // Describes one Phong material by its reflectances:
  '       vec3 emit;\n' +         // Ke: emissive -- surface 'glow' amount (r,g,b);
  '       vec3 ambi;\n' +         // Ka: ambient reflectance (r,g,b)
  '       vec3 diff;\n' +         // Kd: diffuse reflectance (r,g,b)
  '       vec3 spec;\n' +         // Ks: specular reflectance (r,g,b)
  '       int shiny;\n' +         // Kshiny: specular exponent (integer >= 1; typ. <200)
  '     };\n' +
  //                                                                
  'struct LampT {\n' +        // Describes one point-like Phong light source
  '   vec3 pos;\n' +          // (x,y,z,w); w==1.0 for local light at x,y,z position
                              // w==0.0 for distant light from x,y,z direction 
  '   vec3 ambi;\n' +         // Ia ==  ambient light source strength (r,g,b)
  '   vec3 diff;\n' +         // Id ==  diffuse light source strength (r,g,b)
  '   vec3 spec;\n' +         // Is == specular light source strength (r,g,b)
  '}; \n' +
  
  //-------------UNIFORMS: values set from JavaScript before a drawing command.
  // first light source: (YOU write a second one...)
  'uniform LampT u_LampSet[2];\n' +       // Array of all light sources.
  'uniform MatlT u_MatlSet[1];\n' +       // Array of all materials.

  'uniform vec3 u_eyePosWorld; \n' +    // Camera/eye location in world coords.
  'uniform int u_isLit;\n' +
  'uniform int u_isHeadLit;\n' +
  'uniform int u_ShadingMode;\n' +
  'uniform int u_isPhong;\n' +

  'uniform int u_TexMode;\n' +

  'uniform int u_AttMode;\n' +

  'uniform int u_isDistort;\n' +

    //-------------ATTRIBUTES of each vertex, read from our Vertex Buffer Object
  'attribute vec4 a_Position; \n' +     // vertex position (model coord sys)
  'attribute vec4 a_Normal; \n' +           // vertex normal vector (model 
  'uniform mat4 u_ProjView; \n' +
  'uniform mat4 u_ModelMatrix; \n' +        // Model matrix
  'uniform mat4 u_NormalMatrix; \n' +   // Inverse Transpose of ModelMatrix;
  
  //-------------VARYING:Vertex Shader values sent per-pixel to Fragment shader:
  'varying vec3 v_Kd; \n' +                           // Phong Lighting: diffuse reflectance
  'varying vec4 v_Position; \n' +               
  'varying vec3 v_Normal; \n' +                 // Why Vec3? its not a point, hence w==0
  'varying vec4 v_Color;\n' +

  'attribute vec2 a_TexCoord;\n' +
  'varying vec2 v_TexCoord;\n' +

  'float rand(vec2 co){\n' +
  '  return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);\n' +
  '}\n' +
    //-----------------------------------------------------------------------------
  'void main() { \n' +

  '  vec4 n_Position = a_Position;\n' +

  '  if (u_isDistort == 1) {\n' +
  '    float scale = rand(a_Position.xy);\n' +
  '    n_Position = vec4(a_Position[0]*scale, a_Position[1]*scale, a_Position[2], 1.0);\n' +
  // '    n_Position = a_Position * scale;\n' +
  '  }\n' +

  '  gl_Position = u_ProjView * u_ModelMatrix * n_Position;\n' +

  '  v_TexCoord = a_TexCoord;\n' +
  '  if (u_TexMode == 1) {\n' +
  '    return;\n' +
  '  }\n' +

  '  if (u_ShadingMode == 0 && u_TexMode != 2) {\n' +
  '    vec4 position = u_ModelMatrix * n_Position;\n' +
  '    vec3 normal = normalize((u_NormalMatrix * a_Normal).xyz); \n' +
  '    vec3 eyeDirection = normalize(u_eyePosWorld - position.xyz); \n' +

  '    vec3 emissive = vec3(0.0, 0.0, 0.0);\n' +
  '    vec3 ambient = vec3(0.0, 0.0, 0.0);\n' +
  '    vec3 diffuse = vec3(0.0, 0.0, 0.0);\n' +
  '    vec3 speculr = vec3(0.0, 0.0, 0.0);\n' +

  '    for (int i = 0; i < 2; i++) {\n' +
  '      if (u_isLit == 0 && i == 0) {\n' +
  '        continue;\n' +
  '      }\n' +
  '      if (u_isHeadLit == 0 && i == 1) {\n' +
  '        continue;\n' +
  '      }\n' +
  '      vec3 lightDirection = normalize(u_LampSet[i].pos - position.xyz);\n' +

  '      float nDotL = max(dot(lightDirection, normal), 0.0); \n' +

  '      float Att = 1.0;\n' +
  '      if (u_AttMode == 1) {\n' +
  '        Att = Att/length(u_LampSet[i].pos - v_Position.xyz);\n' +
  '      } else if (u_AttMode == 2) {\n' +
  '        Att = Att/pow(length(u_LampSet[i].pos - v_Position.xyz),2.0);\n' +
  '      }\n' +

  '      float e64 = 0.0;\n' +
  '      if (u_isPhong == 1) {\n' +
  '        vec3 R = reflect(-lightDirection, normal);\n' +
  '        float rDotV = max(dot(R, eyeDirection), 0.0);\n' +
  '        e64 = pow(rDotV, float(u_MatlSet[0].shiny));\n' +
  '      } else {\n' +
  '        vec3 H = normalize(lightDirection + eyeDirection); \n' +
  '        float nDotH = max(dot(H, normal), 0.0); \n' +
  '        e64 = pow(nDotH, float(u_MatlSet[0].shiny));\n' +
  '      }\n' +

  '      emissive += u_MatlSet[0].emit;\n' +
  '      ambient += u_LampSet[i].ambi * u_MatlSet[0].ambi;\n' +
  '      diffuse += u_LampSet[i].diff * u_MatlSet[0].diff * Att * nDotL;\n' +
  '      speculr += u_LampSet[i].spec * u_MatlSet[0].spec * Att * e64;\n' +
  '    }\n' +
  '    v_Color = vec4(emissive + ambient + diffuse + speculr , 1.0);\n' +
  '    return;\n' +
  '  }\n' +
  // else
  '  v_Position = u_ModelMatrix * n_Position; \n' +
  '  v_Normal = normalize(vec3(u_NormalMatrix * a_Normal));\n' +

  '  v_Kd = u_MatlSet[0].diff; \n' +        // find per-pixel diffuse reflectance from per-vertex
                                                    // (no per-pixel Ke,Ka, or Ks, but you can do it...)
  '}\n';

//=============================================================================
// Fragment shader program
//=============================================================================
var FSHADER_SOURCE =
  'precision highp float;\n' +
  'precision highp int;\n' +
  
  //--------------- GLSL Struct Definitions:
  'struct MatlT {\n' +        // Describes one Phong material by its reflectances:
  '       vec3 emit;\n' +         // Ke: emissive -- surface 'glow' amount (r,g,b);
  '       vec3 ambi;\n' +         // Ka: ambient reflectance (r,g,b)
  '       vec3 diff;\n' +         // Kd: diffuse reflectance (r,g,b)
  '       vec3 spec;\n' +         // Ks: specular reflectance (r,g,b)
  '       int shiny;\n' +         // Kshiny: specular exponent (integer >= 1; typ. <200)
  '     };\n' +
  //                                                                
  'struct LampT {\n' +        // Describes one point-like Phong light source
  '   vec3 pos;\n' +          // (x,y,z,w); w==1.0 for local light at x,y,z position
                              // w==0.0 for distant light from x,y,z direction 
  '   vec3 ambi;\n' +         // Ia ==  ambient light source strength (r,g,b)
  '   vec3 diff;\n' +         // Id ==  diffuse light source strength (r,g,b)
  '   vec3 spec;\n' +         // Is == specular light source strength (r,g,b)
  '}; \n' +

  'uniform LampT u_LampSet[2];\n' +       // Array of all light sources.
  'uniform MatlT u_MatlSet[1];\n' +       // Array of all materials.
  
  'uniform vec3 u_eyePosWorld; \n' +    // Camera/eye location in world coords.
  'uniform int u_isLit;\n' +
  'uniform int u_isHeadLit;\n' +
  'uniform int u_ShadingMode;\n' +
  'uniform int u_isPhong;\n' +

  'uniform int u_TexMode;\n' +

  'uniform int u_AttMode;\n' +

    //-------------VARYING:Vertex Shader values sent per-pix'''''''''''''''';el to Fragment shader: 
  'varying vec3 v_Normal;\n' +              // Find 3D surface normal at each pix
  'varying vec4 v_Position;\n' +            // pixel's 3D pos too -- in 'world' coords
  'varying vec3 v_Kd;   \n' +       

  'varying vec4 v_Color;\n' + // used for Gourand Shading

  'uniform sampler2D u_Sampler;\n' +
  'varying vec2 v_TexCoord;\n' +

  'void main() { \n' +
  '  if (u_TexMode == 1) {\n' +
  '    gl_FragColor = texture2D(u_Sampler, v_TexCoord);\n' +
  '    return;\n' +
  '  }\n' +

  '  if (u_ShadingMode == 0 && u_TexMode != 2) {\n' +
  '    gl_FragColor = v_Color;\n' +
  '    return;\n' +
  '  }\n' +
  
  '  vec3 normal = normalize(v_Normal); \n' +
  '  if (u_TexMode == 2) {\n' +
  '    normal = normalize(texture2D(u_Sampler, v_TexCoord).xyz*2.0-1.0);\n' +
  '  }\n' +

  '  vec3 eyeDirection = normalize(u_eyePosWorld - v_Position.xyz); \n' +

  '  if (u_ShadingMode == 1){\n' +

    '  vec3 emissive = vec3(0.0, 0.0, 0.0);\n' +
    '  vec3 ambient = vec3(0.0, 0.0, 0.0);\n' +
    '  vec3 diffuse = vec3(0.0, 0.0, 0.0);\n' +
    '  vec3 speculr = vec3(0.0, 0.0, 0.0);\n' +

    '  for (int i = 0; i < 2; i++) {\n' +
    '    if (u_isLit == 0 && i == 0) {\n' +
    '      continue;\n' +
    '    }\n' +
    '    if (u_isHeadLit == 0 && i == 1) {\n' +
    '      continue;\n' +
    '    }\n' +
    '    vec3 lightDirection = normalize(u_LampSet[i].pos - v_Position.xyz);\n' +

    '    float nDotL = max(dot(lightDirection, normal), 0.0); \n' +

    '    float Att = 1.0;\n' +
    '    if (u_AttMode == 1) {\n' +
    '      Att = Att/length(u_LampSet[i].pos - v_Position.xyz);\n' +
    '    } else if (u_AttMode == 2) {\n' +
    '      Att = Att/pow(length(u_LampSet[i].pos - v_Position.xyz),2.0);\n' +
    '    }\n' +

    '    float e64 = 0.0;\n' +
    '    if (u_isPhong == 1) {\n' +
    '      vec3 R = reflect(-lightDirection, normal);\n' +
    '      float rDotV = max(dot(R, eyeDirection), 0.0);\n' +
    '      e64 = pow(rDotV, float(u_MatlSet[0].shiny));\n' +
    '    } else {\n' +
    '      vec3 H = normalize(lightDirection + eyeDirection); \n' +
    '      float nDotH = max(dot(H, normal), 0.0); \n' +
    '      e64 = pow(nDotH, float(u_MatlSet[0].shiny));\n' +
    '    }\n' +

    '    emissive += u_MatlSet[0].emit;\n' +
    '    ambient += u_LampSet[i].ambi * u_MatlSet[0].ambi;\n' +
    '    diffuse += u_LampSet[i].diff * v_Kd * Att * nDotL;\n' +
    '    speculr += u_LampSet[i].spec * u_MatlSet[0].spec * Att * e64;\n' +
    '  }\n' +

    '  gl_FragColor = vec4(emissive + ambient + diffuse + speculr , 1.0);\n' +
    '  return;\n' +
  '  }\n' + // if is toon shading

  '  vec3 fragmentColor = vec3(0.0, 0.0, 0.0);\n' +
  '  vec4 specColor = vec4(1.0,1.0,1.0,1.0);\n' +

  '  for (int i = 0; i < 2; i++) {\n' +
  '    if (u_isLit == 0 && i == 0) {\n' +
  '      continue;\n' +
  '    }\n' +

  '    vec3 temp_fragmentColor = vec3(0.5, 0.5, 0.5);\n' +

  '    vec3 lightDirection = normalize(u_LampSet[i].pos - v_Position.xyz);\n' +
  '    float attenuation = 1.0/length(lightDirection);\n' +

  '    if (attenuation * max(0.0, dot(normal, lightDirection)) >= 0.1) {\n' +
  '      temp_fragmentColor = u_MatlSet[0].diff * vec3(1.0, 1.0, 1.0);\n' +
  '    }\n' +

  '    if (dot(eyeDirection, normal) < mix(0.1, 0.4, max(0.0, dot(normal, lightDirection)))) {\n' +
  '      temp_fragmentColor = u_LampSet[i].ambi * vec3(0.0,0.0,0.0);\n' +
  '    }\n' +

  '    if (dot(normal, lightDirection) > 0.0 && attenuation * pow(max(0.0, dot(reflect(-lightDirection, normal), eyeDirection)), 10.0) > 0.5) {' +
  '      temp_fragmentColor = specColor.a * u_LampSet[i].ambi * specColor.xyz + (1.0 - specColor.a) * temp_fragmentColor;\n' +
  '    }\n' +

  '    fragmentColor += temp_fragmentColor;\n' +
  '  }\n' +
  '  gl_FragColor = vec4(fragmentColor, 1.0);\n' +

  '}\n';

//=============================================================================
// REMAINING GLOBAL VARIABLES   (absorb them into objects, please!)
//=============================================================================

// global vars that contain the values we send thru those uniforms,
//  ... for our camera:
var eyePosWorld = new Float32Array([0.0, -25.0, 5.0]);  // x,y,z in world coords
var F = new Vector4(new Float32Array([0.0, 1.0, 0.0, 0.0]));
var S = new Vector4(new Float32Array([1.0, 0.0, 0.0, 0.0]));
var moveStep = 0.1;
var pitchAngleStep = 0.6;
var yawAngleStep = 0.6;

//  ... for our transforms:
var modelMatrix = new Matrix4();  // Model matrix
var projView    = new Matrix4();    // Model-view-projection matrix
var normalMatrix= new Matrix4();    // Transformation matrix for normals

//  ... for our first light source:   (stays false if never initialized)
var lamps = [];

var isLit = true;
var isHeadLit = true;
var shadingMode = 1;
var isPhong = false;

// ... for our first material:
var matlSel= MATL_RED_PLASTIC;              // see keypress(): 'm' key changes matlSel
var matl0 = new Material(matlSel);  

// Default constants for drawing vertices
var FSIZE = (new Float32Array([0.0, 0.0, 0.0])).BYTES_PER_ELEMENT;
var FLOATS_PER_VERTEX = 3;
var OFFSET_STEP = FSIZE * FLOATS_PER_VERTEX;


// Magic Pyramid
var pyramidAngle = -30;
var pyramidSpinAngle = 0;
var pyramidStep = 10;
var pyramidSpinStep = 10;
var pyramidMax = 30;

// Robot Arm
var armAngle = 0;
var armStep = 10;
var armMax = 10;

// Pearl
var pearlAngle = 0;
var pearlStep = 10;
var pearlMax = 30;

// Light
var lightMax = 20.0;
var attMode = 0;

// dat gui
var settings = {
  isLit: true,
  isHeadLit: true,
  ambient: [100, 100, 100],
  diffuse: [100, 100, 100],
  specular: [255, 255, 255],
  lightX: 6.0, 
  lightY: -5.0,
  lightZ: 10.0,
  shadingMode: 'Phong',
  isPhong: false,
  ATT: 'NONE',
};

// ---------------END of global vars----------------------------

//=============================================================================
function main() {
  // Retrieve <canvas> element
  canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  gl = getWebGLContext(canvas);
  if (!gl) {
    console.log('Failed to get the rendering context \'gl\' for WebGL');
    return;
  }

  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  var n_vcount = initVertexBuffers(gl);     // vertex count.
  if (n_vcount < 0) {
    console.log('Failed to set the vertex information: n_vcount false');
    return;
  }

  // Set texture
  if (!initTextures()) {
    console.log('Failed to intialize the texture.');
    return;
  }

  // Set the clear color and enable the depth test
  gl.clearColor(0.4, 0.4, 0.4, 1.0);
  gl.enable(gl.DEPTH_TEST);

  uLoc_eyePosWorld  = gl.getUniformLocation(gl.program, 'u_eyePosWorld');
  uLoc_ModelMatrix  = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  uLoc_ProjView    = gl.getUniformLocation(gl.program, 'u_ProjView');
  uLoc_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
  if (!uLoc_eyePosWorld ||
      !uLoc_ModelMatrix || !uLoc_ProjView || !uLoc_NormalMatrix) {
    console.log('Failed to get GPUs matrix storage locations');
    return;
  }

  for (var i = 0; i < 2; i++) {
    lamps.push(new LightsT()); 
    lamps[i].u_pos  = gl.getUniformLocation(gl.program, 'u_LampSet['+i+'].pos'); 
    lamps[i].u_ambi = gl.getUniformLocation(gl.program, 'u_LampSet['+i+'].ambi');
    lamps[i].u_diff = gl.getUniformLocation(gl.program, 'u_LampSet['+i+'].diff');
    lamps[i].u_spec = gl.getUniformLocation(gl.program, 'u_LampSet['+i+'].spec');
    if( !lamps[i].u_pos || !lamps[i].u_ambi || !lamps[i].u_diff || !lamps[i].u_spec   ) {
      console.log('Failed to get GPUs Lamps['+i+'] storage locations');
      return;
    }
  }

  u_isLit = gl.getUniformLocation(gl.program, 'u_isLit');
  if(!u_isLit) {
      console.log('Failed to get GPUs u_isLit storage locations');
      return;
  }

  u_isHeadLit = gl.getUniformLocation(gl.program, 'u_isHeadLit');
  if(!u_isLit) {
      console.log('Failed to get GPUs u_isHeadLit storage locations');
      return;
  }

  u_ShadingMode = gl.getUniformLocation(gl.program, 'u_ShadingMode');
  if(!u_ShadingMode) {
      console.log('Failed to get GPUs u_ShadingMode storage locations');
      return;
  }

  u_isPhong = gl.getUniformLocation(gl.program, 'u_isPhong');
  if(!u_isPhong) {
      console.log('Failed to get GPUs u_isPhong storage locations');
      return;
  }

  u_TexMode = gl.getUniformLocation(gl.program, 'u_TexMode');
  if(!u_TexMode) {
      console.log('Failed to get GPUs u_TexMode storage locations');
      return;
  }

  u_AttMode = gl.getUniformLocation(gl.program, 'u_AttMode');
  if(!u_AttMode) {
      console.log('Failed to get GPUs u_AttMode storage locations');
      return;
  }

  u_isDistort = gl.getUniformLocation(gl.program, 'u_isDistort');
  if(!u_isDistort) {
      console.log('Failed to get GPUs u_isDistort storage locations');
      return;
  }

  // ... for Phong material/reflectance:
  matl0.uLoc_Ke = gl.getUniformLocation(gl.program, 'u_MatlSet[0].emit');
  matl0.uLoc_Ka = gl.getUniformLocation(gl.program, 'u_MatlSet[0].ambi');
  matl0.uLoc_Kd = gl.getUniformLocation(gl.program, 'u_MatlSet[0].diff');
  matl0.uLoc_Ks = gl.getUniformLocation(gl.program, 'u_MatlSet[0].spec');
  matl0.uLoc_Kshiny = gl.getUniformLocation(gl.program, 'u_MatlSet[0].shiny');
  if(!matl0.uLoc_Ke || !matl0.uLoc_Ka || !matl0.uLoc_Kd 
                          || !matl0.uLoc_Ks || !matl0.uLoc_Kshiny
       ) {
      console.log('Failed to get GPUs Reflectance storage locations');
      return;
  }

  // Init World-coord. position & colors of first light source in global vars;
  // world light
  lamps[0].I_pos.elements.set([settings.lightX, settings.lightY, settings.lightZ]);
  var ambient = settings.ambient;
  lamps[0].I_ambi.elements.set([ambient[0]/255, ambient[1]/255, ambient[2]/255]);
  var diffuse = settings.diffuse;
  lamps[0].I_diff.elements.set([diffuse[0]/255, diffuse[1]/255, diffuse[2]/255]);
  var specular = settings.specular;
  lamps[0].I_spec.elements.set([specular[0]/255, specular[1]/255, specular[2]/255]);

  // head light
  lamps[1].I_pos.elements = eyePosWorld;
  lamps[1].I_ambi.elements.set([1.0, 1.0, 1.0]);
  lamps[1].I_diff.elements.set([1.0, 1.0, 1.0]);
  lamps[1].I_spec.elements.set([1.0, 1.0, 1.0]);

  // ( MOVED:  set the GPU's uniforms for lights and materials in draw()
  //                    function, not main(), so they ALWAYS get updated before each
  //                    on-screen re-drawing)
  
  winResize();
  setupDatgui();

  window.onkeydown = function(ev){keydown(ev, gl)};
  window.onkeyup   = function(ev){keyup(ev, gl)};

  var tick = function() {
    animate();
    draw();
    requestAnimationFrame(tick, canvas);
  };
  tick();
}

var g_last = Date.now();
function animate() {

  var now = Date.now();
  var elapsed = (now - g_last)/1000;
  g_last = now;

  // pyramid
  pyramidAngle += pyramidStep * elapsed;
  if (Math.abs(pyramidAngle) > pyramidMax) {
    pyramidStep = -pyramidStep;
  }
  pyramidSpinAngle += pyramidSpinStep;
  pyramidSpinAngle %= 360;

  // robot arm
  armAngle += armStep * elapsed;
  if (Math.abs(armAngle) > armMax) {
    armStep = -armStep;
  }

  // pearl
  pearlAngle += pearlStep * elapsed;
  if (Math.abs(pearlAngle) > pearlMax) {
    pearlStep = -pearlStep;
  }

  // camera roaming
  for (var i = 0; i < keys.length; i++) {
    if (keys[i] != true) {
      continue;
    }
    switch(i) {
    case 87: // w: move forward
      moveForward();
      break;
    case 83: // s: move backward
      moveBackward();
      break;
    case 65: // a: move left
      moveLeft();
      break;
    case 68: // d: move right
      moveRight();
      break;
    case 37: // left arrow: rotate left
      rotateLeft();
      break;
    case 39: // right arrow: rotate right
      rotateRight();
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

  lamps[1].I_pos.elements = eyePosWorld;
}

function draw() {
//-------------------------------------------------------------------------------
  // Send fresh 'uniform' values to the GPU:

  // Clear color and depth buffer
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Position the camera in world coordinates:
  gl.uniform3fv(uLoc_eyePosWorld, eyePosWorld);

  //---------------For the light source(s):
  gl.uniform1i(u_isLit, isLit);
  gl.uniform1i(u_isHeadLit, isHeadLit);
  gl.uniform1i(u_ShadingMode, shadingMode);
  gl.uniform1i(u_isPhong, isPhong);
  gl.uniform1i(u_AttMode, attMode);
  for (var i = 0; i < 2; i++) {
    gl.uniform3fv(lamps[i].u_pos,  lamps[i].I_pos.elements.slice(0,3));
    gl.uniform3fv(lamps[i].u_ambi, lamps[i].I_ambi.elements);       // ambient
    gl.uniform3fv(lamps[i].u_diff, lamps[i].I_diff.elements);       // diffuse
    gl.uniform3fv(lamps[i].u_spec, lamps[i].I_spec.elements);       // Specular
  }
  
  // Viewport
  gl.viewport(0, 0, canvas.width, canvas.height);
  var aspect = canvas.width/canvas.height;

  //----------------For the Matrices: find the model matrix:
  // Calculate the view projection matrix
  projView.setPerspective(40, aspect, 1, 100);
  projView.lookAt( eyePosWorld[0], eyePosWorld[1], eyePosWorld[2],
                   eyePosWorld[0] + F.elements[0], 
                   eyePosWorld[1] + F.elements[1],
                   eyePosWorld[2] + F.elements[2],  
                   0, 0, 1);
  gl.uniformMatrix4fv(uLoc_ProjView, false, projView.elements);

  drawGround();
  drawMagicPyramid();
  drawRobotArm();
  drawPearl();  
  drawTexture();
  drawDistortBall();
  drawBumpMap();
}

function drawGround() {
  //---------------For the Material object(s):
  matl0.setMatl(MATL_GRN_PLASTIC);
  gl.uniform3fv(matl0.uLoc_Ke, matl0.K_emit.slice(0,3));              // Ke emissive
  gl.uniform3fv(matl0.uLoc_Ka, matl0.K_ambi.slice(0,3));              // Ka ambient
  gl.uniform3fv(matl0.uLoc_Kd, matl0.K_diff.slice(0,3));                // Kd   diffuse
  gl.uniform3fv(matl0.uLoc_Ks, matl0.K_spec.slice(0,3));              // Ks specular
  gl.uniform1i(matl0.uLoc_Kshiny, parseInt(matl0.K_shiny, 10));     // Kshiny 
  
  modelMatrix.setIdentity();

  normalMatrix.setInverseOf(modelMatrix);
  normalMatrix.transpose();

  gl.uniformMatrix4fv(uLoc_ModelMatrix, false, modelMatrix.elements);
  gl.uniformMatrix4fv(uLoc_NormalMatrix, false, normalMatrix.elements);

  gl.drawArrays(gl.TRIANGLE_STRIP, 
                groundStart/FLOATS_PER_VERTEX,
                groundCount/FLOATS_PER_VERTEX);
}

function drawMagicPyramid() {
  //---------------For the Material object(s):
  matl0.setMatl(MATL_BLU_PLASTIC);
  gl.uniform3fv(matl0.uLoc_Ke, matl0.K_emit.slice(0,3));              // Ke emissive
  gl.uniform3fv(matl0.uLoc_Ka, matl0.K_ambi.slice(0,3));              // Ka ambient
  gl.uniform3fv(matl0.uLoc_Kd, matl0.K_diff.slice(0,3));                // Kd   diffuse
  gl.uniform3fv(matl0.uLoc_Ks, matl0.K_spec.slice(0,3));              // Ks specular
  gl.uniform1i(matl0.uLoc_Kshiny, parseInt(matl0.K_shiny, 10));     // Kshiny 

  // Pyramid 1
  modelMatrix.setTranslate(-5, 5, 0); 
  // Calculate the matrix to transform the normal based on the model matrix
  normalMatrix.setInverseOf(modelMatrix);
  normalMatrix.transpose();

  // Send the new matrix values to their locations in the GPU:
  gl.uniformMatrix4fv(uLoc_ModelMatrix, false, modelMatrix.elements);
  gl.uniformMatrix4fv(uLoc_NormalMatrix, false, normalMatrix.elements);

  // Draw the sphere
  gl.drawArrays(gl.TRIANGLES, 
                pyramidStart/FLOATS_PER_VERTEX,
                pyramidCount/FLOATS_PER_VERTEX);

  // Pyramid 2
  modelMatrix.rotate(pyramidAngle, 0, 1, 0);
  modelMatrix.translate(0, 0, 1); 
  modelMatrix.rotate(pyramidSpinAngle, 0, 0, 1);
  // Calculate the matrix to transform the normal based on the model matrix
  normalMatrix.setInverseOf(modelMatrix);
  normalMatrix.transpose();

  // Send the new matrix values to their locations in the GPU:
  gl.uniformMatrix4fv(uLoc_ModelMatrix, false, modelMatrix.elements);
  gl.uniformMatrix4fv(uLoc_NormalMatrix, false, normalMatrix.elements);

  // Draw the sphere
  gl.drawArrays(gl.TRIANGLES, 
                pyramidStart/FLOATS_PER_VERTEX,
                pyramidCount/FLOATS_PER_VERTEX);

  // Pyramid 3
  modelMatrix.rotate(pyramidAngle, 0, 1, 0);
  modelMatrix.translate(0, 0, 1); 
  modelMatrix.rotate(-pyramidSpinAngle, 0, 0, 1);
  // Calculate the matrix to transform the normal based on the model matrix
  normalMatrix.setInverseOf(modelMatrix);
  normalMatrix.transpose();

  // Send the new matrix values to their locations in the GPU:
  gl.uniformMatrix4fv(uLoc_ModelMatrix, false, modelMatrix.elements);
  gl.uniformMatrix4fv(uLoc_NormalMatrix, false, normalMatrix.elements);

  // Draw the sphere
  gl.drawArrays(gl.TRIANGLES, 
                pyramidStart/FLOATS_PER_VERTEX,
                pyramidCount/FLOATS_PER_VERTEX);
}

function drawRobotArm() {
  //---------------For the Material object(s):
  matl0.setMatl(MATL_BRONZE_SHINY);
  gl.uniform3fv(matl0.uLoc_Ke, matl0.K_emit.slice(0,3));              // Ke emissive
  gl.uniform3fv(matl0.uLoc_Ka, matl0.K_ambi.slice(0,3));              // Ka ambient
  gl.uniform3fv(matl0.uLoc_Kd, matl0.K_diff.slice(0,3));                // Kd   diffuse
  gl.uniform3fv(matl0.uLoc_Ks, matl0.K_spec.slice(0,3));              // Ks specular
  gl.uniform1i(matl0.uLoc_Kshiny, parseInt(matl0.K_shiny, 10));     // Kshiny 

  // Cuboid 1
  modelMatrix.setTranslate(0, 20, 2); 
  // Calculate the matrix to transform the normal based on the model matrix
  normalMatrix.setInverseOf(modelMatrix);
  normalMatrix.transpose();

  // Send the new matrix values to their locations in the GPU:
  gl.uniformMatrix4fv(uLoc_ModelMatrix, false, modelMatrix.elements);
  gl.uniformMatrix4fv(uLoc_NormalMatrix, false, normalMatrix.elements);

  // Draw the sphere
  gl.drawArrays(gl.TRIANGLE_STRIP, 
                cuboidStart/FLOATS_PER_VERTEX,
                cuboidCount/FLOATS_PER_VERTEX);

  modelMatrix.translate(0, 0, 2); 
  pushMatrix(modelMatrix);

  // right arm
  modelMatrix.rotate(30 + armAngle, 0, 1, 0);
  modelMatrix.scale(0.5, 0.5, 0.5);
  modelMatrix.translate(0.5, 0, 2); 
  // Calculate the matrix to transform the normal based on the model matrix
  normalMatrix.setInverseOf(modelMatrix);
  normalMatrix.transpose();

  // Send the new matrix values to their locations in the GPU:
  gl.uniformMatrix4fv(uLoc_ModelMatrix, false, modelMatrix.elements);
  gl.uniformMatrix4fv(uLoc_NormalMatrix, false, normalMatrix.elements);

  // Draw the sphere
  gl.drawArrays(gl.TRIANGLE_STRIP, 
                cuboidStart/FLOATS_PER_VERTEX,
                cuboidCount/FLOATS_PER_VERTEX);

  // finger
  modelMatrix.translate(0, 0, 2);
  modelMatrix.rotate(-40 + armAngle, 0, 1, 0);
  modelMatrix.translate(0, 0, 2); 
  // Calculate the matrix to transform the normal based on the model matrix
  normalMatrix.setInverseOf(modelMatrix);
  normalMatrix.transpose();

  // Send the new matrix values to their locations in the GPU:
  gl.uniformMatrix4fv(uLoc_ModelMatrix, false, modelMatrix.elements);
  gl.uniformMatrix4fv(uLoc_NormalMatrix, false, normalMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP, 
                cuboidStart/FLOATS_PER_VERTEX,
                cuboidCount/FLOATS_PER_VERTEX);

  // return to end of arm
  modelMatrix = popMatrix();
  
  pushMatrix(modelMatrix);

  // left arm
  modelMatrix.rotate(-30 - armAngle, 0, 1, 0);
  modelMatrix.scale(0.5, 0.5, 0.5);
  modelMatrix.translate(-0.5, 0, 2); 
  // Calculate the matrix to transform the normal based on the model matrix
  normalMatrix.setInverseOf(modelMatrix);
  normalMatrix.transpose();

  // Send the new matrix values to their locations in the GPU:
  gl.uniformMatrix4fv(uLoc_ModelMatrix, false, modelMatrix.elements);
  gl.uniformMatrix4fv(uLoc_NormalMatrix, false, normalMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP, 
                cuboidStart/FLOATS_PER_VERTEX,
                cuboidCount/FLOATS_PER_VERTEX);

  // finger
  modelMatrix.translate(0, 0, 2);
  modelMatrix.rotate(40 - armAngle, 0, 1, 0);
  modelMatrix.translate(0, 0, 2); 
  // Calculate the matrix to transform the normal based on the model matrix
  normalMatrix.setInverseOf(modelMatrix);
  normalMatrix.transpose();

  // Send the new matrix values to their locations in the GPU:
  gl.uniformMatrix4fv(uLoc_ModelMatrix, false, modelMatrix.elements);
  gl.uniformMatrix4fv(uLoc_NormalMatrix, false, normalMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP, 
                cuboidStart/FLOATS_PER_VERTEX,
                cuboidCount/FLOATS_PER_VERTEX);

  modelMatrix = popMatrix();
}

function drawPearl() {
  //---------------For the Material object(s):
  matl0.setMatl(MATL_RED_PLASTIC);
  gl.uniform3fv(matl0.uLoc_Ke, matl0.K_emit.slice(0,3));              // Ke emissive
  gl.uniform3fv(matl0.uLoc_Ka, matl0.K_ambi.slice(0,3));              // Ka ambient
  gl.uniform3fv(matl0.uLoc_Kd, matl0.K_diff.slice(0,3));                // Kd   diffuse
  gl.uniform3fv(matl0.uLoc_Ks, matl0.K_spec.slice(0,3));              // Ks specular
  gl.uniform1i(matl0.uLoc_Kshiny, parseInt(matl0.K_shiny, 10));     // Kshiny 

  // Sphere 1
  modelMatrix.setTranslate(10, 5, 1); 
  // Calculate the matrix to transform the normal based on the model matrix
  normalMatrix.setInverseOf(modelMatrix);
  normalMatrix.transpose();

  // Send the new matrix values to their locations in the GPU:
  gl.uniformMatrix4fv(uLoc_ModelMatrix, false, modelMatrix.elements);
  gl.uniformMatrix4fv(uLoc_NormalMatrix, false, normalMatrix.elements);

  // Draw the sphere
  gl.drawArrays(gl.TRIANGLE_STRIP, 
                sphereStart/FLOATS_PER_VERTEX,
                sphereCount/FLOATS_PER_VERTEX);

  // Sphere 2
  //----------------For the Matrices: find the model matrix:
  modelMatrix.rotate(pearlAngle, 0, 1, 0);
  modelMatrix.translate(0, 0, 2);
  // Calculate the matrix to transform the normal based on the model matrix
  normalMatrix.setInverseOf(modelMatrix);
  normalMatrix.transpose();

  // Send the new matrix values to their locations in the GPU:
  gl.uniformMatrix4fv(uLoc_ModelMatrix, false, modelMatrix.elements);
  gl.uniformMatrix4fv(uLoc_NormalMatrix, false, normalMatrix.elements);

  // Draw the sphere
  gl.drawArrays(gl.TRIANGLE_STRIP, 
                sphereStart/FLOATS_PER_VERTEX,
                sphereCount/FLOATS_PER_VERTEX);

  // Sphere 3
  //----------------For the Matrices: find the model matrix:
  modelMatrix.rotate(pearlAngle, 0, 1, 0);
  modelMatrix.translate(0, 0, 2);
  // Calculate the matrix to transform the normal based on the model matrix
  normalMatrix.setInverseOf(modelMatrix);
  normalMatrix.transpose();

  // Send the new matrix values to their locations in the GPU:
  gl.uniformMatrix4fv(uLoc_ModelMatrix, false, modelMatrix.elements);
  gl.uniformMatrix4fv(uLoc_NormalMatrix, false, normalMatrix.elements);

  // Draw the sphere
  gl.drawArrays(gl.TRIANGLE_STRIP, 
                sphereStart/FLOATS_PER_VERTEX,
                sphereCount/FLOATS_PER_VERTEX);
}

function drawTexture() {

  modelMatrix.setTranslate(0, -1, 1);
  // Calculate the matrix to transform the normal based on the model matrix
  normalMatrix.setInverseOf(modelMatrix);
  normalMatrix.transpose();

  gl.uniform1i(u_TexMode, 1);

  // Send the new matrix values to their locations in the GPU:
  gl.uniformMatrix4fv(uLoc_ModelMatrix, false, modelMatrix.elements);
  gl.uniformMatrix4fv(uLoc_NormalMatrix, false, normalMatrix.elements);

  // Draw the sphere
  gl.drawArrays(gl.TRIANGLE_STRIP, 
                cubeStart/FLOATS_PER_VERTEX,
                cubeCount/FLOATS_PER_VERTEX);

  gl.uniform1i(u_TexMode, 0);
}

function drawBumpMap() {

  modelMatrix.setTranslate(3, -8, 1);
  // Calculate the matrix to transform the normal based on the model matrix
  normalMatrix.setInverseOf(modelMatrix);
  normalMatrix.transpose();

  gl.uniform1i(u_TexMode, 2);

  // Send the new matrix values to their locations in the GPU:
  gl.uniformMatrix4fv(uLoc_ModelMatrix, false, modelMatrix.elements);
  gl.uniformMatrix4fv(uLoc_NormalMatrix, false, normalMatrix.elements);

  // Draw the sphere
  gl.drawArrays(gl.TRIANGLE_STRIP, 
                cubeStart/FLOATS_PER_VERTEX,
                cubeCount/FLOATS_PER_VERTEX);

  gl.uniform1i(u_TexMode, 0);
}

function drawDistortBall() {

  gl.uniform1i(u_isDistort, true);

  //---------------For the Material object(s):
  matl0.setMatl(MATL_EMERALD);
  gl.uniform3fv(matl0.uLoc_Ke, matl0.K_emit.slice(0,3));              // Ke emissive
  gl.uniform3fv(matl0.uLoc_Ka, matl0.K_ambi.slice(0,3));              // Ka ambient
  gl.uniform3fv(matl0.uLoc_Kd, matl0.K_diff.slice(0,3));                // Kd   diffuse
  gl.uniform3fv(matl0.uLoc_Ks, matl0.K_spec.slice(0,3));              // Ks specular
  gl.uniform1i(matl0.uLoc_Kshiny, parseInt(matl0.K_shiny, 10));     // Kshiny 

  modelMatrix.setTranslate(-10, 3, 2);
  // Calculate the matrix to transform the normal based on the model matrix
  normalMatrix.setInverseOf(modelMatrix);
  normalMatrix.transpose();

  // Send the new matrix values to their locations in the GPU:
  gl.uniformMatrix4fv(uLoc_ModelMatrix, false, modelMatrix.elements);
  gl.uniformMatrix4fv(uLoc_NormalMatrix, false, normalMatrix.elements);

  // Draw the sphere
  gl.drawArrays(gl.TRIANGLE_STRIP, 
                sphereStart/FLOATS_PER_VERTEX,
                sphereCount/FLOATS_PER_VERTEX);

  gl.uniform1i(u_isDistort, false);
}

function initVertexBuffers(gl) { // Create a sphere
//-------------------------------------------------------------------------------
  
  // var ground = makeGround();
  var ground = makeGround();
  var pyramid = makePyramid();
  var cuboid = makeCuboid();
  var sphere = makeSphere();
  var cube = makeCube();

  var offset = 0;

  groundStart = offset;
  groundCount = ground.positions.length;
  offset += groundCount;

  pyramidStart = offset;
  pyramidCount = pyramid.positions.length;
  offset += pyramidCount;

  cuboidStart = offset;
  cuboidCount = cuboid.positions.length;
  offset += cuboidCount;

  sphereStart = offset;
  sphereCount = sphere.positions.length;
  offset += sphereCount;

  cubeStart = offset;
  cubeCount = cube.positions.length;
  offset += cubeCount;

  var input = [
    ground.positions,
    pyramid.positions,
    cuboid.positions,
    sphere.positions,
    cube.positions,
  ];
  var positions = [];
  for (var i=0; i<input.length; ++i) {
    var current = input[i];
    for (var j=0; j<current.length; ++j)
      positions.push(current[j]);
  }

  var input = [
    ground.normals,
    pyramid.normals,
    cuboid.normals,
    sphere.normals,
    cube.normals,
  ];
  var normals = [];
  for (var i=0; i<input.length; ++i) {
    var current = input[i];
    for (var j=0; j<current.length; ++j)
      normals.push(current[j]);
  }

  // Create texCoords where all other shapes except cube filled with 0
  var texCoords = [];
  for (var i = 0; i < positions.length/FLOATS_PER_VERTEX; i++) {
    texCoords.push(0, 0);
  }

  var texOffset = cubeStart/FLOATS_PER_VERTEX;
  for (var i = 0;
           i < cubeCount/FLOATS_PER_VERTEX;
           i++) {
    texCoords[(i+texOffset)*2] = cube.texCoords[i * 2];
    texCoords[(i+texOffset)*2+1] = cube.texCoords[i*2+1];
  }

  // Write the vertex property to buffers (coordinates and normals)
  // Use the same data for each vertex and its normal because the sphere is
  // centered at the origin, and has radius of 1.0.
  // We create two separate buffers so that you can modify normals if you wish.
  if (!initArrayBuffer(gl, 'a_Position', new Float32Array(positions), gl.FLOAT, 3)) return -1;
  if (!initArrayBuffer(gl, 'a_Normal', new Float32Array(normals), gl.FLOAT, 3))  return -1;
  if (!initArrayBuffer(gl, 'a_TexCoord', new Float32Array(texCoords), gl.FLOAT, 2))  return -1;
  // Unbind the buffer object
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  return positions.length/FLOATS_PER_VERTEX;
}

function initArrayBuffer(gl, attribute, data, type, num) {
//-------------------------------------------------------------------------------
  // Create a buffer object
  var buffer = gl.createBuffer();
  if (!buffer) {
    console.log('Failed to create the buffer object');
    return false;
  }
  // Write date into the buffer object
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  // Assign the buffer object to the attribute variable
  var a_attribute = gl.getAttribLocation(gl.program, attribute);
  if (a_attribute < 0) {
    console.log('Failed to get the storage location of ' + attribute);
    return false;
  }
  gl.vertexAttribPointer(a_attribute, num, type, false, 0, 0);
  // Enable the assignment of the buffer object to the attribute variable
  gl.enableVertexAttribArray(a_attribute);

  return true;
}

function initTextures() {
  var texture = gl.createTexture();   // Create a texture object
  if (!texture) {
    console.log('Failed to create the texture object');
    return false;
  }

  // Get the storage location of u_Sampler
  var u_Sampler = gl.getUniformLocation(gl.program, 'u_Sampler');
  if (!u_Sampler) {
    console.log('Failed to get the storage location of u_Sampler');
    return false;
  }
  var image = new Image();  // Create the image object
  if (!image) {
    console.log('Failed to create the image object');
    return false;
  }
  // Register the event handler to be called on loading an image
  image.onload = function(){ loadTexture(texture, u_Sampler, image); };
  // Tell the browser to load an image
  // image.src = 'bumpmap.jpg';
  image.src = 'data:image/jpeg;base64,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';

  return true;
}

function loadTexture(texture, u_Sampler, image) {

  console.log('load texture');

  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1); // Flip the image's y axis
  // Enable texture unit0
  gl.activeTexture(gl.TEXTURE0);
  // Bind the texture object to the target
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Set the texture parameters
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  // Set the texture image
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);

  // Set the texture unit 0 to the sampler
  gl.uniform1i(u_Sampler, 0);
}

function makeGround() {

  var length = 100;
  var div = 20;
  var height = 2;

  var step = length/div;

  var positions = [];
  var normals = [];
  var count = 0;
  var p1, p2;
  for (var i = 0; i < div; i++) {
    var x = i * step;
    for (var j = 0; j < div * 2; j++) {
      if (j % 2 == 0) {
        var xx = -length/2 + x;
        var yy = -length/2 + j * step;
        if (i % 2 == 1) {
          yy = -yy;
        }
        var dist = Math.sqrt(xx*xx + yy*yy);
        var zz = Math.sin(dist)*height;
        // var zz = 0;
        positions.push(xx, yy, zz);
      } else {
        var xx = -length/2 + x + step;
        var yy = -length/2 + (j-1) * step;
        if (i % 2 == 1) {
          yy = -yy;
        }
        var dist = Math.sqrt(xx*xx + yy*yy);
        var zz = Math.sin(dist)*height;
        // var zz = 0;
        positions.push(xx, yy, zz);
      }
      count++;
      if (count == 3) {
        p1 = positions.slice((count-3)*3, (count-2)*3);
        p2 = positions.slice((count-2)*3, (count-1)*3);
        var p3 = positions.slice((count-1)*3, (count)*3);
        var v1 = new Vector3([p1[0]-p3[0], p1[1]-p3[1], p1[2]-p3[2]]);
        var v2 = new Vector3([p2[0]-p3[0], p2[1]-p3[1], p2[2]-p3[2]]);
        var normal = v1.crossMultiply(v2);
        if (normal[2] < 0) {
          normal[0] = -normal[0];
          normal[1] = -normal[1];
          normal[2] = -normal[2];
        }
        normals.push(normal[0], normal[1], normal[2]);
        normals.push(normal[0], normal[1], normal[2]);
        normals.push(normal[0], normal[1], normal[2]);
        p1 = p2;
        p2 = p3;
      } else if (count > 3) {
        var p3 = positions.slice((count-1)*3, (count)*3);
        var v1 = new Vector3([p1[0]-p3[0], p1[1]-p3[1], p1[2]-p3[2]]);
        var v2 = new Vector3([p2[0]-p3[0], p2[1]-p3[1], p2[2]-p3[2]]);
        var normal = v1.crossMultiply(v2);
        if (normal[2] < 0) {
          normal[0] = -normal[0];
          normal[1] = -normal[1];
          normal[2] = -normal[2];
        }
        normals.push(normal[0], normal[1], normal[2]);
      }
    }
  }

  return {positions: positions, normals: normals};
}

function makePyramid() {

  var positions = [
  // sides
     0,  0,  1,
     1,  0,  0,
     0,  1,  0,

     0,  0,  1,
     0,  1,  0,
    -1,  0,  0,

     0,  0,  1,
    -1,  0,  0,
     0, -1,  0,

     0,  0,  1,
     0, -1,  0,
     1,  0,  0,
  // base
     1,  0,  0,
     0,  1,  0,
    -1,  0,  0,

    -1,  0,  0,
     0, -1,  0,
     1,  0,  0,
  ];

  var normals = [
  // sides
     1,  1,  1,
     1,  1,  1,
     1,  1,  1,

    -1,  1,  1,
    -1,  1,  1,
    -1,  1,  1,

    -1, -1,  1,
    -1, -1,  1,
    -1, -1,  1,

     1, -1,  1,
     1, -1,  1,
     1, -1,  1,
  // base
     0,  0, -1,
     0,  0, -1,
     0,  0, -1,

     0,  0, -1,
     0,  0, -1,
     0,  0, -1,
  ];

  return {positions: positions, normals: normals};
}

function makeCuboid() {
  var positions = [
  // top
     1/2,  1/2,  2,
     1/2, -1/2,  2, 
    -1/2,  1/2,  2,
    -1/2, -1/2,  2,
  // back
     1/2,  1/2, -2,
     1/2,  1/2,  2,
    -1/2,  1/2, -2, 
    -1/2,  1/2,  2,
  // right
     1/2, -1/2,  2,
     1/2, -1/2, -2, 
     1/2,  1/2,  2,
     1/2,  1/2, -2,
  // front
     1/2, -1/2, -2,
     1/2, -1/2,  2,
    -1/2, -1/2, -2, 
    -1/2, -1/2,  2,
  // left
    -1/2, -1/2, -2,
    -1/2, -1/2,  2,
    -1/2,  1/2, -2,
    -1/2,  1/2,  2,
  // bottom
     1/2,  1/2, -2,
     1/2, -1/2, -2, 
    -1/2,  1/2, -2,
    -1/2, -1/2, -2,
  ];

  var normals = [
  // top
     0,  0,  1,
     0,  0,  1,
     0,  0,  1,
     0,  0,  1,
  // back
     0,  1,  0,
     0,  1,  0,
     0,  1,  0,
     0,  1,  0,
  // right
     1,  0,  0,
     1,  0,  0,
     1,  0,  0,
     1,  0,  0,
  // front
     0, -1,  0,
     0, -1,  0,
     0, -1,  0,
     0, -1,  0,
  // left
    -1,  0,  0,
    -1,  0,  0,
    -1,  0,  0,
    -1,  0,  0,
  // bottom
     0,  0, -1, 
     0,  0, -1, 
     0,  0, -1, 
     0,  0, -1, 
  ];

  return {positions:positions, normals:normals};
}

function makeCube() {

  // var positions = [
  // // top
  //    1,  1,  1,
  //    1, -1,  1, 
  //   -1,  1,  1,
  //   -1, -1,  1,
  // // left
  //   -1,  1,  1,
  //   -1,  1, -1,
  //   -1, -1,  1,
  //   -1, -1, -1,
  // // front
  //   -1, -1,  1,
  //   -1, -1, -1,
  //    1, -1,  1,
  //    1, -1, -1,
  // // right
  //    1, -1,  1,
  //    1, -1, -1,
  //    1,  1,  1,
  //    1,  1, -1,
  // // back
  //    1,  1,  1,
  //   -1,  1,  1,
  //    1,  1, -1,
  //   -1,  1, -1,
  // // bottom
  //    1,  1, -1,
  //   -1,  1, -1,
  //    1, -1, -1,
  //   -1, -1, -1,
  // ];

  // var texCoords = [
  // // top
  //    1, 1,
  //    1, 0,
  //    0, 1,
  //    0, 0,
  // // left
  //    1, 1,
  //    1, 0,
  //    0, 1,
  //    0, 0,
  // // front
  //    1, 1,
  //    1, 0,
  //    0, 1,
  //    0, 0,
  // // right
  //    1, 1,
  //    1, 0,
  //    0, 1,
  //    0, 0,
  // // back
  //    1, 1,
  //    1, 0,
  //    0, 1,
  //    0, 0,
  // // bottom
  //    1, 1,
  //    1, 0,
  //    0, 1,
  //    0, 0,
  // ];

  // var normals = [
  // // top
  //    0,  0,  1,
  //    0,  0,  1,
  //    0,  0,  1,
  //    0,  0,  1,
  // // left
  //   -1,  0,  0,
  //   -1,  0,  0,
  //   -1,  0,  0,
  //   -1,  0,  0,
  // // front
  //    0, -1,  0,
  //    0, -1,  0,
  //    0, -1,  0,
  //    0, -1,  0,
  // // right
  //    1,  0,  0,
  //    1,  0,  0,
  //    1,  0,  0,
  //    1,  0,  0,
  // // back
  //    0,  1,  0,
  //    0,  1,  0,
  //    0,  1,  0,
  //    0,  1,  0,
  // // bottom
  //    0,  0, -1, 
  //    0,  0, -1, 
  //    0,  0, -1, 
  //    0,  0, -1, 
  // ];

  var positions = [
  // top
     1,  1,  1,
     1, -1,  1, 
    -1,  1,  1,
    -1, -1,  1,
  // back
     1,  1, -1,
     1,  1,  1,
    -1,  1, -1, 
    -1,  1,  1,
  // right
     1, -1,  1,
     1, -1, -1, 
     1,  1,  1,
     1,  1, -1,
  // front
     1, -1, -1,
     1, -1,  1,
    -1, -1, -1, 
    -1, -1,  1,
  // left
    -1, -1, -1,
    -1, -1,  1,
    -1,  1, -1,
    -1,  1,  1,
  // bottom
     1,  1, -1,
     1, -1, -1, 
    -1,  1, -1,
    -1, -1, -1,
  ];

  var texCoords = [
  // top
     1, 1,
     1, 0,
     0, 1,
     0, 0,
  // left
     1, 1,
     1, 0,
     0, 1,
     0, 0,
  // front
     1, 1,
     1, 0,
     0, 1,
     0, 0,
  // right
     1, 1,
     1, 0,
     0, 1,
     0, 0,
  // back
     1, 1,
     1, 0,
     0, 1,
     0, 0,
  // bottom
     1, 1,
     1, 0,
     0, 1,
     0, 0,
  ];

  var normals = [
  // top
     0,  0,  1,
     0,  0,  1,
     0,  0,  1,
     0,  0,  1,
  // back
     0,  1,  0,
     0,  1,  0,
     0,  1,  0,
     0,  1,  0,
  // right
     1,  0,  0,
     1,  0,  0,
     1,  0,  0,
     1,  0,  0,
  // front
     0, -1,  0,
     0, -1,  0,
     0, -1,  0,
     0, -1,  0,
  // left
    -1,  0,  0,
    -1,  0,  0,
    -1,  0,  0,
    -1,  0,  0,
  // bottom
     0,  0, -1, 
     0,  0, -1, 
     0,  0, -1, 
     0,  0, -1, 
  ];

  return {positions:positions, normals:normals, texCoords: texCoords};
}

function makeSphere() {

    var radius = 1;
    var slices = 15; // # of slice to form sphere
    var sliceVerts = 27; // # of vertices to form `circle'
    var sliceAngle = Math.PI/slices;

    // # of vertices to form sphere
    // each slice need 2n vertices, except for the first and last one
    var sphVerts = new Float32Array((slices*sliceVerts*2-2)*FLOATS_PER_VERTEX);

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
        for (v = isFirst; v < sliceVerts*2-isLast; v++, j+=FLOATS_PER_VERTEX) {
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
    }
  }

  return {positions: sphVerts, normals: sphVerts};
}

var keys = []; // Or you could call it "key"
keyup = keydown = function(ev, gl){

    keys[ev.keyCode] = ev.type == 'keydown';
}

function moveForward() {
  var dx = F.elements[0] * moveStep;
  var dy = F.elements[1] * moveStep;
  var dz = F.elements[2] * moveStep;
  eyePosWorld[0] += dx;
  eyePosWorld[1] += dy;
  eyePosWorld[2] += dz;
}

function moveBackward() {
  var dx = F.elements[0] * moveStep;
  var dy = F.elements[1] * moveStep;
  var dz = F.elements[2] * moveStep;
  eyePosWorld[0] -= dx;
  eyePosWorld[1] -= dy;
  eyePosWorld[2] -= dz;
}

function moveLeft() {
  var dx = S.elements[0] * moveStep;
  var dy = S.elements[1] * moveStep;
  var dz = S.elements[2] * moveStep;
  eyePosWorld[0] -= dx;
  eyePosWorld[1] -= dy;
  eyePosWorld[2] -= dz;
}

function moveRight() {
  var dx = S.elements[0] * moveStep;
  var dy = S.elements[1] * moveStep;
  var dz = S.elements[2] * moveStep;
  eyePosWorld[0] += dx;
  eyePosWorld[1] += dy;
  eyePosWorld[2] += dz;
}

function rotateLeft() {
  var mat = new Matrix4();
  mat.setRotate(yawAngleStep, 0.0, 0.0, 1.0);
  F = mat.multiplyVector4(F);
  S = mat.multiplyVector4(S);
}

function rotateRight() {
  var mat = new Matrix4();
  mat.setRotate(-yawAngleStep, 0.0, 0.0, 1.0);
  F = mat.multiplyVector4(F);
  S = mat.multiplyVector4(S);
}

function tiltDown() {
  var mat = new Matrix4();
  mat.setRotate(-pitchAngleStep, S.elements[0], S.elements[1], S.elements[2]);
  F = mat.multiplyVector4(F);
}

function tiltUp() {
  var mat = new Matrix4();
  mat.setRotate(pitchAngleStep, S.elements[0], S.elements[1], S.elements[2]);
  F = mat.multiplyVector4(F);
}

function winResize() {
  canvas.width = window.innerWidth-300;
  canvas.height = window.innerHeight-20;
  draw();
}

function setupDatgui() {

    var gui = new dat.GUI({autoPlace: false});
    var container = document.getElementById('datgui');
    container.appendChild(gui.domElement);

    gui.add(settings, 'isLit').onChange(function(value) {
      isLit = value;
    });

    gui.add(settings, 'isHeadLit').onChange(function(value) {
      isHeadLit = value;
    });

    gui.addColor(settings, 'ambient').onChange(function(value) {
      lamps[0].I_ambi.elements.set([value[0]/255, value[1]/255, value[2]/255]);
    });

    gui.addColor(settings, 'diffuse').onChange(function(value) {
      lamps[0].I_diff.elements.set([value[0]/255, value[1]/255, value[2]/255]);
    });

    gui.addColor(settings, 'specular').onChange(function(value) {
      lamps[0].I_spec.elements.set([value[0]/255, value[1]/255, value[2]/255]);
    });

    gui.add(settings, 'lightX', -lightMax, lightMax).onChange(function(value) {
      lamps[0].I_pos.elements[0] = value;
    });

    gui.add(settings, 'lightY', -lightMax, lightMax).onChange(function(value) {
      lamps[0].I_pos.elements[1] = value;
    });

    gui.add(settings, 'lightZ', -lightMax, lightMax).onChange(function(value) {
      lamps[0].I_pos.elements[2] = value;
    });
    
    gui.add(settings, 'shadingMode', ['Gourand', 'Phong', 'Toon']).onChange(function(value) {
      shadingMode = ['Gourand', 'Phong', 'Toon'].indexOf(value);
    });

    gui.add(settings, 'isPhong').onChange(function(value) {
      isPhong = value;
    });

    gui.add(settings, 'ATT', ['NONE', '1/dist', '1/dist2']).onChange(function(value) {
      if (value == 'NONE') {
        attMode = 0;
      } else if (value == '1/dist') {
        attMode = 1;
      } else {
        attMode = 2;
      }
    });
}