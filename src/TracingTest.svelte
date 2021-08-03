<script>
	import { onMount } from 'svelte';
	import DrawArea from './DrawArea.svelte';
	import Timer from './Timer.svelte';
    import {drawCurve, Translate, Line} from './ParameterizedCurves.js';
	import Guide from './Guide';

    export let guide_curve, method, target_curve, number_of_points;
	let guide, cursor_paths, trans;

	let time, background_canvas, score;
	time = 10;
	score = '?';
	let width = Math.max(600, screen.width * 0.6),
		height = Math.max(400, screen.height * 0.6);

	
	function computeScore() {
		let lw = 5;
		let w = 1;
		let pixelWidth = Math.round(lw / w);

		function draw(counter, _x, _y, w, v) {
			for(let x = _x - w; x <= _x + w; x++) {
				for(let y = _y - w; y <= _y + w; y++) {
					counter[[x,y]] = v;
				}
			}
		}

		function accumulate(counter) {
			let vals = {};
			for (let k in counter) {
				let v = counter[k];
				if (v in vals) vals[v] += 1;
				else vals[v] = 1;
			}
		
			return vals;
		}

		let counter = {};
		let total_drawn = 0,
			total_to_draw = 0;

		for (let t = 0; t <= 1.0; t+=0.01) {
			let p = trans(target_curve)(t);
			let x = Math.round(p.x/w);
			let y = Math.round(p.y/w);
			draw(counter, x, y, pixelWidth, -1);
		}

		total_to_draw = accumulate(counter)[-1];

		for (let path of cursor_paths) {
			if (path.length < 2) continue;
			let curve = Line(...path);
			for (let t = 0; t <= 1.0; t+=0.01) {
				let p = curve(t);
				let x = Math.round(p.x/w);
				let y = Math.round(p.y/w);
				let k = [x,y];
				draw(counter, x, y, pixelWidth, 1);
			}
		}

		let counts = accumulate(counter);
		total_drawn = total_to_draw - counts[-1];

		score = `${(100*total_drawn/total_to_draw).toFixed(0)}% filled, ${(100*(counts[1] - total_drawn)/total_to_draw || 0).toFixed(0)}% error.`;
	}

    function keydownHandle(e) {
        if (e.key == 'a') {
            print('huh');
        }
    }

    onMount(() => {
		update();

		let scoreKeeper = () => {
			computeScore();
			setTimeout(scoreKeeper, 500);
		};

		scoreKeeper();

    });

    function update() {
		let cx = width / 2,
			cy = height / 2,
			lx = target_curve.Extent[0],
			w = target_curve.Extent[1] - lx,
			ly = target_curve.Extent[2],
			h = target_curve.Extent[3] - ly;
		
		trans = (c) => Translate(cx - lx - w/2, cy - ly - h/2, c);
		guide = Guide(trans(guide_curve), method, number_of_points);
        if (background_canvas) {

            let ctx = background_canvas.getContext('2d');
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            drawCurve(background_canvas, trans(guide_curve));
			ctx.setLineDash([10,10]);
            background_canvas.getContext('2d').stroke();
			ctx.setLineDash([]);
            drawCurve(background_canvas, trans(target_curve));
            background_canvas.getContext('2d').stroke();
        }
    }

    $: {method,target_curve,guide_curve,number_of_points; update()};
</script>

<main on:keydown="{keydownHandle}">
	<div>
		<!-- <div class="topleft">
			<Timer  
					time={time} width={60} 
					height={60} />
		</div> -->
		<DrawArea width={width}
				height={height}
                adjustment={guide}
                bind:background_canvas={background_canvas}
				bind:cursor_paths={cursor_paths}/>
				
		<div class="results">
			<span>Score: {score}</span>
		</div>
	</div>
</main>

<style>
	main {
		margin: auto;
		font-size: 40px;
		font-weight: bolder;
	}

	main > div {
		position: relative;
		margin: auto;
	}

	.topleft {
		position: absolute;
		top: 5px;
		left: 5px;
	}
	.results {
		font-size: medium;
		font-weight: normal;
		margin-left: auto;
		margin-right: auto;
		margin-top: 30px;
	}
</style>