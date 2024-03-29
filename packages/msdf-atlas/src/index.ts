import chain, {VAOBufferMap, createFramebufferTexture} from '@webglify/chain'
import edgeSegmentsVertex from './shaders/edge/edge.segments.vertex.glsl'
import edgeSegmentsFragment from './shaders/edge/edge.segments.fragment.glsl'
import groupVertexShader from './shaders/edge/edge.group.vertex.glsl'
import groupFragmentShader from './shaders/edge/edge.group.fragment.glsl'



import { AtlasGlyph } from './glyph'
type W2 = WebGL2RenderingContext
type ConfigChar = {
  id: number
  index: number
  char: string
  xadvance: number
  width?: number
  height?: number
  xoffset?: number
  yoffset?: number
  chnl?: number
  x?: number
  y?: number
  page?: number
}

const vertexArrayObject  = (gl: W2, vao: WebGLVertexArrayObject, vaoMap: VAOBufferMap) => {

  
  const pb = gl.createBuffer()!;
  {
    gl.bindBuffer(gl.ARRAY_BUFFER, pb);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      0,1,
      0,0,
      1,1,
      1,0
    ]), gl.STATIC_DRAW)
    
    
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);
  
  }  

  const sb = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, sb);
  gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 4*4, 0);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribDivisor(1, 1);

  // gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 4*5, 4*4);
  // gl.enableVertexAttribArray(2);
  // gl.vertexAttribDivisor(2, 1);

  vaoMap.set(vao, {
    'position': pb,
    'segments': sb
  })

  return vao

}


const getWhitspaceConfigChar = (ag: AtlasGlyph) => {
  const glyph = ag.obtainCharData(` `)
  
  return {
    id: glyph.unicode,
    index: glyph.index,
    xadvance: glyph.advanceWidth,
    char: ` `
  }
}


const calculateCavasSize = (atlasGlyph: AtlasGlyph, charset: string[], opts: AtlasRenderOptions) => {
  
  const res = {
    width: 0,
    height: 0.
  }

  const {padding, atlasApproximateWidth} = opts

  const lineHeight = (atlasGlyph.font.ascender - atlasGlyph.font.descender) * atlasGlyph.unitPerEmFactor

  let altasCoords = []

  let prevX = [0, 0, 0, 0]
  let prevY = [0, 0, 0, 0]

  let maxHeight = 0
  charset.forEach((char, i) => { 

    const charData = atlasGlyph.obtainCharData(char)
    charData.unicode = char.charCodeAt(0)
    const channelIndex = i%4
    
    const {glyphBounds: [_x,_y,_z,_w]} = charData
    const width = _z - _x + padding
    const height = _w - _y + padding
  
    maxHeight = Math.max(maxHeight, height)
    
    const x = prevX[channelIndex];
    const y = prevY[channelIndex];
    
    const nextX = x + width     

    res.width = Math.max(nextX, res.width) 
    res.height = Math.max(y + height, res.height)

    
    if(nextX > atlasApproximateWidth) {
      prevY[channelIndex] += Math.max(lineHeight, maxHeight)
      prevX[channelIndex] = 0
      maxHeight = 0
    }else {
      prevX[channelIndex] = nextX
    }
      
    const coordsData = {channelIndex, width, height, x, y}    
    altasCoords.push({charData, coordsData})
    
  
  })

  // flip Y
  altasCoords = altasCoords.map(c => {
    const coordsData = c.coordsData
    coordsData.y = res.height - (coordsData.y + coordsData.height)
    return {...c, coordsData}
  })


  return {res, altasCoords}
}

export type AtlasRenderOptions = {
  sdfExponent: number
  padding: number
  unitPerEmFactor: number
  atlasApproximateWidth: number
  chars: string
}

export const defaultChars = "!\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~¡¢£¤¥¦§¨©ª«¬­®¯°±²³´µ¶·¸¹º»¼½¾¿ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿ"
const controlChars = ['\n', '\r', '\t'];

const defaultAtlasRenderOptions: AtlasRenderOptions = {
  sdfExponent: 10,
  padding: 50,
  unitPerEmFactor: 1.,
  atlasApproximateWidth: 1024,
  chars: defaultChars
  
}

export type AtlasInput = {
  fontUrl: string,
  options?: Partial<AtlasRenderOptions>
}


export const renderAtlas = async ({fontUrl, options}: AtlasInput) => {

  const aOptions = {...defaultAtlasRenderOptions, ...options}
  
  const atlasGlyph: AtlasGlyph = await AtlasGlyph.init(fontUrl, aOptions)
  const canvas = document.createElement('canvas')  
  const gl = canvas.getContext('webgl2', {premultipliedAlpha: false})!;
  
  const uniqueChars = new Set(aOptions.chars.split(''))
  const charset = Array.from(uniqueChars).filter(c => c!= ' ' && c!='\n' && c!='\t')
  
  const {res, altasCoords} = calculateCavasSize(atlasGlyph, charset, aOptions)

  
  const width = res.width
  const height = res.height
  const canvasWidth = width 
  const canvasHeight = height 
  canvas.width = canvasWidth
  canvas.height = canvasHeight

  
  

  const {programs} = chain(gl, [
    // single sdf target
    {
      passId: 'segments',
  //    framebuffer: [segmentsFBO.framebuffer, null],
      vertexShader: edgeSegmentsVertex,
      fragmentShader: edgeSegmentsFragment,
      vertexArrayObject,
      uniforms (gl, loc) {
        
        gl.uniform1f(loc.uExponent, aOptions.sdfExponent)
        gl.uniform1f(loc.uUnitsPerEm, atlasGlyph.font.unitsPerEm)
            
      }
     
    },
     //put together 
     {
      passId: 'atlas',
      vertexShader: groupVertexShader,
      fragmentShader: groupFragmentShader,
      //textures: [segmentsFBO.texture!],
      vertexArrayObject,
           
    } 
  ])
  
  const lineHeight = atlasGlyph.font.ascender - atlasGlyph.font.descender;// + atlasGlyph.font.tables.os2.sTypoLineGap,

  const buffer = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

  const pageId = 0;
  const pages = []
  pages[pageId] = canvas
  const p = aOptions.padding
  const config = {
    pages,
    chars: new Map(),
    info: {
      face: atlasGlyph.fontName,
      size: atlasGlyph.fontSize,
      bold: undefined,
      italic: undefined,
      charset,
      unicode: true,
      stretchH: 100,
      smooth: true,
      aa: true,
      padding: [p, p, p, p],
      spacing: [0, 0]      
    },
    common: {
      lineHeight: lineHeight * aOptions.unitPerEmFactor,
      base: atlasGlyph.font.ascender * aOptions.unitPerEmFactor,
      scaleW: width,
      scaleH: height,
      pages: 1,
      alphaChnl: 0, 
      redChnl: 0, 
      greenChnl: 0, 
      blueChnl: 0
    },
    distanceField: {
      fieldType: 'msdf',
      distanceRange: undefined
    }
  }
  // render a gpyph sprite
  altasCoords.forEach((coords, i) => { 

    const {charData, coordsData} = coords
    
    const {channelIndex, width, height, x, y} = coordsData
    const {bbox: {minX, minY}, ...glyph} = charData
    
    
    
    

    const r = channelIndex === 0
    const g = channelIndex === 1 
    const b = channelIndex === 2
    const a = channelIndex === 3

  
    const segmentsFBO = createFramebufferTexture(gl, [width, height])
    
//     // segments
    programs['segments'].chainDrawCall({frame:0, elapsedTime:0}, (gl, props) => {


      const {buffers, uniformLocations} = props
      if(!buffers) {
        throw new Error(`segments draw call pass lacks of buffer or payload data`)
      }
      
              
      const composedData = [];
//      for(let i =0, j=0; i < charData.segments.length; i+=4, j++){
//        const dist = data.segmentsDist && data.segmentsDist[j]
//        const vertexData = [
//          ...data.segmentsCoord.slice(i, i+4), 
//          dist
//        ]
//        composedData.push(...vertexData)
//      }

      gl.bindBuffer(gl.ARRAY_BUFFER, buffers.segments)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(charData.segments), gl.DYNAMIC_DRAW)


      
      gl.uniform4fv( uniformLocations.uGlyphBounds, charData.glyphBounds)
      gl.uniform2fv(uniformLocations.uItemResolution, [width, height])
      
             
      
      gl.enable(gl.BLEND)
      gl.blendFunc(gl.ONE, gl.ONE)
      gl.blendEquationSeparate(gl.FUNC_ADD, gl.MAX) 
      
      gl.colorMask(true, true, true, true)
      
       gl.viewport(0, 0, width, height)
       gl.scissor(0, 0, width, height)
      

      //gl.clear(gl.COLOR_BUFFER_BIT)
      // var viewport = gl.getParameter(gl.VIEWPORT);
      // console.log("Viewport state:", viewport);

      gl.bindFramebuffer(gl.FRAMEBUFFER, segmentsFBO.framebuffer)
      // render

      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, charData.segments.length/4)
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      
      
    })


    
    programs['atlas'].chainDrawCall({frame:0, elapsedTime:0}, (gl) => {
      gl.viewport(x, y, width, height)
      gl.bindTexture(gl.TEXTURE_2D, segmentsFBO.texture);

    
      gl.colorMask(r, g, b, a)
      gl.disable(gl.BLEND)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
          
    })
    const cc = {
      id: glyph.unicode,
      index: glyph.index,
      char: String.fromCharCode(glyph.unicode),
      width: width,
      height: height,
      xoffset: minX,
      yoffset: minY,
      xadvance: glyph.advanceWidth,
      chnl: channelIndex,
      x: x,
      y: y,
      page: pageId,
    }
    config.chars.set(cc.id, cc)


  })

  // add whitespace data
  const wsCC = getWhitspaceConfigChar(atlasGlyph)
  config.chars.set(wsCC.id, wsCC)

  return config


  

}
