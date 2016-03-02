"""
Configures AWS
Generates routes and views for the flask application.
"""

import os
import sys
import json
import time
import ast

from datetime import datetime

import flask
from flask import request, Response, render_template, flash, redirect

from sqlalchemy import exc
import _mysql
import sqlalchemy 
from sqlalchemy.orm import sessionmaker, scoped_session
from auth.auth import User
import flask.ext.login as flask_login
from flask_login import LoginManager, current_user
from werkzeug.security import generate_password_hash, \
     check_password_hash

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
        user.is_authenticated = generate_password_hash(request.form['password']) == password    
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
    print('a')
    if request.method == 'POST':
        print('b')
        email = request.form['email']
        password = request.form['password']

        Session = scoped_session(sessionmaker(bind=engine))
        s = Session()
        result_proxy = s.execute('SELECT id, name, password FROM users WHERE email = "' + email + '" LIMIT 1')
        s.close()
        result = result_proxy.fetchone()

        if result == None:
            flash('Email Address not found')
            return json.dumps({}, 500, {'ContentType':'application/json'})
        
        true_password = result[2]
        print('here')

        if check_password_hash(true_password, password):
            user_id = result[0]
            name = result[1]

            user = User(user_id, name, email)
            flask_login.login_user(user)
            data = {'email': email, 'name':name}
            application.logger.debug(data)
            resp = Response(data, status=200, mimetype='application/json')
            return json.dumps(data, 200, {'ContentType':'application/json'})
        else:
            flash('Passwords do not match')
            return json.dumps({}, 500, {'ContentType':'application/json'})
    else:
        return render_template(
            'login.html'
        )

@application.route('/register', methods=['POST', 'GET'])
def register():
    if request.method == 'POST':
        name = request.form['name']
        email = request.form['email']
        password = generate_password_hash(request.form['password'])

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
            flash('An error occurred')
            return json.dumps({}, 403, {'ContentType':'application/json'})
    else:
        return render_template(
            'register.html'
        )

@application.route('/send_message', methods=['POST'])
def send_message():
    other_id =  request.form['other_uid']
    select_type =  request.form['select_type']

    if other_id == "null":
        #not doing this right
        return json.dumps({}, 403, {'ContentType':'application/json'})

    Session = scoped_session(sessionmaker(bind=engine))
    s = Session()

    if select_type == "user":
        user_ids = sorted([current_user.id, other_id])
        users_str = '"[' + ", ".join(user_ids) + ']"'
        query = 'SELECT * from groups WHERE user_ids = %s LIMIT 1' % users_str
        result_proxy = s.execute(query)
        result = result_proxy.fetchone()
        if result is None:
            query = 'insert into groups (groupname, user_ids) VALUES("twousers", %s)' % users_str
            s.execute(query)
            query = 'SELECT * from groups WHERE user_ids = %s LIMIT 1' % users_str
            result_proxy = s.execute(query)
            result = result_proxy.fetchone()
    else:
        query = 'SELECT * from groups WHERE group_id = %s LIMIT 1' % other_id
        result_proxy = s.execute(query)
        result = result_proxy.fetchone()

    group_id = result[0]
    group_name = result[1]

    message = request.form['message']

    pkg = (str(current_user.id), str(message) , time.strftime("%Y-%m-%d %H:%M:%S"), group_id)
    query = 'INSERT INTO messages(user_id, message, time_sent, group_id) '  + \
                        'VALUES ("%s", "%s", "%s", %d)' % pkg
                

    s.execute(query)

    s.commit()
    s.close() 
    return json.dumps({}, 200, {'ContentType':'application/json'})

@application.route('/get_messages', methods=['POST'])
def get_message():

    other_user =  request.form['user_id']
    select_type =  request.form['select_type']
    Session = scoped_session(sessionmaker(bind=engine))
    s = Session()
    if select_type == "user":

        user_ids = sorted([current_user.id, other_user])
        users_str = '"[' + ", ".join(user_ids) + ']"'
        query = 'SELECT * from groups WHERE user_ids = %s' %users_str
        result_proxy = s.execute(query)
    results = result_proxy.fetchall()
    out = []
    if len(results) > 0:
        group_id = results[0][0]

        
        result_proxy = s.execute('SELECT messages.id, users.name, messages.message from messages JOIN users ON users.id=messages.user_id where group_id = %s' % group_id)
        s.close()
        results = result_proxy.fetchall()
        for result in reversed(results):
            message_id = result[0]
            name = result[1]
            message = result[2]
            out.append((message_id, name, message))

    return json.dumps(out)

@application.route('/get_users')
def get_users():
    Session = scoped_session(sessionmaker(bind=engine))
    s = Session()
    result = s.execute('SELECT * FROM users')
    s.close()
    results = result.fetchall()
    out = []
    for result in results:
        user_id = result[0]
        name = result[1]
        email = result[2]

        if user_id != int(current_user.id):
            out.append((user_id, name, email))

    return json.dumps(out)

@application.route('/logout')
def logout():
    flask_login.logout_user()
    return redirect("login", code=302)

@application.route('/delete_account')
def delete_account():
    Session = scoped_session(sessionmaker(bind=engine))
    uid_to_delete = current_user.id
    flask_login.logout_user()
    s = Session()
    result_proxy = s.execute('DELETE FROM users WHERE id='+ uid_to_delete)
    s.commit()
    s.close()

    return redirect("login", code=302)

@application.route('/create_group', methods=['POST', 'GET'])
def create_group():
    if request.method == 'POST':
        user_ids = request.form['user_ids']
        name = request.form['group_name']
        user_ids = user_ids.split(',')
        user_ids = [int(user_id) for user_id in user_ids]
        user_ids.sort()
        user_ids = str(user_ids)
        Session = scoped_session(sessionmaker(bind=engine))
        s = Session()
        result_proxy = s.execute('SELECT * FROM groups WHERE user_ids = "' + user_ids + '" LIMIT 1')
        s.close()
        result = result_proxy.fetchone()
        if result is not None:
            flash('That group has already been created')
            return json.dumps({}, 403, {'ContentType':'application/json'})
        try:
            Session = scoped_session(sessionmaker(bind=engine))
            s = Session()
            s.execute('INSERT INTO groups(groupname, user_ids) VALUES ("' + name + '","' + user_ids + '")') 
            s.commit()
            s.close()
            return json.dumps({}, 200, {'ContentType':'application/json'})
        except:
            return json.dumps({}, 403, {'ContentType':'application/json'})
    else:
        return render_template(
            'create_group.html'
        )

@application.route('/get_groups', methods=['POST', 'GET'])
def get_groups():
    Session = scoped_session(sessionmaker(bind=engine))
    s = Session()
    result = s.execute('SELECT * FROM groups')
    s.close()
    results = result.fetchall()
    application.logger.error('WTF')
    out = []
    for result in results:
        group_id = result[0]
        group_name = result[1]
        user_ids = ast.literal_eval(result[2])
        application.logger.error(user_ids)
        if current_user.id in user_ids:
            out.append((group_id, group_name, user_ids))
    application.logger.error(results)
    return json.dumps(out)

@application.route('/test')
def test():
    return render_template('test.html')

if __name__ == '__main__':
    application.run(host='0.0.0.0')