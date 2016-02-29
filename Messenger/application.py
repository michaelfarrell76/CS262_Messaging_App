"""
Configures AWS
Generates routes and views for the flask application.
"""

import os
import sys
import json
import time

from datetime import datetime

import flask
from flask import request, Response, render_template, flash, redirect

import _mysql
import sqlalchemy 
from sqlalchemy.orm import sessionmaker, scoped_session
from auth.auth import User
import flask.ext.login as flask_login
from flask_login import LoginManager, current_user

# Default config vals
FLASK_DEBUG = 'false' if os.environ.get('FLASK_DEBUG') is None else os.environ.get('FLASK_DEBUG')

# Create the Flask app
application = flask.Flask(__name__)

# Load config values specified above
application.config.from_object('config')

# Only enable Flask debugging if an env var is set to true
application.debug = application.config['FLASK_DEBUG'] in ['true', 'True']

# Not the most secure, but oh well
application.config['SQLALCHEMY_DATABASE_URI'] = 'mysql://cs262admin:cs262project@messenger.c57b9wmfsuhp.us-east-1.rds.amazonaws.com/messenger'
engine = sqlalchemy.create_engine(application.config['SQLALCHEMY_DATABASE_URI'])

# Authentication for the application
application.secret_key = 'testtesttest'
login_manager = LoginManager()
login_manager.init_app(application)
login_manager.login_view = 'login'

@login_manager.user_loader
def user_loader(user_id):
    Session = scoped_session(sessionmaker(bind=engine))
    s = Session()
    result_proxy = s.execute('SELECT name, email FROM users WHERE id = "' + user_id + '" LIMIT 1')
    s.close()
    result = result_proxy.fetchone()
    if result is None:
        return
    name = result[0]
    email = result[1]
    user = User(user_id, name, email)
    return user

@login_manager.request_loader
def request_loader(request):
    email = request.form.get('email')
    if email is not None:
        Session = scoped_session(sessionmaker(bind=engine))
        s = Session()
        result_proxy = s.execute('SELECT id, name, password FROM users WHERE email = "' + email + '" LIMIT 1')    
        s.close()
        if result_proxy is None:
            return
        result = result_proxy.fetchone()
        user_id = result[0]
        name = result[1]
        password = result[2]
        user = User(user_id, name, email)
        # Should hash password here! Add in after finishing testing
        user.is_authenticated = request.form['password'] == password    
        application.logger.error(user)
        return user
    return

@application.route('/')
@flask_login.login_required
def home():
    """Renders the chat page."""
    return render_template(
        'index.html',
        title='Messenger',
        year=datetime.now().year,
    )

@application.route('/login', methods=['POST', 'GET'])
def login():
    """Renders the login page."""
    if request.method == 'POST':
        email = request.form['email']
        #password = hashlib.sha224(request.form['passwords']).hexdigest()
        password = request.form['password']

        Session = scoped_session(sessionmaker(bind=engine))
        s = Session()
        result_proxy = s.execute('SELECT id, name, password FROM users WHERE email = "' + email + '" LIMIT 1')
        s.close()
        result = result_proxy.fetchone()

        user_id = result[0]
        name = result[1]
        true_password = result[2]

        if true_password == password:
            user = User(user_id, name, email)
            flask_login.login_user(user)
            data = {'email': email, 'name':name}
            application.logger.debug(data)
            resp = Response(data, status=200, mimetype='application/json')
            return json.dumps(data, 200, {'ContentType':'application/json'})
        else:
            return json.dumps({}, 404, {'ContentType':'application/json'})
    else:
        return render_template(
            'login.html'
        )

@application.route('/register', methods=['POST', 'GET'])
@application.route('/register')
def register():
    if request.method == 'POST':
        name = request.form['name']
        email = request.form['email']
        password = request.form['password']
        #password = hashlib.sha224(request.form['passwords']).hexdigest()

        Session = scoped_session(sessionmaker(bind=engine))
        s = Session()
        result_proxy = s.execute('SELECT * FROM users WHERE email = "' + email + '" LIMIT 1')
        s.close()
        result = result_proxy.fetchone()
        if result is not None:
            flash('That email has already been registered')
            return json.dumps({}, 403, {'ContentType':'application/json'})
        try:
            Session = scoped_session(sessionmaker(bind=engine))
            s = Session()
            s.execute('INSERT INTO users(name, email, password) VALUES ("' + str(name) + '","' + str(email) + '","' + str(password) + '")') 
            result_proxy = s.execute ('SELECT * FROM users WHERE email = "' + email + '" LIMIT 1')
            s.commit()
            s.close()
            result = result_proxy.fetchone()
            user_id = result[0]
            user = User(user_id, name, email)
            flask_login.login_user(user)
            data = {'email': email, 'name':name}
            return json.dumps(data, 200, {'ContentType':'application/json'})
        except:
            return json.dumps({}, 403, {'ContentType':'application/json'})
    else:
        return render_template(
            'register.html'
        )

@application.route('/send_message', methods=['POST'])
def send_message():
    # Need some error checking here probably if we want to be robust about security

    message = request.form['message']
    email = request.form['email']
    # NEED TO GRAB USER ID FROM THE PAGE
    query = 'INSERT INTO messages(user_id, message, time_sent) VALUES (' + str(current_user.id) + ',' + '"' + str(message) + '"' + ', "' + time.strftime("%Y-%m-%d %H:%M:%S") + '")'
    application.logger.error(query)
    Session = scoped_session(sessionmaker(bind=engine))
    s = Session()
    result = s.execute('INSERT INTO messages(user_id, message, time_sent) VALUES (' + str(current_user.id) + ',"' + str(message) + '"' + ', "' + time.strftime("%Y-%m-%d %H:%M:%S") + '")')
    s.commit()
    s.close()
    return json.dumps({}, 200, {'ContentType':'application/json'})

@application.route('/get_messages')
def get_message():
    Session = scoped_session(sessionmaker(bind=engine))
    s = Session()
    result_proxy = s.execute('SELECT * FROM users RIGHT JOIN messages ON users.id = messages.user_id ORDER BY messages.time_sent DESC')
    s.close()
    results = result_proxy.fetchall()
    out = []
    for result in results:
        message_id = result[4]
        name = result[1]
        message = result[6]
        out.append((message_id, name, message))
    return json.dumps(out)

@application.route('/get_users')
def get_users():
    Session = scoped_session(sessionmaker(bind=engine))
    s = Session()
    result = s.execute('SELECT * FROM users')
    s.close()
    results = result.fetchall()
    return str(results)

@application.route('/logout')
def logout():
    flask_login.logout_user()
    return redirect("login", code=302)

if __name__ == '__main__':
    application.run(host='0.0.0.0')