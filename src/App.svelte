<script>
	import { onMount } from 'svelte';
	import TracingTest from './TracingTest.svelte';
	import {Rectangle, Line, Circle, Scale, Translate, Rotate} from './ParameterizedCurves.js';
	import Guide from './Guide.js';
	import {quadraticTesselation} from './quadratic_tessellation.js';
	import { each, listen, not_equal } from 'svelte/internal';
	let qt_bounds = [-1e5, -1e5, 1e5, 1e5];
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
			let SCALE = 2; // The width of each target is effectively increased to 2x

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

	function nothing(points) {
		return (cursor, delta, real) => {
			return {
				x : real.x,
				y : real.y
			}
		}
	}

	export 
	let target_curve, guide_curve, method, trans, cursor_paths, number_of_points;

	let score = '?';

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
		[Circle({x:100, y:100}, 100), 'Circle({x:100, y:100}, 100)'],
		[Rectangle({x:100, y:100}, 100, 200), 'Rectangle({x:100, y:100}, 100, 200)']
	];

	let transforms = [
		[(c) => c, 'no transform'],
		[(c) => Translate(10, 10, c), 'x+10, y+10'],
		[(c) => Translate(50, 50, c), 'x+50, y+50'],
		[(c) => Scale(1.1, c), 'scale 1.1'],
		[(c) => Scale(1.25, c), 'scale 1.25'],
		[(c) => Rotate(Math.PI / 12, c), 'rotate pi/12'],
		[(c) => Rotate(Math.PI / 6, c), 'rotate pi/6'],
		[(c) => addNoise(c, 2), 'noisey 2px'],
		[(c) => addNoise(c, 10), 'noisey 10px'],
		[(c) => addNoise(c, 30), 'noisey 30px']
	]

	let methods = [
		[nothing, 'nothing'],
		[qt_adjustment(0.5, 20), 'gauss qt 0.5 20px'],
		[quadratic_qt(0.5, 0.5), 'qt 0.5 0.5'],
		[quadratic_qt(0.5, 0.8), 'qt 0.5 0.8'],
		[sp_adjustment(20), 'sp 20'],
	];

	let numbers = [
		10,
		50,
		100,
		200,
		1000
	];
	trans = transforms[0][0];
	method = methods[0][0];
	target_curve = curves[0][0];
	number_of_points = numbers[0];
	$: guide_curve = trans(target_curve);
</script>

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
			{#each transforms as t}
			<li>
				<button on:click="{e => {trans=t[0];}}">{t[1]}</button>
			</li>
			{/each}
		</ul>
		<ul>
			{#each methods as a}
			<li>
				<button on:click="{e => {method = a[0];}}">{a[1]}</button>
			</li>
			{/each}
		</ul>
		<ul>
			{#each numbers as n}
			<li>
				<button on:click="{e => {number_of_points = n;}}">{n}</button>
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