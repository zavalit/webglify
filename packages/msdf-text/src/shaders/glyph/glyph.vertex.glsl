#version 300 es


layout(location=0) in vec2 aPosition;
layout(location=1) in vec2 aGlyphStart;
layout(location=2) in vec2 aGlyphSize;
layout(location=3) in vec2 aGlyphOffset;
layout(location=4) in float aGlyphAdvance;
layout(location=5) in float aGlyphChannel;

layout(location=6) in vec4 aAtlasBounds;

layout(location=7) in vec2 aSpaceDiffs;

out vec2 glyphUV;
out float vGlyphChannel;
out float vS;


uniform vec2 uAtlasResolution;
uniform vec2 uResolution;
uniform vec2 uResolutionInPx;
uniform float uLineHeight;
uniform float uBaseLine;
uniform vec4 uPadding;
uniform float uFontSize;

void main(){

  vec2 pos = aPosition;
  vec2 r = uResolution;
  
  //height *=  .6;
  float base = uBaseLine;
  //base *= .7;
  
  vec2 diffs = aSpaceDiffs;

  vec2 start = aGlyphStart;
  start.x += diffs.x;
  vec2 end = aGlyphStart + vec2( aGlyphSize.x, uLineHeight);
  end.x += diffs.y;
  
  float height = end.y - start.y;
  float width = end.x - start.x;
  
  
  
    
  pos = mix(start, end, pos);
  
  pos *= uFontSize/r;
  
  
  pos = mix(vec2(-1.), vec2(1.), pos);

  gl_Position = vec4(pos, 0.,1.);


  vec4 ab = aAtlasBounds;
  vec2 ar = uAtlasResolution;
  

  vec2 gpos = aPosition;
  
  // offset y
  float glyphHeight = aGlyphSize.y;
  float heightScale = height/glyphHeight; 
  
  // fix height scaling
  gpos.y *= heightScale;
  

  // move scaled pos up to the base
  gpos.y -= (1. - (base)/height) * heightScale;
    
  // offset y
  gpos.y -= aGlyphOffset.y/height * heightScale;

  // padding 
  vec2 p = uPadding.xy * .5;
  gpos.y +=  p.y / aGlyphSize.y;
  gpos.x +=  p.x / width;
  

  // diff delta
  float xSpaceDelta = (diffs.y - diffs.x)/aGlyphSize.x;
  float leftSpaceDelta = (diffs.x)/aGlyphSize.x;
  gpos.x *= 1. + xSpaceDelta;
  
  float d = leftSpaceDelta;
  gpos.x += d;

  glyphUV = mix((ab.xy)/ar, ab.zw/ar, gpos);

  
  
  
  vGlyphChannel = aGlyphChannel;
  
}