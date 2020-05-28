// -----------------------------------------------------------------------------
// ZX Spectrum Display Simulator                                  [zxdisplay.js]
// (c) balarabe@protonmail.com                                      License: MIT
// -----------------------------------------------------------------------------

// Note: flashing attributes are not supported, because flashing is
// evil and I don't want to give anyone seizures by any chance.

// # ZXDisplay Object:
// # Internal Constants
// # Display State
//
// # Context Method
//   context(canvasId)
//
// # Drawing Methods
//   clearScreenDithered()
//   drawChar(line, col, ch)
//   drawCharset()
//   drawText(line, col, text)
//   randomizeArea(line, col, lines, cols)
//
// # Display Update Methods
//   update(context)
//   updateArea(context, line, col, lines, cols)
//
// # Helper Method
//   makeAttribute(ink, paper)
//
// # ZXDisplay End
//
// # Loader
//   drawAll()

// -----------------------------------------------------------------------------
// # ZXDisplay Object:

const ZXDisplay = (() => {

// Display resolution:
const COLUMNS = 32;  // number of text columns (& horizontal colour attributes)
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
    // BINARY       HEX  @ROM ASCII HEX / CHAR
    //
    0b00000000,  // 0x00 3D00 0x20 ' '
    0b00000000,  // 0x00 3D01
    0b00000000,  // 0x00 3D02
    0b00000000,  // 0x00 3D03
    0b00000000,  // 0x00 3D04
    0b00000000,  // 0x00 3D05
    0b00000000,  // 0x00 3D06
    0b00000000,  // 0x00 3D07
    //
    //
    0b00000000,  // 0x00 3D08 0x21 '!'
    0b00010000,  // 0x10 3D09
    0b00010000,  // 0x10 3D0A
    0b00010000,  // 0x10 3D0B
    0b00010000,  // 0x10 3D0C
    0b00000000,  // 0x00 3D0D
    0b00010000,  // 0x10 3D0E
    0b00000000,  // 0x00 3D0F
    //
    0b00000000,  // 0x00 3D10 0x22 '"'
    0b00100100,  // 0x24 3D11
    0b00100100,  // 0x24 3D12
    0b00000000,  // 0x00 3D13
    0b00000000,  // 0x00 3D14
    0b00000000,  // 0x00 3D15
    0b00000000,  // 0x00 3D16
    0b00000000,  // 0x00 3D17
    //
    0b00000000,  // 0x00 3D18 0x23 '#'
    0b00100100,  // 0x24 3D19
    0b01111110,  // 0x7E 3D1A
    0b00100100,  // 0x24 3D1B
    0b00100100,  // 0x24 3D1C
    0b01111110,  // 0x7E 3D1D
    0b00100100,  // 0x24 3D1E
    0b00000000,  // 0x00 3D1F
    //
    0b00000000,  // 0x00 3D20 0x24 '$'
    0b00001000,  // 0x08 3D21
    0b00111110,  // 0x3E 3D22
    0b00101000,  // 0x28 3D23
    0b00111110,  // 0x3E 3D24
    0b00001010,  // 0x0A 3D25
    0b00111110,  // 0x3E 3D26
    0b00001000,  // 0x08 3D27
    //
    0b00000000,  // 0x00 3D28 0x25 '%'
    0b01100010,  // 0x62 3D29
    0b01100100,  // 0x64 3D2A
    0b00001000,  // 0x08 3D2B
    0b00010000,  // 0x10 3D2C
    0b00100110,  // 0x26 3D2D
    0b01000110,  // 0x46 3D2E
    0b00000000,  // 0x00 3D2F
    //
    0b00000000,  // 0x00 3D30 0x26 '&'
    0b00010000,  // 0x10 3D31
    0b00101000,  // 0x28 3D32
    0b00010000,  // 0x10 3D33
    0b00101010,  // 0x2A 3D34
    0b01000100,  // 0x44 3D35
    0b00111010,  // 0x3A 3D36
    0b00000000,  // 0x00 3D37
    //
    0b00000000,  // 0x00 3D38 0x27 (** single quote)
    0b00001000,  // 0x08 3D39
    0b00010000,  // 0x10 3D3A
    0b00000000,  // 0x00 3D3B
    0b00000000,  // 0x00 3D3C
    0b00000000,  // 0x00 3D3D
    0b00000000,  // 0x00 3D3E
    0b00000000,  // 0x00 3D3F
    //
    0b00000000,  // 0x00 3D40 0x28 '('
    0b00000100,  // 0x04 3D41
    0b00001000,  // 0x08 3D42
    0b00001000,  // 0x08 3D43
    0b00001000,  // 0x08 3D44
    0b00001000,  // 0x08 3D45
    0b00000100,  // 0x04 3D46
    0b00000000,  // 0x00 3D47
    //
    0b00000000,  // 0x00 3D48 0x29 ')'
    0b00100000,  // 0x20 3D49
    0b00010000,  // 0x10 3D4A
    0b00010000,  // 0x10 3D4B
    0b00010000,  // 0x10 3D4C
    0b00010000,  // 0x10 3D4D
    0b00100000,  // 0x20 3D4E
    0b00000000,  // 0x00 3D4F
    //
    0b00000000,  // 0x00 3D50 0x2A '*'
    0b00000000,  // 0x00 3D51
    0b00010100,  // 0x14 3D52
    0b00001000,  // 0x08 3D53
    0b00111110,  // 0x3E 3D54
    0b00001000,  // 0x08 3D55
    0b00010100,  // 0x14 3D56
    0b00000000,  // 0x00 3D57
    //
    0b00000000,  // 0x00 3D58 0x2B '+'
    0b00000000,  // 0x00 3D59
    0b00001000,  // 0x08 3D5A
    0b00001000,  // 0x08 3D5B
    0b00111110,  // 0x3E 3D5C
    0b00001000,  // 0x08 3D5D
    0b00001000,  // 0x08 3D5E
    0b00000000,  // 0x00 3D5F
    //
    0b00000000,  // 0x00 3D60 0x2C ','
    0b00000000,  // 0x00 3D61
    0b00000000,  // 0x00 3D62
    0b00000000,  // 0x00 3D63
    0b00000000,  // 0x00 3D64
    0b00001000,  // 0x08 3D65
    0b00001000,  // 0x08 3D66
    0b00010000,  // 0x10 3D67
    //
    0b00000000,  // 0x00 3D68 0x2D '-'
    0b00000000,  // 0x00 3D69
    0b00000000,  // 0x00 3D6A
    0b00000000,  // 0x00 3D6B
    0b00111110,  // 0x3E 3D6C
    0b00000000,  // 0x00 3D6D
    0b00000000,  // 0x00 3D6E
    0b00000000,  // 0x00 3D6F
    //
    0b00000000,  // 0x00 3D70 0x2E '.'
    0b00000000,  // 0x00 3D71
    0b00000000,  // 0x00 3D72
    0b00000000,  // 0x00 3D73
    0b00000000,  // 0x00 3D74
    0b00011000,  // 0x18 3D75
    0b00011000,  // 0x18 3D76
    0b00000000,  // 0x00 3D77
    //
    0b00000000,  // 0x00 3D78 0x2F '/'
    0b00000000,  // 0x00 3D79
    0b00000010,  // 0x02 3D7A
    0b00000100,  // 0x04 3D7B
    0b00001000,  // 0x08 3D7C
    0b00010000,  // 0x10 3D7D
    0b00100000,  // 0x20 3D7E
    0b00000000,  // 0x00 3D7F
    //
    0b00000000,  // 0x00 3D80 0x30 '0'
    0b00111100,  // 0x3C 3D81
    0b01000110,  // 0x46 3D82
    0b01001010,  // 0x4A 3D83
    0b01010010,  // 0x52 3D84
    0b01100010,  // 0x62 3D85
    0b00111100,  // 0x3C 3D86
    0b00000000,  // 0x00 3D87
    //
    0b00000000,  // 0x00 3D88 0x31 '1'
    0b00011000,  // 0x18 3D89
    0b00101000,  // 0x28 3D8A
    0b00001000,  // 0x08 3D8B
    0b00001000,  // 0x08 3D8C
    0b00001000,  // 0x08 3D8D
    0b00111110,  // 0x3E 3D8E
    0b00000000,  // 0x00 3D8F
    //
    0b00000000,  // 0x00 3D90 0x32 '2'
    0b00111100,  // 0x3C 3D91
    0b01000010,  // 0x42 3D92
    0b00000010,  // 0x02 3D93
    0b00111100,  // 0x3C 3D94
    0b01000000,  // 0x40 3D95
    0b01111110,  // 0x7E 3D96
    0b00000000,  // 0x00 3D97
    //
    0b00000000,  // 0x00 3D98 0x33 '3'
    0b00111100,  // 0x3C 3D99
    0b01000010,  // 0x42 3D9A
    0b00001100,  // 0x0C 3D9B
    0b00000010,  // 0x02 3D9C
    0b01000010,  // 0x42 3D9D
    0b00111100,  // 0x3C 3D9E
    0b00000000,  // 0x00 3D9F
    //
    0b00000000,  // 0x00 3DA0 0x34 '4'
    0b00001000,  // 0x08 3DA1
    0b00011000,  // 0x18 3DA2
    0b00101000,  // 0x28 3DA3
    0b01001000,  // 0x48 3DA4
    0b01111110,  // 0x7E 3DA5
    0b00001000,  // 0x08 3DA6
    0b00000000,  // 0x00 3DA7
    //
    0b00000000,  // 0x00 3DA8 0x35 '5'
    0b01111110,  // 0x7E 3DA9
    0b01000000,  // 0x40 3DAA
    0b01111100,  // 0x7C 3DAB
    0b00000010,  // 0x02 3DAC
    0b01000010,  // 0x42 3DAD
    0b00111100,  // 0x3C 3DAE
    0b00000000,  // 0x00 3DAF
    //
    0b00000000,  // 0x00 3DB0 0x36 '6'
    0b00111100,  // 0x3C 3DB1
    0b01000000,  // 0x40 3DB2
    0b01111100,  // 0x7C 3DB3
    0b01000010,  // 0x42 3DB4
    0b01000010,  // 0x42 3DB5
    0b00111100,  // 0x3C 3DB6
    0b00000000,  // 0x00 3DB7
    //
    0b00000000,  // 0x00 3DB8 0x37 '7'
    0b01111110,  // 0x7E 3DB9
    0b00000010,  // 0x02 3DBA
    0b00000100,  // 0x04 3DBB
    0b00001000,  // 0x08 3DBC
    0b00010000,  // 0x10 3DBD
    0b00010000,  // 0x10 3DBE
    0b00000000,  // 0x00 3DBF
    //
    0b00000000,  // 0x00 3DC0 0x38 '8'
    0b00111100,  // 0x3C 3DC1
    0b01000010,  // 0x42 3DC2
    0b00111100,  // 0x3C 3DC3
    0b01000010,  // 0x42 3DC4
    0b01000010,  // 0x42 3DC5
    0b00111100,  // 0x3C 3DC6
    0b00000000,  // 0x00 3DC7
    //
    0b00000000,  // 0x00 3DC8 0x39 '9'
    0b00111100,  // 0x3C 3DC9
    0b01000010,  // 0x42 3DCA
    0b01000010,  // 0x42 3DCB
    0b00111110,  // 0x3E 3DCC
    0b00000010,  // 0x02 3DCD
    0b00111100,  // 0x3C 3DCE
    0b00000000,  // 0x00 3DCF
    //
    0b00000000,  // 0x00 3DD0 0x3A ':'
    0b00000000,  // 0x00 3DD1
    0b00000000,  // 0x00 3DD2
    0b00010000,  // 0x10 3DD3
    0b00000000,  // 0x00 3DD4
    0b00000000,  // 0x00 3DD5
    0b00010000,  // 0x10 3DD6
    0b00000000,  // 0x00 3DD7
    //
    0b00000000,  // 0x00 3DD8 0x3B ';'
    0b00000000,  // 0x00 3DD9
    0b00010000,  // 0x10 3DDA
    0b00000000,  // 0x00 3DDB
    0b00000000,  // 0x00 3DDC
    0b00010000,  // 0x10 3DDD
    0b00010000,  // 0x10 3DDE
    0b00100000,  // 0x20 3DDF
    //
    0b00000000,  // 0x00 3DE0 0x3C '<'
    0b00000000,  // 0x00 3DE1
    0b00000100,  // 0x04 3DE2
    0b00001000,  // 0x08 3DE3
    0b00010000,  // 0x10 3DE4
    0b00001000,  // 0x08 3DE5
    0b00000100,  // 0x04 3DE6
    0b00000000,  // 0x00 3DE7
    //
    0b00000000,  // 0x00 3DE8 0x3D '='
    0b00000000,  // 0x00 3DE9
    0b00000000,  // 0x00 3DEA
    0b00111110,  // 0x3E 3DEB
    0b00000000,  // 0x00 3DEC
    0b00111110,  // 0x3E 3DED
    0b00000000,  // 0x00 3DEE
    0b00000000,  // 0x00 3DEF
    //
    0b00000000,  // 0x00 3DF0 0x3E '>'
    0b00000000,  // 0x00 3DF1
    0b00010000,  // 0x10 3DF2
    0b00001000,  // 0x08 3DF3
    0b00000100,  // 0x04 3DF4
    0b00001000,  // 0x08 3DF5
    0b00010000,  // 0x10 3DF6
    0b00000000,  // 0x00 3DF7
    //
    0b00000000,  // 0x00 3DF8 0x3F '?'
    0b00111100,  // 0x3C 3DF9
    0b01000010,  // 0x42 3DFA
    0b00000100,  // 0x04 3DFB
    0b00001000,  // 0x08 3DFC
    0b00000000,  // 0x00 3DFD
    0b00001000,  // 0x08 3DFE
    0b00000000,  // 0x00 3DFF
    //
    0b00000000,  // 0x00 3E00 0x40 '@'
    0b00111100,  // 0x3C 3E01
    0b01001010,  // 0x4A 3E02
    0b01010110,  // 0x56 3E03
    0b01011110,  // 0x5E 3E04
    0b01000000,  // 0x40 3E05
    0b00111100,  // 0x3C 3E06
    0b00000000,  // 0x00 3E07
    //
    0b00000000,  // 0x00 3E08 0x41 'A'
    0b00111100,  // 0x3C 3E09
    0b01000010,  // 0x42 3E0A
    0b01000010,  // 0x42 3E0B
    0b01111110,  // 0x7E 3E0C
    0b01000010,  // 0x42 3E0D
    0b01000010,  // 0x42 3E0E
    0b00000000,  // 0x00 3E0F
    //
    0b00000000,  // 0x00 3E10 0x42 'B'
    0b01111100,  // 0x7C 3E11
    0b01000010,  // 0x42 3E12
    0b01111100,  // 0x7C 3E13
    0b01000010,  // 0x42 3E14
    0b01000010,  // 0x42 3E15
    0b01111100,  // 0x7C 3E16
    0b00000000,  // 0x00 3E17
    //
    0b00000000,  // 0x00 3E18 0x43 'C'
    0b00111100,  // 0x3C 3E19
    0b01000010,  // 0x42 3E1A
    0b01000000,  // 0x40 3E1B
    0b01000000,  // 0x40 3E1C
    0b01000010,  // 0x42 3E1D
    0b00111100,  // 0x3C 3E1E
    0b00000000,  // 0x00 3E1F
    //
    0b00000000,  // 0x00 3E20 0x44 'D'
    0b01111000,  // 0x78 3E21
    0b01000100,  // 0x44 3E22
    0b01000010,  // 0x42 3E23
    0b01000010,  // 0x42 3E24
    0b01000100,  // 0x44 3E25
    0b01111000,  // 0x78 3E26
    0b00000000,  // 0x00 3E27
    //
    0b00000000,  // 0x00 3E28 0x45 'E'
    0b01111110,  // 0x7E 3E29
    0b01000000,  // 0x40 3E2A
    0b01111100,  // 0x7C 3E2B
    0b01000000,  // 0x40 3E2C
    0b01000000,  // 0x40 3E2D
    0b01111110,  // 0x7E 3E2E
    0b00000000,  // 0x00 3E2F
    //
    0b00000000,  // 0x00 3E30 0x46 'F'
    0b01111110,  // 0x7E 3E31
    0b01000000,  // 0x40 3E32
    0b01111100,  // 0x7C 3E33
    0b01000000,  // 0x40 3E34
    0b01000000,  // 0x40 3E35
    0b01000000,  // 0x40 3E36
    0b00000000,  // 0x00 3E37
    //
    0b00000000,  // 0x00 3E38 0x47 'G'
    0b00111100,  // 0x3C 3E39
    0b01000010,  // 0x42 3E3A
    0b01000000,  // 0x40 3E3B
    0b01001110,  // 0x4E 3E3C
    0b01000010,  // 0x42 3E3D
    0b00111100,  // 0x3C 3E3E
    0b00000000,  // 0x00 3E3F
    //
    0b00000000,  // 0x00 3E40 0x48 'H'
    0b01000010,  // 0x42 3E41
    0b01000010,  // 0x42 3E42
    0b01111110,  // 0x7E 3E43
    0b01000010,  // 0x42 3E44
    0b01000010,  // 0x42 3E45
    0b01000010,  // 0x42 3E46
    0b00000000,  // 0x00 3E47
    //
    0b00000000,  // 0x00 3E48 0x49 'I'
    0b00111110,  // 0x3E 3E49
    0b00001000,  // 0x08 3E4A
    0b00001000,  // 0x08 3E4B
    0b00001000,  // 0x08 3E4C
    0b00001000,  // 0x08 3E4D
    0b00111110,  // 0x3E 3E4E
    0b00000000,  // 0x00 3E4F
    //
    0b00000000,  // 0x00 3E50 0x4A 'J'
    0b00000010,  // 0x02 3E51
    0b00000010,  // 0x02 3E52
    0b00000010,  // 0x02 3E53
    0b01000010,  // 0x42 3E54
    0b01000010,  // 0x42 3E55
    0b00111100,  // 0x3C 3E56
    0b00000000,  // 0x00 3E57
    //
    0b00000000,  // 0x00 3E58 0x4B 'K'
    0b01000100,  // 0x44 3E59
    0b01001000,  // 0x48 3E5A
    0b01110000,  // 0x70 3E5B
    0b01001000,  // 0x48 3E5C
    0b01000100,  // 0x44 3E5D
    0b01000010,  // 0x42 3E5E
    0b00000000,  // 0x00 3E5F
    //
    0b00000000,  // 0x00 3E60 0x4C 'L'
    0b01000000,  // 0x40 3E61
    0b01000000,  // 0x40 3E62
    0b01000000,  // 0x40 3E63
    0b01000000,  // 0x40 3E64
    0b01000000,  // 0x40 3E65
    0b01111110,  // 0x7E 3E66
    0b00000000,  // 0x00 3E67
    //
    0b00000000,  // 0x00 3E68 0x4D 'M'
    0b01000010,  // 0x42 3E69
    0b01100110,  // 0x66 3E6A
    0b01011010,  // 0x5A 3E6B
    0b01000010,  // 0x42 3E6C
    0b01000010,  // 0x42 3E6D
    0b01000010,  // 0x42 3E6E
    0b00000000,  // 0x00 3E6F
    //
    0b00000000,  // 0x00 3E70 0x4E 'N'
    0b01000010,  // 0x42 3E71
    0b01100010,  // 0x62 3E72
    0b01010010,  // 0x52 3E73
    0b01001010,  // 0x4A 3E74
    0b01000110,  // 0x46 3E75
    0b01000010,  // 0x42 3E76
    0b00000000,  // 0x00 3E77
    //
    0b00000000,  // 0x00 3E78 0x4F 'O'
    0b00111100,  // 0x3C 3E79
    0b01000010,  // 0x42 3E7A
    0b01000010,  // 0x42 3E7B
    0b01000010,  // 0x42 3E7C
    0b01000010,  // 0x42 3E7D
    0b00111100,  // 0x3C 3E7E
    0b00000000,  // 0x00 3E7F
    //
    0b00000000,  // 0x00 3E80 0x50 'P'
    0b01111100,  // 0x7C 3E81
    0b01000010,  // 0x42 3E82
    0b01000010,  // 0x42 3E83
    0b01111100,  // 0x7C 3E84
    0b01000000,  // 0x40 3E85
    0b01000000,  // 0x40 3E86
    0b00000000,  // 0x00 3E87
    //
    0b00000000,  // 0x00 3E88 0x51 'Q'
    0b00111100,  // 0x3C 3E89
    0b01000010,  // 0x42 3E8A
    0b01000010,  // 0x42 3E8B
    0b01010010,  // 0x52 3E8C
    0b01001010,  // 0x4A 3E8D
    0b00111100,  // 0x3C 3E8E
    0b00000000,  // 0x00 3E8F
    //
    0b00000000,  // 0x00 3E90 0x52 'R'
    0b01111100,  // 0x7C 3E91
    0b01000010,  // 0x42 3E92
    0b01000010,  // 0x42 3E93
    0b01111100,  // 0x7C 3E94
    0b01000100,  // 0x44 3E95
    0b01000010,  // 0x42 3E96
    0b00000000,  // 0x00 3E97
    //
    0b00000000,  // 0x00 3E98 0x53 'S'
    0b00111100,  // 0x3C 3E99
    0b01000000,  // 0x40 3E9A
    0b00111100,  // 0x3C 3E9B
    0b00000010,  // 0x02 3E9C
    0b01000010,  // 0x42 3E9D
    0b00111100,  // 0x3C 3E9E
    0b00000000,  // 0x00 3E9F
    //
    0b00000000,  // 0x00 3EA0 0x54 'T'
    0b11111110,  // 0xFE 3EA1
    0b00010000,  // 0x10 3EA2
    0b00010000,  // 0x10 3EA3
    0b00010000,  // 0x10 3EA4
    0b00010000,  // 0x10 3EA5
    0b00010000,  // 0x10 3EA6
    0b00000000,  // 0x00 3EA7
    //
    0b00000000,  // 0x00 3EA8 0x55 'U'
    0b01000010,  // 0x42 3EA9
    0b01000010,  // 0x42 3EAA
    0b01000010,  // 0x42 3EAB
    0b01000010,  // 0x42 3EAC
    0b01000010,  // 0x42 3EAD
    0b00111100,  // 0x3C 3EAE
    0b00000000,  // 0x00 3EAF
    //
    0b00000000,  // 0x00 3EB0 0x56 'V'
    0b01000010,  // 0x42 3EB1
    0b01000010,  // 0x42 3EB2
    0b01000010,  // 0x42 3EB3
    0b01000010,  // 0x42 3EB4
    0b00100100,  // 0x24 3EB5
    0b00011000,  // 0x18 3EB6
    0b00000000,  // 0x00 3EB7
    //
    0b00000000,  // 0x00 3EB8 0x57 'W'
    0b01000010,  // 0x42 3EB9
    0b01000010,  // 0x42 3EBA
    0b01000010,  // 0x42 3EBB
    0b01000010,  // 0x42 3EBC
    0b01011010,  // 0x5A 3EBD
    0b00100100,  // 0x24 3EBE
    0b00000000,  // 0x00 3EBF
    //
    0b00000000,  // 0x00 3EC0 0x58 'X'
    0b01000010,  // 0x42 3EC1
    0b00100100,  // 0x24 3EC2
    0b00011000,  // 0x18 3EC3
    0b00011000,  // 0x18 3EC4
    0b00100100,  // 0x24 3EC5
    0b01000010,  // 0x42 3EC6
    0b00000000,  // 0x00 3EC7
    //
    0b00000000,  // 0x00 3EC8 0x59 'Y'
    0b10000010,  // 0x82 3EC9
    0b01000100,  // 0x44 3ECA
    0b00101000,  // 0x28 3ECB
    0b00010000,  // 0x10 3ECC
    0b00010000,  // 0x10 3ECD
    0b00010000,  // 0x10 3ECE
    0b00000000,  // 0x00 3ECF
    //
    0b00000000,  // 0x00 3ED0 0x5A 'Z'
    0b01111110,  // 0x7E 3ED1
    0b00000100,  // 0x04 3ED2
    0b00001000,  // 0x08 3ED3
    0b00010000,  // 0x10 3ED4
    0b00100000,  // 0x20 3ED5
    0b01111110,  // 0x7E 3ED6
    0b00000000,  // 0x00 3ED7
    //
    0b00000000,  // 0x00 3ED8 0x5B '['
    0b00001110,  // 0x0E 3ED9
    0b00001000,  // 0x08 3EDA
    0b00001000,  // 0x08 3EDB
    0b00001000,  // 0x08 3EDC
    0b00001000,  // 0x08 3EDD
    0b00001110,  // 0x0E 3EDE
    0b00000000,  // 0x00 3EDF
    //
    0b00000000,  // 0x00 3EE0 0x5C '\'
    0b00000000,  // 0x00 3EE1
    0b01000000,  // 0x40 3EE2
    0b00100000,  // 0x20 3EE3
    0b00010000,  // 0x10 3EE4
    0b00001000,  // 0x08 3EE5
    0b00000100,  // 0x04 3EE6
    0b00000000,  // 0x00 3EE7
    //
    0b00000000,  // 0x00 3EE8 0x5D ']'
    0b01110000,  // 0x70 3EE9
    0b00010000,  // 0x10 3EEA
    0b00010000,  // 0x10 3EEB
    0b00010000,  // 0x10 3EEC
    0b00010000,  // 0x10 3EED
    0b01110000,  // 0x70 3EEE
    0b00000000,  // 0x00 3EEF
    //
    0b00000000,  // 0x00 3EF0 0x5E '^' (** up arrow)
    0b00010000,  // 0x10 3EF1
    0b00111000,  // 0x38 3EF2
    0b01010100,  // 0x54 3EF3
    0b00010000,  // 0x10 3EF4
    0b00010000,  // 0x10 3EF5
    0b00010000,  // 0x10 3EF6
    0b00000000,  // 0x00 3EF7
    //
    0b00000000,  // 0x00 3EF8 0x5F '_'
    0b00000000,  // 0x00 3EF9
    0b00000000,  // 0x00 3EFA
    0b00000000,  // 0x00 3EFB
    0b00000000,  // 0x00 3EFC
    0b00000000,  // 0x00 3EFD
    0b00000000,  // 0x00 3EFE
    0b11111111,  // 0xFF 3EFF
    //
    0b00000000,  // 0x00 3F00 0x60 (** pound sign)
    0b00011100,  // 0x1C 3F01
    0b00100010,  // 0x22 3F02
    0b01111000,  // 0x78 3F03
    0b00100000,  // 0x20 3F04
    0b00100000,  // 0x20 3F05
    0b01111110,  // 0x7E 3F06
    0b00000000,  // 0x00 3F07
    //
    0b00000000,  // 0x00 3F08 0x61 'a'
    0b00000000,  // 0x00 3F09
    0b00111000,  // 0x38 3F0A
    0b00000100,  // 0x04 3F0B
    0b00111100,  // 0x3C 3F0C
    0b01000100,  // 0x44 3F0D
    0b00111100,  // 0x3C 3F0E
    0b00000000,  // 0x00 3F0F
    //
    0b00000000,  // 0x00 3F10 0x62 'b'
    0b00100000,  // 0x20 3F11
    0b00100000,  // 0x20 3F12
    0b00111100,  // 0x3C 3F13
    0b00100010,  // 0x22 3F14
    0b00100010,  // 0x22 3F15
    0b00111100,  // 0x3C 3F16
    0b00000000,  // 0x00 3F17
    //
    0b00000000,  // 0x00 3F18 0x63 'c'
    0b00000000,  // 0x00 3F19
    0b00011100,  // 0x1C 3F1A
    0b00100000,  // 0x20 3F1B
    0b00100000,  // 0x20 3F1C
    0b00100000,  // 0x20 3F1D
    0b00011100,  // 0x1C 3F1E
    0b00000000,  // 0x00 3F1F
    //
    0b00000000,  // 0x00 3F20 0x64 'd'
    0b00000100,  // 0x04 3F21
    0b00000100,  // 0x04 3F22
    0b00111100,  // 0x3C 3F23
    0b01000100,  // 0x44 3F24
    0b01000100,  // 0x44 3F25
    0b00111100,  // 0x3C 3F26
    0b00000000,  // 0x00 3F27
    //
    0b00000000,  // 0x00 3F28 0x65 'e'
    0b00000000,  // 0x00 3F29
    0b00111000,  // 0x38 3F2A
    0b01000100,  // 0x44 3F2B
    0b01111000,  // 0x78 3F2C
    0b01000000,  // 0x40 3F2D
    0b00111100,  // 0x3C 3F2E
    0b00000000,  // 0x00 3F2F
    //
    0b00000000,  // 0x00 3F30 0x66 'f'
    0b00001100,  // 0x0C 3F31
    0b00010000,  // 0x10 3F32
    0b00011000,  // 0x18 3F33
    0b00010000,  // 0x10 3F34
    0b00010000,  // 0x10 3F35
    0b00010000,  // 0x10 3F36
    0b00000000,  // 0x00 3F37
    //
    0b00000000,  // 0x00 3F38 0x67 'g'
    0b00000000,  // 0x00 3F39
    0b00111100,  // 0x3C 3F3A
    0b01000100,  // 0x44 3F3B
    0b01000100,  // 0x44 3F3C
    0b00111100,  // 0x3C 3F3D
    0b00000100,  // 0x04 3F3E
    0b00111000,  // 0x38 3F3F
    //
    0b00000000,  // 0x00 3F40 0x68 'h'
    0b01000000,  // 0x40 3F41
    0b01000000,  // 0x40 3F42
    0b01111000,  // 0x78 3F43
    0b01000100,  // 0x44 3F44
    0b01000100,  // 0x44 3F45
    0b01000100,  // 0x44 3F46
    0b00000000,  // 0x00 3F47
    //
    0b00000000,  // 0x00 3F48 0x69 'i'
    0b00010000,  // 0x10 3F49
    0b00000000,  // 0x00 3F4A
    0b00110000,  // 0x30 3F4B
    0b00010000,  // 0x10 3F4C
    0b00010000,  // 0x10 3F4D
    0b00111000,  // 0x38 3F4E
    0b00000000,  // 0x00 3F4F
    //
    0b00000000,  // 0x00 3F50 0x6A 'j'
    0b00000100,  // 0x04 3F51
    0b00000000,  // 0x00 3F52
    0b00000100,  // 0x04 3F53
    0b00000100,  // 0x04 3F54
    0b00000100,  // 0x04 3F55
    0b00100100,  // 0x24 3F56
    0b00011000,  // 0x18 3F57
    //
    0b00000000,  // 0x00 3F58 0x6B 'k'
    0b00100000,  // 0x20 3F59
    0b00101000,  // 0x28 3F5A
    0b00110000,  // 0x30 3F5B
    0b00110000,  // 0x30 3F5C
    0b00101000,  // 0x28 3F5D
    0b00100100,  // 0x24 3F5E
    0b00000000,  // 0x00 3F5F
    //
    0b00000000,  // 0x00 3F60 0x6C 'l'
    0b00010000,  // 0x10 3F61
    0b00010000,  // 0x10 3F62
    0b00010000,  // 0x10 3F63
    0b00010000,  // 0x10 3F64
    0b00010000,  // 0x10 3F65
    0b00001100,  // 0x0C 3F66
    0b00000000,  // 0x00 3F67
    //
    0b00000000,  // 0x00 3F68 0x6D 'm'
    0b00000000,  // 0x00 3F69
    0b01101000,  // 0x68 3F6A
    0b01010100,  // 0x54 3F6B
    0b01010100,  // 0x54 3F6C
    0b01010100,  // 0x54 3F6D
    0b01010100,  // 0x54 3F6E
    0b00000000,  // 0x00 3F6F
    //
    0b00000000,  // 0x00 3F70 0x6E 'n'
    0b00000000,  // 0x00 3F71
    0b01111000,  // 0x78 3F72
    0b01000100,  // 0x44 3F73
    0b01000100,  // 0x44 3F74
    0b01000100,  // 0x44 3F75
    0b01000100,  // 0x44 3F76
    0b00000000,  // 0x00 3F77
    //
    0b00000000,  // 0x00 3F78 0x6F 'o'
    0b00000000,  // 0x00 3F79
    0b00111000,  // 0x38 3F7A
    0b01000100,  // 0x44 3F7B
    0b01000100,  // 0x44 3F7C
    0b01000100,  // 0x44 3F7D
    0b00111000,  // 0x38 3F7E
    0b00000000,  // 0x00 3F7F
    //
    0b00000000,  // 0x00 3F80 0x70 'p'
    0b00000000,  // 0x00 3F81
    0b01111000,  // 0x78 3F82
    0b01000100,  // 0x44 3F83
    0b01000100,  // 0x44 3F84
    0b01111000,  // 0x78 3F85
    0b01000000,  // 0x40 3F86
    0b01000000,  // 0x40 3F87
    //
    0b00000000,  // 0x00 3F88 0x71 'q'
    0b00000000,  // 0x00 3F89
    0b00111100,  // 0x3C 3F8A
    0b01000100,  // 0x44 3F8B
    0b01000100,  // 0x44 3F8C
    0b00111100,  // 0x3C 3F8D
    0b00000100,  // 0x04 3F8E
    0b00000110,  // 0x06 3F8F
    //
    0b00000000,  // 0x00 3F90 0x72 'r'
    0b00000000,  // 0x00 3F91
    0b00011100,  // 0x1C 3F92
    0b00100000,  // 0x20 3F93
    0b00100000,  // 0x20 3F94
    0b00100000,  // 0x20 3F95
    0b00100000,  // 0x20 3F96
    0b00000000,  // 0x00 3F97
    //
    0b00000000,  // 0x00 3F98 0x73 's'
    0b00000000,  // 0x00 3F99
    0b00111000,  // 0x38 3F9A
    0b01000000,  // 0x40 3F9B
    0b00111000,  // 0x38 3F9C
    0b00000100,  // 0x04 3F9D
    0b01111000,  // 0x78 3F9E
    0b00000000,  // 0x00 3F9F
    //
    0b00000000,  // 0x00 3FA0 0x74 't'
    0b00010000,  // 0x10 3FA1
    0b00111000,  // 0x38 3FA2
    0b00010000,  // 0x10 3FA3
    0b00010000,  // 0x10 3FA4
    0b00010000,  // 0x10 3FA5
    0b00001100,  // 0x0C 3FA6
    0b00000000,  // 0x00 3FA7
    //
    0b00000000,  // 0x00 3FA8 0x75 'u'
    0b00000000,  // 0x00 3FA9
    0b01000100,  // 0x44 3FAA
    0b01000100,  // 0x44 3FAB
    0b01000100,  // 0x44 3FAC
    0b01000100,  // 0x44 3FAD
    0b00111000,  // 0x38 3FAE
    0b00000000,  // 0x00 3FAF
    //
    0b00000000,  // 0x00 3FB0 0x76 'v'
    0b00000000,  // 0x00 3FB1
    0b01000100,  // 0x44 3FB2
    0b01000100,  // 0x44 3FB3
    0b00101000,  // 0x28 3FB4
    0b00101000,  // 0x28 3FB5
    0b00010000,  // 0x10 3FB6
    0b00000000,  // 0x00 3FB7
    //
    0b00000000,  // 0x00 3FB8 0x77 'w'
    0b00000000,  // 0x00 3FB9
    0b01000100,  // 0x44 3FBA
    0b01010100,  // 0x54 3FBB
    0b01010100,  // 0x54 3FBC
    0b01010100,  // 0x54 3FBD
    0b00101000,  // 0x28 3FBE
    0b00000000,  // 0x00 3FBF
    //
    0b00000000,  // 0x00 3FC0 0x78 'x'
    0b00000000,  // 0x00 3FC1
    0b01000100,  // 0x44 3FC2
    0b00101000,  // 0x28 3FC3
    0b00010000,  // 0x10 3FC4
    0b00101000,  // 0x28 3FC5
    0b01000100,  // 0x44 3FC6
    0b00000000,  // 0x00 3FC7
    //
    0b00000000,  // 0x00 3FC8 0x79 'y'
    0b00000000,  // 0x00 3FC9
    0b01000100,  // 0x44 3FCA
    0b01000100,  // 0x44 3FCB
    0b01000100,  // 0x44 3FCC
    0b00111100,  // 0x3C 3FCD
    0b00000100,  // 0x04 3FCE
    0b00111000,  // 0x38 3FCF
    //
    0b00000000,  // 0x00 3FD0 0x7A 'z'
    0b00000000,  // 0x00 3FD1
    0b01111100,  // 0x7C 3FD2
    0b00001000,  // 0x08 3FD3
    0b00010000,  // 0x10 3FD4
    0b00100000,  // 0x20 3FD5
    0b01111100,  // 0x7C 3FD6
    0b00000000,  // 0x00 3FD7
    //
    0b00000000,  // 0x00 3FD8 0x7B '{'
    0b00001110,  // 0x0E 3FD9
    0b00001000,  // 0x08 3FDA
    0b00110000,  // 0x30 3FDB
    0b00001000,  // 0x08 3FDC
    0b00001000,  // 0x08 3FDD
    0b00001110,  // 0x0E 3FDE
    0b00000000,  // 0x00 3FDF
    //
    0b00000000,  // 0x00 3FE0 0x7C '|'
    0b00001000,  // 0x08 3FE1
    0b00001000,  // 0x08 3FE2
    0b00001000,  // 0x08 3FE3
    0b00001000,  // 0x08 3FE4
    0b00001000,  // 0x08 3FE5
    0b00001000,  // 0x08 3FE6
    0b00000000,  // 0x00 3FE7
    //
    0b00000000,  // 0x00 3FE8 0x7D '}'
    0b01110000,  // 0x70 3FE9
    0b00010000,  // 0x10 3FEA
    0b00001100,  // 0x0C 3FEB
    0b00010000,  // 0x10 3FEC
    0b00010000,  // 0x10 3FED
    0b01110000,  // 0x70 3FEE
    0b00000000,  // 0x00 3FEF
    //
    0b00000000,  // 0x00 3FF0 0x7E '~'
    0b00010100,  // 0x14 3FF1
    0b00101000,  // 0x28 3FF2
    0b00000000,  // 0x00 3FF3
    0b00000000,  // 0x00 3FF4
    0b00000000,  // 0x00 3FF5
    0b00000000,  // 0x00 3FF6
    0b00000000,  // 0x00 3FF7
    //
    0b00111100,  // 0x3C 3FF8 0x7F '(C)'
    0b01000010,  // 0x42 3FF9
    0b10011001,  // 0x99 3FFA
    0b10100001,  // 0xA1 3FFB
    0b10100001,  // 0xA1 3FFC
    0b10011001,  // 0x99 3FFD
    0b01000010,  // 0x42 3FFE
    0b00111100   // 0x3C 3FFF
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
 */
function clearScreenDithered() {
    //
    // set all the attribute values
    const attr = makeAttribute(my.ink, my.paper, false);
    displayColours.fill(attr);
    //
    // fill the display with an odd pixel pattern
    displayPixels.fill(0b01010101);
    //
    // fill every other line with an even pixel pattern;
    // it is necessary to do this even/odd alternation otherwise
    // the pixels will align into lines instead of a checkerboard
    for (let i = 0; i < (XMAX * YMAX); i += COLUMNS * 2)
       displayPixels.fill(0b10101010, i, i + COLUMNS);
} //                                                         clearScreenDithered

/** drawChar():
 *  Draws a single character at the specified line and column.
 *
 *  @param [line]  Line number, a number from 0 to LINES-1.
 *                 The starting line is at the top of the display.
 *
 *  @param [col]   Column number, a number from 0 to COLUMNS-1.
 *                 The starting column is at the left of the display.
 *
 *  @param [ch]    The character to draw, as a string.
 *                 Only the first character of the string is used.
 */
function drawChar(line, col, ch) {
    if (line < 0 || line >= LINES || col < 0 || col >= COLUMNS)
        return;
    //
    // attributes
    const a = line * COLUMNS + col;
    const attr = makeAttribute(my.ink, my.paper);
    displayColours[a] = attr;
    //
    // index of the first byte of the character in the character set
    const chAt = (ch.charCodeAt(0) - 0x20) * CHARSIZE;
    //
    // copy pixel data
    for (let i = 0; i < CHARSIZE; i++) {
        const at = (line * CHARSIZE + i) * COLUMNS + col;
        displayPixels[at] = CHARSET[chAt + i];
    }
} //                                                                    drawChar

/** drawCharset():
 *  Draws the entire character set at the bottom of the screen.
 *  This method exists so we can visually check that the
 *  system character set in renders properly.
 */
function drawCharset() {
    let chars = "";
    for (let ch = 0x20; ch <= 0x7F; ch++)
        chars += String.fromCharCode(ch);
    drawText(21, 0, chars);
} //                                                                 drawCharset

/** drawText():
 *  Draws a string of text starting from the specified position.
 *  If the text spills past the last column, continues the text
 *  on the next line from the first column.
 *
 *  @param [line]     Line number, a number from 0 to LINES-1.
 *                    The starting line is at the top of the display.
 *
 *  @param [col]      Column number, a number from 0 to COLUMNS-1.
 *                    The starting column is at the left of the display.
 *
 *  @param [ch]       The string to draw.
 */
function drawText(line, col, text) {
    const length = text.length;
    for (let i = 0; i < length && line < LINES; i++) {
        drawChar(line, col, text.charAt(i));
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
 *
 *  @param [context]  Optional context into which to draw.
 */
function update(context) {
    const c = context || this.context();
    this.updateArea(c, 0, 0, LINES, COLUMNS);
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
                let bright =  (a & 0b0_1_000_000) ? 8 : 0;
                let ink    =  (a & 0b0_0_000_111) + bright;
                let paper  = ((a & 0b0_0_111_000) >>> 3) + bright;
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
// # Helper Method

/** makeAttribute():
 *  Creates a colour attribute value which combines the paper and ink colours.
 *
 *  If either the given ink or paper colour is grater than 7,
 *  then the whole attribute will be set to bright mode.
 *
 *  @param [ink]    The ink (foreground) colour, which can range from 0 to 15.
 *                  One of the constants BLACK, BLUE, RED, MAGENTA, GREEN,
 *                  CYAN, YELLOW, WHITE or their bright counterparts.
 *
 *  @param [paper]  The paper (background) colour,
 *                  which can range from 0 to 15.
 */
function makeAttribute(ink, paper) {
    const isBright =
            ink > 7 || paper > 7;
    const brightOffset =
            isBright ? 8 : 0;
    const inkBits =
            brightOffset +
            ink < 0  ? BLACK :
            ink > 15 ? WHITE :
            ink > 7  ? ink - 8 :
            ink;
    const paperBits =
            brightOffset +
            paper < 0  ? BLACK :
            paper > 15 ? WHITE :
            paper > 7  ? paper - 8 :
            paper;
    const brightBit =
            isBright ? 0b01_000_000 : 0;
    const ret =
            brightBit | (paperBits << 3) | inkBits;
    return ret;
} //                                                               makeAttribute

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
    const d = ZXDisplay;
    //
    // clear the screen with a dithered background
    if (true) {
        c.time("clearScreenDithered()");
        d.paper = d.BLUE;
        d.ink = d.BLACK;
        d.clearScreenDithered();
        c.timeEnd("clearScreenDithered()");
    }
    // draw a random strip (at top)
    if (true) {
        const lines = 3;
        //
        c.time("randomizeArea()");
        d.randomizeArea(0, 0, lines, d.COLUMNS);
        c.timeEnd("randomizeArea()");
    }
    // draw the character set (at bottom)
    if (true) {
        c.time("drawCharset()");
        d.paper = d.MAGENTA;
        d.ink = d.BRWHITE;
        d.drawCharset();
        c.timeEnd("drawCharset()");
    }
    // draw the virutal display on the canvas
    c.time("update()");
    d.update();
    c.timeEnd("update()");
    //
    c.timeEnd("drawAll()");
} //                                                                     drawAll

//end
