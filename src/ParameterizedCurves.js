export function drawCurve(canvas, curve, dt = 0.01) {
    let ctx = canvas.getContext('2d');
    let p = curve(0);

    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    for (let t = dt; t <= 1.0; t+=dt) {
        p = curve(t);
        ctx.lineTo(p.x, p.y);
        ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
}

export function Translate(x, y, curve) {
    let f = (t) => {
        let r = curve(t);
        return {
            x: r.x + x,
            y: r.y + y
        }
    }
    f.Length = curve.Length;
    f.Extent = [
        curve.Extent[0] + x,
        curve.Extent[1] + x,
        curve.Extent[2] + y,
        curve.Extent[3] + y,
    ];
    return f;
}

export function Scale(s, curve) {
    let cx = (curve.Extent[0] + curve.Extent[1]) / 2;
    let cy = (curve.Extent[2] + curve.Extent[3]) / 2;
    let f = (t) => {
        let r = curve(t);
        return {
            x: (r.x - cx) * s + cx,
            y: (r.y - cy) * s + cy
        }
    }
    f.Length = curve.Length * s;
    f.Extent = [
        (curve.Extent[0] - cx) * s + cx,
        (curve.Extent[1] - cx) * s + cx,
        (curve.Extent[2] - cy) * s + cy,
        (curve.Extent[3] - cy) * s + cy,
    ];
    return f;
}

export function Rotate(theta, curve) {
    let ct = Math.cos(theta);
    let st = Math.sin(theta);

    let cx = (curve.Extent[0] + curve.Extent[1]) / 2;
    let cy = (curve.Extent[2] + curve.Extent[3]) / 2;

    let f = (t) => {
        let r = curve(t);
        let relX = r.x - cx;
        let relY = r.y - cy;

        return {
            x: relX * ct - relY * st + cx,
            y: relX * st + relY * ct + cy
        }
    }
    f.Length = curve.Length;
    let ax = curve.Extent[0],
        ay = curve.Extent[2],
        bx = curve.Extent[1],
        by = curve.Extent[3];

    f.Extent = [
        (ax - cx)*ct + (ay - cy)*st + cx,
        (bx - cx)*ct + (by - cy)*st + cx,
        (ax - cx)*st - (ay - cy)*ct + cy,
        (bx - cx)*ct - (by - cy)*st + cy,
    ];
    return f;
}

function lineFromTimeStampedPoints(points) {
    throw 'Not Implemented';
}

function lineSegment(a, b) {
    let direction = [b.x - a.x, b.y - a.y];
    let self = (t) => {
        if (t > 1.0 || t < 0.0) {
            t = t % 1.0;
        }
        return {
            x : a.x + direction[0] * t,
            y : a.y + direction[1] * t
        }
    }
    self.Length = Math.sqrt(Math.pow(direction[0], 2) + Math.pow(direction[1], 2));
    self.Extent = [Math.min(a.x, b.x), Math.max(a.x, b.x),
                    Math.min(a.y, b.y), Math.max(a.y, b.y)];
    return self;
}

function lineFromPoints(points) {
    let lines = []
    let last_p = points[0];
    for (let i = 1; i < points.length; i++) {
        let p = points[i];
        lines.push(lineSegment(last_p, p));
        last_p = p;
    }

    let length = lines.map((l) => l.Length)
    .reduce((s,c) => s+c);
    let extent = lines.map((l) => l.Extent)
        .reduce((a, b) => [
            Math.min(a[0], b[0]), 
            Math.max(a[1], b[1]), 
            Math.min(a[2], b[2]), 
            Math.max(a[3], b[3]), 
        ]);
    let self = (t) => {
        if (t > 1.0 || t < 0.0) {
            t = t % 1.0;
        }
        t *= length;
        for (let l of lines) {
            if (l.Length >= t) {
                return l(t / l.Length);
            }
            t -= l.Length;
        }
    };
    self.Length = length;
    self.Extent = extent;
    return self;
}

export function Line() {
    if (arguments.length < 2) console.error('Cannot create line with fewer than two points');
    if (arguments[0].t !== undefined) {
        return lineFromTimeStampedPoints(arguments);
    } else {
        return lineFromPoints(arguments);
    }
}

export function Rectangle(p, w, h) {
    return Line({
            x : p.x,
            y : p.y
        }, {
            x : p.x + w,
            y : p.y
        }, {
            x : p.x + w,
            y : p.y + h
        }, {
            x : p.x,
            y : p.y + h
        }, {
            x : p.x,
            y : p.y
        }
    );
}

export function Circle(p, r, offset = 0) {
    let self = (t) => {
        t = t * Math.PI * 2;
        return {
            x : p.x + r * Math.cos(t + offset),
            y : p.y + r * Math.sin(t + offset)
        }
    }
    self.Length = Math.PI * 2 * r;
    self.Extent = [p.x - r, p.x + r, p.y - r, p.x + r];
    return self;
}