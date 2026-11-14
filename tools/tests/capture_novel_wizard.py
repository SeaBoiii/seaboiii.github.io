"""Capture the real Windows Tk layout without displaying a visible window.

Uses the isolated-state smoke harness and Windows PrintWindow. Requires the
optional Pillow dependency already used by Novel Wizard's artwork previews.
Output goes to the ignored tools/qa-artifacts directory.

    python -B tools/tests/capture_novel_wizard.py
"""

import ctypes
from ctypes import wintypes
from pathlib import Path
import sys

sys.dont_write_bytecode = True

from test_novel_wizard_ui import WizardUiTests


class BitmapHeader(ctypes.Structure):
    _fields_ = [("size", wintypes.DWORD), ("width", wintypes.LONG), ("height", wintypes.LONG),
                ("planes", wintypes.WORD), ("bits", wintypes.WORD), ("compression", wintypes.DWORD),
                ("image_size", wintypes.DWORD), ("x", wintypes.LONG), ("y", wintypes.LONG),
                ("used", wintypes.DWORD), ("important", wintypes.DWORD)]


class BitmapInfo(ctypes.Structure):
    _fields_ = [("header", BitmapHeader), ("color", wintypes.DWORD * 3)]


def capture(app, path):
    from PIL import Image

    user, gdi = ctypes.windll.user32, ctypes.windll.gdi32
    for api, arguments, result in [
        (user.GetAncestor, [wintypes.HWND, wintypes.UINT], wintypes.HWND),
        (user.GetWindowRect, [wintypes.HWND, ctypes.POINTER(wintypes.RECT)], wintypes.BOOL),
        (user.GetWindowDC, [wintypes.HWND], wintypes.HDC),
        (user.PrintWindow, [wintypes.HWND, wintypes.HDC, wintypes.UINT], wintypes.BOOL),
        (user.ReleaseDC, [wintypes.HWND, wintypes.HDC], ctypes.c_int),
        (gdi.CreateCompatibleDC, [wintypes.HDC], wintypes.HDC),
        (gdi.CreateCompatibleBitmap, [wintypes.HDC, ctypes.c_int, ctypes.c_int], wintypes.HBITMAP),
        (gdi.SelectObject, [wintypes.HDC, wintypes.HANDLE], wintypes.HANDLE),
        (gdi.GetDIBits, [wintypes.HDC, wintypes.HBITMAP, wintypes.UINT, wintypes.UINT, ctypes.c_void_p, ctypes.POINTER(BitmapInfo), wintypes.UINT], ctypes.c_int),
        (gdi.DeleteObject, [wintypes.HANDLE], wintypes.BOOL),
        (gdi.DeleteDC, [wintypes.HDC], wintypes.BOOL),
    ]:
        api.argtypes, api.restype = arguments, result
    handle = user.GetAncestor(app.winfo_id(), 2)
    rectangle = wintypes.RECT()
    if not user.GetWindowRect(handle, ctypes.byref(rectangle)):
        raise RuntimeError("Unable to measure the Tk window")
    width, height = rectangle.right - rectangle.left, rectangle.bottom - rectangle.top
    source = user.GetWindowDC(handle)
    target = gdi.CreateCompatibleDC(source)
    bitmap = gdi.CreateCompatibleBitmap(source, width, height)
    previous = gdi.SelectObject(target, bitmap)
    try:
        if not user.PrintWindow(handle, target, 2):
            raise RuntimeError("Windows PrintWindow failed")
        data = ctypes.create_string_buffer(width * height * 4)
        information = BitmapInfo()
        information.header = BitmapHeader(ctypes.sizeof(BitmapHeader), width, -height, 1, 32, 0, len(data), 0, 0, 0, 0)
        if gdi.GetDIBits(target, bitmap, 0, height, data, ctypes.byref(information), 0) != height:
            raise RuntimeError("Unable to read the full window bitmap")
        Image.frombuffer("RGB", (width, height), data.raw, "raw", "BGRX", 0, 1).save(path)
    finally:
        gdi.SelectObject(target, previous)
        gdi.DeleteObject(bitmap)
        gdi.DeleteDC(target)
        user.ReleaseDC(handle, source)


def main():
    if sys.platform != "win32":
        raise SystemExit("This capture helper uses Windows PrintWindow.")
    output = Path(__file__).resolve().parents[1] / "qa-artifacts"
    output.mkdir(exist_ok=True)
    case = WizardUiTests()
    case.setUp()
    try:
        case._select_book("the-cinder-crown")
        for width, height, page in [(1280, 800, "Book"), (940, 620, "Book"), (1280, 800, "Chapters"), (940, 620, "Chapters"), (1280, 800, "Review")]:
            app = case.app
            app.geometry(f"{width}x{height}+4000+4000")
            app.studio.workspace.select(app.studio.pages[page])
            app.update()
            case._settle_layout()
            if page == "Chapters" and width >= 1280 and not app.studio.reader_text.winfo_ismapped():
                app.studio.toggle_reader()
                app.update()
                case._settle_layout()
            path = output / f"{page.lower()}-{width}.png"
            capture(app, path)
            print(path)
    finally:
        case.doCleanups()


if __name__ == "__main__":
    main()
