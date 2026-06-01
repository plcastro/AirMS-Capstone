from flask import Blueprint

from . import admin_activity
from . import admin_security_alert
from . import aircraft
from . import flight_log
from . import inspection
from . import maintenance_log
from . import message
from . import notification
from . import parts_monitoring
from . import parts_requisition
from . import post_inspection
from . import pre_inspection
from . import task
from . import user


def register_blueprints(app):
    modules = [
        (user.blueprint, "/api/user"),
        (aircraft.blueprint, "/api/aircraft"),
        (task.blueprint, "/api/tasks"),
        (inspection.blueprint, "/api/inspections"),
        (pre_inspection.blueprint, "/api/pre-inspections"),
        (post_inspection.blueprint, "/api/post-inspections"),
        (flight_log.blueprint, "/api/flightlogs"),
        (maintenance_log.blueprint, "/api/maintenance-logs"),
        (parts_requisition.blueprint, "/api/parts-requisition"),
        (parts_monitoring.blueprint, "/api/parts-monitoring"),
        (notification.blueprint, "/api/notifications"),
        (message.blueprint, "/api/messages"),
        (admin_activity.blueprint, "/api/admin-activity"),
        (admin_security_alert.blueprint, "/api/admin-security-alerts"),
    ]
    for blueprint, prefix in modules:
        app.register_blueprint(blueprint, url_prefix=prefix)
    app.register_blueprint(parts_requisition.blueprint, url_prefix="/api/requisitions", name_prefix="requisitions_alias")
