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
uniform vec2 oldCamCenterWorld;
uniform float oldCamWorldUnitsPerPixel;
uniform sampler2D oldFrame;
uniform bool cChanged; // true if c changed, ignore old frame

#define TRUE_MAX_ITERS 16384.0

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
    return (worldCoords - oldCamCenterWorld) / oldCamWorldUnitsPerPixel + 0.5 * windowSizePixels;
}

// For SSAA
// Given (dx, dy) in [0, AA)^2, suppose the unit square [0, 1)^2 was cut up into AA equal
// partitions along each dimension. delta((dx, dy)) returns the center of the sub-square
// which is in the dy'th row and dx'th column (both 0-indexed).
vec2 delta(vec2 dxy) {
    return vec2(dxy + 0.5) / float(AA);
}
void main() {
    
    vec2 pixelCorner = floor(gl_FragCoord.xy);

    vec4 sum = vec4(0.0);
    for (int dy = 0; dy < AA; ++dy) {
        for (int dx = 0; dx < AA; ++dx) {
            vec2 sampleWindow = pixelCorner + delta(vec2(dx, dy));
            vec2 world = windowToWorld(sampleWindow);
            EscapeTime t = escapeTimeSmooth(world);
            // Points that never escape are inside the set; color them black
            vec4 color = t.isInf ? vec4(0.0, 0.0, 0.0, 1.0) : colorTime(t.iters);

            // Where was this point on screen last frame? If it was visible,
            // blend with the last frame's color
            vec2 oldWindow = worldToOldWindow(world);
            if (all(greaterThanEqual(oldWindow, vec2(0.0))) &&
                all(lessThan(oldWindow, windowSizePixels))) {
                    vec4 oldColor = texture2D(oldFrame, oldWindow / windowSizePixels);
                    
                    // alpha: how much to trust the new smaple vs the old frame
                    // Escaped points use a log scale of their iter count
                    // Points that didn't escape use MAX_ITER / TRUE_MAX_ITERS
                    // while moving (MAX_ITERS is low), so the old image is kept
                    float alpha;
                    if (cChanged) {
                        alpha = 1.0;
                    }
                    else if (t.isInf) {
                        alpha = float(MAX_ITERS) / TRUE_MAX_ITERS;
                    }
                    else {
                        alpha = clamp(log(1.0 + max(t.iters, 0.0)) / log(1.0 + TRUE_MAX_ITERS), 0.0, 1.0);
                    }
                    color = mix(oldColor, color, alpha);

                }
                sum += color;
        }
    }
    
    // TODO
    // EscapeTime t = escapeTimeSmooth(windowToWorld(gl_FragCoord.xy));
    // gl_FragColor = t.isInf ? vec4(0.0, 0.0, 0.0, 1.0) : colorTime(t.iters);
    gl_FragColor = sum / float(TOTAL_SAMPLES);
    // gl_FragColor = ... some vec4 rgba colour
}
