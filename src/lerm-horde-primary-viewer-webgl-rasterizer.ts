import type { HillPrimaryViewerActorDrawFrame } from './terrain/hill-primary-viewer-actor-host.js';

export const LERM_HORDE_PRIMARY_VIEWER_WEBGL_RASTERIZER_ROUTE =
  'lerms/lerm-horde/primary-viewer-webgl-rasterizer-v0' as const;

export interface LermHordePrimaryViewerActorRasterizer {
  route: typeof LERM_HORDE_PRIMARY_VIEWER_WEBGL_RASTERIZER_ROUTE;
  render(
    frame: HillPrimaryViewerActorDrawFrame,
    positions: Float32Array,
  ): CanvasImageSource;
}

export function createLermHordePrimaryViewerWebglRasterizer(): LermHordePrimaryViewerActorRasterizer {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2', {
    alpha: true,
    antialias: true,
    depth: true,
    premultipliedAlpha: true,
    preserveDrawingBuffer: false,
  });
  requireRasterizer(
    gl !== null,
    'exact Horde actor requires the official WebGL2 rasterizer',
  );
  const program = createProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER);
  const positionBuffer = gl.createBuffer();
  requireRasterizer(
    positionBuffer !== null,
    'exact Horde actor position buffer is unavailable',
  );
  const positionLocation = gl.getAttribLocation(program, 'a_position');
  requireRasterizer(
    positionLocation >= 0,
    'exact Horde actor position attribute is unavailable',
  );
  const uniforms = {
    yaw: uniform(gl, program, 'u_yaw'),
    tilt: uniform(gl, program, 'u_tilt'),
    zoom: uniform(gl, program, 'u_zoom'),
    pan: uniform(gl, program, 'u_pan'),
    viewport: uniform(gl, program, 'u_viewport'),
    terrainLength: uniform(gl, program, 'u_terrain_length'),
  };

  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.disable(gl.CULL_FACE);

  return {
    route: LERM_HORDE_PRIMARY_VIEWER_WEBGL_RASTERIZER_ROUTE,
    render(frame, positions) {
      validateRasterInput(frame, positions);
      const backingWidth = Math.max(
        1,
        Math.floor(frame.viewport.width * frame.viewport.pixelRatio),
      );
      const backingHeight = Math.max(
        1,
        Math.floor(frame.viewport.height * frame.viewport.pixelRatio),
      );
      if (
        canvas.width !== backingWidth ||
        canvas.height !== backingHeight
      ) {
        canvas.width = backingWidth;
        canvas.height = backingHeight;
      }
      gl.viewport(0, 0, backingWidth, backingHeight);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW);
      gl.uniform1f(uniforms.yaw, frame.view.yaw);
      gl.uniform1f(uniforms.tilt, frame.view.tilt);
      gl.uniform1f(uniforms.zoom, frame.view.zoom);
      gl.uniform2f(uniforms.pan, frame.view.panX, frame.view.panY);
      gl.uniform2f(
        uniforms.viewport,
        frame.viewport.width,
        frame.viewport.height,
      );
      gl.uniform1f(
        uniforms.terrainLength,
        inferTerrainLength(frame),
      );
      gl.drawArrays(gl.TRIANGLES, 0, positions.length / 3);
      return canvas;
    },
  };
}

function inferTerrainLength(
  frame: HillPrimaryViewerActorDrawFrame,
): number {
  const projectedOrigin = frame.project({ x: 0, y: 0, z: 0 });
  const projectedUnit = frame.project({ x: 0, y: 0, z: 1 });
  const yawCos = Math.cos(frame.view.yaw);
  const depthDelta = projectedUnit.depth - projectedOrigin.depth;
  requireRasterizer(
    Number.isFinite(depthDelta) &&
      Math.abs(depthDelta - yawCos) <= 1e-4,
    'WebGL actor rasterizer projection does not match Hill camera authority',
  );
  // The canonical Horde Hill route is explicitly 15 world units long.
  // Projection parity above prevents this route-bound value from silently
  // being applied to a different camera law.
  return 15;
}

function validateRasterInput(
  frame: HillPrimaryViewerActorDrawFrame,
  positions: Float32Array,
): void {
  requireRasterizer(
    positions instanceof Float32Array &&
      positions.length >= 9 &&
      positions.length % 9 === 0 &&
      Number.isFinite(frame?.viewport?.width) &&
      frame.viewport.width > 0 &&
      Number.isFinite(frame.viewport.height) &&
      frame.viewport.height > 0 &&
      Number.isFinite(frame.viewport.pixelRatio) &&
      frame.viewport.pixelRatio > 0 &&
      Object.values(frame.view).every(Number.isFinite),
    'WebGL actor rasterizer requires a complete exact actor frame',
  );
}

function createProgram(
  gl: WebGL2RenderingContext,
  vertexSource: string,
  fragmentSource: string,
): WebGLProgram {
  const program = gl.createProgram();
  requireRasterizer(program !== null, 'WebGL actor program is unavailable');
  gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, vertexSource));
  gl.attachShader(
    program,
    compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource),
  );
  gl.linkProgram(program);
  requireRasterizer(
    gl.getProgramParameter(program, gl.LINK_STATUS) === true,
    `WebGL actor program link failed: ${gl.getProgramInfoLog(program) ?? 'unknown'}`,
  );
  return program;
}

function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string,
): WebGLShader {
  const shader = gl.createShader(type);
  requireRasterizer(shader !== null, 'WebGL actor shader is unavailable');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  requireRasterizer(
    gl.getShaderParameter(shader, gl.COMPILE_STATUS) === true,
    `WebGL actor shader compile failed: ${gl.getShaderInfoLog(shader) ?? 'unknown'}`,
  );
  return shader;
}

function uniform(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  name: string,
): WebGLUniformLocation {
  const location = gl.getUniformLocation(program, name);
  requireRasterizer(
    location !== null,
    `WebGL actor uniform ${name} is unavailable`,
  );
  return location;
}

function requireRasterizer(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) throw new Error(message);
}

const VERTEX_SHADER = `#version 300 es
precision highp float;
in vec3 a_position;
uniform float u_yaw;
uniform float u_tilt;
uniform float u_zoom;
uniform vec2 u_pan;
uniform vec2 u_viewport;
uniform float u_terrain_length;
out vec3 v_world;

void main() {
  float yawCos = cos(u_yaw);
  float yawSin = sin(u_yaw);
  float rotatedX = a_position.x * yawCos - a_position.z * yawSin;
  float rotatedZ = a_position.x * yawSin + a_position.z * yawCos;
  float zn = (rotatedZ + u_terrain_length * 0.5) / u_terrain_length;
  float perspective = (0.42 + (1.0 - zn) * 0.5) * u_zoom;
  float scaleX = min(u_viewport.x / 16.0, u_viewport.y / 11.0) * perspective;
  float screenX = u_viewport.x * (0.5 + u_pan.x) + rotatedX * scaleX;
  float screenY = u_viewport.y * (0.9 + u_pan.y)
    - zn * u_viewport.y * 0.68 * u_tilt
    - a_position.y * 42.0 * perspective;
  vec2 clip = vec2(
    screenX / u_viewport.x * 2.0 - 1.0,
    1.0 - screenY / u_viewport.y * 2.0
  );
  gl_Position = vec4(clip, clamp(zn, 0.0, 1.0) * 2.0 - 1.0, 1.0);
  v_world = a_position;
}
`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec3 v_world;
out vec4 outColor;

void main() {
  vec3 normal = normalize(cross(dFdx(v_world), dFdy(v_world)));
  vec3 lightDirection = normalize(vec3(-0.35, 0.82, -0.45));
  float light = abs(dot(normal, lightDirection));
  vec3 darkRed = vec3(0.39, 0.055, 0.105);
  vec3 litRed = vec3(0.78, 0.105, 0.19);
  outColor = vec4(mix(darkRed, litRed, 0.25 + light * 0.75), 1.0);
}
`;
