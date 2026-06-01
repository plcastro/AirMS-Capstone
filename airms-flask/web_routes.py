from flask import Blueprint, render_template

web_blueprint = Blueprint("web", __name__)

NAV = [
    ("View Users", "/web/dashboard/user-management/view-users"),
    ("Activity Logs", "/web/dashboard/user-management/activity-logs"),
    ("Flight Log", "/web/dashboard/flight-log"),
    ("Pre Inspection", "/web/dashboard/pre-inspection"),
    ("Post Inspection", "/web/dashboard/post-inspection"),
    ("Tasks", "/web/dashboard/tasks"),
    ("Mechanics", "/web/dashboard/mechanics"),
    ("Maintenance Log", "/web/dashboard/maintenance-log"),
    ("Parts Lifespan", "/web/dashboard/parts-lifespan-monitoring"),
    ("Maintenance Tracking", "/web/dashboard/maintenance-tracking"),
    ("Maintenance Priority", "/web/dashboard/maintenance-priority"),
    ("Maintenance Dashboard", "/web/dashboard/maintenance-dashboard"),
    ("Parts Requisition", "/web/dashboard/parts-requisition"),
    ("Messages", "/web/dashboard/messages"),
    ("Profile", "/web/dashboard/profile"),
]


def nav(active):
    return [{"label": label, "href": href, "active": href == active} for label, href in NAV]


@web_blueprint.get('/web/login')
def login():
    return render_template('auth/login.html', title='Login')


@web_blueprint.get('/web/forgot')
def forgot():
    return render_template('auth/forgot.html', title='Forgot Password')


@web_blueprint.get('/web/verification')
def verification():
    return render_template('auth/verification.html', title='Verification')


@web_blueprint.get('/web/reset-password')
def reset_password():
    return render_template('auth/reset_password.html', title='Reset Password')


@web_blueprint.get('/web/security-setup')
def security_setup():
    return render_template('auth/security_setup.html', title='Security Setup')


@web_blueprint.get('/web/dashboard/user-management/view-users')
def view_users():
    p = '/web/dashboard/user-management/view-users'
    return render_template('dashboard/user-management/view_users.html', title='User Management', nav_items=nav(p))


@web_blueprint.get('/web/dashboard/user-management/activity-logs')
def activity_logs():
    p = '/web/dashboard/user-management/activity-logs'
    return render_template('dashboard/user-management/activity_logs.html', title='Activity Logs', nav_items=nav(p))


@web_blueprint.get('/web/dashboard/flight-log')
def flight_log():
    p = '/web/dashboard/flight-log'
    return render_template('dashboard/flight_log.html', title='Flight Log', nav_items=nav(p))


@web_blueprint.get('/web/dashboard/pre-inspection')
def pre_inspection():
    p = '/web/dashboard/pre-inspection'
    return render_template('dashboard/pre_inspection.html', title='Pre Inspection', nav_items=nav(p))


@web_blueprint.get('/web/dashboard/post-inspection')
def post_inspection():
    p = '/web/dashboard/post-inspection'
    return render_template('dashboard/post_inspection.html', title='Post Inspection', nav_items=nav(p))


@web_blueprint.get('/web/dashboard/tasks')
def tasks():
    p = '/web/dashboard/tasks'
    return render_template('dashboard/tasks.html', title='Tasks', nav_items=nav(p))


@web_blueprint.get('/web/dashboard/mechanics')
def mechanics():
    p = '/web/dashboard/mechanics'
    return render_template('dashboard/mechanics.html', title='Mechanics', nav_items=nav(p))


@web_blueprint.get('/web/dashboard/maintenance-log')
def maintenance_log():
    p = '/web/dashboard/maintenance-log'
    return render_template('dashboard/maintenance_log.html', title='Maintenance Log', nav_items=nav(p))


@web_blueprint.get('/web/dashboard/parts-lifespan-monitoring')
def parts_lifespan():
    p = '/web/dashboard/parts-lifespan-monitoring'
    return render_template('dashboard/parts_lifespan_monitoring.html', title='Parts Lifespan Monitoring', nav_items=nav(p))


@web_blueprint.get('/web/dashboard/maintenance-tracking')
def maintenance_tracking():
    p = '/web/dashboard/maintenance-tracking'
    return render_template('dashboard/maintenance_tracking.html', title='Maintenance Tracking', nav_items=nav(p))


@web_blueprint.get('/web/dashboard/maintenance-priority')
def maintenance_priority():
    p = '/web/dashboard/maintenance-priority'
    return render_template('dashboard/maintenance_priority.html', title='Maintenance Priority', nav_items=nav(p))


@web_blueprint.get('/web/dashboard/maintenance-dashboard')
def maintenance_dashboard():
    p = '/web/dashboard/maintenance-dashboard'
    return render_template('dashboard/maintenance_dashboard.html', title='Maintenance Dashboard', nav_items=nav(p))


@web_blueprint.get('/web/dashboard/parts-requisition')
def parts_requisition():
    p = '/web/dashboard/parts-requisition'
    return render_template('dashboard/parts_requisition.html', title='Parts Requisition', nav_items=nav(p))


@web_blueprint.get('/web/dashboard/messages')
def messages():
    p = '/web/dashboard/messages'
    return render_template('dashboard/messages.html', title='Messages', nav_items=nav(p))


@web_blueprint.get('/web/dashboard/profile')
def profile():
    p = '/web/dashboard/profile'
    return render_template('dashboard/profile.html', title='Profile', nav_items=nav(p))
