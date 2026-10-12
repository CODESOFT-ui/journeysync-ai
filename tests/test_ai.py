import json
import threading
import unittest
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer
from unittest.mock import patch
import server


def activity(id, start, end, deps=None):
    return {'id': id, 'title': id, 'type': 'Meeting', 'start': start, 'end': end,
            'cost': 100, 'deps': deps or []}


class LocalAITest(unittest.TestCase):
    def setUp(self):
        self.items = [activity('flight', 0, 60), activity('meeting', 90, 120, [{'id': 'flight', 'buffer': 15}])]
        self.payload = {'question': 'Which recovery works?', 'items': self.items, 'budget': 500, 'extra': 0,
                        'plans': [{'id': 'good', 'title': 'good', 'items': self.items, 'extra': 50}]}

    def test_recomputes_budget_and_conflicts(self):
        self.payload['plans'][0]['feasible'] = True
        self.payload['budget'] = 50
        _, ctx = server.prepare_context(self.payload)
        self.assertFalse(ctx['recovery_plans'][0]['feasible'])
        self.payload['budget'] = 500
        self.payload['items'][1]['start'] = 45
        _, ctx = server.prepare_context(self.payload)
        self.assertFalse(ctx['recovery_plans'][0]['feasible'])
        self.assertTrue(ctx['conflicts'])

    def test_rejects_unknown_or_infeasible_model_ids(self):
        _, ctx = server.prepare_context(self.payload)
        self.assertEqual(server.parse_answer({'message': {'content': '{"answer":"ok","suggested_plan_id":"good"}'}}, ctx)['suggested_plan_id'], 'good')
        self.assertIsNone(server.parse_answer({'message': {'content': '{"answer":"ok","suggested_plan_id":"invented"}'}}, ctx)['suggested_plan_id'])
        ctx['recovery_plans'][0]['feasible'] = False
        self.assertIsNone(server.parse_answer({'message': {'content': '{"answer":"ok","suggested_plan_id":"good"}'}}, ctx)['suggested_plan_id'])

    def test_rejects_dropped_dependencies_and_cycles(self):
        self.payload['plans'][0]['items'] = json.loads(json.dumps(self.items))
        self.payload['plans'][0]['items'][1]['deps'] = []
        with self.assertRaises(ValueError):
            server.prepare_context(self.payload)
        self.items[0]['deps'] = [{'id': 'meeting', 'buffer': 10}]
        with self.assertRaises(ValueError):
            server.validate_items(self.items)

    def test_unstructured_answer_cannot_select_plan(self):
        _, ctx = server.prepare_context(self.payload)
        self.assertIsNone(server.parse_answer({'message': {'content': 'Here is an explanation.'}}, ctx)['suggested_plan_id'])

    def test_http_chat_health_and_origin_guard(self):
        httpd = ThreadingHTTPServer(('127.0.0.1', 0), server.Handler)
        worker = threading.Thread(target=httpd.serve_forever, daemon=True)
        worker.start()
        origin = f'http://127.0.0.1:{httpd.server_port}'
        def model(path, payload=None, timeout=180):
            if path == '/api/tags':
                return {'models': [{'name': server.MODEL}]}
            self.assertEqual(path, '/api/chat')
            self.assertEqual(payload['model'], server.MODEL)
            self.assertFalse(payload['stream'])
            self.assertEqual(payload['options']['num_ctx'], 4096)
            return {'message': {'content': '{"answer":"Use the feasible plan.","suggested_plan_id":"good"}'}}
        try:
            with patch.object(server, 'ollama', side_effect=model):
                with urllib.request.urlopen(origin + '/api/health') as r:
                    self.assertTrue(json.load(r)['ready'])
                req = urllib.request.Request(origin + '/api/chat', data=json.dumps(self.payload).encode(), headers={'Content-Type': 'application/json', 'Origin': origin})
                with urllib.request.urlopen(req) as r:
                    result = json.load(r)
                    self.assertEqual(result['suggested_plan_id'], 'good')
                    self.assertEqual(result['source'], 'local_ollama')
                req.add_header('Origin', 'https://example.com')
                with self.assertRaises(urllib.error.HTTPError) as err:
                    urllib.request.urlopen(req)
                self.assertEqual(err.exception.code, 403)
                with urllib.request.urlopen(origin + '/index.html') as r:
                    self.assertIn(b'LOCAL AI ASSISTANT', r.read())
            with patch.object(server, 'ollama', side_effect=OSError('offline')):
                with urllib.request.urlopen(origin + '/api/health') as r:
                    self.assertFalse(json.load(r)['connected'])
                req = urllib.request.Request(origin + '/api/chat', data=json.dumps(self.payload).encode(), headers={'Content-Type': 'application/json'})
                with self.assertRaises(urllib.error.HTTPError) as err:
                    urllib.request.urlopen(req)
                self.assertEqual(err.exception.code, 503)
        finally:
            httpd.shutdown()
            httpd.server_close()
            worker.join()


if __name__ == '__main__':
    unittest.main()
