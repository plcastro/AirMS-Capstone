from flask import Blueprint, render_template

pages_bp = Blueprint("pages", __name__)


@pages_bp.get("/")
def index():
    return render_template("pages/index.html", title="AirMS Flask")


@pages_bp.get("/login")
def login():
    return render_template("pages/login.html", title="Login")


@pages_bp.get("/dashboard")
def dashboard():
    return render_template("pages/dashboard.html", title="Dashboard")
