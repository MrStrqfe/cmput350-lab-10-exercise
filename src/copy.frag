#version 120 

uniform sampler2D toCopy;

void main() {
    // Draw the finished frame to the window. The fullscreen
    // triangle's texture
    // coordinates go from (0, 0) to (1, 1) across the screen

    gl_FragColor = texture2D(toCopy, gl_TexCoord[0].xy);
}
