#version 300 es

layout(location=0) in vec2 aPosition;


out vec2 iPosition;


layout(location=1) in vec4 aGlyphBounds;
layout(location=2) in float aGlyphIndex;
layout(location=3) in vec2 aRow;
layout(location=4) in float aRowColumn;

out vec2 vUV;
out vec2 pUV;


uniform float uAtlasColumnCount;
uniform vec2 uSDFTextureSize;
uniform float uSdfItemSize;
uniform vec2 uResolution;
uniform vec2 uResolutionInPx;
uniform float uFontSize;
uniform float uDescender;
uniform float uBottomPadding;

vec2 getGlyphPosition () {
  
  float paddingLeft = 1./sqrt(uFontSize);
  
  vec4 gb = aGlyphBounds;

  vec2 pos = aPosition;
  
  vec2 fontScale = uFontSize / uResolutionInPx;
  pos.x += gb.x;
  pos.y -= uDescender;
  pos.x += paddingLeft;

  float width = gb.z - gb.x;
  float height = gb.w - gb.y;

  
  float centerShiftX = (1. - width) * .5;
  
  float centerShiftY = (1. - height) * .5;

  pos.x -= centerShiftX;
  pos.y -= centerShiftY;
  pos.y += min(0., gb.y) * height + aRow.y/uFontSize;
    
  pos *= fontScale;
  return pos;
}

vec2 getGlyphUV () {
  vec2 itemSize = uSdfItemSize / uSDFTextureSize;
  float column = mod(aGlyphIndex, uAtlasColumnCount) * itemSize.x;
  float row = floor(aGlyphIndex/uAtlasColumnCount) * itemSize.y;


  float u = mix(column, column + itemSize.x, aPosition.x);
  float v = mix(row, row + itemSize.y, aPosition.y);

  vec2 uv = vec2(u,v);
  return uv;
}


void main(){


  vec2 pos = getGlyphPosition();

  pos.y += sin(aRowColumn * 3.1415) * .1;


  gl_Position = vec4(mix(vec2(-1.), vec2(1.), pos), 0.,1.);


  vUV = getGlyphUV();
  pUV = aPosition;
}