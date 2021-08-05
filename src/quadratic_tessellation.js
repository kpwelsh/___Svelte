import {Delaunay} from "d3-delaunay";
import { map } from "jquery";
const zip = (a, b) => a.map((k, i) => [k, b[i]]);
const chunk = (a, n) => {
    let result = [];

    for (let i = 0; i < a.length; i+= n) {
        result.push(a.slice(i, i+n));
    }
    return result;
};
const arrayEqual = (a, b) => {
    if (a.length != b.length) {
        return false;
    }
    
    for (let combo of zip(a,b)) {
        if (Math.abs(combo[0] - combo[1]) > 1e-10) {
            return false;
        }
    }
    return true;
}

const intersection = (setA, setB) => {
    let _intersection = new Set();
    for (let elem of setB) {
        if (setA.has(elem)) {
            _intersection.add(elem);
        } 
    }
    return _intersection;
}

const union = (setA, setB) => {
    let _union = new Set();
    for (let elem of setA) {
        _union.add(elem);
    }
    for (let elem of setB) {
        _union.add(elem);
    }
    return _union;
}

const setDiff = (larger, smaller) => {
    let diff = new Set();
    for (let elem of larger) {
        if (!smaller.has(elem)) {
            diff.add(elem);
        }
    }
    return diff;
}

export function quadraticTesselation (points, bounds) {
    // bounds = [xl, yl, xr, yr]
    
    points = points.concat([
        [bounds[0], bounds[1]],
        [bounds[0], bounds[3]],
        [bounds[2], bounds[1]],
        [bounds[2], bounds[3]]
    ]);

    let delaunay = Delaunay.from(points);
    let voronoi = delaunay.voronoi([bounds[0] * 10, bounds[1] * 10, bounds[2] * 10, bounds[3] * 10]);

    let addVertex = (vertices, v) => {
        for (let i = 0; i < vertices.length; i+=1) {
            if (arrayEqual(vertices[i], v)) {
                return i;
            }
        }
        vertices.push(v);
        return vertices.length - 1;
    }

    let vertices = [];
    let vertex_to_point = new Map();
    let point_to_vertex = new Map();

    map(points, (p, i) => {
        let poly = voronoi.cellPolygon(i);
        point_to_vertex.set(i, new Set());
        if (!poly) debugger;
        for(let vert of poly.slice(0, -1)) {
            let v = addVertex(vertices, vert);
            if (!vertex_to_point.has(v)) {
                vertex_to_point.set(v, new Set());
            }
            vertex_to_point.get(v).add(i);
            point_to_vertex.get(i).add(v);
        }
    });

    for (let v of vertex_to_point.keys()){
        if (vertex_to_point.get(v).size < 3) {
            for (let p of vertex_to_point.get(v)) {
                point_to_vertex.get(p).delete(v);
            }
            vertex_to_point.delete(v);
        }
    }

    let neighbors = new Map();
    for (let i = 0; i < points.length; i++) {
        if(!neighbors.has(i)) neighbors.set(i, new Set());
        for (let j = i+1; j < points.length; j++) {
            if (intersection(point_to_vertex.get(i), point_to_vertex.get(j)).size >= 2) { // This is currently picking all edge neighbors
                if(!neighbors.has(j)) neighbors.set(j, new Set());
                neighbors.get(i).add(j);
                neighbors.get(j).add(i);
            }
        }
    }

    function getNeighborRegions (region) {
        let new_neighbors = []
        if (region.size < 3) {
            let neighbor_indices = map(Array.from(region), (p) => {
                return neighbors.get(p);
            }).reduce((prev, cur) => {
                return intersection(prev, cur);
            });
            
            neighbor_indices.forEach((n) => {
                let next_set = new Set();
                region.forEach((p) => next_set.add(p));
                next_set.add(n);
                new_neighbors.push(next_set);
            });
        }

        if (region.size > 1) {
            region.forEach((p) => {
                let next_set = new Set();
                region.forEach((_p) => {
                    if (_p != p) {
                        next_set.add(_p);
                    }
                });
                new_neighbors.push(next_set);
            });
        }
        return new_neighbors;
    };

    function getPlaneNormal (regionA, regionB) {
        let region = intersection(regionA, regionB);
        let new_p_s = setDiff(union(regionA, regionB), region);
        let new_p = Array.from(new_p_s)[0];

        let region_points = [];
        region.forEach((p) => {
            region_points.push(array2vec(points[p]));
        });


        let x0 = region_points[0];
        region_points.shift();
        region_points = map(region_points, (point) => {
            return sub(point, x0);
        });

        let new_point = sub(array2vec(points[new_p]), x0);
        region_points.forEach((point, i, arr) => {
            let n = norm(point);
            new_point = sub(new_point,mulScalarVector(dot(new_point, point) / n, divVectorScalar(point, n)));
        })
        return divVectorScalar(new_point, norm(new_point));
    }


    function shouldMove(x, regionA, regionB, ratio) {

        let normal = getPlaneNormal(regionA, regionB);
        
        let region_verts = map(Array.from(regionA), (p) => {
            return point_to_vertex.get(p);
        }).reduce((last, cur) => {
            return intersection(last, cur);
        });

        let min = 100000;
        let max = -100000;
        let dx = dot(array2vec(x), normal);
        for (let v of region_verts) {
            let vert = array2vec(vertices[v]);
            for (let p of regionA) {
                let point = array2vec(points[p]);
                let internal_vert = addVectors(mulScalarVector(1 - ratio, point), mulScalarVector(ratio, vert));
                let d = dot(internal_vert, normal);

                if (d < min) min = d;
                if (d > max) max = d;
            }
        }

        let neighbor_verts = map(Array.from(regionB), (p) => {
            return point_to_vertex.get(p);
        }).reduce((last, cur) => {
            return intersection(last, cur);
        });
        if (neighbor_verts.size == 0) {
            return {
                should_move: false,
            }
        }
        let next_region = map(Array.from(neighbor_verts), (v) => {
            return vertex_to_point.get(v);
        }).reduce((last, cur) => {
            return intersection(last, cur);
        });

        for (let v of neighbor_verts) {
            let vert = array2vec(vertices[v]);
            for (let p of next_region) {
                let point = array2vec(points[p]);
                let internal_vert = addVectors(mulScalarVector(1 - ratio, point), mulScalarVector(ratio, vert));
                let d = dot(internal_vert, normal);

                if (d > max) {
                    return {
                        should_move : dx > max,
                        next_region : next_region
                    };
                } else if (d < min) {
                    return {
                        should_move : dx < min,
                        next_region : next_region
                    };
                }
            }
        }

        return {
            should_move : false,
        };
    }
    
    function eval_region(x, region, ratio) {
        x = array2vec(x);
        if (region.size == 1) {
            let point = array2vec(points[Array.from(region)[0]]);
            let d = sub(x, point);
            return {
                f: dot(d,d), 
                gd: mulScalarVector(2, d),
                H: [[1,0],[0,1]]
            };
        }

        // Mean points
        let ps = map(Array.from(region), (p) => array2vec(points[p]));
        let mean_p = map(ps, (cur) => divVectorScalar(cur, region.size)).reduce(
            (prev, cur) => addVectors(prev, cur)
        );

        // Mean vertex
        let region_verts = Array.from(map(Array.from(region), (p) => {
            return point_to_vertex.get(p);
        }).reduce((last, cur) => {
            return intersection(last, cur);
        }));

        region_verts = map(region_verts, 
            (v) => array2vec(vertices[v])
        );

        let mean_v = map(region_verts, (cur) => divVectorScalar(cur, region_verts.length)).reduce(
            (prev, cur) => addVectors(prev, cur)
        );
        let mean_nu = addVectors(mulScalarVector(1 - ratio, mean_p), mulScalarVector(ratio, mean_v));
        let d = mulScalarVector(ratio, subVectors(region_verts[0], ps[0]));
        let f0 = dot(d,d);

        let v0 = addVectors(d, ps[0]);

        let x0 = ps[0];
        ps = map(ps, (p) => subVectors(p, x0));

        let H;
        if (region.size == 2) {
            let v = divVectorScalar(ps[1], norm(ps[1]));
            let V = array2mat([[v[0], v[1]], [-v[1], v[0]]]);
            let S = array2mat([[-ratio / (1 - ratio), 0],[0, 1]]);
            H = mulMatrixMatrix(mulMatrixMatrix(transposeMatrix(V), S), V);
        }

        if (region.size >= 3) {
            H = array2mat([[-ratio / (1-ratio), 0],[0, -ratio / (1 - ratio)]]);
        }

        
        let b = mulScalarVector(-1, mulMatrixVector(
            addMatrices(
                mulScalarMatrix(2, H),
                mat([[-2,0],[0,-2]])
            ),
            subVectors(mean_nu, mean_p)
        ));
        
        d = subVectors(v0, mean_p);
        let c = f0 - dot(d, mulMatrixVector(H, d)) - dot(b, d);

        d = subVectors(x, mean_p);

        return {
            f: dot(d, mulMatrixVector(H, d)) + dot(b, d) + c,
            gd: addVectors(mulScalarVector(2, mulMatrixVector(H, d)), b),
            H: [[H.val[0], H.val[2]], [H.val[1], H.val[3]]]
        };
    }

    function get_value (x, ratio) {
        let p;
        for (let i = 0; i < points.length; i++) {
            if (voronoi.contains(i, x[0], x[1])) {
                p = i;
                break;
            }
        }
        let region = new Set();
        region.add(p);
        let moved = false;
        let count = 0;
        while (true) {
            for (let next_region of getNeighborRegions(region)) {
                let res = shouldMove(x, region, next_region, ratio)
                if (res.should_move) {
                    region = res.next_region;
                    moved = true;
                    break;
                }
            }
            if (!moved) {
                return eval_region(x, region, ratio);
            }
            count++;
            moved = false;
            if (count > 10) {
                break;
            }
        }
        return eval_region(x, region, ratio);
    }

    return (x, ratio = 0.5) => {
        return get_value(x, ratio);
    }
};