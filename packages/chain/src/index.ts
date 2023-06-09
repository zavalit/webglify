
type UniformSignature = (gl:WebGL2RenderingContext, prog: WebGLProgram) => () => void
type DrawData = {drawData: any, buffer: WebGLBuffer}

type WebGLFactoryPops = {
  vertexShader: string;
  fragmentShader: string;
  canvasWidth?: number;
  canvasHeight?: number;
  devicePixelRatio?: number;
  textures?: WebGLTexture[]
  vertices?: Float32Array
  indices?: Uint16Array,
  name?: string,
  addVertexData?: (gl:WebGL2RenderingContext) => WebGLVertexArrayObject
  addBlend?: (gl:WebGL2RenderingContext) => void
  addUniformData?: UniformSignature
  addUniformBufferObjects?:(gl:WebGL2RenderingContext, prog: WebGLProgram) => () => void
  addFramebuffer?: (gl:WebGL2RenderingContext) => [WebGLFramebuffer, WebGLTexture]
  drawCall?: (gl:WebGL2RenderingContext, data?: DrawData) => void
};

type ProgramsMapType = {
  [name: string]: {
    prog: WebGLProgram,
    nextDataDrawCall: (time: number, data?: DrawData) => void
  }
}

type ChainDrawProps = {
  performance: {
    last_60: number [],
    avg: number,
    max?: number
  }[]
  renderFrame: (time: number) => void
  programs: ProgramsMapType
}

const MOUSE_COORDS = {
  x: 0,
  y: 0,
  z: 0,
}


export default (
  gl: WebGL2RenderingContext,
  callsProps: WebGLFactoryPops[]
) => {


  // Check for the extension support
  const ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
  if (!ext) {
    // The extension is not supported
    console.warn('EXT_disjoint_timer_query_webgl2 extension is not supported.');
  }
  
  const calls = callsProps.map(({ vertexShader, fragmentShader, devicePixelRatio=2, ...props }, index:number) => {


    const name = props.name || `program_${index}`
   
  
    const specifyCanvasSize = () => {
      if (!props.canvasWidth || !props.canvasHeight) return
      const width = props.canvasWidth;
      const height = props.canvasHeight;
      const canvas = gl.canvas as HTMLCanvasElement;
      canvas.style.width = width.toString();
      canvas.style.height = height.toString();
      canvas.width = width * devicePixelRatio;
      canvas.height = height * devicePixelRatio;
  
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    };
  
    specifyCanvasSize();
  
  
    const listenToMouseMove = (ev: MouseEvent)=> {
  
      const {top, bottom, left} =  (gl.canvas as HTMLCanvasElement).getBoundingClientRect()
      const height = bottom - top;
      const fromTop = ev.clientY - top;
      MOUSE_COORDS.x = (left - ev.clientX) * devicePixelRatio
      MOUSE_COORDS.y = (fromTop - height) * devicePixelRatio
      
    }
  
  
    const prog = createProgramm(gl, {vertexShader, fragmentShader})
  
    gl.useProgram(prog);
  
  
    // provide attributes and uniforms
    const vao = props.addVertexData 
    ? props.addVertexData(gl) 
    : addDefaultVertexData(gl)

    
    props.indices && addIndices(gl, props.indices)
  
    const u1 = gl.getUniformLocation(prog, "uResolution");
    gl.uniform2fv(u1, [gl.drawingBufferWidth, gl.drawingBufferHeight]);
    const u2 = gl.getUniformLocation(prog, "uTime");
    gl.uniform1f(u2, 0);
    const u3 = gl.getUniformLocation(prog, "uMouse");
    gl.uniform2fv(u3, [MOUSE_COORDS.x, MOUSE_COORDS.y]);
    const u4 = gl.getUniformLocation(prog, "uDpr");
    gl.uniform1f(u4, devicePixelRatio);
  
    
    const applyUniform = props.addUniformData 
    ? props.addUniformData(gl, prog)
    : () => undefined

    const applyUniformBufferObjects = props.addUniformBufferObjects
    ? props.addUniformBufferObjects(gl, prog)
    : () => undefined
    
    // Textures
    const textures: any[] = []
    props.textures && props.textures.forEach((texture: WebGLTexture, i: number) => {
      const name =  `uTexture${i}`
      const textureLocation = gl.getUniformLocation(prog, name);
      
      
      textures.push(() => {
        gl.uniform1i(textureLocation, i);  
        gl.activeTexture(gl.TEXTURE0 + i);  
        gl.bindTexture(gl.TEXTURE_2D, texture);

      })
      
    })

    const prepareDrawCall = (time: number, query?: WebGLQuery) => {
      if(query) {
        // Start the timer query
        gl.beginQuery(ext.TIME_ELAPSED_EXT, query);
      }
      
      gl.useProgram(prog)
      gl.bindVertexArray(vao)
      
      props.addBlend && props.addBlend(gl)

      textures.forEach(t => t())
      
      
      gl.uniform1f(u2, time);
      gl.uniform2fv(u3, [MOUSE_COORDS.x, MOUSE_COORDS.y]);
  

      applyUniform()
      applyUniformBufferObjects()
    }
    
  
    const nextDrawCall = (time: number, query?: WebGLQuery) => {

      prepareDrawCall(time, query)
  
      props.drawCall 
      ? props.drawCall(gl)
      : drawDefaultCall(gl)
  
      
      if(query) {
        //End the timer query
        gl.endQuery(ext.TIME_ELAPSED_EXT);

        // Wait for the query to become available
        //gl.finish();

        // Get the query result
        function checkQueryResult() {
          // Check if the query result is available
          const available = gl.getQueryParameter(query!, gl.QUERY_RESULT_AVAILABLE);
          const disjoint = gl.getParameter(ext.GPU_DISJOINT_EXT);
        
          if (available && !disjoint) {
            // Get the elapsed time in nanoseconds
            const timeElapsed = gl.getQueryParameter(query!, gl.QUERY_RESULT);
            const ms = timeElapsed / 1000000;
            const last_60 =  [...chainDraw.performance[index].last_60.slice(-59), ms]
            const {sum, max} = last_60.reduce((a, b) => ({
              sum: a.sum + b, 
              max: b > a.max ? b : a.max
            }), {sum:0, max:0});
            const avg = (sum / last_60.length) || 0;

            chainDraw.performance[index] = {
              last_60,
              avg,
              max  
            }
          } else {
            // The query result is not available or the GPU is disjointed
           // console.log('draw pass', index, 'Query result is not available or the GPU is disjointed.');
        
            // Check again in the next frame
            requestAnimationFrame(checkQueryResult);
          }
        }
        
        // Call the function to start checking for the query result asynchronously
        checkQueryResult();
      }
      
    };

    const nextDataDrawCall = (time: number, data: DrawData) => {
      

      if(!props.drawCall) {
        console.warn('define own drawCall, since you are using custom draw data')
        return
      } 
      
      prepareDrawCall(time)
      props.drawCall(gl, data)
      
    }
  
    // listeners
    window.addEventListener("resize", specifyCanvasSize, false);
    window.addEventListener("mousemove", listenToMouseMove, false)
  
    return {
      nextDrawCall,
      nextDataDrawCall,
      program: {name, prog}
    };
  });




  let currentPerformanceIndex = 0
  const chainDraw: ChainDrawProps = {
    performance: calls.map(_ => ({
      last_60: [],
      avg: 0
    })),
    programs: calls.reduce((acc, {nextDataDrawCall, program: {name, prog}}) => {
        return {...acc, [name]: {
          nextDataDrawCall, prog
        }}
    }, {}),
    renderFrame: function (time: number){

      
      const query = gl.createQuery()!;
      
      calls.forEach((c, index) => {
     
        // Perform the draw call 
        c.nextDrawCall(time, index === currentPerformanceIndex && query);   

      
      })      
      currentPerformanceIndex = (currentPerformanceIndex + 1) % calls.length

    }
    

    
  }

  return chainDraw

}





 


function loadImage(url: string, callback: (i:HTMLImageElement) => void) {
  const image = new Image();
  image.src = url;
  image.onload = () => callback(image);
  return image;
}


function createTexture(gl: WebGL2RenderingContext, image: TexImageSource, settings?: (gl:WebGL2RenderingContext, image: TexImageSource) => void) {
  
  const texture = gl.createTexture();

  gl.bindTexture(gl.TEXTURE_2D, texture);

  settings && settings(gl, image) || (() => {
  
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    // Set texture parameters
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  
  })()
  
  gl.bindTexture(gl.TEXTURE_2D, null)

  return  texture;

}

export const createFramebuffer = (gl:WebGL2RenderingContext, { width, height} : {width: number, height: number}) => {
    // Create a framebuffer
    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    
    // Create a texture to render to
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    
    
    // Attach the texture to the framebuffer
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    
    // Check if the framebuffer is complete
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
        throw new Error('Framebuffer is not complete');
    }
  
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null)
    return {
      framebuffer,
      texture
    }
}


export const createProgramm = (gl: WebGL2RenderingContext, {vertexShader, fragmentShader}: {vertexShader: string, fragmentShader: string}): WebGLProgram => {
   // initiaize program and attach shaders
   const prog = gl.createProgram()!;

   const attachShader = (shaderType: number, shaderSource: string) => {
     const shader = gl.createShader(shaderType)!;
     gl.shaderSource(shader, shaderSource);
     gl.compileShader(shader);
     if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(`${shaderType}: ${gl.getShaderInfoLog(shader)}`);       
     }
     gl.attachShader(prog, shader);
   };
 
   attachShader(gl.VERTEX_SHADER, vertexShader);
   attachShader(gl.FRAGMENT_SHADER, fragmentShader);
   gl.linkProgram(prog);
   if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(prog)?.toString());
   }
   return prog
}



export const loadTexture = (gl: WebGL2RenderingContext, url: string) => new Promise((res, _) => loadImage(url, image => res(createTexture(gl, image))));

export const loadSVGTexture = (gl: WebGL2RenderingContext, svgString: string) => {
  const svgDataUrl = 'data:image/svg+xml;base64,' + btoa(svgString);
  return loadTexture(gl, svgDataUrl);
}

export const convertCanvasTexture = (gl: WebGL2RenderingContext, canvas: HTMLCanvasElement) => {
  // TODO
  // check safari and eventauly fix with context.getImageData(0, 0, context.canvas.width, context.canvas.height);

  return createTexture(gl, canvas);
}



const addDefaultVertexData = (gl: WebGL2RenderingContext) => {

    const vao = gl.createVertexArray()
    gl.bindVertexArray(vao)
    // Create the buffer and load the tree vertices
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, 1,
      -1, -1,
      1, 1,
      1, -1
    ]), gl.STATIC_DRAW);

    // Set up the vertex attribute pointers
    const location = 0
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);

    return vao;

}

const drawDefaultCall = (gl: WebGL2RenderingContext) => {

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    
}

const addIndices = (gl: WebGL2RenderingContext, indices: Uint16Array) => {

  // Create the element buffer and load the tree indices
  const indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
}