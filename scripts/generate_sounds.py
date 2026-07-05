import os
import wave
import struct
import math

def write_wav(filename, sample_rate, duration, tone_generator):
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    with wave.open(filename, 'w') as w:
        w.setnchannels(1)
        w.setsampwidth(2) # 16-bit PCM
        w.setframerate(sample_rate)
        
        num_samples = int(sample_rate * duration)
        for i in range(num_samples):
            t = i / sample_rate
            value = tone_generator(t, duration)
            # scale to 16-bit int range (-32768 to 32767)
            val = int(value * 32767)
            # clip to range
            val = max(-32768, min(32767, val))
            data = struct.pack('<h', val)
            w.writeframesraw(data)

def success_tone(t, duration):
    # Success sound: a bright, pleasant double-tone
    # Note 1: E5 (659.25 Hz) for first 0.12 seconds
    # Note 2: A5 (880.00 Hz) for the rest
    volume = 0.4
    if t < 0.12:
        freq = 659.25
        env = min(1.0, t / 0.01)
    else:
        freq = 880.00
        env = max(0.0, 1.0 - (t - 0.12) / (duration - 0.12))
    
    return volume * env * math.sin(2 * math.pi * freq * t)

def failure_tone(t, duration):
    # Failure sound: a low, buzzy, descending warning tone
    # frequency sweeps from 220 Hz down to 110 Hz
    volume = 0.4
    freq = 220.0 - (110.0 * (t / duration))
    env = max(0.0, 1.0 - t / duration)
    
    # Add a slight amount of odd harmonics to make it buzzier (alarm/warning style)
    sine = math.sin(2 * math.pi * freq * t)
    harmonic = 0.3 * math.sin(2 * math.pi * (3 * freq) * t)
    return volume * env * (sine + harmonic)

if __name__ == '__main__':
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    media_dir = os.path.join(base_dir, 'media')
    
    success_path = os.path.join(media_dir, 'success.wav')
    failure_path = os.path.join(media_dir, 'failure.wav')
    
    print(f"Generating success sound at {success_path}...")
    write_wav(success_path, 44100, 0.35, success_tone)
    
    print(f"Generating failure sound at {failure_path}...")
    write_wav(failure_path, 44100, 0.45, failure_tone)
    
    print("Done generating sounds!")
