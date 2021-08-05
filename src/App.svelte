<script>
	import { onMount } from 'svelte';
	import TracingTest from './TracingTest.svelte';
	import {Rectangle, Line, Circle, Scale, Translate, Rotate} from './ParameterizedCurves.js';
	import Guide from './Guide.js';
	import {quadraticTesselation} from './quadratic_tessellation.js';
	import { each, listen, not_equal } from 'svelte/internal';

	let qt_bounds = [-1e5, -1e5, 1e5, 1e5];
	let radius = 50,
		qt_ratio = 0.5;
	
	function qt_adjustment(ratio, width) {
		return (points) => {
			let tess = quadraticTesselation(points, qt_bounds);
			return (cursor, delta, real) => {
				let val = tess([real.x, real.y], ratio);
				let gd = [val.gd[0] * Math.exp(-val.f / (width*width)), val.gd[1] * Math.exp(-val.f / (width*width))];
				return {
					x : real.x - gd[0] / 2,
					y : real.y - gd[1] / 2
				}
			}
		}
	}

	function quadratic_qt(ratio, scale) {
		return (points) => {
			let tess = quadraticTesselation(points, qt_bounds);
			return (cursor, delta, real) => {
				let val = tess([real.x, real.y], ratio);
				return {
					x : real.x - scale * val.gd[0] / 2,
					y : real.y - scale * val.gd[1] / 2
				}
			}
		}
	}

	function sp_adjustment(width) {
		return (points) => {
			let WIDTH = 2 * width; // The total width of the target, not the radius
			let SCALE = 1 + 3*effect_scale; // The width of each target is effectively increased to 2x

			let get_scale = function (x, y) {
				let d = 1000000;
				for(let p of points) {
					let o = Math.sqrt((x - p[0]) * (x - p[0]) + (y - p[1]) * (y - p[1]));
					if (o < d) {
						d = o;
					}
				}

				let local_scale = 1 + (SCALE - 1) * Math.log(3) / (Math.pow(Math.cosh(Math.log(3) * d / WIDTH), 2));
				return 1 / local_scale;
			};

			return (p, delta, real) => {
				let dt = 0.01;
				let {x, y} = p;
				let dx = delta.x;
				let dy = delta.y;
				for (let t = dt; t <= 1; t += dt) {
					let s = get_scale(x, y);
					x += s * dt * dx;
					y += s * dt * dy;
				}
				return {
					x : x,
					y : y
				}
			};
		};
	};

	function stepSlowness(width) {
		return (points) => {
			return (cursor, delta, real) => {
				let d = Math.min(...points.map(p => Math.sqrt(Math.pow(p[0] - cursor.x, 2) + Math.pow(p[1] - cursor.y, 2))));
				let s = 1;
				if (d < width) {
					s = 1 - effect_scale;
				}
				return {
					x: cursor.x + s * delta.x,
					y: cursor.y + s * delta.y
				}
			}
		}
	}

	function snap(points) {
		let tess = quadraticTesselation(points, qt_bounds);
		return (cursor, delta, real) => {
			let val = tess([real.x, real.y], 0.99);
			return {
				x : real.x - val.gd[0] / 2,
				y : real.y - val.gd[1] / 2
			}
		}
	}

	function nothing(points) {
		return (cursor, delta, real) => {
			return {
				x : real.x,
				y : real.y
			}
		}
	}

	function testA(radius, ratio) {
		return (points) => {
			let qt = qt_adjustment(ratio, radius)(points);
			return (cursor, delta, real) => {
				let l2 = Math.pow(delta.x, 2) + Math.pow(delta.y, 2);
				let d = Math.sqrt(l2);
				if (l2 == 0) {
					return cursor;
				}

				let A = qt(undefined, undefined, cursor);
				let B = qt(undefined, undefined, {x:cursor.x+delta.x, y:cursor.y+delta.y});

				let qt_delta = [B.x - A.x, B.y - A.y];
				let s = (qt_delta[0] * delta.x + qt_delta[1] * delta.y) / d;
				s = Math.max(1 - effect_scale, s);
				
				return {
					x: cursor.x + s * delta.x / d,
					y: cursor.y + s * delta.y / d 
				};
			}
		}
	}


	function testB(radius, ratio) {
		return (points) => {
			let qt = quadratic_qt(ratio, 1)(points);
			
			return (cursor, delta, real) => {
				let l2 = Math.pow(delta.x, 2) + Math.pow(delta.y, 2);
				let d = Math.sqrt(l2);
				if (l2 == 0) {
					return cursor;
				}
				

				let val = qt(undefined, undefined, cursor);
				let ideal_delta = [val.x - cursor.x, val.y - cursor.y];
				let l = Math.sqrt(Math.pow(ideal_delta[0], 2) + Math.pow(ideal_delta[1], 2));
				let s = (ideal_delta[0] * delta.x + ideal_delta[1] * delta.y) / d / l;
				//s = Math.max(0.1, s);
				s *= effect_scale;
				
				return {
					x: cursor.x + (1+s) * delta.x,
					y: cursor.y + (1+s) * delta.y 
				};
			}
		}
	}

	function gaussianSlow(radius) {
		return (points) => {
			return (cursor, delta, real) => {
				let d = Math.min(...points.map(p => Math.sqrt(Math.pow(p[0] - cursor.x, 2) + Math.pow(p[1] - cursor.y, 2))));
				let s = 1 - effect_scale * Math.exp(-d*d / (radius*radius));

				return {
					x: cursor.x + s * delta.x,
					y: cursor.y + s * delta.y
				}
			}
		}
	}
	// function test(points, radius, ratio) {
	// 	function move(x, dir, dx) {
	// 		let val = tess([x.x, x.y], ratio);
	// 		let H = val.H;
	// 		let s = (dir[0] * (H[0][0] * dir[0] + H[0][1] * dir[1])
	// 				+ dir[1] * (H[1][0] * dir[0] + H[1][1] * dir[1]));
	// 		s *= scale;// * Math.exp(-val.f / (width * width));
	// 		s = 1 - s;
	// 		console.log(s);
	// 		return {
	// 			x : x.x + s * dir[0] * dx,
	// 			y : x.y + s * dir[1] * dx
	// 		}
	// 	}

	// 	return (cursor, delta, real) => {
	// 		let l2 = Math.pow(delta.x, 2) + Math.pow(delta.y, 2);
	// 		let d = Math.sqrt(l2);
	// 		if (l2 == 0) {
	// 			return cursor;
	// 		}
	// 		let dir = [delta.x, delta.y];
	// 		dir[0] /= d;
	// 		dir[1] /= d;
	// 		let t;
	// 		for (t = dt; t <= d; t+=dt) {
	// 			cursor = move(cursor, dir, dt);
	// 		}
	// 		if (t - d > 0) {
	// 			cursor = move(cursor, dir, t - d);
	// 		}
			
	// 		return cursor;
	// 	}
	// }

	export 
	let target_curve, guide_curve, method, cursor_paths, number_of_points = 200;

	let displacement = 0,
		rotation = 0,
		noise = 0,
		scale = 1,
		effect_scale = 0.5;
		

	function addNoise(c, s = 1) {
		let dt = 0.01;
		let points = [];
		for (let t = 0; t < 1.0; t+=dt) {
			let p = c(t);
			points.push({
				x: p.x + s*(Math.random() - 0.5),
				y: p.y + s*(Math.random() - 0.5)
			});
		}
		return Line(...points);
	};

	let curves = [
		[Rectangle({x:100, y:100}, 100, 200), 'Rectangle({x:100, y:100}, 100, 200)'],
		[Circle({x:100, y:100}, 100), 'Circle({x:100, y:100}, 100)'],
	];

	let methods = []; 

	let method_index = 2;
	method = nothing;
	target_curve = curves[0][0];

	$: {
		effect_scale;
		methods = [
			[nothing, 'nothing'],
			[testA(radius, qt_ratio), 'testA'],
			[testB(radius, qt_ratio), 'testB'],
			[sp_adjustment(radius), 'semantic pointing'],
			[snap, 'snap'],
			[stepSlowness(radius), 'step slowness'],
			[gaussianSlow(radius), 'gaussian slow']
		];

		method = methods[method_index][0];
	}

	$: {
		guide_curve = addNoise(
			Scale(
				scale,
				Translate(
					displacement, displacement,
					Rotate(
						rotation * Math.PI / 180,
						target_curve
					)
				)
			), noise);
	}

	function resetTransform() {
		displacement = 0;
		rotation = 0;
		noise = 0;
		scale = 1;
	};
</script>


<div class = "control-panel">
	<div class = "control-panel-column">
		<div class = "control-panel-title">
			Method Parameters
		</div>
		<div>Radius:</div>
		<input type="range" min="0" max="200" bind:value={radius}>
		<div>{radius}px</div>

		<div>QT Ratio:</div>
		<input type="range" min="0" max="0.9" step="0.05" bind:value={qt_ratio}>
		<div>{qt_ratio}</div>

		<div>Effect Scale:</div>
		<input type="range" min="0" max="1" step="0.05" bind:value={effect_scale}>
		<div>{effect_scale}</div>
	</div>
	<div class = "control-panel-column">
		<div class = "control-panel-title">
			Guide Transformation
			<button on:click={resetTransform}>Reset Transform</button>
		</div>
		<div>Translation:</div>
		<input type="range" min="-50" max="50" bind:value={displacement}>
		<div>{displacement}px</div>

		<div>Rotation:</div>
		<input type="range" min="-90" max="90" bind:value={rotation}>
		<div>{rotation}</div>

		<div>Scale:</div>
		<input type="range" min="0.1" max="2" step="0.1" bind:value={scale}>
		<div>{scale}</div>

		<div>Noise:</div>
		<input type="range" min="0" max="50" bind:value={noise}>
		<div>{noise}px</div>
	</div>
</div>
<main>
	<lists>
		<ul>
			{#each curves as c}
			<li>
				<button on:click="{e => {target_curve = c[0];}}">{c[1]}</button>
			</li>
			{/each}
		</ul>
		<ul>
			{#each methods as a, i}
			<li>
				<button on:click="{e => {method_index = i;}}">{a[1]}</button>
			</li>
			{/each}
		</ul>
	</lists>
	<test>
		<TracingTest 
		guide_curve={guide_curve}
		number_of_points={number_of_points}
		method={method}
		target_curve={target_curve}
		bind:cursor_paths={cursor_paths}/>
	</test>
</main>


<style>
	.control-panel {
		display: flex;
		width: min-content;
		margin-top: auto;
		margin-left: auto;
		margin-right: auto;
	}

	.control-panel-column {
		display: grid;
		grid-template-columns:max-content;
		margin-left: 10px;
		margin-right: 10px;
	}

	.control-panel-column div {
		margin-top: auto;
		margin-bottom: auto;
	}

	.control-panel-column input + div {
		min-width: 50px;
		text-align: right;
	}
	
	.control-panel-title {
		width: max-content;
		grid-column-start: 1;
		grid-column-end: 4;
		margin-left: auto;
		margin-right: auto;
	}

	.control-panel-column > div {
		width: max-content;
	}


	main {
		display: flex;
		flex-direction: row;
	}
	lists {
		margin:auto;
		display: flex;
		flex-direction: row;
	}
	ul {
		list-style: none;
		padding: 0;
	}
	test {
		margin-right: auto;
	}
	li > button {
		width:100%;
	}
	li {
		margin: auto;
		text-align: center;
	}
</style>