export default function Guide (curve, method, n = 200) {
    let dt = 1 / n;
    let points = [];
    
    for(let t = 0.0; t < 1.0; t+=dt) {
        let p = curve(t);
        points.push([p.x,p.y]);
    }

    return method(points);
}
