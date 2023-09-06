import { ChainPassPops } from "@webglify/chain";
type W2 = WebGL2RenderingContext;
type TextPassProps = {
    text: string;
    fontUrl: string;
    viewport: {
        width: number;
        height: number;
    };
    sdfParams?: typeof defaultSdfParams;
    textMeta?: typeof defaultTextMeta;
    fragmentShader?: string;
};
type PassChainRepo = {
    pass: ChainPassPops;
    texture: WebGLTexture | null;
};
export const obtainPassChain: (gl: W2, { text, fontUrl, viewport, ...passParams }: TextPassProps) => Promise<PassChainRepo>;
export interface SDFParams {
    sdfItemSize: number;
    sdfMargin: number;
    sdfExponent: number;
}
export interface ParamsProps {
    text: string;
    fontSize: number;
    letterSpacing: number;
    sdfParams: SDFParams;
}
export interface TextCharMeta {
    sdfViewBox: number[];
    advanceWidth: number;
    xMin: number;
    yMin: number;
    xMax: number;
    yMax: number;
    fontUnitsMargin: number;
}
export type RenderTextProps = {
    charCodes: number[];
    glyphBounds: Float32Array;
    sdfItemSize: number;
    fontMeta: {
        unitsPerEm: number;
        ascender: number;
        descender: number;
        capHeight: number;
        xHeight: number;
        lineGap: number;
    };
};
export const defaultSdfParams: {
    sdfItemSize: number;
    sdfExponent: number;
};
export const defaultTextMeta: {
    fontSize: number;
    letterSpacing: number;
};
type TextMetaType = {
    text: string;
    textMeta: typeof defaultTextMeta;
    sdfParams: typeof defaultSdfParams;
    sizesMap: {
        [key: number]: [number, number, number, number, number];
    };
    fontMeta: {
        unitsPerEm: number;
        ascender: number;
        descender: number;
        capHeight: number;
        xHeight: number;
        lineGap: number;
    };
};
export const getTextMetaData: (meta: TextMetaType) => RenderTextProps;
export type ViewportType = {
    x: number;
    y: number;
    width: number;
    height: number;
};
export type ColorType = {
    r: number;
    g: number;
    b: number;
};
export const passItem: ({ glyphMapTexture, framebuffer, glyphBounds, charCodes, viewport, sdfTexture, sdfItemSize, fontMeta, shaders }: {
    glyphMapTexture: any;
    framebuffer: any;
    glyphBounds: any;
    charCodes: any;
    viewport: any;
    sdfTexture: any;
    sdfItemSize: any;
    fontMeta: any;
    shaders?: {} | undefined;
}) => ChainPassPops;
export const renderText: (gl: WebGL2RenderingContext, sdfTexture: {
    texture: HTMLCanvasElement;
}, meta: TextMetaType, viewport: ViewportType, color?: ColorType) => void;

//# sourceMappingURL=types.d.ts.map