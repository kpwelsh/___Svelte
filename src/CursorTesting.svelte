<script>
	import { onMount } from 'svelte';
	import DrawArea from './DrawArea.svelte';
	import {Rectangle, Line, Circle, Scale, Translate, Rotate} from './ParameterizedCurves.js';
	import Guide from './Guide.js';
	import {quadraticTesselation} from './quadratic_tessellation.js';
	import { each, listen, not_equal } from 'svelte/internal';
    import {Trajectories} from './normed_trajectories.js';

	let qt_bounds = [-1e5, -1e5, 1e5, 1e5];

    let background_canvas, adjustment;
    let width = 0.6*screen.width;
    let height = 0.4*screen.height;
    let canvas;

    function circle (ctx, pos, s, color) {
        ctx.beginPath();
        ctx.moveTo(pos[0], pos[1]);
        ctx.arc(pos[0], pos[1], s, 0, Math.PI * 2, true);
        ctx.strokeStyle = 'rgba(0,0,0,0)';
        ctx.fillStyle = color;
        ctx.fill();
        ctx.stroke();
    }

    onMount(() => {
        let start = [-200 + width/2, height/2];
        let end = [200 + width/2, height/2];
        let points = [start, end];
        let ctx = canvas.getContext('2d');
        let circ_color = 'rgba(0,0,255,0.5)';
        let radius = 20;
        circle(ctx, [start[0],start[1]], radius, circ_color);
        circle(ctx, [end[0],end[1]], radius, circ_color);

        function zip(a,b) {
            let r = [];
            for(let i = 0; i < Math.min(a.length, b.length); i++) {
                r.push([a[i], b[i]]);
            }
            return r;
        }

        function transformTrajectory(traj) {
            let x = [end[0] - start[0], end[1] - start[1]];
            let d = Math.sqrt(x[0]*x[0] + x[1]*x[1]);
            x[0] /= d;
            x[1] /= d;
            let y = [-x[1], x[0]];
            return traj.map(p => 
                [
                    start[0] + (p[0]*x[0] + p[1]*y[0])*d, 
                    start[1] + (p[0]*x[1] + p[1]*y[1])*d
                ]
            );
        }

        function drawTrajectory(traj) {
            ctx.beginPath();
            ctx.moveTo(traj[0][0], traj[0][1]);
            traj.slice(1).forEach((p) => ctx.lineTo(p[0], p[1]))
            ctx.strokeStyle = 'rgba(0,0,255,0.5)';
            ctx.stroke();
        }

        ctx.filter = 'blur(2px)';
        let all_trajectories = Trajectories.map(t => transformTrajectory(zip(t[0], t[1])));
        for (let t of all_trajectories.slice(0,50)) {
            drawTrajectory(t);
        }

        ctx.filter = 'none';
        all_trajectories.forEach(t => {
            let color = 'rgba(255, 0, 0, 0.1)';
            let p = t[t.length-1];
            if (Math.sqrt(Math.pow(end[0]-p[0],2) + Math.pow(end[1]-p[1],2)) < radius) {
                color = 'rgba(0, 255, 0, 0.1)';
            }
            circle(ctx, p, 1, color);
        });



        // let scale = (cursor) => {
        //     let d = points
        //         .map((p) => {
        //             return Math.sqrt(Math.pow(p[0] - cursor.x, 2) + Math.pow(p[1] - cursor.y, 2));
        //         }).reduce((a,b) => {
        //             return Math.min(a,b);
        //         });
        //     return 1 - 0.8*Math.exp(-(d*d / 1000));
        // }

        // let f = (cursor, delta) => {
        //     let dx = Math.sqrt(delta.x*delta.x + delta.y*delta.y);
        //     let direction = [delta.x / dx, delta.y / dx];

        //     let distance = points.map((p) => {
        //         return Math.sqrt(Math.pow(p[0] - cursor.x, 2) + Math.pow(p[1] - cursor.y, 2));
        //     });

            

        //     let s = scale(cursor);
        //     return {
        //         x: cursor.x + delta.x * s,
        //         y: cursor.y + delta.y * s
        //     };
        // };


        // if (background_canvas) {
        //     let ctx = background_canvas.getContext('2d');
        //     ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        //     for (let dot of points) {
        //         circle(ctx, {x:dot[0] + width/2, y:dot[1] + height/2}, 20, 'blue');
        //     }
        // }
        
        // adjustment = (cursor, delta, real) => {
        //     let p = f({
        //         x: cursor.x - width / 2,
        //         y: cursor.y - height / 2
        //     }, delta);
        //     console.log(p);
        //     return {
        //         x: p.x + width/2,
        //         y: p.y + height/2
        //     }
        // };
    });
</script>

<main>
	<div class="card">
		<!-- <DrawArea
            adjustment={adjustment}
            width={width}
            height={height}
            bind:background_canvas={background_canvas}
        /> -->
        <canvas bind:this={canvas} width={width} height={height}></canvas>
	</div>
</main>
<style>
    main {
        margin: auto;
        width: min-content;
        height: min-content;
    }


</style>