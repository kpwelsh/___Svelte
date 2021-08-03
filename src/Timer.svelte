<script>
	import { createEventDispatcher, onMount } from 'svelte';
    
    export let time = 0,
                width = 30,
                height = 30,
                interval = 1,
                resolution = 1;

    let dispatcher = createEventDispatcher();
    let start, end, ticker;
    let remaining_time = time;
    let display_time = remaining_time;


    function updateDisplay() {
        display_time = Math.round(remaining_time / 1000 / resolution) * resolution;
    }

    function tick() {
        remaining_time = end - new Date().getTime();
        remaining_time = Math.max(remaining_time, 0);
        updateDisplay();
        dispatcher('tick', {
            current_time : new Date().getTime(),
            remaining_time : remaining_time
        });

        if (remaining_time == 0) {
            dispatcher('timeup', {
                current_time : new Date().getTime(),
                elapsed_time : time
            });
            stopTicker();
        }
    }


    function stopTicker() {
        if (ticker) clearInterval(ticker);
        ticker = undefined;
    };

    function onTimeChange(time) {
        start = new Date().getTime();
        remaining_time = time * 1000;
        end = start + remaining_time;
        stopTicker();
        ticker = setInterval(tick, interval * 1000);
    };

    $: onTimeChange(time);
</script>

<main style="width:{width}px; height:{height}px;">
    <div class="circle"></div>
    <div class="time">{display_time}</div>
</main>


<style>
    main {
        position: relative;
    }

    .circle {
        position: absolute;
        height: calc(100% - 4px);
        width: calc(100% - 4px);
        border: 2px solid black;
        border-radius: 50%;
        z-index: -1;
    }

    .time {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
    }
</style>