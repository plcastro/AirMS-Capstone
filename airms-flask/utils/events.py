from collections import defaultdict
from queue import Queue
from threading import Lock

_subscribers = defaultdict(set)
_lock = Lock()


def subscribe(channel):
    queue = Queue()
    with _lock:
        _subscribers[channel].add(queue)
    return queue


def unsubscribe(channel, queue):
    with _lock:
        _subscribers[channel].discard(queue)


def publish_event(channel, payload):
    with _lock:
        subscribers = list(_subscribers[channel])
    for queue in subscribers:
        queue.put(payload)
