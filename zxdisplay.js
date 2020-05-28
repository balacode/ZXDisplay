// -----------------------------------------------------------------------------
// ZX Spectrum Display Simulator                                  [zxdisplay.js]
// (c) balarabe@protonmail.com                                      License: MIT
// -----------------------------------------------------------------------------

// # ZXDisplay Object:
// # Internal Constants
// # Display State
//
// # Context Method
//   context(canvasId)
//
// # Drawing Methods
//   clearScreenDithered(context)
//   drawChar(context, line, col, ch)
//   drawCharset(context)
//   drawText(context, line, col, text)
//   randomizeArea(line, col, lines, cols)
//
// # Display Update Methods
//   update(_)
//   updateArea(context, line, col, lines, cols)
//
// # ZXDisplay End
//
// # Loader
//   drawAll()

// -----------------------------------------------------------------------------
// # ZXDisplay Object:

const ZXDisplay = (() => {

// Display resolution:
const COLUMNS = 32;  // number of text columns (& horizontal colour attributes)s
const LINES = 24;    // number of text lines (and vertical colour attributes)
const XMAX = 256;    // horizontal resolution
const YMAX = 192;    // vertical resolution

const my = {

    // Public Constants:
    //
    // These are the 15 colours the ZX Spectrum can display:
    //
    // Normal Colours:
    BLACK:     0,
    BLUE:      1,
    RED:       2,
    MAGENTA:   3,
    GREEN:     4,
    CYAN:      5,
    YELLOW:    6,
    WHITE:     7,
    //
    // Bright Colours:
    //         8            <- unused: bright black is same as black
    BRBLUE:    9,
    BRRED:     10,
    BRMAGENTA: 11,
    BRGREEN:   12,
    BRCYAN:    13,
    BRYELLOW:  14,
    BRWHITE:   15,

    // Constants:
    COLUMNS: COLUMNS,
    LINES: LINES,
    XMAX: XMAX,
    YMAX: YMAX,

    // Public Property:
    context: context,

    // Public Methods:
    clearScreenDithered: clearScreenDithered,
    drawChar: drawChar,
    drawCharset: drawCharset,
    drawText: drawText,
    randomizeArea: randomizeArea,
    update: update,
    updateArea: updateArea
}; //                                                                         my

// -----------------------------------------------------------------------------
// # Internal Constants

const CHARSIZE = 8;  // each character is 8 pixels high and wide
const SCALE = 3;     // one Spectrum pixel is so many pixels on modern displays

const COLOUR_BYTES = COLUMNS * LINES;
const PIXEL_BYTES = XMAX * YMAX / 8;  // 8 pixels per byte

// Maps ZX Spectrum colour indexes to 4-byte RGBA pixels used on the canvas
// (add 8 to the colour index to get the bright colour value)
const COLOUR_PIXELS = [
    //
    // Normal Colours:     R     G     B     ALPHA
    new Uint8ClampedArray([0x00, 0x00, 0x00, 0xFF]),  // 0  BLACK
    new Uint8ClampedArray([0x00, 0x00, 0xD7, 0xFF]),  // 1  BLUE
    new Uint8ClampedArray([0xD7, 0x00, 0x00, 0xFF]),  // 2  RED
    new Uint8ClampedArray([0xD7, 0x00, 0xD7, 0xFF]),  // 3  MAGENTA
    new Uint8ClampedArray([0x00, 0xD7, 0x00, 0xFF]),  // 4  GREEN
    new Uint8ClampedArray([0x00, 0xD7, 0xD7, 0xFF]),  // 5  CYAN
    new Uint8ClampedArray([0xD7, 0xD7, 0x00, 0xFF]),  // 6  YELLOW
    new Uint8ClampedArray([0xD7, 0xD7, 0xD7, 0xFF]),  // 7  WHITE
    //
    // Bright Colours:     R     G     B     ALPHA
    new Uint8ClampedArray([0x00, 0x00, 0x00, 0xFF]),  //  8 (8+0) BLACK
    new Uint8ClampedArray([0x00, 0x00, 0xFF, 0xFF]),  //  9 (8+1) BRBLUE
    new Uint8ClampedArray([0xFF, 0x00, 0x00, 0xFF]),  // 10 (8+2) BRRED
    new Uint8ClampedArray([0xFF, 0x00, 0xFF, 0xFF]),  // 11 (8+3) BRMAGENTA
    new Uint8ClampedArray([0x00, 0xFF, 0x00, 0xFF]),  // 12 (8+4) BRGREEN
    new Uint8ClampedArray([0x00, 0xFF, 0xFF, 0xFF]),  // 13 (8+5) BRCYAN
    new Uint8ClampedArray([0xFF, 0xFF, 0x00, 0xFF]),  // 14 (8+6) BRYELLOW
    new Uint8ClampedArray([0xFF, 0xFF, 0xFF, 0xFF])   // 15 (8+7) BRWHITE
];

// The ZX Spectrum character set as it is found in its ROM, starting
// from address 3D00. Each character is an 8 x 8 grid of pixels.
// Each byte/line represents a row of pixels of the character.
const CHARSET = new Uint8ClampedArray([
           //
           // @ROM  BINARY    HEX   ASCII CHAR
           //
    0x00,  // 3D00  00000000  0x20  ' '
    0x00,  // 3D01  00000000
    0x00,  // 3D02  00000000
    0x00,  // 3D03  00000000
    0x00,  // 3D04  00000000
    0x00,  // 3D05  00000000
    0x00,  // 3D06  00000000
    0x00,  // 3D07  00000000
    //
    0x00,  // 3D08  00000000  0x21  '!'
    0x10,  // 3D09  00010000
    0x10,  // 3D0A  00010000
    0x10,  // 3D0B  00010000
    0x10,  // 3D0C  00010000
    0x00,  // 3D0D  00000000
    0x10,  // 3D0E  00010000
    0x00,  // 3D0F  00000000
    //
    0x00,  // 3D10  00000000  0x22  '"'
    0x24,  // 3D11  00100100
    0x24,  // 3D12  00100100
    0x00,  // 3D13  00000000
    0x00,  // 3D14  00000000
    0x00,  // 3D15  00000000
    0x00,  // 3D16  00000000
    0x00,  // 3D17  00000000
    //
    0x00,  // 3D18  00000000  0x23  '#'
    0x24,  // 3D19  00100100
    0x7E,  // 3D1A  01111110
    0x24,  // 3D1B  00100100
    0x24,  // 3D1C  00100100
    0x7E,  // 3D1D  01111110
    0x24,  // 3D1E  00100100
    0x00,  // 3D1F  00000000
    //
    0x00,  // 3D20  00000000  0x24  '$'
    0x08,  // 3D21  00001000
    0x3E,  // 3D22  00111110
    0x28,  // 3D23  00101000
    0x3E,  // 3D24  00111110
    0x0A,  // 3D25  00001010
    0x3E,  // 3D26  00111110
    0x08,  // 3D27  00001000
    //
    0x00,  // 3D28  00000000  0x25  '%'
    0x62,  // 3D29  01100010
    0x64,  // 3D2A  01100100
    0x08,  // 3D2B  00001000
    0x10,  // 3D2C  00010000
    0x26,  // 3D2D  00100110
    0x46,  // 3D2E  01000110
    0x00,  // 3D2F  00000000
    //
    0x00,  // 3D30  00000000  0x26  '&'
    0x10,  // 3D31  00010000
    0x28,  // 3D32  00101000
    0x10,  // 3D33  00010000
    0x2A,  // 3D34  00101010
    0x44,  // 3D35  01000100
    0x3A,  // 3D36  00111010
    0x00,  // 3D37  00000000
    //
    0x00,  // 3D38  00000000  0x27  (** single quote)
    0x08,  // 3D39  00001000
    0x10,  // 3D3A  00010000
    0x00,  // 3D3B  00000000
    0x00,  // 3D3C  00000000
    0x00,  // 3D3D  00000000
    0x00,  // 3D3E  00000000
    0x00,  // 3D3F  00000000
    //
    0x00,  // 3D40  00000000  0x28  '('
    0x04,  // 3D41  00000100
    0x08,  // 3D42  00001000
    0x08,  // 3D43  00001000
    0x08,  // 3D44  00001000
    0x08,  // 3D45  00001000
    0x04,  // 3D46  00000100
    0x00,  // 3D47  00000000
    //
    0x00,  // 3D48  00000000  0x29  ')'
    0x20,  // 3D49  00100000
    0x10,  // 3D4A  00010000
    0x10,  // 3D4B  00010000
    0x10,  // 3D4C  00010000
    0x10,  // 3D4D  00010000
    0x20,  // 3D4E  00100000
    0x00,  // 3D4F  00000000
    //
    0x00,  // 3D50  00000000  0x2A  '*'
    0x00,  // 3D51  00000000
    0x14,  // 3D52  00010100
    0x08,  // 3D53  00001000
    0x3E,  // 3D54  00111110
    0x08,  // 3D55  00001000
    0x14,  // 3D56  00010100
    0x00,  // 3D57  00000000
    //
    0x00,  // 3D58  00000000  0x2B   '+'
    0x00,  // 3D59  00000000
    0x08,  // 3D5A  00001000
    0x08,  // 3D5B  00001000
    0x3E,  // 3D5C  00111110
    0x08,  // 3D5D  00001000
    0x08,  // 3D5E  00001000
    0x00,  // 3D5F  00000000
    //
    0x00,  // 3D60  00000000  0x2C  ','
    0x00,  // 3D61  00000000
    0x00,  // 3D62  00000000
    0x00,  // 3D63  00000000
    0x00,  // 3D64  00000000
    0x08,  // 3D65  00001000
    0x08,  // 3D66  00001000
    0x10,  // 3D67  00010000
    //
    0x00,  // 3D68  00000000  0x2D  '-'
    0x00,  // 3D69  00000000
    0x00,  // 3D6A  00000000
    0x00,  // 3D6B  00000000
    0x3E,  // 3D6C  00111110
    0x00,  // 3D6D  00000000
    0x00,  // 3D6E  00000000
    0x00,  // 3D6F  00000000
    //
    0x00,  // 3D70  00000000  0x2E  '.'
    0x00,  // 3D71  00000000
    0x00,  // 3D72  00000000
    0x00,  // 3D73  00000000
    0x00,  // 3D74  00000000
    0x18,  // 3D75  00011000
    0x18,  // 3D76  00011000
    0x00,  // 3D77  00000000
    //
    0x00,  // 3D78  00000000  0x2F  '/'
    0x00,  // 3D79  00000000
    0x02,  // 3D7A  00000010
    0x04,  // 3D7B  00000100
    0x08,  // 3D7C  00001000
    0x10,  // 3D7D  00010000
    0x20,  // 3D7E  00100000
    0x00,  // 3D7F  00000000
    //
    0x00,  // 3D80  00000000  0x30  '0'
    0x3C,  // 3D81  00111100
    0x46,  // 3D82  01000110
    0x4A,  // 3D83  01001010
    0x52,  // 3D84  01010010
    0x62,  // 3D85  01100010
    0x3C,  // 3D86  00111100
    0x00,  // 3D87  00000000
    //
    0x00,  // 3D88  00000000  0x31  '1'
    0x18,  // 3D89  00011000
    0x28,  // 3D8A  00101000
    0x08,  // 3D8B  00001000
    0x08,  // 3D8C  00001000
    0x08,  // 3D8D  00001000
    0x3E,  // 3D8E  00111110
    0x00,  // 3D8F  00000000
    //
    0x00,  // 3D90  00000000  0x32  '2'
    0x3C,  // 3D91  00111100
    0x42,  // 3D92  01000010
    0x02,  // 3D93  00000010
    0x3C,  // 3D94  00111100
    0x40,  // 3D95  01000000
    0x7E,  // 3D96  01111110
    0x00,  // 3D97  00000000
    //
    0x00,  // 3D98  00000000  0x33  '3'
    0x3C,  // 3D99  00111100
    0x42,  // 3D9A  01000010
    0x0C,  // 3D9B  00001100
    0x02,  // 3D9C  00000010
    0x42,  // 3D9D  01000010
    0x3C,  // 3D9E  00111100
    0x00,  // 3D9F  00000000
    //
    0x00,  // 3DA0  00000000  0x34  '4'
    0x08,  // 3DA1  00001000
    0x18,  // 3DA2  00011000
    0x28,  // 3DA3  00101000
    0x48,  // 3DA4  01001000
    0x7E,  // 3DA5  01111110
    0x08,  // 3DA6  00001000
    0x00,  // 3DA7  00000000
    //
    0x00,  // 3DA8  00000000  0x35  '5'
    0x7E,  // 3DA9  01111110
    0x40,  // 3DAA  01000000
    0x7C,  // 3DAB  01111100
    0x02,  // 3DAC  00000010
    0x42,  // 3DAD  01000010
    0x3C,  // 3DAE  00111100
    0x00,  // 3DAF  00000000
    //
    0x00,  // 3DB0  00000000  0x36  '6'
    0x3C,  // 3DB1  00111100
    0x40,  // 3DB2  01000000
    0x7C,  // 3DB3  01111100
    0x42,  // 3DB4  01000010
    0x42,  // 3DB5  01000010
    0x3C,  // 3DB6  00111100
    0x00,  // 3DB7  00000000
    //
    0x00,  // 3DB8  00000000  0x37  '7'
    0x7E,  // 3DB9  01111110
    0x02,  // 3DBA  00000010
    0x04,  // 3DBB  00000100
    0x08,  // 3DBC  00001000
    0x10,  // 3DBD  00010000
    0x10,  // 3DBE  00010000
    0x00,  // 3DBF  00000000
    //
    0x00,  // 3DC0  00000000  0x38  '8'
    0x3C,  // 3DC1  00111100
    0x42,  // 3DC2  01000010
    0x3C,  // 3DC3  00111100
    0x42,  // 3DC4  01000010
    0x42,  // 3DC5  01000010
    0x3C,  // 3DC6  00111100
    0x00,  // 3DC7  00000000
    //
    0x00,  // 3DC8  00000000  0x39  '9'
    0x3C,  // 3DC9  00111100
    0x42,  // 3DCA  01000010
    0x42,  // 3DCB  01000010
    0x3E,  // 3DCC  00111110
    0x02,  // 3DCD  00000010
    0x3C,  // 3DCE  00111100
    0x00,  // 3DCF  00000000
    //
    0x00,  // 3DD0  00000000  0x3A  ':'
    0x00,  // 3DD1  00000000
    0x00,  // 3DD2  00000000
    0x10,  // 3DD3  00010000
    0x00,  // 3DD4  00000000
    0x00,  // 3DD5  00000000
    0x10,  // 3DD6  00010000
    0x00,  // 3DD7  00000000
    //
    0x00,  // 3DD8  00000000  0x3B  ';'
    0x00,  // 3DD9  00000000
    0x10,  // 3DDA  00010000
    0x00,  // 3DDB  00000000
    0x00,  // 3DDC  00000000
    0x10,  // 3DDD  00010000
    0x10,  // 3DDE  00010000
    0x20,  // 3DDF  00100000
    //
    0x00,  // 3DE0  00000000  0x3C  '<'
    0x00,  // 3DE1  00000000
    0x04,  // 3DE2  00000100
    0x08,  // 3DE3  00001000
    0x10,  // 3DE4  00010000
    0x08,  // 3DE5  00001000
    0x04,  // 3DE6  00000100
    0x00,  // 3DE7  00000000
    //
    0x00,  // 3DE8  00000000  0x3D  '='
    0x00,  // 3DE9  00000000
    0x00,  // 3DEA  00000000
    0x3E,  // 3DEB  00111110
    0x00,  // 3DEC  00000000
    0x3E,  // 3DED  00111110
    0x00,  // 3DEE  00000000
    0x00,  // 3DEF  00000000
    //
    0x00,  // 3DF0  00000000  0x3E  '>'
    0x00,  // 3DF1  00000000
    0x10,  // 3DF2  00010000
    0x08,  // 3DF3  00001000
    0x04,  // 3DF4  00000100
    0x08,  // 3DF5  00001000
    0x10,  // 3DF6  00010000
    0x00,  // 3DF7  00000000
    //
    0x00,  // 3DF8  00000000  0x3F  '?'
    0x3C,  // 3DF9  00111100
    0x42,  // 3DFA  01000010
    0x04,  // 3DFB  00000100
    0x08,  // 3DFC  00001000
    0x00,  // 3DFD  00000000
    0x08,  // 3DFE  00001000
    0x00,  // 3DFF  00000000
    //
    0x00,  // 3E00  00000000  0x40  '@'
    0x3C,  // 3E01  00111100
    0x4A,  // 3E02  01001010
    0x56,  // 3E03  01010110
    0x5E,  // 3E04  01011110
    0x40,  // 3E05  01000000
    0x3C,  // 3E06  00111100
    0x00,  // 3E07  00000000
    //
    0x00,  // 3E08  00000000  0x41  'A'
    0x3C,  // 3E09  00111100
    0x42,  // 3E0A  01000010
    0x42,  // 3E0B  01000010
    0x7E,  // 3E0C  01111110
    0x42,  // 3E0D  01000010
    0x42,  // 3E0E  01000010
    0x00,  // 3E0F  00000000
    //
    0x00,  // 3E10  00000000  0x42  'B'
    0x7C,  // 3E11  01111100
    0x42,  // 3E12  01000010
    0x7C,  // 3E13  01111100
    0x42,  // 3E14  01000010
    0x42,  // 3E15  01000010
    0x7C,  // 3E16  01111100
    0x00,  // 3E17  00000000
    //
    0x00,  // 3E18  00000000  0x43  'C'
    0x3C,  // 3E19  00111100
    0x42,  // 3E1A  01000010
    0x40,  // 3E1B  01000000
    0x40,  // 3E1C  01000000
    0x42,  // 3E1D  01000010
    0x3C,  // 3E1E  00111100
    0x00,  // 3E1F  00000000
    //
    0x00,  // 3E20  00000000  0x44  'D'
    0x78,  // 3E21  01111000
    0x44,  // 3E22  01000100
    0x42,  // 3E23  01000010
    0x42,  // 3E24  01000010
    0x44,  // 3E25  01000100
    0x78,  // 3E26  01111000
    0x00,  // 3E27  00000000
    //
    0x00,  // 3E28  00000000  0x45  'E'
    0x7E,  // 3E29  01111110
    0x40,  // 3E2A  01000000
    0x7C,  // 3E2B  01111100
    0x40,  // 3E2C  01000000
    0x40,  // 3E2D  01000000
    0x7E,  // 3E2E  01111110
    0x00,  // 3E2F  00000000
    //
    0x00,  // 3E30  00000000  0x46  'F'
    0x7E,  // 3E31  01111110
    0x40,  // 3E32  01000000
    0x7C,  // 3E33  01111100
    0x40,  // 3E34  01000000
    0x40,  // 3E35  01000000
    0x40,  // 3E36  01000000
    0x00,  // 3E37  00000000
    //
    0x00,  // 3E38  00000000  0x47  'G'
    0x3C,  // 3E39  00111100
    0x42,  // 3E3A  01000010
    0x40,  // 3E3B  01000000
    0x4E,  // 3E3C  01001110
    0x42,  // 3E3D  01000010
    0x3C,  // 3E3E  00111100
    0x00,  // 3E3F  00000000
    //
    0x00,  // 3E40  00000000  0x48  'H'
    0x42,  // 3E41  01000010
    0x42,  // 3E42  01000010
    0x7E,  // 3E43  01111110
    0x42,  // 3E44  01000010
    0x42,  // 3E45  01000010
    0x42,  // 3E46  01000010
    0x00,  // 3E47  00000000
    //
    0x00,  // 3E48  00000000  0x49  'I'
    0x3E,  // 3E49  00111110
    0x08,  // 3E4A  00001000
    0x08,  // 3E4B  00001000
    0x08,  // 3E4C  00001000
    0x08,  // 3E4D  00001000
    0x3E,  // 3E4E  00111110
    0x00,  // 3E4F  00000000
    //
    0x00,  // 3E50  00000000  0x4A  'J'
    0x02,  // 3E51  00000010
    0x02,  // 3E52  00000010
    0x02,  // 3E53  00000010
    0x42,  // 3E54  01000010
    0x42,  // 3E55  01000010
    0x3C,  // 3E56  00111100
    0x00,  // 3E57  00000000
    //
    0x00,  // 3E58  00000000  0x4B  'K'
    0x44,  // 3E59  01000100
    0x48,  // 3E5A  01001000
    0x70,  // 3E5B  01110000
    0x48,  // 3E5C  01001000
    0x44,  // 3E5D  01000100
    0x42,  // 3E5E  01000010
    0x00,  // 3E5F  00000000
    //
    0x00,  // 3E60  00000000  0x4C  'L'
    0x40,  // 3E61  01000000
    0x40,  // 3E62  01000000
    0x40,  // 3E63  01000000
    0x40,  // 3E64  01000000
    0x40,  // 3E65  01000000
    0x7E,  // 3E66  01111110
    0x00,  // 3E67  00000000
    //
    0x00,  // 3E68  00000000  0x4D  'M'
    0x42,  // 3E69  01000010
    0x66,  // 3E6A  01100110
    0x5A,  // 3E6B  01011010
    0x42,  // 3E6C  01000010
    0x42,  // 3E6D  01000010
    0x42,  // 3E6E  01000010
    0x00,  // 3E6F  00000000
    //
    0x00,  // 3E70  00000000  0x4E  'N'
    0x42,  // 3E71  01000010
    0x62,  // 3E72  01100010
    0x52,  // 3E73  01010010
    0x4A,  // 3E74  01001010
    0x46,  // 3E75  01000110
    0x42,  // 3E76  01000010
    0x00,  // 3E77  00000000
    //
    0x00,  // 3E78  00000000  0x4F  'O'
    0x3C,  // 3E79  00111100
    0x42,  // 3E7A  01000010
    0x42,  // 3E7B  01000010
    0x42,  // 3E7C  01000010
    0x42,  // 3E7D  01000010
    0x3C,  // 3E7E  00111100
    0x00,  // 3E7F  00000000
    //
    0x00,  // 3E80  00000000  0x50  'P'
    0x7C,  // 3E81  01111100
    0x42,  // 3E82  01000010
    0x42,  // 3E83  01000010
    0x7C,  // 3E84  01111100
    0x40,  // 3E85  01000000
    0x40,  // 3E86  01000000
    0x00,  // 3E87  00000000
    //
    0x00,  // 3E88  00000000  0x51  'Q'
    0x3C,  // 3E89  00111100
    0x42,  // 3E8A  01000010
    0x42,  // 3E8B  01000010
    0x52,  // 3E8C  01010010
    0x4A,  // 3E8D  01001010
    0x3C,  // 3E8E  00111100
    0x00,  // 3E8F  00000000
    //
    0x00,  // 3E90  00000000  0x52  'R'
    0x7C,  // 3E91  01111100
    0x42,  // 3E92  01000010
    0x42,  // 3E93  01000010
    0x7C,  // 3E94  01111100
    0x44,  // 3E95  01000100
    0x42,  // 3E96  01000010
    0x00,  // 3E97  00000000
    //
    0x00,  // 3E98  00000000  0x53  'S'
    0x3C,  // 3E99  00111100
    0x40,  // 3E9A  01000000
    0x3C,  // 3E9B  00111100
    0x02,  // 3E9C  00000010
    0x42,  // 3E9D  01000010
    0x3C,  // 3E9E  00111100
    0x00,  // 3E9F  00000000
    //
    0x00,  // 3EA0  00000000  0x54  'T'
    0xFE,  // 3EA1  11111110
    0x10,  // 3EA2  00010000
    0x10,  // 3EA3  00010000
    0x10,  // 3EA4  00010000
    0x10,  // 3EA5  00010000
    0x10,  // 3EA6  00010000
    0x00,  // 3EA7  00000000
    //
    0x00,  // 3EA8  00000000  0x55  'U'
    0x42,  // 3EA9  01000010
    0x42,  // 3EAA  01000010
    0x42,  // 3EAB  01000010
    0x42,  // 3EAC  01000010
    0x42,  // 3EAD  01000010
    0x3C,  // 3EAE  00111100
    0x00,  // 3EAF  00000000
    //
    0x00,  // 3EB0  00000000  0x56  'V'
    0x42,  // 3EB1  01000010
    0x42,  // 3EB2  01000010
    0x42,  // 3EB3  01000010
    0x42,  // 3EB4  01000010
    0x24,  // 3EB5  00100100
    0x18,  // 3EB6  00011000
    0x00,  // 3EB7  00000000
    //
    0x00,  // 3EB8  00000000  0x57  'W'
    0x42,  // 3EB9  01000010
    0x42,  // 3EBA  01000010
    0x42,  // 3EBB  01000010
    0x42,  // 3EBC  01000010
    0x5A,  // 3EBD  01011010
    0x24,  // 3EBE  00100100
    0x00,  // 3EBF  00000000
    //
    0x00,  // 3EC0  00000000  0x58  'X'
    0x42,  // 3EC1  01000010
    0x24,  // 3EC2  00100100
    0x18,  // 3EC3  00011000
    0x18,  // 3EC4  00011000
    0x24,  // 3EC5  00100100
    0x42,  // 3EC6  01000010
    0x00,  // 3EC7  00000000
    //
    0x00,  // 3EC8  00000000  0x59  'Y'
    0x82,  // 3EC9  10000010
    0x44,  // 3ECA  01000100
    0x28,  // 3ECB  00101000
    0x10,  // 3ECC  00010000
    0x10,  // 3ECD  00010000
    0x10,  // 3ECE  00010000
    0x00,  // 3ECF  00000000
    //
    0x00,  // 3ED0  00000000  0x5A  'Z'
    0x7E,  // 3ED1  01111110
    0x04,  // 3ED2  00000100
    0x08,  // 3ED3  00001000
    0x10,  // 3ED4  00010000
    0x20,  // 3ED5  00100000
    0x7E,  // 3ED6  01111110
    0x00,  // 3ED7  00000000
    //
    0x00,  // 3ED8  00000000  0x5B  '['
    0x0E,  // 3ED9  00001110
    0x08,  // 3EDA  00001000
    0x08,  // 3EDB  00001000
    0x08,  // 3EDC  00001000
    0x08,  // 3EDD  00001000
    0x0E,  // 3EDE  00001110
    0x00,  // 3EDF  00000000
    //
    0x00,  // 3EE0  00000000  0x5C  '\'
    0x00,  // 3EE1  00000000
    0x40,  // 3EE2  01000000
    0x20,  // 3EE3  00100000
    0x10,  // 3EE4  00010000
    0x08,  // 3EE5  00001000
    0x04,  // 3EE6  00000100
    0x00,  // 3EE7  00000000
    //
    0x00,  // 3EE8  00000000  0x5D  ']'
    0x70,  // 3EE9  01110000
    0x10,  // 3EEA  00010000
    0x10,  // 3EEB  00010000
    0x10,  // 3EEC  00010000
    0x10,  // 3EED  00010000
    0x70,  // 3EEE  01110000
    0x00,  // 3EEF  00000000
    //
    0x00,  // 3EF0  00000000  0x5E  '^' (** up arrow)
    0x10,  // 3EF1  00010000
    0x38,  // 3EF2  00111000
    0x54,  // 3EF3  01010100
    0x10,  // 3EF4  00010000
    0x10,  // 3EF5  00010000
    0x10,  // 3EF6  00010000
    0x00,  // 3EF7  00000000
    //
    0x00,  // 3EF8  00000000  0x5F  '_'
    0x00,  // 3EF9  00000000
    0x00,  // 3EFA  00000000
    0x00,  // 3EFB  00000000
    0x00,  // 3EFC  00000000
    0x00,  // 3EFD  00000000
    0x00,  // 3EFE  00000000
    0xFF,  // 3EFF  11111111
    //
    0x00,  // 3F00  00000000  0x60  (** pound sign)
    0x1C,  // 3F01  00011100
    0x22,  // 3F02  00100010
    0x78,  // 3F03  01111000
    0x20,  // 3F04  00100000
    0x20,  // 3F05  00100000
    0x7E,  // 3F06  01111110
    0x00,  // 3F07  00000000
    //
    0x00,  // 3F08  00000000  0x61  'a'
    0x00,  // 3F09  00000000
    0x38,  // 3F0A  00111000
    0x04,  // 3F0B  00000100
    0x3C,  // 3F0C  00111100
    0x44,  // 3F0D  01000100
    0x3C,  // 3F0E  00111100
    0x00,  // 3F0F  00000000
    //
    0x00,  // 3F10  00000000  0x62  'b'
    0x20,  // 3F11  00100000
    0x20,  // 3F12  00100000
    0x3C,  // 3F13  00111100
    0x22,  // 3F14  00100010
    0x22,  // 3F15  00100010
    0x3C,  // 3F16  00111100
    0x00,  // 3F17  00000000
    //
    0x00,  // 3F18  00000000  0x63  'c'
    0x00,  // 3F19  00000000
    0x1C,  // 3F1A  00011100
    0x20,  // 3F1B  00100000
    0x20,  // 3F1C  00100000
    0x20,  // 3F1D  00100000
    0x1C,  // 3F1E  00011100
    0x00,  // 3F1F  00000000
    //
    0x00,  // 3F20  00000000  0x64  'd'
    0x04,  // 3F21  00000100
    0x04,  // 3F22  00000100
    0x3C,  // 3F23  00111100
    0x44,  // 3F24  01000100
    0x44,  // 3F25  01000100
    0x3C,  // 3F26  00111100
    0x00,  // 3F27  00000000
    //
    0x00,  // 3F28  00000000  0x65  'e'
    0x00,  // 3F29  00000000
    0x38,  // 3F2A  00111000
    0x44,  // 3F2B  01000100
    0x78,  // 3F2C  01111000
    0x40,  // 3F2D  01000000
    0x3C,  // 3F2E  00111100
    0x00,  // 3F2F  00000000
    //
    0x00,  // 3F30  00000000  0x66  'f'
    0x0C,  // 3F31  00001100
    0x10,  // 3F32  00010000
    0x18,  // 3F33  00011000
    0x10,  // 3F34  00010000
    0x10,  // 3F35  00010000
    0x10,  // 3F36  00010000
    0x00,  // 3F37  00000000
    //
    0x00,  // 3F38  00000000  0x67  'g'
    0x00,  // 3F39  00000000
    0x3C,  // 3F3A  00111100
    0x44,  // 3F3B  01000100
    0x44,  // 3F3C  01000100
    0x3C,  // 3F3D  00111100
    0x04,  // 3F3E  00000100
    0x38,  // 3F3F  00111000
    //
    0x00,  // 3F40  00000000  0x68  'h'
    0x40,  // 3F41  01000000
    0x40,  // 3F42  01000000
    0x78,  // 3F43  01111000
    0x44,  // 3F44  01000100
    0x44,  // 3F45  01000100
    0x44,  // 3F46  01000100
    0x00,  // 3F47  00000000
    //
    0x00,  // 3F48  00000000  0x69  'i'
    0x10,  // 3F49  00010000
    0x00,  // 3F4A  00000000
    0x30,  // 3F4B  00110000
    0x10,  // 3F4C  00010000
    0x10,  // 3F4D  00010000
    0x38,  // 3F4E  00111000
    0x00,  // 3F4F  00000000
    //
    0x00,  // 3F50  00000000  0x6A  'j'
    0x04,  // 3F51  00000100
    0x00,  // 3F52  00000000
    0x04,  // 3F53  00000100
    0x04,  // 3F54  00000100
    0x04,  // 3F55  00000100
    0x24,  // 3F56  00100100
    0x18,  // 3F57  00011000
    //
    0x00,  // 3F58  00000000  0x6B  'k'
    0x20,  // 3F59  00100000
    0x28,  // 3F5A  00101000
    0x30,  // 3F5B  00110000
    0x30,  // 3F5C  00110000
    0x28,  // 3F5D  00101000
    0x24,  // 3F5E  00100100
    0x00,  // 3F5F  00000000
    //
    0x00,  // 3F60  00000000  0x6C  'l'
    0x10,  // 3F61  00010000
    0x10,  // 3F62  00010000
    0x10,  // 3F63  00010000
    0x10,  // 3F64  00010000
    0x10,  // 3F65  00010000
    0x0C,  // 3F66  00001100
    0x00,  // 3F67  00000000
    //
    0x00,  // 3F68  00000000  0x6D  'm'
    0x00,  // 3F69  00000000
    0x68,  // 3F6A  01101000
    0x54,  // 3F6B  01010100
    0x54,  // 3F6C  01010100
    0x54,  // 3F6D  01010100
    0x54,  // 3F6E  01010100
    0x00,  // 3F6F  00000000
    //
    0x00,  // 3F70  00000000  0x6E  'n'
    0x00,  // 3F71  00000000
    0x78,  // 3F72  01111000
    0x44,  // 3F73  01000100
    0x44,  // 3F74  01000100
    0x44,  // 3F75  01000100
    0x44,  // 3F76  01000100
    0x00,  // 3F77  00000000
    //
    0x00,  // 3F78  00000000  0x6F  'o'
    0x00,  // 3F79  00000000
    0x38,  // 3F7A  00111000
    0x44,  // 3F7B  01000100
    0x44,  // 3F7C  01000100
    0x44,  // 3F7D  01000100
    0x38,  // 3F7E  00111000
    0x00,  // 3F7F  00000000
    //
    0x00,  // 3F80  00000000  0x70  'p'
    0x00,  // 3F81  00000000
    0x78,  // 3F82  01111000
    0x44,  // 3F83  01000100
    0x44,  // 3F84  01000100
    0x78,  // 3F85  01111000
    0x40,  // 3F86  01000000
    0x40,  // 3F87  01000000
    //
    0x00,  // 3F88  00000000  0x71  'q'
    0x00,  // 3F89  00000000
    0x3C,  // 3F8A  00111100
    0x44,  // 3F8B  01000100
    0x44,  // 3F8C  01000100
    0x3C,  // 3F8D  00111100
    0x04,  // 3F8E  00000100
    0x06,  // 3F8F  00000110
    //
    0x00,  // 3F90  00000000  0x72  'r'
    0x00,  // 3F91  00000000
    0x1C,  // 3F92  00011100
    0x20,  // 3F93  00100000
    0x20,  // 3F94  00100000
    0x20,  // 3F95  00100000
    0x20,  // 3F96  00100000
    0x00,  // 3F97  00000000
    //
    0x00,  // 3F98  00000000  0x73  's'
    0x00,  // 3F99  00000000
    0x38,  // 3F9A  00111000
    0x40,  // 3F9B  01000000
    0x38,  // 3F9C  00111000
    0x04,  // 3F9D  00000100
    0x78,  // 3F9E  01111000
    0x00,  // 3F9F  00000000
    //
    0x00,  // 3FA0  00000000  0x74  't'
    0x10,  // 3FA1  00010000
    0x38,  // 3FA2  00111000
    0x10,  // 3FA3  00010000
    0x10,  // 3FA4  00010000
    0x10,  // 3FA5  00010000
    0x0C,  // 3FA6  00001100
    0x00,  // 3FA7  00000000
    //
    0x00,  // 3FA8  00000000  0x75  'u'
    0x00,  // 3FA9  00000000
    0x44,  // 3FAA  01000100
    0x44,  // 3FAB  01000100
    0x44,  // 3FAC  01000100
    0x44,  // 3FAD  01000100
    0x38,  // 3FAE  00111000
    0x00,  // 3FAF  00000000
    //
    0x00,  // 3FB0  00000000  0x76  'v'
    0x00,  // 3FB1  00000000
    0x44,  // 3FB2  01000100
    0x44,  // 3FB3  01000100
    0x28,  // 3FB4  00101000
    0x28,  // 3FB5  00101000
    0x10,  // 3FB6  00010000
    0x00,  // 3FB7  00000000
    //
    0x00,  // 3FB8  00000000  0x77  'w'
    0x00,  // 3FB9  00000000
    0x44,  // 3FBA  01000100
    0x54,  // 3FBB  01010100
    0x54,  // 3FBC  01010100
    0x54,  // 3FBD  01010100
    0x28,  // 3FBE  00101000
    0x00,  // 3FBF  00000000
    //
    0x00,  // 3FC0  00000000  0x78  'x'
    0x00,  // 3FC1  00000000
    0x44,  // 3FC2  01000100
    0x28,  // 3FC3  00101000
    0x10,  // 3FC4  00010000
    0x28,  // 3FC5  00101000
    0x44,  // 3FC6  01000100
    0x00,  // 3FC7  00000000
    //
    0x00,  // 3FC8  00000000  0x79  'y'
    0x00,  // 3FC9  00000000
    0x44,  // 3FCA  01000100
    0x44,  // 3FCB  01000100
    0x44,  // 3FCC  01000100
    0x3C,  // 3FCD  00111100
    0x04,  // 3FCE  00000100
    0x38,  // 3FCF  00111000
    //
    0x00,  // 3FD0  00000000  0x7A  'z'
    0x00,  // 3FD1  00000000
    0x7C,  // 3FD2  01111100
    0x08,  // 3FD3  00001000
    0x10,  // 3FD4  00010000
    0x20,  // 3FD5  00100000
    0x7C,  // 3FD6  01111100
    0x00,  // 3FD7  00000000
    //
    0x00,  // 3FD8  00000000  0x7B  '{'
    0x0E,  // 3FD9  00001110
    0x08,  // 3FDA  00001000
    0x30,  // 3FDB  00110000
    0x08,  // 3FDC  00001000
    0x08,  // 3FDD  00001000
    0x0E,  // 3FDE  00001110
    0x00,  // 3FDF  00000000
    //
    0x00,  // 3FE0  00000000  0x7C  '|'
    0x08,  // 3FE1  00001000
    0x08,  // 3FE2  00001000
    0x08,  // 3FE3  00001000
    0x08,  // 3FE4  00001000
    0x08,  // 3FE5  00001000
    0x08,  // 3FE6  00001000
    0x00,  // 3FE7  00000000
    //
    0x00,  // 3FE8  00000000  0x7D  '}'
    0x70,  // 3FE9  01110000
    0x10,  // 3FEA  00010000
    0x0C,  // 3FEB  00001100
    0x10,  // 3FEC  00010000
    0x10,  // 3FED  00010000
    0x70,  // 3FEE  01110000
    0x00,  // 3FEF  00000000
    //
    0x00,  // 3FF0  00000000  0x7E  '~'
    0x14,  // 3FF1  00010100
    0x28,  // 3FF2  00101000
    0x00,  // 3FF3  00000000
    0x00,  // 3FF4  00000000
    0x00,  // 3FF5  00000000
    0x00,  // 3FF6  00000000
    0x00,  // 3FF7  00000000
    //
    0x3C,  // 3FF8  00111100  0x7F  '(C)'
    0x42,  // 3FF9  01000010
    0x99,  // 3FFA  10011001
    0xA1,  // 3FFB  10100001
    0xA1,  // 3FFC  10100001
    0x99,  // 3FFD  10011001
    0x42,  // 3FFE  01000010
    0x3C   // 3FFF  00111100
]);

// -----------------------------------------------------------------------------
// # Display State

my.ink = my.BLACK;
my.paper = my.WHITE;

// virtual display memory:
let displayPixels = new Uint8ClampedArray(PIXEL_BYTES);
let displayColours = new Uint8ClampedArray(COLOUR_BYTES);

// -----------------------------------------------------------------------------
// # Context Method

/** context():
 *
 *  @param [canvasId]  Optional canvas element ID to use.
 *
 *  @return  The context used to draw on the canvas.
 */
function context(canvasId) {
    let id = canvasId || "zx_canvas";
    let canvas = document.getElementById(id);
    let context = canvas.getContext("2d");
    return context;
} //                                                                     context

// -----------------------------------------------------------------------------
// # Drawing Methods

/** clearScreenDithered():
 *  Clears the screen using a mix of two colours.
 *
 *  @param [context]  Context into which to draw.
 */
function clearScreenDithered(context) {
    let yf = false;
    for (let y = 0; y < YMAX; y++) {
        yf = !yf;
        let xf = yf;
        for (let x = 0; x < XMAX; x++) {
            xf = !xf;
            context.fillStyle = xf ? my.ink : my.paper;
            context.fillRect(x * SCALE, y * SCALE, SCALE, SCALE);
        }
    }
} //                                                         clearScreenDithered

/** drawChar():
 *  Draws a single character at the specified line and column.
 *
 *  @param [context]  Context into which to draw.
 *
 *  @param [line]     Line number, a number from 0 to LINES-1.
 *                    The starting line is at the top of the display.
 *
 *  @param [col]      Column number, a number from 0 to COLUMNS-1.
 *                    The starting column is at the left of the display.
 *
 *  @param [ch]       The character to draw, as a string.
 *                    Only the first character of the string is used.
 */
function drawChar(context, line, col, ch) {
    //
    // x and y specify the top left corner of the character on the display
    const x = col  * CHARSIZE * SCALE;
    const y = line * CHARSIZE * SCALE;
    //
    // index of the first byte of the character in the character set
    const ci = (ch.charCodeAt(0) - 0x20) * CHARSIZE;
    //
    // fetch each of the bytes of the character
    for (let iy = 0; iy < CHARSIZE; iy++) {
        const offset = ci + iy;
        const byte = CHARSET[offset];
        for (let ix = 0; ix < 8; ix++) {
            const isInk = (Math.pow(2, 8 - ix) & byte) > 0;
            context.fillStyle = isInk ? my.ink : my.paper;
            context.fillRect(x + ix * SCALE, y + iy * SCALE, SCALE, SCALE);
        }
    }
} //                                                                    drawChar

/** drawCharset():
 *  Draws the entire character set at the bottom of the screen.
 *  This method exists so we can visually check that the
 *  system character set in renders properly.
 *
 *  @param [context]  Context into which to draw.
 */
function drawCharset(context) {
    let chars = "";
    for (let ch = 0x20; ch <= 0x7F; ch++)
        chars += String.fromCharCode(ch);
    drawText(context, 21, 0, chars);
} //                                                                 drawCharset

/** drawText():
 *  Draws a string of text starting from the specified position.
 *  If the text spills past the last column, continues the text
 *  on the next line from the first column.
 *
 *  @param [context]  Context into which to draw.
 *
 *  @param [line]     Line number, a number from 0 to LINES-1.
 *                    The starting line is at the top of the display.
 *
 *  @param [col]      Column number, a number from 0 to COLUMNS-1.
 *                    The starting column is at the left of the display.
 *
 *  @param [ch]       The string to draw.
 */
function drawText(context, line, col, text) {
    const length = text.length;
    for (let i = 0; i < length && line < LINES; i++) {
        drawChar(context, line, col, text.charAt(i));
        if (++col >= COLUMNS) {
            col = 0;
            line++;
        }
    }
} //                                                                    drawText

/** randomizeArea():
 *  Randomizes the specified area of the virtual display.
 *  The area will contain random pixels and colours.
 *
 *  @param [context]  Context into which to draw.
 *
 *  @param [line]     Starting line number, a number from 0 to LINES-1.
 *                    The starting line is at the top of the display.
 *
 *  @param [col]      Starting column number, a number from 0 to COLUMNS-1.
 *                    The starting column is at the left of the display.
 *
 *  @param [lines]    The height of the area to update, from 1 to LINES.
 *                    Any areas out of the display area will be ignored.
 *
 *  @param [colc]     The width of the area to update, from 1 to COLUMNS.
 */
function randomizeArea(line, col, lines, cols) {
    //
    const randomByte = () => Math.floor(Math.random() * 256);
    //
    // randomize the colour attributes
    for (let l = line; l < (line + lines) && l < LINES; l++)
        for (let c = col; c < (col + cols) && c < COLUMNS; c++)
            displayColours[l * COLUMNS + c] = randomByte();
    //
    // randomize the pixels
    for (let l = line; l < (line + lines) && l < LINES; l++)
        for (let c = col; c < (col + cols) && c < COLUMNS; c++)
            for (b = 0; b < CHARSIZE; b++)
                displayPixels[(l * 8 + b) * COLUMNS + c] = randomByte();
} //                                                               randomizeArea

// -----------------------------------------------------------------------------
// # Display Update Methods

/** update():
 *  Updates the canvas with the changes in virtual display memory.
 */
function update(_) {
    this.updateArea(this.context(), 0, 0, LINES, COLUMNS);
} //                                                                      update

/** updateArea():
 *  Updates the specified area of the canvas
 *  with changes in the virtual display memory.
 *
 *  @param [context]  Context into which to draw.
 *
 *  @param [line]     Starting line number, a number from 0 to LINES-1.
 *                    The starting line is at the top of the display.
 *
 *  @param [col]      Starting column number, a number from 0 to COLUMNS-1.
 *                    The starting column is at the left of the display.
 *
 *  @param [line]     The height of the area to update, from 1 to LINES.
 *                    Any areas out of the display area will be ignored.
 *
 *  @param [col]      The width of the area to update, from 1 to COLUMNS.
 */
function updateArea(context, line, col, lines, cols) {
    if (lines < 1 || cols < 1)
        return;
    //
    // set timing to TRUE to output timing details to the console
    const TIMING    = false
    const doNothing = (s) => {};
    const time      = TIMING ? (s) => {
                        console.time(`updateArea() ${s}`);
                      } : doNothing;
    const timeEnd   = TIMING ? (s) => {
                        console.timeEnd(`updateArea() ${s}`);
                      } : doNothing;
    //
    // create temporary structures
    time("TOTAL");
    time("init");
    const REALSIZE = CHARSIZE * SCALE;
    const x = col  * REALSIZE; // left corner of the block to display
    const y = line * REALSIZE; // top   "  "
    const img = context.createImageData(cols * REALSIZE, lines * REALSIZE);
    const BITS = new Uint8ClampedArray([128, 64, 32, 16, 8, 4, 2, 1]);
    let paperPx = new Uint8ClampedArray(4 * SCALE);  // 4 bytes for RGBA
    let inkPx = new Uint8ClampedArray(4 * SCALE);
    let prevAttr = 0;
    timeEnd("init");
    //
    // translate the data in displayColours and displayPixels
    // to RGBA 4-byte grid of pixels in ImageData (img).
    time("fill");
    for (let l = line; l < (line + lines) && l < LINES; l++)
        for (let c = col; c < (col + cols) && c < COLUMNS; c++) {
            //
            // if the attribute value has changed from the previous
            // block, update paperPx and inkPx content
            let a = displayColours[l * COLUMNS + c];
            if (a != prevAttr) {
                //
                // determine the ink and paper indexes
                let bright = (a & 0x40) ? 8 : 0;           // 0x40 = b01000000
                let ink    = (a & 0x07) + bright;          // 0x07 = b00000111
                let paper  = ((a & 0x38) >>> 3) + bright;  // 0x38 = b00111000
                //
                // copy RGBA bytes into paperPx and inkPx (repeat to SCALE)
                let colour = COLOUR_PIXELS[paper];
                for (let i = 0; i < SCALE; i++)
                    paperPx.set(colour, i * 4);
                //
                colour = COLOUR_PIXELS[ink];
                for (let i = 0; i < SCALE; i++)
                    inkPx.set(colour, i * 4);
                //
                prevAttr = a;
            }
            // draw the vertical lines of the character block
            for (let b = 0; b < CHARSIZE; b++) {
                const byte = displayPixels[(l * CHARSIZE + b) * COLUMNS + c];
                for (let bit = 7; bit >= 0; bit--) {
                    const isInk = byte & BITS[bit];
                    const N = CHARSIZE * SCALE;
                    const i =
                          l   * 4 * COLUMNS * N * N +
                          b   * 4 * COLUMNS * SCALE * N +
                          c   * 4 * N +
                          bit * 4 * SCALE
                          ;
                    const px = isInk ? inkPx : paperPx;
                    img.data.set(px, i);
                }
            }
        }
    // copy the first line of physical pixels down so that each
    // virtual pixel is SCALE physical pixels high on the canvas.
    timeEnd("fill");
    //
    const BPL = 4 * XMAX * SCALE; // real bytes per line on canvas
    time("copy");
    const length = img.data.length;
    for (let i = 0; i < length; i += BPL * SCALE) {
        const start = i;
        const end   = i + BPL - 1;
        for (let j = 1; j < SCALE; j++)
            img.data.copyWithin(i + BPL * j, start, end);
    }
    // finally, write the rendered image data to the canvas
    timeEnd("copy");
    //
    time("putd");
    context.putImageData(img, x, y);
    timeEnd("putd");
    timeEnd("TOTAL");
} //                                                                  updateArea

// -----------------------------------------------------------------------------
// # ZXDisplay End
return my;
})();

// -----------------------------------------------------------------------------
// # Loader

window.addEventListener("load", () => {
    setTimeout(() => { drawAll(); }, 50);
}, false);

function drawAll() {
    const c = console;
    c.time("drawAll()");
    let context = ZXDisplay.context();
    const d = ZXDisplay;
    //
    // clear the screen with a dithered background
    if (true) {
        c.time("clearScreenDithered()");
        d.paper = "#0000D7";  // blue
        d.ink = "#000000";    // black
        d.clearScreenDithered(context);
        c.timeEnd("clearScreenDithered()");
    }
    // draw a random strip (at top)
    if (true) {
        const lines = 3;
        //
        c.time("randomizeArea()");
        d.randomizeArea(0, 0, lines, d.COLUMNS);
        c.timeEnd("randomizeArea()");
        //
        c.time("updateArea()");
        d.updateArea(context, 0, 0, lines, d.COLUMNS);
        c.timeEnd("updateArea()");
    }
    // draw the character set (at bottom)
    if (true) {
        c.time("drawCharset()");
        d.paper = "#D700D7";  // magenta
        d.ink = "#FFFFFF";    // bright white
        d.drawCharset(context);
        c.timeEnd("drawCharset()");
    }
    c.timeEnd("drawAll()");
} //                                                                     drawAll

//end
