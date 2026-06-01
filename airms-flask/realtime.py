import json

from flask import Blueprint, Response, stream_with_context

from utils.events import subscribe, unsubscribe

events_blueprint = Blueprint("events", __name__)


@events_blueprint.get("/stream")
def stream_events():
    channel = "airms:data-changed"
    queue = subscribe(channel)

    def generate():
        yield ": connected\n\n"
        try:
            while True:
                data = queue.get()
                yield f"event: airms:data-changed\ndata: {json.dumps(data)}\n\n"
        finally:
            unsubscribe(channel, queue)

    return Response(stream_with_context(generate()), mimetype="text/event-stream")
