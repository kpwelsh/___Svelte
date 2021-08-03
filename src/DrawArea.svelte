<script>
    import { onMount } from "svelte";
    function circle (ctx, pos, s, color) {
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        ctx.arc(pos.x, pos.y, s, 0, Math.PI * 2, true);
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.fill();
        ctx.stroke();
    }

    function line(ctx, start, end, s, color) {
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y)
        ctx.lineWidth = s;
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        //ctx.fill();
        ctx.stroke();
    }

    function clear (ctx) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }

    export let width = 300, 
                height = 250, 
                cursor_width = 2, 
                adjustment = undefined,
                background_canvas = undefined;
    export let cursor_paths = [];

    let art_canvas, cursor_canvas, draw_area;

    onMount(() => {
        draw_area.style.width = `${width}px`;
        draw_area.style.height = `${height}px`;
        let art_ctx = art_canvas.getContext('2d');
        let cursor_ctx = cursor_canvas.getContext('2d');

        let has_control = false;
        let is_drawing = false;

        let virtual = {};
        let cursor = {};
        let last_cursor = {};
        let real = {x:0, y:0};
        
        function resetCursor() {
            virtual = {...real};
            cursor = {...virtual};
            last_cursor = {...cursor};
        }
        resetCursor();

        function drawCursor () {
            clear(cursor_ctx);
            if (has_control) {
                circle (cursor_ctx, cursor, cursor_width, 'rgb(0, 0, 0)');
            }
        }

        function clearArt (e) {
            if (e.key == 'c') {
                clear(art_ctx);
                cursor_paths = [[{...cursor}]];
            }
        }

        draw_area.addEventListener('click', (e) => {
            if (has_control) {
                is_drawing = !is_drawing;
                if (is_drawing) cursor_paths.push([]);
            } else {
                cursor_canvas.requestPointerLock();
                document.addEventListener('keydown', clearArt);
            }
            drawCursor();
        });

        document.addEventListener('pointerlockchange', (e) => {
            has_control = document.pointerLockElement === cursor_canvas;
            if (has_control) {
                resetCursor();
                drawCursor();
            } else {
                is_drawing = false;
                document.removeEventListener('keydown', clearArt);
            }
        });

        draw_area.addEventListener('mousemove', (e) => {
            real = {
                x: e.offsetX,
                y: e.offsetY
            };

            virtual.x += e.movementX / window.devicePixelRatio;
            virtual.y += e.movementY / window.devicePixelRatio;
            
            virtual.x = Math.min(cursor_canvas.width, Math.max(0, virtual.x));
            virtual.y = Math.min(cursor_canvas.height, Math.max(0, virtual.y));
            if (adjustment) {
                cursor = adjustment(
                    cursor,
                    {x: e.movementX, y: e.movementY},
                    virtual
                );
                cursor.x = Math.min(cursor_canvas.width, Math.max(0, cursor.x));
                cursor.y = Math.min(cursor_canvas.width, Math.max(0, cursor.y));
            } else {
                cursor = {...virtual};
            }

            if (is_drawing) {
                line(art_ctx, last_cursor, cursor, 2 * cursor_width, 'rgb(0,0,0');
                cursor_paths[cursor_paths.length-1].push({...cursor});
            }
            last_cursor = {...cursor};
            drawCursor();
        });
    });
</script>

<main class="card" bind:this={draw_area} on:keydown>
    <div>
        <canvas bind:this={background_canvas} width={width} height={height}>
        </canvas>
        <canvas bind:this={art_canvas} width={width} height={height}>
        </canvas>
        <canvas bind:this={cursor_canvas} width={width} height={height}>
        </canvas>
    </div>
</main>

<style>
    main {
        position: relative;
    }
    div {
        width: 100%;
        height: 100%;
    }
    
    canvas {
        background-color: transparent;
        position: absolute;
        left: 10px;
        top: 10px;
    }
    
    canvas:focus {
        border: none;
    }
</style>