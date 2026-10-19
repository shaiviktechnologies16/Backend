import os
import sys
import json
import numpy as np
import soundfile as sf

def compute_f0_autocorr(signal, sr, fmin=60, fmax=400, frame_len_ms=30, hop_len_ms=10):
    frame_len = int(sr * frame_len_ms / 1000)
    hop_len = int(sr * hop_len_ms / 1000)
    min_lag = int(sr / fmax)
    max_lag = int(sr / fmin)

    f0_values = []
    energy_values = []

    for i in range(0, len(signal) - frame_len, hop_len):
        frame = signal[i:i + frame_len]
        energy = np.sqrt(np.mean(frame**2))
        energy_values.append(energy)

        # Skip low-energy (unvoiced / silent) frames
        if energy < 0.01:
            continue

        # Windowing
        windowed = frame * np.hanning(len(frame))
        # Autocorrelation
        autocorr = np.correlate(windowed, windowed, mode='full')
        autocorr = autocorr[len(autocorr)//2:]

        if max_lag >= len(autocorr):
            continue

        peak_region = autocorr[min_lag:max_lag]
        if len(peak_region) == 0:
            continue

        peak_idx = np.argmax(peak_region) + min_lag
        peak_val = autocorr[peak_idx]

        # Normalized autocorrelation threshold for voiced frames
        if autocorr[0] > 0 and (peak_val / autocorr[0]) > 0.35:
            f0 = sr / peak_idx
            if fmin <= f0 <= fmax:
                f0_values.append(f0)

    f0_arr = np.array(f0_values)
    energy_arr = np.array(energy_values)

    return {
        "voiced_frames_count": len(f0_arr),
        "f0_mean_hz": round(float(np.mean(f0_arr)), 2) if len(f0_arr) > 0 else None,
        "f0_median_hz": round(float(np.median(f0_arr)), 2) if len(f0_arr) > 0 else None,
        "f0_std_hz": round(float(np.std(f0_arr)), 2) if len(f0_arr) > 0 else None,
        "f0_p5_hz": round(float(np.percentile(f0_arr, 5)), 2) if len(f0_arr) > 0 else None,
        "f0_p95_hz": round(float(np.percentile(f0_arr, 95)), 2) if len(f0_arr) > 0 else None,
        "f0_range_hz": round(float(np.percentile(f0_arr, 95) - np.percentile(f0_arr, 5)), 2) if len(f0_arr) > 0 else None,
        "energy_std": round(float(np.std(energy_arr)), 4) if len(energy_arr) > 0 else None,
        "energy_mean": round(float(np.mean(energy_arr)), 4) if len(energy_arr) > 0 else None,
    }

def compute_spectral_centroid(signal, sr, n_fft=1024, hop_length=512):
    # Short-time FFT using numpy
    frames = []
    for i in range(0, len(signal) - n_fft, hop_length):
        w = signal[i:i+n_fft] * np.hanning(n_fft)
        frames.append(np.abs(np.fft.rfft(w)))
    
    if not frames:
        return {"spectral_centroid_mean_hz": None, "spectral_centroid_std_hz": None}

    spec = np.array(frames) # (num_frames, num_bins)
    freqs = np.fft.rfftfreq(n_fft, 1.0 / sr)

    sum_spec = np.sum(spec, axis=1)
    sum_spec[sum_spec == 0] = 1e-10
    centroids = np.sum(spec * freqs, axis=1) / sum_spec

    return {
        "spectral_centroid_mean_hz": round(float(np.mean(centroids)), 2),
        "spectral_centroid_std_hz": round(float(np.std(centroids)), 2),
    }

def analyze_audio_file(filepath):
    if not os.path.exists(filepath):
        return {"error": f"File not found: {filepath}"}

    data, sr = sf.read(filepath)
    if data.ndim > 1:
        data = np.mean(data, axis=1) # convert to mono
    duration = len(data) / sr

    f0_stats = compute_f0_autocorr(data, sr)
    spec_stats = compute_spectral_centroid(data, sr)

    return {
        "file": os.path.basename(filepath),
        "duration_sec": round(duration, 3),
        "sample_rate": sr,
        **f0_stats,
        **spec_stats,
    }

if __name__ == "__main__":
    files = sys.argv[1:]
    results = {}
    for f in files:
        results[f] = analyze_audio_file(f)
    print(json.dumps(results, indent=2))

