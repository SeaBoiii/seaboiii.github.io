"""Isolated startup checks: every socket/process boundary is mocked."""
import importlib.util
from pathlib import Path
import subprocess
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location("novel_preview_under_test", Path(__file__).resolve().parents[1] / "novel_preview.py")
preview = importlib.util.module_from_spec(spec)
spec.loader.exec_module(preview)


class PreviewStartupTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="novel-preview-helper-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        script = self.root / "showcase" / "scripts" / "serve.mjs"
        script.parent.mkdir(parents=True)
        script.write_text("// fixture only; never launched", encoding="utf-8")
        build = self.root / "showcase" / "site-dist" / "novel" / "index.html"
        build.parent.mkdir(parents=True)
        build.write_text("<html>Fixture</html>", encoding="utf-8")
        self.process = SimpleNamespace(pid=12345, poll=lambda: None)
        self.probe = patch.object(preview, "_probe", return_value="closed")
        self.probe_mock = self.probe.start()
        self.addCleanup(self.probe.stop)
        self.launch = patch.object(preview.subprocess, "Popen", return_value=self.process)
        self.launch_mock = self.launch.start()
        self.addCleanup(self.launch.stop)
        self.node = patch.object(preview.shutil, "which", return_value="node-fixture.exe")
        self.node_mock = self.node.start()
        self.addCleanup(self.node.stop)

    def test_running_preview_is_reused_without_launch(self):
        self.probe_mock.return_value = "ready"
        result = preview.ensure_local_preview(self.root, "http://127.0.0.1:4175")
        self.assertTrue(result["ok"])
        self.assertEqual(result["status"], "running")
        self.assertFalse(result["started"])
        self.probe_mock.assert_called_once_with(4175, preview.preview_identity(self.root))
        self.launch_mock.assert_not_called()

    def test_occupied_port_is_not_replaced(self):
        self.probe_mock.return_value = "occupied"
        result = preview.ensure_local_preview(self.root, "http://localhost:4175")
        self.assertFalse(result["ok"])
        self.assertEqual(result["status"], "occupied")
        self.launch_mock.assert_not_called()

    def test_local_preview_starts_only_expected_server_with_requested_port(self):
        self.probe_mock.side_effect = ["closed", "ready"]
        result = preview.ensure_local_preview(self.root, "http://localhost:4329/")
        self.assertTrue(result["ok"])
        self.assertEqual(result["status"], "started")
        self.assertEqual(result["pid"], 12345)
        self.assertEqual(result["url"], "http://localhost:4329/novel/")
        command = self.launch_mock.call_args.args[0]
        self.assertEqual(command, ["node-fixture.exe", str(self.root / "showcase" / "scripts" / "serve.mjs"), "--port=4329"])
        self.assertEqual(self.launch_mock.call_args.kwargs["cwd"], self.root)
        self.assertEqual(self.launch_mock.call_args.kwargs["stdin"], subprocess.DEVNULL)
        self.assertNotIn("shell", self.launch_mock.call_args.kwargs)
        if sys.platform == "win32":
            flags = self.launch_mock.call_args.kwargs["creationflags"]
            self.assertTrue(flags & subprocess.CREATE_NO_WINDOW)
            self.assertTrue(flags & subprocess.DETACHED_PROCESS)
        else:
            self.assertTrue(self.launch_mock.call_args.kwargs["start_new_session"])

    def test_remote_and_https_origins_never_probe_or_launch(self):
        for base in ("https://example.org", "http://example.org:4175", "https://localhost:4175", "http://[::1]:4175"):
            with self.subTest(base=base):
                self.assertFalse(preview.ensure_local_preview(self.root, base)["ok"])
        self.probe_mock.assert_not_called()
        self.launch_mock.assert_not_called()

    def test_invalid_addresses_never_probe_or_launch(self):
        for base in ("http://user:password@localhost:4175", "http://localhost:70000", "http://localhost:0",
                     "http://localhost:4175/novel/", "http://localhost:4175/?query=1", "http://localhost:4175/#part", "nonsense"):
            with self.subTest(base=base):
                self.assertFalse(preview.ensure_local_preview(self.root, base)["ok"])
        self.probe_mock.assert_not_called()
        self.launch_mock.assert_not_called()

    def test_missing_build_does_not_launch(self):
        (self.root / "showcase" / "site-dist" / "novel" / "index.html").unlink()
        self.assertEqual(preview.ensure_local_preview(self.root, "http://127.0.0.1:4175")["status"], "missing_build")
        self.launch_mock.assert_not_called()

    def test_missing_node_does_not_launch(self):
        self.node_mock.return_value = None
        self.assertEqual(preview.ensure_local_preview(self.root, "http://127.0.0.1:4175")["status"], "missing_node")
        self.launch_mock.assert_not_called()

    def test_launch_failure_is_returned_without_exception(self):
        self.launch_mock.side_effect = OSError("simulated denied launch")
        result = preview.ensure_local_preview(self.root, "http://127.0.0.1:4175")
        self.assertEqual(result["status"], "start_failed")
        self.assertIn("simulated denied launch", result["message"])

    def test_child_exit_is_reported_and_no_process_is_killed(self):
        self.process.poll = lambda: 1
        result = preview.ensure_local_preview(self.root, "http://127.0.0.1:4175")
        self.assertEqual(result["status"], "start_failed")
        self.assertTrue(result["started"])
        self.assertIn("code 1", result["message"])

    def test_startup_timeout_preserves_the_new_process(self):
        with patch.object(preview.time, "monotonic", side_effect=[0, 9]):
            result = preview.ensure_local_preview(self.root, "http://127.0.0.1:4175")
        self.assertEqual(result["status"], "starting")
        self.assertTrue(result["started"])
        self.assertEqual(result["pid"], 12345)

    def test_probe_uses_direct_loopback_head_request_and_does_not_follow_redirects(self):
        self.probe.stop()
        connection = SimpleNamespace(request=lambda *args: None, getresponse=lambda: SimpleNamespace(status=302, getheader=lambda *args: "text/html"), close=lambda: None)
        with patch.object(preview.http.client, "HTTPConnection", return_value=connection) as factory:
            self.assertEqual(preview._probe(4175), "occupied")
            factory.assert_called_once_with("127.0.0.1", 4175, timeout=0.75)

    def test_matching_worktree_identity_is_ready(self):
        self.probe.stop()
        expected = preview.preview_identity(self.root)
        response = SimpleNamespace(status=200, getheader=lambda name, default="": {"Content-Type": "text/html; charset=utf-8", "X-Portfolio-Preview": expected}.get(name, default))
        connection = SimpleNamespace(request=lambda *args: None, getresponse=lambda: response, close=lambda: None)
        with patch.object(preview.http.client, "HTTPConnection", return_value=connection):
            self.assertEqual(preview._probe(4175, expected), "ready")

    def test_missing_or_different_worktree_identity_never_launches(self):
        for identity, expected_status in (("", "identity_missing"), ("another-worktree", "identity_mismatch")):
            with self.subTest(identity=identity):
                self.probe.stop()
                response = SimpleNamespace(status=200, getheader=lambda name, default="", current=identity: {"Content-Type": "text/html", "X-Portfolio-Preview": current}.get(name, default))
                connection = SimpleNamespace(request=lambda *args: None, getresponse=lambda: response, close=lambda: None)
                with patch.object(preview.http.client, "HTTPConnection", return_value=connection):
                    result = preview.ensure_local_preview(self.root, "http://127.0.0.1:4175")
                self.assertFalse(result["ok"])
                self.assertEqual(result["status"], expected_status)
                self.assertIn("unused", result["message"])
        self.launch_mock.assert_not_called()


if __name__ == "__main__":
    unittest.main(verbosity=2)
