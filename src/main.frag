#version 120 

// (way more precision than a float can actually store...)
#define LOG_2 0.6931471805599453094172321214581765680755001

// start using these antialiasing values once you start (c)
#define AA 2
const int TOTAL_SAMPLES = AA * AA;

uniform vec2 c;
uniform int MAX_ITERS;
uniform vec2 windowSizePixels;
uniform vec2 camCenterWorld;
uniform float camWorldUnitsPerPixel;

// reprojection (1d) may require extra uniforms here...

// Use this to get a color from your smoothed Julia set escape times.
vec4 colorTime(float t) {
    return vec4(0.5 + 0.5 * cos(  0.1 * (t) + vec3(0.f, 0.35, 0.7)), 1.f);
}

struct EscapeTime {
    float iters;
    bool isInf;
};

// Escape time of iterating z^2 + c
EscapeTime escapeTimeSmooth(vec2 z) {
    // TODO
    for (int i = 1; i <= MAX_ITERS; ++i) {
        if (length(z) > 4.0) {
            // i is the escape time n, step once more to get z_n
            z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
            float n = float(i);
            return EscapeTime(n + 1.0 - log(log(length(z))) / LOG_2, false);
        }
        // z = z^2 + c, using (x + iy) ^ 2 = (x^2 - y^2) + i(2xy)
        z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
    }
    // Never escaped within MAX_ITERS, so treat the escape time as infinite
    return EscapeTime(0.0, true);
}


vec2 windowToWorld(vec2 windowCoords) {
    // uses the camera uniforms above to convert a window-space (pixels) point to a world-coordinates point.
    return (windowCoords - 0.5 * windowSizePixels) * camWorldUnitsPerPixel + camCenterWorld;
}

// For reprojection
vec2 worldToOldWindow(vec2 worldCoords) {
    return vec2(0.0);
}

// For SSAA
// Given (dx, dy) in [0, AA)^2, suppose the unit square [0, 1)^2 was cut up into AA equal
// partitions along each dimension. delta((dx, dy)) returns the center of the sub-square
// which is in the dy'th row and dx'th column (both 0-indexed).
vec2 delta(vec2 dxy) {
    return vec2(0.0);
}


void main() {
    // TODO
    EscapeTime t = escapeTimeSmooth(windowToWorld(gl_FragCoord.xy));
    gl_FragColor = t.isInf ? vec4(0.0, 0.0, 0.0, 1.0) : colorTime(t.iters);
    // gl_FragColor = ... some vec4 rgba colour
}
