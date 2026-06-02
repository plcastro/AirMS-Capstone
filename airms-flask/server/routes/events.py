from flask import Blueprint, Response

sse_bp = Blueprint("events_api", __name__, url_prefix="/api/events")


@sse_bp.get('/stream')
def stream():
    def event_stream():
        yield 'event: data-changed\n'
        yield 'data: {"url":"/api/events/stream","method":"INIT","statusCode":200}\n\n'

    return Response(event_stream(), mimetype='text/event-stream', headers={
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'
    })
