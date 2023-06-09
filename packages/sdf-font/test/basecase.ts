import {getTexture} from '../src'
import {renderText, getTextMetaData} from  '../src/text'
import fontUrl from 'url:./Roboto/Roboto-Regular.ttf'


export class Api {

    canvas: HTMLCanvasElement
    gl: WebGL2RenderingContext

    constructor(canvas: HTMLCanvasElement, options?: WebGLContextAttributes) {
        
        this.canvas = canvas
        
        const gl = this.canvas.getContext('webgl2', options)!
        
        if(gl === null) {
            throw new Error('webgl2 is not supported')
        }
        
        this.gl = gl;
        
    }
    
    static init(canvas?: HTMLCanvasElement, options?: WebGLContextAttributes) {
        
        if (!canvas) {
            canvas = document.createElement('canvas')
        }
        
        return new Api(canvas, options)

    }
}

const textApiWhite = Api.init(undefined)
const textApiRed = Api.init(undefined)

const [width, height] = [300, 300]

const devicePixelRatio = Math.min(window.devicePixelRatio, 2)
textApiWhite.canvas.width = width * devicePixelRatio
textApiWhite.canvas.height = height * devicePixelRatio

textApiWhite.canvas.style.width = `${width}`
textApiWhite.canvas.style.height = `${height}`

const [widthR, heightR] = [450, 100]
textApiRed.canvas.setAttribute('id', 'red')
textApiRed.canvas.width = widthR * devicePixelRatio
textApiRed.canvas.height = heightR * devicePixelRatio


textApiRed.canvas.style.width = `${widthR}`
textApiRed.canvas.style.height = `${heightR}`

document.body.prepend(textApiWhite.canvas)
document.body.prepend(textApiRed.canvas)


let text = 'qqwddsdlksldk sdlksdl ';
//text = 'Apyl'

const texts = [
    
]

const alphabet = [...Array(256).keys()].map(k => String.fromCodePoint(k))


const sdfSize = 64;

(async() => {

    
    const  chars = alphabet.toString()
    
    const sdfGlyphSize = 64
    const sdfParams = {
    sdfGlyphSize,
    sdfMargin: 1/sdfGlyphSize,
    sdfExponent: 9
    }

    const fontParams = {
    fontSize: .6,
    letterSpacing: 1.
    }
    const params = {...sdfParams, ...fontParams}



    const sdfTexture = await getTexture(fontUrl, chars, sdfParams)

    document.body.appendChild(sdfTexture.texture)




    // render text
    const meta = getTextMetaData(sdfTexture.fontData, {...params, text})
    const viewport = {x:0, y:0, width: width * devicePixelRatio, height: height * devicePixelRatio}
    renderText(textApiWhite.gl, sdfTexture, meta, viewport)
    viewport.width =  widthR * devicePixelRatio
    viewport.height =  heightR * devicePixelRatio

    renderText(textApiRed.gl, sdfTexture, meta, viewport)

    // var image = textureApi.canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");  // here is the most important part because if you dont replace you will get a DOM 18 exception.

    // window.location.href=image; 
    

})()


