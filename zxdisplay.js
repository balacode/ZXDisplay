// -----------------------------------------------------------------------------
// ZX Spectrum Display Simulator                                  [zxdisplay.js]
// (c) balarabe@protonmail.com                                      License: MIT
// -----------------------------------------------------------------------------

// # Constants
// # Loader

// -----------------------------------------------------------------------------
// # Constants

// Display resolution:
const CHARSIZE = 8; // each character is 8 pixels high and wide
const COLUMNS = 32; // number of text columns (and horizontal colour attributes)
const LINES = 24;   // number of text lines (and vertical colour attributes)
const SCALE = 3;    // one Spectrum pixel is so many pixels on modern displays
const XMAX = 256;   // horizontal resolution
const YMAX = 192;   // vertical resolution

// 15 colours the ZX Spectrum can display:
//
// Normal:
const BLACK    = "#000000";
const BLUE     = "#0000D7";
const RED      = "#D70000";
const MAGENTA  = "#D700D7";
const GREEN    = "#00D700";
const CYAN     = "#00D7D7";
const YELLOW   = "#D7D700";
const WHITE    = "#D7D7D7";
//
// Bright:
const BRBLUE    = "#0000FF";
const BRRED     = "#FF0000";
const BRMAGENTA = "#FF00FF";
const BRGREEN   = "#00FF00";
const BRCYAN    = "#00FFFF";
const BRYELLOW  = "#FFFF00";
const BRWHITE   = "#FFFFFF";

const PIXEL_BYTE_COUNT = 6144;  // XMAX * YMAX / 8 pixels per byte

// -----------------------------------------------------------------------------
// # Loader

window.addEventListener("load", drawAll, false);

function drawAll() {
    console.log("drawAll()");
    //
    // clear the screen
    let canvas = document.getElementById("zx_canvas");
    let c = canvas.getContext("2d");
    c.fillStyle = WHITE;
    c.fillRect(0, 0, XMAX * SCALE, YMAX * SCALE);
}

//end
