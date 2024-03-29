#version 300 es

precision highp float;
uniform sampler2D tex;

in vec2 vUV;

uniform vec2 uResolution;
uniform float uXOffset;
uniform float uXScale;
uniform float uYScale;

out vec4 fragColor;

// Main shader pass left us "counts" of directional segment crossings in the red+green channels; used as
// a "winding number", these values being unequal indicates a point inside the glyph. This pass will just
// use that to flip the distance value from the alpha channel across the midpoint to give us a "signed" value.

void main() {

  
  
  vec4 color = texture(tex, vUV);
  bool inside = color.r != color.g;
  float val = inside ? 1.0 - color.a : color.a;
  
  color = vec4(val);

  //color.r = 0.;
  //color.a = 1.;
  
  fragColor = color;

  
}
