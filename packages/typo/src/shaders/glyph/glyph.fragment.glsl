#version 300 es

precision mediump float;

out vec4 fragColor;

in vec2 glyphUV;
in vec2 textUV;
in float vChannel;
in vec4 vGlyphBounds;

uniform sampler2D uTexture0;
uniform highp vec2 uResolution;
uniform float uMaxGylphX;
uniform vec3 uColor;



void main () {

  vec2 border = vec2(.5);

  vec2 uv = glyphUV;
  
  float mask = texture(uTexture0, uv).a;
  if(vChannel == 0.){
    mask = texture(uTexture0, uv).r;
  }
  if(vChannel == 1.){
    mask = texture(uTexture0, uv).g;
  }
  if(vChannel == 2.){
    mask = texture(uTexture0, uv).b;
  }
  
  float d = fwidth(mask);
  float edge = smoothstep(border.x - d, border.y - d*.05, mask);
  
  vec3 color = uColor * edge;
  
  
  vec4 gb = vGlyphBounds;

  float textWidth = uMaxGylphX;

  float glyphBox = step(gb.x/textWidth, textUV.x);

  //  glyphBox = min(glyphBox,1. - step(gb.z/textWidth, textUV.x));

  //  if(vChannel == 0.){    
  //    color.r += glyphBox;
  //  }
  //  if(vChannel == 1.){
  //    color.g += glyphBox;
  //  }
  
  // if(vChannel == 2.){
  //   color.b += glyphBox;
  // }
  // if(vChannel == 3.){
  //   color.rgb -= glyphBox;
  // }
  
  // fragColor = vec4(color, max(edge,glyphBox * .3));
  fragColor = vec4(color, edge);

  //fragColor.xy = textUV;
  //fragColor.w += .5;

  
}