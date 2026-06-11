import React, { useRef, useEffect, useState } from 'react';

// Lightweight canvas signature pad. Calls onChange with a PNG data URL when a
// stroke finishes, and with '' when cleared.
const SignaturePad = ({ onChange }) => {
    const canvasRef = useRef(null);
    const drawing = useRef(false);
    const last = useRef({ x: 0, y: 0 });
    const [hasInk, setHasInk] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ratio = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * ratio;
        canvas.height = rect.height * ratio;
        const ctx = canvas.getContext('2d');
        ctx.scale(ratio, ratio);
        ctx.lineWidth = 2.2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#111827';
    }, []);

    const getPos = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const point = e.touches ? e.touches[0] : e;
        return { x: point.clientX - rect.left, y: point.clientY - rect.top };
    };

    const start = (e) => {
        e.preventDefault();
        drawing.current = true;
        last.current = getPos(e);
    };

    const move = (e) => {
        if (!drawing.current) return;
        e.preventDefault();
        const ctx = canvasRef.current.getContext('2d');
        const p = getPos(e);
        ctx.beginPath();
        ctx.moveTo(last.current.x, last.current.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        last.current = p;
        if (!hasInk) setHasInk(true);
    };

    const end = () => {
        if (!drawing.current) return;
        drawing.current = false;
        if (onChange) onChange(canvasRef.current.toDataURL('image/png'));
    };

    const clear = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasInk(false);
        if (onChange) onChange('');
    };

    return (
        <div>
            <canvas
                ref={canvasRef}
                className="w-full h-40 border-2 border-dashed border-gray-300 rounded-md bg-white cursor-crosshair touch-none"
                onMouseDown={start}
                onMouseMove={move}
                onMouseUp={end}
                onMouseLeave={end}
                onTouchStart={start}
                onTouchMove={move}
                onTouchEnd={end}
            />
            <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-gray-400">
                    {hasInk ? 'Signature captured.' : 'Sign above using your mouse or finger.'}
                </span>
                <button type="button" onClick={clear} className="text-xs text-red-600 hover:underline">
                    Clear
                </button>
            </div>
        </div>
    );
};

export default SignaturePad;
