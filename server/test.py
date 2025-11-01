from flask import Flask, request
from markupsafe import escape

app = Flask(__name__)

@app.route("/")
def hello_world():
    return "<p>Hello, World!</p>"

@app.route("/hello")
def hello():
    name = request.args.get("name", "Flask")
    return f"Hello, {escape(name)}!"

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == 'POST':
        return do_the_login()
    else:
        return show_the_login_form()
