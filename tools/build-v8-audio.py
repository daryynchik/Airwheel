"""Rebuild the CC BY-SA 3.0 loops. Requires numpy, scipy and soundfile.
Source: Edvvc, Ferrari F60 (2009), Wikimedia Commons. See public/audio/README.md.
Reference rpm is a pitch calibration, not recorded telemetry.
"""
from pathlib import Path
import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt
root = Path(__file__).resolve().parents[1]
x, rate = sf.read(root / 'public/audio/ferrari-f60-v8.ogg')
x = x.mean(axis=1) if x.ndim > 1 else x
for name, start, end in [('v8-mid', 4.46, 4.74), ('v8-high', 7.13, 7.66)]:
    y = x[int(start * rate):int(end * rate)]
    y = sosfilt(butter(2, 180, fs=rate, btype='highpass', output='sos'), y)
    # Overlap the ends so both the waveform and its level remain continuous.
    n = int(rate * .035)
    fade = np.linspace(0, 1, n)
    seam = y[-n:] * (1 - fade) + y[:n] * fade
    y = np.concatenate([seam, y[n:-n]])
    y *= min(.8 / max(abs(y)), .16 / np.sqrt(np.mean(y*y)))
    sf.write(root / f'public/audio/{name}.wav', y, rate, subtype='PCM_16')
    print(name, len(y) / rate, 'seconds')
