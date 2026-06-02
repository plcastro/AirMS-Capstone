from django.shortcuts import render

NAV = [
    ('View Users', '/web/dashboard/user-management/view-users'),
    ('Activity Logs', '/web/dashboard/user-management/activity-logs'),
    ('Flight Log', '/web/dashboard/flight-log'),
    ('Pre Inspection', '/web/dashboard/pre-inspection'),
    ('Post Inspection', '/web/dashboard/post-inspection'),
    ('Tasks', '/web/dashboard/tasks'),
    ('Mechanics', '/web/dashboard/mechanics'),
    ('Maintenance Log', '/web/dashboard/maintenance-log'),
    ('Parts Lifespan', '/web/dashboard/parts-lifespan-monitoring'),
    ('Maintenance Tracking', '/web/dashboard/maintenance-tracking'),
    ('Maintenance Priority', '/web/dashboard/maintenance-priority'),
    ('Maintenance Dashboard', '/web/dashboard/maintenance-dashboard'),
    ('Parts Requisition', '/web/dashboard/parts-requisition'),
    ('Messages', '/web/dashboard/messages'),
    ('Profile', '/web/dashboard/profile'),
]


def nav(active: str):
    return [
        {'label': label, 'href': href, 'active': href == active}
        for label, href in NAV
    ]


def auth_page(request, template_name: str, title: str):
    return render(request, template_name, {'title': title})


def dashboard_page(request, template_name: str, title: str, path: str):
    return render(request, template_name, {'title': title, 'nav_items': nav(path)})


def login(request):
    return auth_page(request, 'auth/login.html', 'Login')


def forgot(request):
    return auth_page(request, 'auth/forgot.html', 'Forgot Password')


def verification(request):
    return auth_page(request, 'auth/verification.html', 'Verification')


def reset_password(request):
    return auth_page(request, 'auth/reset_password.html', 'Reset Password')


def security_setup(request):
    return auth_page(request, 'auth/security_setup.html', 'Security Setup')


def view_users(request):
    p = '/web/dashboard/user-management/view-users'
    return dashboard_page(request, 'dashboard/user-management/view_users.html', 'User Management', p)


def activity_logs(request):
    p = '/web/dashboard/user-management/activity-logs'
    return dashboard_page(request, 'dashboard/user-management/activity_logs.html', 'Activity Logs', p)


def flight_log(request):
    p = '/web/dashboard/flight-log'
    return dashboard_page(request, 'dashboard/flight_log.html', 'Flight Log', p)


def pre_inspection(request):
    p = '/web/dashboard/pre-inspection'
    return dashboard_page(request, 'dashboard/pre_inspection.html', 'Pre Inspection', p)


def post_inspection(request):
    p = '/web/dashboard/post-inspection'
    return dashboard_page(request, 'dashboard/post_inspection.html', 'Post Inspection', p)


def tasks(request):
    p = '/web/dashboard/tasks'
    return dashboard_page(request, 'dashboard/tasks.html', 'Tasks', p)


def mechanics(request):
    p = '/web/dashboard/mechanics'
    return dashboard_page(request, 'dashboard/mechanics.html', 'Mechanics', p)


def maintenance_log(request):
    p = '/web/dashboard/maintenance-log'
    return dashboard_page(request, 'dashboard/maintenance_log.html', 'Maintenance Log', p)


def parts_lifespan(request):
    p = '/web/dashboard/parts-lifespan-monitoring'
    return dashboard_page(request, 'dashboard/parts_lifespan_monitoring.html', 'Parts Lifespan Monitoring', p)


def maintenance_tracking(request):
    p = '/web/dashboard/maintenance-tracking'
    return dashboard_page(request, 'dashboard/maintenance_tracking.html', 'Maintenance Tracking', p)


def maintenance_priority(request):
    p = '/web/dashboard/maintenance-priority'
    return dashboard_page(request, 'dashboard/maintenance_priority.html', 'Maintenance Priority', p)


def maintenance_dashboard(request):
    p = '/web/dashboard/maintenance-dashboard'
    return dashboard_page(request, 'dashboard/maintenance_dashboard.html', 'Maintenance Dashboard', p)


def parts_requisition(request):
    p = '/web/dashboard/parts-requisition'
    return dashboard_page(request, 'dashboard/parts_requisition.html', 'Parts Requisition', p)


def messages(request):
    p = '/web/dashboard/messages'
    return dashboard_page(request, 'dashboard/messages.html', 'Messages', p)


def profile(request):
    p = '/web/dashboard/profile'
    return dashboard_page(request, 'dashboard/profile.html', 'Profile', p)


def spa_index(request):
    return render(request, 'client_web/index.html')
