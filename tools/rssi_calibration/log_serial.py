#!/usr/bin/env python3
"""
TroDes Phase 1 - timestamped serial capture.

Records everything the wearable prints, tagging each line with a LABEL that
carries the ground truth for the test being run:

  Test 1 (distance profile)  -> label is the true distance in metres: 1, 2, 4 ...
  Test 2 (zone accuracy)     -> label is the zone the tester is actually standing in
  Test 3 (boundary behaviour)-> label is the zone, changed as the tester crosses

While the capture is running you can type a new label and press Enter to
change it without stopping the log. That is the whole workflow: walk to the
next spot, type where you are, keep walking.

Usage:
    python log_serial.py --port COM6 --out test1_bedroom.csv --label 1
    python log_serial.py --port /dev/ttyUSB0 --out test2.csv --label bedroom_wing

Output CSV columns: iso_time, elapsed_s, label, line
"""

import argparse
import csv
import datetime
import sys
import threading
import time

try:
    import serial  # pyserial
except ImportError:
    sys.exit("pyserial is not installed.  Run:  pip install pyserial")


class LabelBox:
    """Current ground-truth label, updated from a background stdin reader."""

    def __init__(self, initial):
        self.value = str(initial)
        self._lock = threading.Lock()

    def get(self):
        with self._lock:
            return self.value

    def set(self, v):
        with self._lock:
            self.value = v


def stdin_reader(box, stop_event):
    """Let the operator retype the label mid-capture.

    On Windows, iterating sys.stdin buffers read-ahead: the typed label sits in
    a buffer and the change does not take effect until much later, or at all.
    That is useless mid-test, so on Windows we read the console directly with
    msvcrt, character by character, echoing as you type. Everything else falls
    back to readline(), which is responsive enough on a POSIX terminal.
    """
    try:
        import msvcrt                      # Windows only
    except ImportError:
        msvcrt = None

    if msvcrt is not None:
        buf = ""
        while not stop_event.is_set():
            if not msvcrt.kbhit():
                time.sleep(0.05)
                continue
            ch = msvcrt.getwche()          # echoes the character as typed
            if ch in ("\r", "\n"):
                print()
                newlabel = buf.strip()
                buf = ""
                if newlabel:
                    box.set(newlabel)
                    print(f"--- label is now: {newlabel} ---", flush=True)
            elif ch in ("\b", "\x08"):
                buf = buf[:-1]
            else:
                buf += ch
        return

    while not stop_event.is_set():
        line = sys.stdin.readline()
        if not line:
            return
        newlabel = line.strip()
        if newlabel:
            box.set(newlabel)
            print(f"--- label is now: {newlabel} ---", flush=True)


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--port", required=True,
                    help="Serial port, e.g. COM6 or /dev/ttyUSB0")
    ap.add_argument("--baud", type=int, default=115200)
    ap.add_argument("--out", required=True, help="Output CSV path")
    ap.add_argument("--label", default="unlabelled",
                    help="Initial ground-truth label (distance in m, or zone name)")
    ap.add_argument("--echo", action="store_true", default=True,
                    help="Also print lines to the terminal (default on)")
    args = ap.parse_args()

    box = LabelBox(args.label)
    stop = threading.Event()
    threading.Thread(target=stdin_reader, args=(box, stop), daemon=True).start()

    try:
        ser = serial.Serial(args.port, args.baud, timeout=1)
    except Exception as exc:
        sys.exit(f"Could not open {args.port}: {exc}\n"
                 f"Close the PlatformIO Serial Monitor first - only one program "
                 f"can hold a COM port at a time.")

    t0 = time.time()
    n = 0

    print(f"Logging {args.port} @ {args.baud} -> {args.out}")
    print(f"Initial label: {box.get()}")
    print("Type a new label + Enter to change it.  Ctrl+C to stop.\n")

    with open(args.out, "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["iso_time", "elapsed_s", "label", "line"])
        try:
            while True:
                raw = ser.readline()
                if not raw:
                    continue
                line = raw.decode("utf-8", errors="replace").rstrip("\r\n")
                if not line:
                    continue
                now = datetime.datetime.now().isoformat(timespec="milliseconds")
                w.writerow([now, f"{time.time() - t0:.3f}", box.get(), line])
                fh.flush()          # survive a Ctrl+C or an unplugged board
                n += 1
                if args.echo:
                    print(f"[{box.get()}] {line}", flush=True)
        except KeyboardInterrupt:
            pass
        finally:
            stop.set()
            ser.close()

    print(f"\nStopped. {n} lines written to {args.out}")


if __name__ == "__main__":
    main()
