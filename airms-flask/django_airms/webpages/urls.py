from django.urls import path

from . import views

urlpatterns = [
    path('web/login', views.login, name='web_login'),
    path('web/forgot', views.forgot, name='web_forgot'),
    path('web/verification', views.verification, name='web_verification'),
    path('web/reset-password', views.reset_password, name='web_reset_password'),
    path('web/security-setup', views.security_setup, name='web_security_setup'),
    path('web/dashboard/user-management/view-users', views.view_users, name='web_view_users'),
    path('web/dashboard/user-management/activity-logs', views.activity_logs, name='web_activity_logs'),
    path('web/dashboard/flight-log', views.flight_log, name='web_flight_log'),
    path('web/dashboard/pre-inspection', views.pre_inspection, name='web_pre_inspection'),
    path('web/dashboard/post-inspection', views.post_inspection, name='web_post_inspection'),
    path('web/dashboard/tasks', views.tasks, name='web_tasks'),
    path('web/dashboard/mechanics', views.mechanics, name='web_mechanics'),
    path('web/dashboard/maintenance-log', views.maintenance_log, name='web_maintenance_log'),
    path('web/dashboard/parts-lifespan-monitoring', views.parts_lifespan, name='web_parts_lifespan'),
    path('web/dashboard/maintenance-tracking', views.maintenance_tracking, name='web_maintenance_tracking'),
    path('web/dashboard/maintenance-priority', views.maintenance_priority, name='web_maintenance_priority'),
    path('web/dashboard/maintenance-dashboard', views.maintenance_dashboard, name='web_maintenance_dashboard'),
    path('web/dashboard/parts-requisition', views.parts_requisition, name='web_parts_requisition'),
    path('web/dashboard/messages', views.messages, name='web_messages'),
    path('web/dashboard/profile', views.profile, name='web_profile'),
]