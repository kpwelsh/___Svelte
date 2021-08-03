import {getTemplate} from './Templating.js';

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

export function DrawArea({container, width = 300, height = 150, cursor_width = 2, adjustment = undefined}) {
    let draw_area = getTemplate('drawArea');
    draw_area.style.width = `${width}px`;
    draw_area.style.height = `${height}px`;
    let art_canvas = draw_area.querySelector('canvas.art');
    let cursor_canvas = draw_area.querySelector('canvas.cursor');
    let background_canvas = draw_area.querySelector('canvas.background');
    background_canvas.width = width;
    art_canvas.width = width;
    cursor_canvas.width = width;
    background_canvas.height = height;
    art_canvas.height = height;
    cursor_canvas.height = height;

    let art_ctx = art_canvas.getContext('2d');
    let cursor_ctx = cursor_canvas.getContext('2d');

    let has_control = false;
    let is_drawing = false;

    let real = {};
    let cursor = {};
    let last_cursor = {};
    function resetCursor() {
        real.x = width / 2;
        real.y = height / 2;
        cursor = {...real};
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
            cursor_paths = [];
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

    // Remove this:
    
    let display = document.getElementById('display');

    let cursor_paths = [];

    draw_area.addEventListener('mousemove', (e) => {
        real.x += e.movementX / window.devicePixelRatio;
        real.y += e.movementY / window.devicePixelRatio;
        
        real.x = Math.min(cursor_canvas.width, Math.max(0, real.x));
        real.y = Math.min(cursor_canvas.height, Math.max(0, real.y));

        if (adjustment) {
            cursor = adjustment(
                cursor,
                {x: e.movementX, y: e.movementY},
                real
            );
            cursor.x = Math.min(cursor_canvas.width, Math.max(0, cursor.x));
            cursor.y = Math.min(cursor_canvas.width, Math.max(0, cursor.y));
        } else {
            cursor = {...real};
        }

        if (is_drawing) {
            line(art_ctx, last_cursor, cursor, 2 * cursor_width, 'rgb(0,0,0');
            cursor_paths[cursor_paths.length-1].push({...cursor});
        }
        last_cursor = {...cursor};
        
        if (display) {
            display.innerText = `x:${real.x}, y:${real.y}`;
        }

        drawCursor();
    });

    container.appendChild(draw_area);

    return {
        draw_area : draw_area,
        background : background_canvas,
        canvas : art_canvas,
        context : art_ctx,
        getPaths : () => {return cursor_paths;}
    }
}